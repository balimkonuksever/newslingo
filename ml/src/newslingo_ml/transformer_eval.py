"""Scores the chosen transformer on the test split, once, beside the baselines.

    python -I -m newslingo_ml.transformer_eval reports/<date>-transformer-dev-<run>.json

The run's epoch and decision rule were chosen on the validation split by
newslingo_ml.transformer; nothing here chooses anything. The test split is
read once, for the transformer, the light model sentence_eval chooses, and the
two baselines. Writes ml/reports/<date>-transformer.md and .json.
"""

import argparse
import datetime
import json
from collections import Counter

import numpy as np
import torch
from sklearn.linear_model import LogisticRegression

from newslingo_ml import corpus
from newslingo_ml.corpus import LEVEL_NAMES, LEVELS, ML_ROOT
from newslingo_ml.features import fk_grade, sentence_words
from newslingo_ml.metrics import annotator_agreement, bootstrap_interval, confusion, scores
from newslingo_ml.sentence_eval import (
    INTERVAL_METRICS,
    SCORE_HEADER,
    SEED,
    candidates,
    percent,
    provenance,
    score_row,
)
from newslingo_ml.text import detokenize
from newslingo_ml.transformer import predict_levels


def paired_difference(
    first: np.ndarray, second: np.ndarray, sentences: list, seed: int, resamples: int = 1000
) -> tuple[float, float, float]:
    """The difference in either-annotator accuracy, first minus second, with a
    95% interval from resampling the same sentences for both."""
    a = np.array([s.level_a for s in sentences])
    b = np.array([s.level_b for s in sentences])
    right_first = (first == a) | (first == b)
    right_second = (second == a) | (second == b)
    difference = right_first.astype(float) - right_second.astype(float)
    rng = np.random.default_rng(seed)
    means = [difference[rng.integers(0, len(difference), len(difference))].mean() for _ in range(resamples)]
    low, high = np.percentile(means, [2.5, 97.5])
    return float(difference.mean()), float(low), float(high)


def report(result: dict) -> str:
    run = result["run"]
    chosen = run["chosen"]
    settings = run["settings"]
    lines = [
        f"# CEFR sentence classifier: a fine-tuned transformer, {result['date']}",
        "",
        "Written by `python -I -m newslingo_ml.transformer_eval`. Do not edit by hand; rerun it.",
        "",
        "## Setup",
        "",
        f"- Data: CEFR-SP, Wiki-Auto subset, revision `{result['data_revision']}`, CC BY-SA 3.0. "
        "Card: `ml/datasets/cefr-sp.md`. Gold level and metrics as in the sentence-level report.",
        f"- Model: `{settings['model']}` (revision `{run['pretrained']['revision']}`), fine-tuned on the "
        f"training split by `python -I -m newslingo_ml.transformer` for {settings['epochs']} epochs: "
        f"learning rate {settings['learning_rate']:g}, batch {settings['batch_size']}, "
        f"warm-up {settings['warmup']:g}, weight decay {settings['weight_decay']:g}, seed {settings['seed']}. "
        "Each sentence's target puts half its weight on each annotator's level.",
        f"- Selection: the epoch and the decision rule were chosen on the validation split only: epoch "
        f"{chosen['epoch']}, reading the level as the model's {chosen['decision']} level. The test split "
        "was then read once, for this model, the light model and the two baselines.",
        f"- The light model is the one `newslingo_ml.sentence_eval` chooses: {result['light_model']}. Its "
        "test scores repeat those of the sentence-level report of 2026-11-04.",
        f"- Training code at `{run['provenance']['commit']}`"
        + (" with uncommitted changes in `ml/`" if run["provenance"]["uncommitted_changes_in_ml"] else "")
        + f"; this report's code at `{result['provenance']['commit']}`"
        + (" with uncommitted changes in `ml/`" if result["provenance"]["uncommitted_changes_in_ml"] else "")
        + f". Trained on `{run['device']}` with torch {run['packages']['torch']} and transformers "
        f"{run['packages']['transformers']}. Training on Apple's MPS is not bit-for-bit "
        "deterministic, so a rerun can differ slightly.",
        "- Intervals are 95% bootstrap intervals over test sentences (1,000 resamples).",
        "",
        "## Human reference",
        "",
        f"On the test split the two annotators give the same level for "
        f"{percent(result['human']['exact'])} of sentences and are within one level for "
        f"{percent(result['human']['adjacent'])}; their QWK is {result['human']['qwk']:.3f}.",
        "",
        "## Test split",
        "",
        SCORE_HEADER,
    ]
    for name, entry in result["test"].items():
        lines.append(score_row(name, entry["scores"], entry["intervals"]))
    difference, low, high = result["difference_vs_light"]
    lines += [
        "",
        f"The transformer matches an annotator on {100 * difference:+.1f} points more test sentences "
        f"than the light model (paired 95% interval {100 * low:+.1f} to {100 * high:+.1f}).",
        "",
        "### Confusion matrix of the transformer on the test split",
        "",
        "Rows are gold levels, columns predicted levels.",
        "",
        "| Gold | " + " | ".join(LEVEL_NAMES[level] for level in LEVELS) + " |",
        "|---|" + "---|" * len(LEVELS),
    ]
    for level, row in zip(LEVELS, result["confusion_test"], strict=True):
        lines.append(f"| {LEVEL_NAMES[level]} | " + " | ".join(str(n) for n in row) + " |")
    lines += [
        "",
        "## Validation split, every epoch",
        "",
        "| Epoch | Decision | Either annotator | Exact | Within one level | QWK |",
        "|---|---|---|---|---|---|",
    ]
    for epoch in run["epochs"]:
        for decision, values in epoch["dev"].items():
            lines.append(
                f"| {epoch['epoch']} | {decision} | {percent(values['either'])} | "
                f"{percent(values['exact'])} | {percent(values['adjacent'])} | {values['qwk']:.3f} |"
            )
    lines += [
        "",
        "## Not yet measured",
        "",
        "- A zero-shot LLM on a seeded sample of the test split (ML roadmap item 1).",
        "- Article-level accuracy on texts the user labels (milestone C).",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("run_report", help="the dev report newslingo_ml.transformer wrote")
    parser.add_argument("--date", default=datetime.date.today().isoformat())
    args = parser.parse_args()

    run = json.loads((ML_ROOT / args.run_report).read_text())
    manifest = corpus.load_manifest()
    data = {split: corpus.load(split) for split in ("train", "dev")}
    words = {split: [sentence_words(s.text) for s in data[split]] for split in data}

    # The light model and the baselines, chosen exactly as sentence_eval does.
    train_high = [s.high for s in data["train"]]
    majority_level = int(Counter(train_high).most_common(1)[0][0])
    readability = LogisticRegression(max_iter=5000).fit(
        np.array([[fk_grade(s)] for s in words["train"]]), train_high
    )
    light = max(
        (c for c in candidates(words, data) if c.exportable),
        key=lambda c: (c.dev["either"], c.dev["qwk"]),
    )

    test = corpus.load("test")
    test_words = [sentence_words(s.text) for s in test]
    test_texts = [s.text for s in test]
    predictions = {
        "Majority class": np.full(len(test), majority_level),
        "Readability (Flesch–Kincaid)": readability.predict(
            np.array([[fk_grade(s)] for s in test_words])
        ),
        f"Light model: {light.name}": light.predict(light.rows(test_texts, test_words)),
        f"Transformer: {run['settings']['model']}": predict_levels(
            run["checkpoint"],
            [detokenize(text) for text in test_texts],
            run["chosen"]["decision"],
            run["settings"]["max_length"],
        ),
    }
    transformer_name = f"Transformer: {run['settings']['model']}"
    light_name = f"Light model: {light.name}"

    result = {
        "date": args.date,
        "data_revision": manifest["revision"],
        "provenance": provenance(),
        "torch": torch.__version__,
        "run": run,
        "light_model": light.name,
        "human": annotator_agreement(test),
        "test": {
            name: {
                "scores": scores(predicted, test),
                "intervals": {
                    metric: bootstrap_interval(predicted, test, metric, SEED)
                    for metric in INTERVAL_METRICS
                },
            }
            for name, predicted in predictions.items()
        },
        "difference_vs_light": paired_difference(
            predictions[transformer_name], predictions[light_name], test, SEED
        ),
        "confusion_test": confusion(predictions[transformer_name], test),
    }
    reports = ML_ROOT / "reports"
    (reports / f"{args.date}-transformer.json").write_text(json.dumps(result, indent=2) + "\n")
    (reports / f"{args.date}-transformer.md").write_text(report(result))
    print(report(result))


if __name__ == "__main__":
    main()
