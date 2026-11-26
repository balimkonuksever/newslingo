"""Fine-tunes a small pretrained transformer to read a sentence's CEFR level.

    python -I -m newslingo_ml.transformer [--model distilroberta-base] [--epochs 4]
        [--alpha 0.2] [--seed N] [--select either|macro_f1_paper]

Trains on the training split and scores the validation split after every
epoch, keeping the epoch and decision rule with the best --select metric
(ties broken by QWK): either-annotator accuracy by default, as sentence_eval
chooses among its candidates, or the CEFR-SP paper's macro-F1. The test split
is never read here. The kept weights go to ml/checkpoints/<run>/, which git
ignores, and the validation results to
ml/reports/<date>-transformer-dev-<run>.json.

Each sentence is trained toward both annotators' levels at once: half the
target on one annotator's level and half on the other's. With --alpha, each
level's loss is weighted as the CEFR-SP paper does (newslingo_ml.weighting),
so rare levels count for more.
"""

import argparse
import datetime
import json
import random
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from huggingface_hub import constants
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    get_linear_schedule_with_warmup,
)

from newslingo_ml import corpus
from newslingo_ml.corpus import LEVELS, ML_ROOT, Sentence
from newslingo_ml.metrics import scores
from newslingo_ml.sentence_eval import SEED, provenance
from newslingo_ml.text import detokenize
from newslingo_ml.weighting import class_weights

CHECKPOINTS = ML_ROOT / "checkpoints"
SELECT_METRICS = ("either", "macro_f1_paper")


@dataclass(frozen=True)
class Settings:
    model: str
    epochs: int
    learning_rate: float
    batch_size: int
    max_length: int
    warmup: float
    weight_decay: float
    seed: int
    class_weight_alpha: float | None = None
    select: str = "either"
    # Each batch runs in this many parts whose gradients add up, so a larger
    # model fits in memory while training exactly as with whole batches.
    accumulate: int = 1


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def device() -> torch.device:
    return torch.device("mps" if torch.backends.mps.is_available() else "cpu")


def soft_targets(sentences: list[Sentence]) -> torch.Tensor:
    """Half the weight on each annotator's level (levels 1–6 are classes 0–5)."""
    targets = torch.zeros(len(sentences), len(LEVELS))
    for row, sentence in enumerate(sentences):
        targets[row, sentence.level_a - 1] += 0.5
        targets[row, sentence.level_b - 1] += 0.5
    return targets


def part_loss(
    logits: torch.Tensor, targets: torch.Tensor, weights: torch.Tensor | None, batch_count: int
) -> torch.Tensor:
    """A part's mean loss, scaled by its share of the batch, so the parts of a
    batch add up to the batch's mean loss. With probability targets,
    cross_entropy averages over sentences even when levels are weighted."""
    return F.cross_entropy(logits, targets, weight=weights) * (len(targets) / batch_count)


def level_decisions(probabilities: np.ndarray) -> dict[str, np.ndarray]:
    """Two ways to read a level off class probabilities: the most likely class,
    and the expected level rounded half up, as sentence_eval rounds."""
    expected = probabilities @ np.arange(1, len(LEVELS) + 1)
    return {
        "most likely": probabilities.argmax(axis=1) + 1,
        "expected": np.clip(np.floor(expected + 0.5), 1, 6).astype(int),
    }


def decisions(logits: torch.Tensor) -> dict[str, np.ndarray]:
    return level_decisions(logits.softmax(dim=-1).cpu().numpy())


@torch.no_grad()
def predict_logits(model, tokenizer, texts: list[str], settings: Settings) -> torch.Tensor:
    model.eval()
    chunks = []
    for start in range(0, len(texts), 64):
        batch = tokenizer(
            texts[start : start + 64],
            padding=True,
            truncation=True,
            max_length=settings.max_length,
            return_tensors="pt",
        ).to(device())
        chunks.append(model(**batch).logits.float().cpu())
    return torch.cat(chunks)


def load_pretrained(name: str, **options):
    """A model in float32, whatever precision its checkpoint stores. Since
    version 5, transformers keeps a checkpoint's dtype, and DeBERTa-v3's is
    float16, in which AdamW's epsilon rounds to zero and the first update
    turns the weights to NaN (2026-11-25)."""
    model = AutoModelForSequenceClassification.from_pretrained(name, dtype=torch.float32, **options)
    dtypes = {parameter.dtype for parameter in model.parameters()}
    if dtypes != {torch.float32}:
        raise ValueError(f"{name} loaded as {sorted(map(str, dtypes))}, not float32")
    return model


def revision_of(name: str, model=None) -> str | None:
    """The pretrained model's commit on Hugging Face: from the model when it
    says, else from the local cache's record of the revision it downloaded."""
    revision = getattr(getattr(model, "config", None), "_commit_hash", None)
    if revision:
        return revision
    ref = Path(constants.HF_HUB_CACHE) / f"models--{name.replace('/', '--')}" / "refs" / "main"
    return ref.read_text().strip() if ref.exists() else None


def predict_probabilities(checkpoint: str, texts: list[str], max_length: int = 96) -> np.ndarray:
    """Class probabilities for detokenized texts from a kept checkpoint."""
    path = ML_ROOT.parent / checkpoint
    tokenizer = AutoTokenizer.from_pretrained(path)
    model = load_pretrained(str(path)).to(device())
    settings = Settings(str(path), 0, 0.0, 64, max_length, 0.0, 0.0, SEED)
    probabilities = predict_logits(model, tokenizer, texts, settings).softmax(dim=-1).numpy()
    del model
    if device().type == "mps":
        torch.mps.empty_cache()
    return probabilities


def predict_levels(checkpoint: str, texts: list[str], decision: str, max_length: int = 96) -> np.ndarray:
    """Levels for detokenized texts from a kept checkpoint, read with the
    decision rule chosen on the validation split."""
    return level_decisions(predict_probabilities(checkpoint, texts, max_length))[decision]


def train(settings: Settings, run: str, date: str) -> dict:
    # Recorded before training, so edits made while it runs are not mistaken
    # for the code that ran.
    code = provenance()
    seed_everything(settings.seed)
    train_rows = corpus.load("train")
    dev_rows = corpus.load("dev")
    train_texts = [detokenize(s.text) for s in train_rows]
    dev_texts = [detokenize(s.text) for s in dev_rows]
    targets = soft_targets(train_rows)
    weights = (
        None
        if settings.class_weight_alpha is None
        else torch.tensor(class_weights(train_rows, settings.class_weight_alpha), dtype=torch.float32)
    )

    tokenizer = AutoTokenizer.from_pretrained(settings.model)
    model = load_pretrained(settings.model, num_labels=len(LEVELS)).to(device())
    pretrained_revision = revision_of(settings.model, model)

    optimizer = torch.optim.AdamW(
        model.parameters(), lr=settings.learning_rate, weight_decay=settings.weight_decay
    )
    steps_per_epoch = -(-len(train_texts) // settings.batch_size)
    schedule = get_linear_schedule_with_warmup(
        optimizer,
        int(settings.warmup * steps_per_epoch * settings.epochs),
        steps_per_epoch * settings.epochs,
    )
    order = torch.Generator().manual_seed(settings.seed)

    epochs = []
    best: dict | None = None
    for epoch in range(1, settings.epochs + 1):
        model.train()
        started = time.time()
        permutation = torch.randperm(len(train_texts), generator=order).tolist()
        total_loss = 0.0
        part_size = -(-settings.batch_size // settings.accumulate)
        for start in range(0, len(permutation), settings.batch_size):
            index = permutation[start : start + settings.batch_size]
            for part_start in range(0, len(index), part_size):
                part = index[part_start : part_start + part_size]
                batch = tokenizer(
                    [train_texts[i] for i in part],
                    padding=True,
                    truncation=True,
                    max_length=settings.max_length,
                    return_tensors="pt",
                ).to(device())
                logits = model(**batch).logits
                loss = part_loss(
                    logits,
                    targets[part].to(device()),
                    None if weights is None else weights.to(device()),
                    len(index),
                )
                loss.backward()
                total_loss += float(loss.detach()) * len(index)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            schedule.step()
            optimizer.zero_grad()

        dev_logits = predict_logits(model, tokenizer, dev_texts, settings)
        if device().type == "mps":
            torch.mps.empty_cache()
        dev = {name: scores(levels, dev_rows) for name, levels in decisions(dev_logits).items()}
        entry = {
            "epoch": epoch,
            "train_loss": total_loss / len(train_texts),
            "seconds": round(time.time() - started, 1),
            "dev": dev,
        }
        epochs.append(entry)
        print(
            f"epoch {epoch}: loss {entry['train_loss']:.4f}, "
            + ", ".join(
                f"{name}: either {values['either']:.3f} paper F1 {values['macro_f1_paper']:.3f} "
                f"qwk {values['qwk']:.3f}"
                for name, values in dev.items()
            )
            + f" ({entry['seconds']}s)",
            flush=True,
        )
        for name, values in dev.items():
            key = (values[settings.select], values["qwk"])
            if best is None or key > best["key"]:
                best = {"key": key, "epoch": epoch, "decision": name, "dev": values}
                target = CHECKPOINTS / run
                target.mkdir(parents=True, exist_ok=True)
                model.save_pretrained(target)
                tokenizer.save_pretrained(target)

    assert best is not None
    result = {
        "date": date,
        "run": run,
        "settings": asdict(settings),
        "pretrained": {"model": settings.model, "revision": pretrained_revision},
        "device": str(device()),
        "provenance": code,
        "packages": {"torch": torch.__version__, "transformers": __import__("transformers").__version__},
        "class_weights": None if weights is None else [round(float(w), 4) for w in weights],
        "epochs": epochs,
        "chosen": {
            "epoch": best["epoch"],
            "decision": best["decision"],
            "select": settings.select,
            "dev": best["dev"],
        },
        "checkpoint": f"ml/checkpoints/{run}",
    }
    reports = ML_ROOT / "reports"
    reports.mkdir(exist_ok=True)
    (reports / f"{date}-transformer-dev-{run}.json").write_text(json.dumps(result, indent=2) + "\n")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--model", default="distilroberta-base")
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=3e-5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--max-length", type=int, default=96)
    parser.add_argument("--alpha", type=float, help="weight each level's loss, as newslingo_ml.weighting")
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--select", choices=SELECT_METRICS, default="either")
    parser.add_argument(
        "--accumulate", type=int, default=1, help="run each batch in this many parts, to save memory"
    )
    parser.add_argument("--date", default=datetime.date.today().isoformat())
    args = parser.parse_args()

    settings = Settings(
        model=args.model,
        epochs=args.epochs,
        learning_rate=args.learning_rate,
        batch_size=args.batch_size,
        max_length=args.max_length,
        warmup=0.06,
        weight_decay=0.01,
        seed=args.seed,
        class_weight_alpha=args.alpha,
        select=args.select,
        accumulate=args.accumulate,
    )
    run = f"{settings.model.split('/')[-1]}-lr{settings.learning_rate:g}-e{settings.epochs}"
    if settings.class_weight_alpha is not None:
        run += f"-w{settings.class_weight_alpha:g}"
    if settings.seed != SEED:
        run += f"-s{settings.seed}"
    result = train(settings, run, args.date)
    chosen = result["chosen"]
    print(
        f"\nKept epoch {chosen['epoch']} ({chosen['decision']}, chosen by {chosen['select']}): either "
        f"{chosen['dev']['either']:.3f}, paper macro-F1 {chosen['dev']['macro_f1_paper']:.3f}, "
        f"exact {chosen['dev']['exact']:.3f}, QWK {chosen['dev']['qwk']:.3f}. The test split was not read."
    )


if __name__ == "__main__":
    main()
