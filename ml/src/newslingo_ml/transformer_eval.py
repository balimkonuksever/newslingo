"""Scores the chosen transformer, alone or averaged over several runs, on the
test split once, beside the transformer it replaces and the baselines.

    python -I -m newslingo_ml.transformer_eval CHOSEN [--previous PREVIOUS]
        [--candidate REPORT ...] [--select either|macro_f1_paper]
        [--not-below either|macro_f1_paper] [--dev-only]

CHOSEN is the validation report of the model chosen on the validation split:
one run from newslingo_ml.transformer or an average from
newslingo_ml.ensemble. --candidate names the other validation reports it was
compared with, and --previous the transformer it replaces. Every one of them
is scored again on the validation split, and the script stops unless CHOSEN
has the best --select metric (ties broken by QWK): nothing here chooses
anything. With --not-below, only candidates at least as good as PREVIOUS on
that metric count, and CHOSEN must also beat PREVIOUS on --select. The test
split is then read once, for the chosen model, the previous one, the light
model sentence_eval chooses and the two baselines. Writes
ml/reports/<date>-transformer.md and .json. With --dev-only it prints the
validation scores, writes them with each candidate's paired difference from
PREVIOUS and the rule's verdict to ml/reports/<date>-transformer-dev-selection.json,
and stops before the test split.
"""

import argparse
import datetime
import json
from collections import Counter
from dataclasses import dataclass

import numpy as np
import torch
from sklearn.linear_model import LogisticRegression

from newslingo_ml import corpus
from newslingo_ml.corpus import LEVEL_NAMES, LEVELS, ML_ROOT, Sentence
from newslingo_ml.ensemble import average_probabilities
from newslingo_ml.features import fk_grade, sentence_words
from newslingo_ml.metrics import annotator_agreement, bootstrap_interval, confusion, level_f1, scores
from newslingo_ml.sentence_eval import SEED, Candidate, candidates, percent, provenance
from newslingo_ml.text import detokenize
from newslingo_ml.transformer import SELECT_METRICS, level_decisions, revision_of

LICENCES = {
    "distilroberta-base": "Apache 2.0",
    "FacebookAI/roberta-base": "MIT",
    "answerdotai/ModernBERT-base": "Apache 2.0",
    "microsoft/deberta-v3-base": "MIT",
}
INTERVAL_METRICS = ("either", "macro_f1_paper", "exact", "adjacent")
SELECT_LABELS = {"either": "either-annotator accuracy", "macro_f1_paper": "paper's macro-F1"}
# Arase et al. (2022), Table 6: BERT-base fine-tuned on all of CEFR-SP and
# scored on its whole test set, mean of 10 runs, per-level F1 the paper's way.
PAPER_TABLE_6 = {
    "BERT, no loss weights": (12.8, 83.6, 87.0, 86.7, 82.9, 76.8, 71.7),
    "BERT with loss weights": (72.7, 82.7, 85.5, 86.4, 84.9, 83.6, 82.5),
    "Prototypes with loss weights (the paper's model)": (78.0, 81.4, 86.5, 85.9, 85.4, 89.7, 84.5),
}


def load_model(path: str) -> dict:
    """A validation report as a model to score: its members (one for a run),
    the decision rule chosen for it, and a name for the report."""
    report = json.loads((ML_ROOT / path).read_text())
    if "members" in report:
        members = report["members"]
    else:
        members = [
            {
                "report": path,
                "run": report["run"],
                "checkpoint": report["checkpoint"],
                "max_length": report["settings"]["max_length"],
                "settings": report["settings"],
                "pretrained": report["pretrained"],
                "epoch": report["chosen"]["epoch"],
            }
        ]
    if len(members) == 1:
        settings = members[0]["settings"]
        name = settings["model"]
        if settings.get("class_weight_alpha") is not None:
            name += f", class weights α {settings['class_weight_alpha']:g}"
    else:
        models = Counter(m["settings"]["model"] for m in members)
        name = f"average of {len(members)} runs (" + ", ".join(f"{n} × {m}" for m, n in models.items()) + ")"
    return {
        "report": path,
        "name": name,
        "members": members,
        "decision": report["chosen"]["decision"],
        "provenance": report["provenance"],
        "date": report["date"],
    }


def predict(model: dict, texts: list[str]) -> np.ndarray:
    return level_decisions(average_probabilities(model["members"], texts))[model["decision"]]


@dataclass
class References:
    """The majority class, the readability baseline and the light model, fit
    and chosen on the training and validation splits exactly as sentence_eval
    does, so a report can put them beside a model on the test split."""

    majority_level: int
    readability: LogisticRegression
    light: Candidate

    @classmethod
    def fit(cls) -> "References":
        data = {split: corpus.load(split) for split in ("train", "dev")}
        words = {split: [sentence_words(s.text) for s in data[split]] for split in data}
        train_high = [s.high for s in data["train"]]
        readability = LogisticRegression(max_iter=5000).fit(
            np.array([[fk_grade(s)] for s in words["train"]]), train_high
        )
        light = max(
            (c for c in candidates(words, data) if c.exportable),
            key=lambda c: (c.dev["either"], c.dev["qwk"]),
        )
        return cls(int(Counter(train_high).most_common(1)[0][0]), readability, light)

    @property
    def light_name(self) -> str:
        return f"Light model: {self.light.name}"

    def predict(self, sentences: list[Sentence]) -> dict[str, np.ndarray]:
        words = [sentence_words(s.text) for s in sentences]
        return {
            "Majority class": np.full(len(sentences), self.majority_level),
            "Readability (Flesch–Kincaid)": self.readability.predict(
                np.array([[fk_grade(s)] for s in words])
            ),
            self.light_name: self.light.predict(self.light.rows([s.text for s in sentences], words)),
        }


def selection_problem(validation: list[dict], select: str, not_below: str | None = None) -> str | None:
    """Why the chosen model may not go on to the test split, or None if it may.

    Each entry holds a model's validation scores and whether it is the chosen
    or the previous model. The chosen one needs the best `select` metric (ties
    broken by QWK). With `not_below`, only models whose `not_below` metric is
    at least the previous model's count, and the chosen one must also beat the
    previous model on `select`, so a switch never trades one metric for the
    other."""

    def key(entry: dict) -> tuple[float, float]:
        return (entry["scores"][select], entry["scores"]["qwk"])

    chosen = next(entry for entry in validation if entry["chosen"])
    eligible = validation
    if not_below:
        previous = next((entry for entry in validation if entry.get("previous")), None)
        if previous is None:
            return f"--not-below {not_below} needs the model it compares with: name it with --previous."
        floor = previous["scores"][not_below]
        eligible = [entry for entry in validation if entry["scores"][not_below] >= floor]
        if chosen not in eligible:
            return f"{chosen['report']} has a lower {not_below} than {previous['report']} on the validation split."
        if chosen["scores"][select] <= previous["scores"][select]:
            return f"{chosen['report']} does not beat {previous['report']} on {select} on the validation split."
    best = max(eligible, key=key)
    if key(chosen) < key(best):
        return (
            f"{chosen['report']} is not the best candidate on the validation split by {select}: "
            f"{best['report']} is."
        )
    return None


def paired_difference(
    first: np.ndarray, second: np.ndarray, sentences: list, metric: str, seed: int, resamples: int = 1000
) -> tuple[float, float, float]:
    """One metric, first minus second, with a 95% interval from resampling the
    same sentences for both."""
    observed = scores(first, sentences)[metric] - scores(second, sentences)[metric]
    rng = np.random.default_rng(seed)
    count = len(sentences)
    values = []
    for _ in range(resamples):
        index = rng.integers(0, count, count)
        subset = [sentences[i] for i in index]
        values.append(scores(first[index], subset)[metric] - scores(second[index], subset)[metric])
    low, high = np.percentile(values, [2.5, 97.5])
    return float(observed), float(low), float(high)


def cell(values: dict, intervals: dict, metric: str) -> str:
    text = percent(values[metric])
    if metric in intervals:
        low, high = intervals[metric]
        text += f" ({percent(low)}–{percent(high)})"
    return text


def model_lines(model: dict) -> list[str]:
    lines = []
    for member in model["members"]:
        settings = member["settings"]
        pretrained = member["pretrained"]["model"]
        revision = member["pretrained"]["revision"] or revision_of(pretrained)
        weights = (
            f", class weights α {settings['class_weight_alpha']:g}"
            if settings.get("class_weight_alpha") is not None
            else ""
        )
        lines.append(
            f"  - `{member['run']}`: `{pretrained}` (revision `{revision}`, {LICENCES[pretrained]}), "
            f"{settings['epochs']} epochs at learning rate {settings['learning_rate']:g}, batch "
            f"{settings['batch_size']}, seed {settings['seed']}{weights}; epoch {member['epoch']} kept "
            f"(`{member['report']}`)."
        )
    return lines


def report(result: dict) -> str:
    chosen, previous = result["chosen"], result["previous"]
    lines = [
        f"# CEFR sentence classifier: {chosen['name']}, {result['date']}",
        "",
        "Written by `python -I -m newslingo_ml.transformer_eval`. Do not edit by hand; rerun it.",
        "",
        "## Setup",
        "",
        f"- Data: CEFR-SP, Wiki-Auto subset, revision `{result['data_revision']}`, CC BY-SA 3.0. "
        "Card: `ml/datasets/cefr-sp.md`. Gold level and metrics as in the sentence-level report.",
        "- The paper's macro-F1 is the metric the CEFR-SP paper reports (Arase et al., 2022): a "
        "prediction that matches either annotator is right, and a miss is scored against whichever "
        "annotator the model matches more often (`metrics.paper_gold`). The other macro-F1 uses the "
        "higher of the two levels.",
        f"- Chosen: {chosen['name']}, read as its {chosen['decision']} level, from "
        f"`{chosen['report']}`:",
        *model_lines(chosen),
        f"- Selection: every candidate below was scored on the validation split, and the chosen one "
        f"has the best {SELECT_LABELS[result['select']]} (ties broken by QWK)"
        + (
            f" among those whose {SELECT_LABELS[result['not_below']]} is not below the previous transformer's, "
            f"and beats the previous transformer's {SELECT_LABELS[result['select']]}"
            if result.get("not_below")
            else ""
        )
        + ". The test split was then read for the chosen model, the previous transformer, the light model and "
        "the two baselines.",
    ]
    if previous:
        lines += [
            f"- Previous transformer: {previous['name']}, read as its {previous['decision']} level, from "
            f"`{previous['report']}` (reported on {previous['date']}).",
        ]
    lines += [
        f"- The light model is the one `newslingo_ml.sentence_eval` chooses: {result['light_model']}.",
        f"- This report's code is at `{result['provenance']['commit']}`"
        + (" with uncommitted changes in `ml/`" if result["provenance"]["uncommitted_changes_in_ml"] else "")
        + ". Training on Apple's MPS is not bit-for-bit deterministic, so a rerun can differ slightly.",
        *(
            [
                f"- This Markdown was rendered from the report's JSON by the code at `{result['rendered_by']}`, "
                "without scoring anything again."
            ]
            if "rendered_by" in result
            else []
        ),
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
        "| Model | Either annotator | Paper's macro-F1 | Exact | Within one level | MAE | "
        "Macro-F1, higher level | QWK |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for name, entry in result["test"].items():
        values, intervals = entry["scores"], entry["intervals"]
        lines.append(
            f"| {name} | {cell(values, intervals, 'either')} | {cell(values, intervals, 'macro_f1_paper')} "
            f"| {cell(values, intervals, 'exact')} | {cell(values, intervals, 'adjacent')} "
            f"| {values['mae']:.2f} | {values['macro_f1']:.3f} | {values['qwk']:.3f} |"
        )
    lines.append("")
    for label, (difference, low, high) in result["differences"].items():
        lines.append(
            f"- {label}: {100 * difference:+.1f} points "
            f"(paired 95% interval {100 * low:+.1f} to {100 * high:+.1f})."
        )
    lines += [
        "",
        "### F1 for each level, the paper's way",
        "",
        "| Model | " + " | ".join(LEVEL_NAMES[level] for level in LEVELS) + " | Macro |",
        "|---|" + "---|" * (len(LEVELS) + 1),
    ]
    for name, values in result["level_f1"].items():
        macro = result["test"][name]["scores"]["macro_f1_paper"]
        lines.append(
            f"| {name} | " + " | ".join(percent(values[str(level)]) for level in LEVELS) + f" | {percent(macro)} |"
        )
    lines.append(
        "| Test sentences at each level (higher level) | "
        + " | ".join(str(result["level_counts"][str(level)]) for level in LEVELS)
        + " | |"
    )
    lines += [
        "",
        "For reference, the CEFR-SP paper's Table 6 (Arase et al., 2022). Its models were trained on all "
        "three parts of CEFR-SP and scored on the whole test set, so the numbers are not directly "
        "comparable with those above, which use the Wikipedia part only:",
        "",
        "| Model | " + " | ".join(LEVEL_NAMES[level] for level in LEVELS) + " | Macro |",
        "|---|" + "---|" * (len(LEVELS) + 1),
    ]
    for name, values in PAPER_TABLE_6.items():
        lines.append(f"| {name} | " + " | ".join(f"{value:.1f}%" for value in values) + " |")
    lines += [
        "",
        "### Confusion matrix of the chosen model on the test split",
        "",
        "Rows are gold (higher) levels, columns predicted levels.",
        "",
        "| Gold | " + " | ".join(LEVEL_NAMES[level] for level in LEVELS) + " |",
        "|---|" + "---|" * len(LEVELS),
    ]
    for level, row in zip(LEVELS, result["confusion_test"], strict=True):
        lines.append(f"| {LEVEL_NAMES[level]} | " + " | ".join(str(n) for n in row) + " |")
    lines += [
        "",
        "## Validation split, every candidate",
        "",
        "| Candidate | Decision | Either annotator | Paper's macro-F1 | Exact | QWK | Chosen |",
        "|---|---|---|---|---|---|---|",
    ]
    for entry in result["validation"]:
        values = entry["scores"]
        lines.append(
            f"| {entry['name']} (`{entry['report']}`) | {entry['decision']} | {percent(values['either'])} | "
            f"{percent(values['macro_f1_paper'])} | {percent(values['exact'])} | {values['qwk']:.3f} | "
            + ("yes" if entry["chosen"] else "")
            + " |"
        )
    lines += [
        "",
        "## Not yet measured",
        "",
        "- Article-level accuracy on texts the user labels (milestone C).",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("chosen", nargs="?", help="validation report of the chosen run or average")
    parser.add_argument(
        "--render", help="write the Markdown for a result JSON this script wrote, without scoring again"
    )
    parser.add_argument("--previous", help="validation report of the transformer it replaces")
    parser.add_argument("--candidate", action="append", default=[], help="another validation report compared")
    parser.add_argument("--select", choices=SELECT_METRICS, default="macro_f1_paper")
    parser.add_argument(
        "--not-below",
        choices=SELECT_METRICS,
        help="count only candidates at least as good as --previous on this metric, and beat it on --select",
    )
    parser.add_argument(
        "--dev-only", action="store_true", help="score the candidates on the validation split and stop"
    )
    parser.add_argument("--date", default=datetime.date.today().isoformat())
    args = parser.parse_args()

    if args.render:
        path = ML_ROOT / args.render
        rendered = json.loads(path.read_text())
        rendered["rendered_by"] = provenance()["commit"]
        path.with_suffix(".md").write_text(report(rendered))
        print(report(rendered))
        return
    if not args.chosen:
        parser.error("name the chosen validation report, or --render a result")

    code = provenance()
    chosen = load_model(args.chosen)
    previous = load_model(args.previous) if args.previous else None
    compared = [chosen] + ([previous] if previous else []) + [load_model(p) for p in args.candidate]

    # Every candidate again on the validation split, with today's metrics.
    dev = corpus.load("dev")
    dev_texts = [detokenize(s.text) for s in dev]
    validation = []
    dev_levels = {}
    for model in compared:
        dev_levels[model["report"]] = predict(model, dev_texts)
        validation.append(
            {
                "name": model["name"],
                "report": model["report"],
                "decision": model["decision"],
                "scores": scores(dev_levels[model["report"]], dev),
                "chosen": model is chosen,
                "previous": model is previous,
            }
        )

    def key(entry: dict) -> tuple[float, float]:
        return (entry["scores"][args.select], entry["scores"]["qwk"])

    problem = selection_problem(validation, args.select, args.not_below)
    if args.dev_only:
        for entry in sorted(validation, key=key, reverse=True):
            values = entry["scores"]
            print(
                f"{entry['report']}: {entry['decision']}, either {values['either']:.3f}, paper macro-F1 "
                f"{values['macro_f1_paper']:.3f}, exact {values['exact']:.3f}, QWK {values['qwk']:.3f}"
            )
        differences = {}
        if previous:
            for entry in validation:
                if entry["previous"]:
                    continue
                differences[entry["report"]] = {
                    metric: paired_difference(
                        dev_levels[entry["report"]], dev_levels[previous["report"]], dev, metric, SEED
                    )
                    for metric in ("either", "macro_f1_paper")
                }
                for metric, (difference, low, high) in differences[entry["report"]].items():
                    print(
                        f"{entry['report']} minus {previous['report']}, {metric}: {100 * difference:+.1f} points "
                        f"(paired 95% interval {100 * low:+.1f} to {100 * high:+.1f})"
                    )
        verdict = problem or "may go on to the test split."
        record = {
            "date": args.date,
            "provenance": code,
            "torch": torch.__version__,
            "select": args.select,
            "not_below": args.not_below,
            "chosen": args.chosen,
            "previous": args.previous,
            "candidates": args.candidate,
            "validation": validation,
            "differences_from_previous": differences,
            "verdict": verdict,
        }
        path = ML_ROOT / "reports" / f"{args.date}-transformer-dev-selection.json"
        path.write_text(json.dumps(record, indent=2) + "\n")
        print(f"{args.chosen}: {verdict} The test split was not read. Written to {path.relative_to(ML_ROOT)}.")
        return
    if problem:
        raise SystemExit(f"{problem} The test split was not read.")

    references = References.fit()

    test = corpus.load("test")
    detokenized = [detokenize(s.text) for s in test]
    light_name = references.light_name
    previous_name = f"Previous transformer: {previous['name']}" if previous else None
    chosen_name = f"Chosen: {chosen['name']}"
    predictions = references.predict(test)
    if previous:
        predictions[previous_name] = predict(previous, detokenized)
    predictions[chosen_name] = predict(chosen, detokenized)

    differences = {}
    if previous:
        differences["Either-annotator accuracy, chosen minus previous"] = paired_difference(
            predictions[chosen_name], predictions[previous_name], test, "either", SEED
        )
        differences["Paper's macro-F1, chosen minus previous"] = paired_difference(
            predictions[chosen_name], predictions[previous_name], test, "macro_f1_paper", SEED
        )
    differences["Either-annotator accuracy, chosen minus light model"] = paired_difference(
        predictions[chosen_name], predictions[light_name], test, "either", SEED
    )

    result = {
        "date": args.date,
        "data_revision": corpus.load_manifest()["revision"],
        "provenance": code,
        "torch": torch.__version__,
        "select": args.select,
        "not_below": args.not_below,
        "chosen": chosen,
        "previous": previous,
        "light_model": references.light.name,
        "validation": validation,
        "human": annotator_agreement(test),
        "test": {
            name: {
                "scores": scores(predicted, test),
                "intervals": {m: bootstrap_interval(predicted, test, m, SEED) for m in INTERVAL_METRICS},
            }
            for name, predicted in predictions.items()
        },
        "differences": differences,
        "level_f1": {
            name: {str(level): value for level, value in level_f1(predictions[name], test).items()}
            for name in ([previous_name] if previous else []) + [chosen_name]
        },
        "level_counts": {str(level): sum(1 for s in test if s.high == level) for level in LEVELS},
        "confusion_test": confusion(predictions[chosen_name], test),
    }
    reports = ML_ROOT / "reports"
    (reports / f"{args.date}-transformer.json").write_text(json.dumps(result, indent=2) + "\n")
    (reports / f"{args.date}-transformer.md").write_text(report(result))
    print(report(result))


if __name__ == "__main__":
    main()
