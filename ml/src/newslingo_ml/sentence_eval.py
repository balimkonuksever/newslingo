"""Trains the sentence-level CEFR classifier and writes its evaluation report.

    python -I -m newslingo_ml.sentence_eval

Candidates are compared on the validation split only, and the best is chosen
before the test split is read. The test split is then scored once, for the
chosen candidate and the two baselines. Writes ml/reports/<date>-sentence-level.md
and .json, and the chosen model to ml/models/cefr-sentence.json.
"""

import argparse
import datetime
import json
import platform
import subprocess
from collections import Counter
from dataclasses import dataclass
from importlib import metadata

import numpy as np
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.preprocessing import StandardScaler

from newslingo_ml import corpus
from newslingo_ml.corpus import LEVEL_NAMES, LEVELS, ML_ROOT, Sentence
from newslingo_ml.features import (
    FEATURE_NAMES,
    WordLevels,
    fk_grade,
    matrix,
    out_of_fold_matrix,
    sentence_words,
)
from newslingo_ml.metrics import annotator_agreement, bootstrap_interval, confusion, scores

SEED = 20261104
SMOOTHING = (2.0, 5.0, 10.0, 20.0)
LOGISTIC_C = (0.03, 0.1, 0.3, 1.0, 3.0)
RIDGE_ALPHA = (0.1, 1.0, 10.0)
MODEL_VERSION = "cefr-sentence-1"
INTERVAL_METRICS = ("either", "exact", "adjacent")


def round_levels(values: np.ndarray) -> np.ndarray:
    # Half up, as JavaScript's Math.round does, so Node gives the same levels.
    return np.clip(np.floor(values + 0.5), 1, 6).astype(int)


@dataclass
class Candidate:
    kind: str
    smoothing: float
    strength: float
    model: LogisticRegression | Ridge
    scaler: StandardScaler
    table: WordLevels
    dev: dict[str, float]

    @property
    def name(self) -> str:
        knob = "C" if self.kind == "logistic" else "alpha"
        return f"{self.kind} (smoothing {self.smoothing:g}, {knob} {self.strength:g})"

    def predict(self, rows: np.ndarray) -> np.ndarray:
        scaled = self.scaler.transform(rows)
        if self.kind == "logistic":
            return self.model.predict(scaled).astype(int)
        return round_levels(self.model.predict(scaled))


def candidates(
    words: dict[str, list[list[str]]],
    data: dict[str, list[Sentence]],
) -> list[Candidate]:
    high = np.array([s.high for s in data["train"]])
    mean = np.array([s.mean for s in data["train"]])
    found = []
    for smoothing in SMOOTHING:
        train_rows = out_of_fold_matrix(words["train"], mean, smoothing, SEED)
        table = WordLevels.fit(words["train"], mean, smoothing)
        dev_rows = matrix(words["dev"], table)
        scaler = StandardScaler().fit(train_rows)
        scaled = scaler.transform(train_rows)
        models: list[tuple[str, float, LogisticRegression | Ridge]] = [
            ("logistic", c, LogisticRegression(C=c, max_iter=5000).fit(scaled, high))
            for c in LOGISTIC_C
        ] + [("ridge", alpha, Ridge(alpha=alpha).fit(scaled, mean)) for alpha in RIDGE_ALPHA]
        for kind, strength, model in models:
            candidate = Candidate(kind, smoothing, strength, model, scaler, table, {})
            candidate.dev = scores(candidate.predict(dev_rows), data["dev"])
            found.append(candidate)
    return found


def provenance() -> dict:
    def git(*args: str) -> str:
        return subprocess.run(
            ["git", *args], cwd=ML_ROOT, capture_output=True, text=True, check=True
        ).stdout.strip()

    return {
        "commit": git("rev-parse", "HEAD"),
        "uncommitted_changes_in_ml": bool(git("status", "--porcelain", "--", ".")),
        "python": platform.python_version(),
        "packages": {name: metadata.version(name) for name in ("numpy", "scikit-learn", "scipy")},
    }


def export(best: Candidate, date: str, manifest: dict) -> dict:
    model = best.model
    weights = (
        {"classes": model.classes_.tolist(), "coef": model.coef_.tolist(), "intercept": model.intercept_.tolist()}
        if best.kind == "logistic"
        else {"coef": model.coef_.tolist(), "intercept": float(model.intercept_)}
    )
    return {
        "version": MODEL_VERSION,
        "trained": date,
        "seed": SEED,
        "data": {
            "name": manifest["name"],
            "source": manifest["source"],
            "revision": manifest["revision"],
            "trainSha256": manifest["files"]["train"]["sha256"],
            "licence": "Word levels derive from CEFR-SP (Arase et al., 2022), CC BY-SA 3.0.",
        },
        "kind": best.kind,
        "features": list(FEATURE_NAMES),
        "scaler": {"mean": best.scaler.mean_.tolist(), "scale": best.scaler.scale_.tolist()},
        **weights,
        "smoothing": best.smoothing,
        "globalMean": best.table.global_mean,
        "wordLevels": {w: round(v, 4) for w, v in sorted(best.table.levels.items())},
    }


def percent(value: float) -> str:
    return f"{100 * value:.1f}%"


def score_row(name: str, values: dict[str, float], intervals: dict | None = None) -> str:
    def cell(metric: str) -> str:
        text = percent(values[metric])
        if intervals and metric in intervals:
            low, high = intervals[metric]
            text += f" ({percent(low)}–{percent(high)})"
        return text

    return (
        f"| {name} | {cell('either')} | {cell('exact')} | {cell('adjacent')} "
        f"| {values['mae']:.2f} | {values['macro_f1']:.3f} | {values['qwk']:.3f} |"
    )


SCORE_HEADER = (
    "| Model | Either annotator | Exact | Within one level | MAE | Macro-F1 | QWK |\n"
    "|---|---|---|---|---|---|---|"
)


def report(result: dict) -> str:
    lines = [
        f"# CEFR sentence classifier: sentence-level evaluation, {result['date']}",
        "",
        "Written by `python -I -m newslingo_ml.sentence_eval`. Do not edit by hand; rerun it.",
        "",
        "## Setup",
        "",
        f"- Data: {result['data']['name']}, revision `{result['data']['revision']}`, "
        f"{result['data']['licence']}. Card: `ml/datasets/cefr-sp.md`.",
        "- Gold level: the higher of the two annotators' levels. *Either annotator* counts a "
        "prediction as right when it matches one of them.",
        "- Selection: every candidate was scored on the validation split only, and the best by "
        "either-annotator accuracy (ties broken by QWK) was chosen before the test split was read. "
        "The test split was scored once, for the chosen model and the baselines.",
        f"- Seed {result['seed']}. Code at `{result['provenance']['commit']}`"
        + (" with uncommitted changes in `ml/`" if result["provenance"]["uncommitted_changes_in_ml"] else "")
        + f". Python {result['provenance']['python']}, "
        + ", ".join(f"{k} {v}" for k, v in result["provenance"]["packages"].items())
        + ".",
        "- Intervals are 95% bootstrap intervals over test sentences (1,000 resamples).",
        "",
        "## Data",
        "",
        "| Split | Sentences | " + " | ".join(LEVEL_NAMES[level] for level in LEVELS) + " |",
        "|---|---|" + "---|" * len(LEVELS),
    ]
    for split, counts in result["distribution"].items():
        lines.append(
            f"| {split} | {sum(counts.values())} | "
            + " | ".join(str(counts.get(str(level), 0)) for level in LEVELS)
            + " |"
        )
    human = result["annotator_agreement_test"]
    lines += [
        "",
        "Levels are each sentence's gold (higher) level.",
        "",
        "## Human reference",
        "",
        f"On the test split the two annotators give the same level for {percent(human['exact'])} "
        f"of sentences and are within one level for {percent(human['adjacent'])}; their QWK is "
        f"{human['qwk']:.3f}.",
        "",
        "## Test split",
        "",
        SCORE_HEADER,
    ]
    for name, entry in result["test"].items():
        lines.append(score_row(name, entry["scores"], entry["intervals"]))
    lines += [
        "",
        f"Chosen model: {result['chosen']}. Majority class: {LEVEL_NAMES[result['majority_level']]}.",
        "",
        "### Confusion matrix of the chosen model on the test split",
        "",
        "Rows are gold levels, columns predicted levels.",
        "",
        "| Gold | " + " | ".join(LEVEL_NAMES[level] for level in LEVELS) + " |",
        "|---|" + "---|" * len(LEVELS),
    ]
    for level, row in zip(LEVELS, result["confusion_test"], strict=True):
        lines.append(f"| {LEVEL_NAMES[level]} | " + " | ".join(str(n) for n in row) + " |")
    lines += ["", "## Validation split, every candidate", "", SCORE_HEADER]
    for name, values in result["dev"].items():
        lines.append(score_row(name, values))
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
    parser.add_argument("--date", default=datetime.date.today().isoformat())
    args = parser.parse_args()

    manifest = corpus.load_manifest()
    # The test split is loaded, and its digest checked, only after selection.
    data = {split: corpus.load(split) for split in ("train", "dev")}
    words = {split: [sentence_words(s.text) for s in data[split]] for split in data}

    train_high = [s.high for s in data["train"]]
    majority_level = int(Counter(train_high).most_common(1)[0][0])

    def grade(split: str) -> np.ndarray:
        return np.array([[fk_grade(sentence)] for sentence in words[split]])

    readability = LogisticRegression(max_iter=5000).fit(grade("train"), train_high)

    found = candidates(words, data)
    best = max(found, key=lambda c: (c.dev["either"], c.dev["qwk"]))
    dev_scores = {
        "Majority class": scores(np.full(len(data["dev"]), majority_level), data["dev"]),
        "Readability (Flesch–Kincaid)": scores(readability.predict(grade("dev")), data["dev"]),
        **{c.name: c.dev for c in found},
    }

    data["test"] = corpus.load("test")
    words["test"] = [sentence_words(s.text) for s in data["test"]]
    predictions = {
        "Majority class": np.full(len(data["test"]), majority_level),
        "Readability (Flesch–Kincaid)": readability.predict(grade("test")),
        best.name: best.predict(matrix(words["test"], best.table)),
    }
    test = {
        name: {
            "scores": scores(predicted, data["test"]),
            "intervals": {
                metric: bootstrap_interval(predicted, data["test"], metric, SEED)
                for metric in INTERVAL_METRICS
            },
        }
        for name, predicted in predictions.items()
    }

    result = {
        "date": args.date,
        "seed": SEED,
        "model_version": MODEL_VERSION,
        "data": {
            "name": manifest["name"],
            "revision": manifest["revision"],
            "licence": manifest["licence"],
            "sha256": {split: entry["sha256"] for split, entry in manifest["files"].items()},
        },
        "provenance": provenance(),
        "distribution": {
            split: {str(k): v for k, v in sorted(Counter(s.high for s in rows).items())}
            for split, rows in data.items()
        },
        "majority_level": majority_level,
        "annotator_agreement_test": annotator_agreement(data["test"]),
        "chosen": best.name,
        "dev": dev_scores,
        "test": test,
        "confusion_test": confusion(predictions[best.name], data["test"]),
    }

    reports = ML_ROOT / "reports"
    models = ML_ROOT / "models"
    reports.mkdir(exist_ok=True)
    models.mkdir(exist_ok=True)
    (reports / f"{args.date}-sentence-level.json").write_text(json.dumps(result, indent=2) + "\n")
    (reports / f"{args.date}-sentence-level.md").write_text(report(result))
    (models / "cefr-sentence.json").write_text(
        json.dumps(export(best, args.date, manifest), ensure_ascii=False) + "\n"
    )
    print(report(result))


if __name__ == "__main__":
    main()
