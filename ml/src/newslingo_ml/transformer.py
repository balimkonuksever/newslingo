"""Fine-tunes a small pretrained transformer to read a sentence's CEFR level.

    python -I -m newslingo_ml.transformer [--model distilroberta-base] [--epochs 4]

Trains on the training split and scores the validation split after every
epoch, keeping the epoch with the best either-annotator accuracy (ties broken
by QWK), as sentence_eval chooses among its candidates. The test split is
never read here. The kept weights go to ml/checkpoints/<run>/, which git
ignores, and the validation results to ml/reports/<date>-transformer-dev.json.

Each sentence is trained toward both annotators' levels at once: half the
target on one annotator's level and half on the other's.
"""

import argparse
import datetime
import json
import random
import time
from dataclasses import asdict, dataclass

import numpy as np
import torch
import torch.nn.functional as F
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

CHECKPOINTS = ML_ROOT / "checkpoints"


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


def decisions(logits: torch.Tensor) -> dict[str, np.ndarray]:
    """Two ways to read a level off the model: its most likely class, and its
    expected level rounded half up, as sentence_eval rounds."""
    probabilities = logits.softmax(dim=-1).cpu().numpy()
    expected = probabilities @ np.arange(1, len(LEVELS) + 1)
    return {
        "most likely": probabilities.argmax(axis=1) + 1,
        "expected": np.clip(np.floor(expected + 0.5), 1, 6).astype(int),
    }


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


def predict_levels(checkpoint: str, texts: list[str], decision: str, max_length: int = 96) -> np.ndarray:
    """Levels for detokenized texts from a kept checkpoint, read with the
    decision rule chosen on the validation split."""
    path = ML_ROOT.parent / checkpoint
    tokenizer = AutoTokenizer.from_pretrained(path)
    model = AutoModelForSequenceClassification.from_pretrained(path).to(device())
    settings = Settings(str(path), 0, 0.0, 64, max_length, 0.0, 0.0, SEED)
    return decisions(predict_logits(model, tokenizer, texts, settings))[decision]


def train(settings: Settings, run: str, date: str) -> dict:
    seed_everything(settings.seed)
    train_rows = corpus.load("train")
    dev_rows = corpus.load("dev")
    train_texts = [detokenize(s.text) for s in train_rows]
    dev_texts = [detokenize(s.text) for s in dev_rows]
    targets = soft_targets(train_rows)

    tokenizer = AutoTokenizer.from_pretrained(settings.model)
    model = AutoModelForSequenceClassification.from_pretrained(
        settings.model, num_labels=len(LEVELS)
    ).to(device())
    pretrained_revision = getattr(model.config, "_commit_hash", None)

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
        for start in range(0, len(permutation), settings.batch_size):
            index = permutation[start : start + settings.batch_size]
            batch = tokenizer(
                [train_texts[i] for i in index],
                padding=True,
                truncation=True,
                max_length=settings.max_length,
                return_tensors="pt",
            ).to(device())
            logits = model(**batch).logits
            loss = F.cross_entropy(logits, targets[index].to(device()))
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            schedule.step()
            optimizer.zero_grad()
            total_loss += float(loss) * len(index)

        dev_logits = predict_logits(model, tokenizer, dev_texts, settings)
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
                f"{name}: either {values['either']:.3f} qwk {values['qwk']:.3f}"
                for name, values in dev.items()
            )
            + f" ({entry['seconds']}s)",
            flush=True,
        )
        for name, values in dev.items():
            key = (values["either"], values["qwk"])
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
        "provenance": provenance(),
        "packages": {"torch": torch.__version__, "transformers": __import__("transformers").__version__},
        "epochs": epochs,
        "chosen": {"epoch": best["epoch"], "decision": best["decision"], "dev": best["dev"]},
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
        seed=SEED,
    )
    run = f"{settings.model.split('/')[-1]}-lr{settings.learning_rate:g}-e{settings.epochs}"
    result = train(settings, run, args.date)
    chosen = result["chosen"]
    print(
        f"\nKept epoch {chosen['epoch']} ({chosen['decision']}): either "
        f"{chosen['dev']['either']:.3f}, exact {chosen['dev']['exact']:.3f}, "
        f"QWK {chosen['dev']['qwk']:.3f}. The test split was not read."
    )


if __name__ == "__main__":
    main()
