"""Scores the chosen transformer, alone or averaged over several runs, on the
test split once, beside the transformer it replaces and the baselines.

    python -I -m newslingo_ml.transformer_eval CHOSEN [--previous PREVIOUS]
        [--candidate REPORT ...] [--select either|macro_f1_paper] [--dev-only]

CHOSEN is the validation report of the model chosen on the validation split:
one run from newslingo_ml.transformer or an average from
newslingo_ml.ensemble. --candidate names the other validation reports it was
compared with, and --previous the transformer it replaces. Every one of them
is scored again on the validation split, and the script stops unless CHOSEN
has the best --select metric (ties broken by QWK): nothing here chooses
anything. The test split is then read once, for the chosen model, the
previous one, the light model sentence_eval chooses and the two baselines.
Writes ml/reports/<date>-transformer.md and .json. With --dev-only it prints
the validation scores and stops before the test split.
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
from newslingo_ml.ensemble import average_probabilities
from newslingo_ml.features import fk_grade, sentence_words
from newslingo_ml.metrics import annotator_agreement, bootstrap_interval, confusion, level_f1, scores
from newslingo_ml.sentence_eval import SEED, candidates, percent, provenance
from newslingo_ml.text import detokenize
from newslingo_ml.transformer import SELECT_METRICS, level_decisions, revision_of

LICENCES = {
    "distilroberta-base": "Apache 2.0",
    "FacebookAI/roberta-base": "MIT",
    "answerdotai/ModernBERT-base": "Apache 2.0",
    "microsoft/deberta-v3-base": "MIT",
}
INTERVAL_METRICS = ("either", "macro_f1_paper", "exact", "adjacent")
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
    settings = members[0]["settings"]
    name = settings["model"]
    if settings.get("class_weight_alpha") is not None:
        name += f", class weights α {settings['class_weight_alpha']:g}"
    if len(members) > 1:
        name = f"average of {len(members)} runs of {name}"
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
        f"has the best {result['select']} (ties broken by QWK). The test split was then read once, "
        "for the chosen model, the previous transformer, the light model and the two baselines.",
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
        "- A zero-shot LLM on a seeded sample of the test split (ML roadmap item 1).",
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
    for model in compared:
        validation.append(
            {
                "name": model["name"],
                "report": model["report"],
                "decision": model["decision"],
                "scores": scores(predict(model, dev_texts), dev),
                "chosen": model is chosen,
            }
        )

    def key(entry: dict) -> tuple[float, float]:
        return (entry["scores"][args.select], entry["scores"]["qwk"])

    best = max(validation, key=key)
    if args.dev_only:
        for entry in sorted(validation, key=key, reverse=True):
            values = entry["scores"]
            print(
                f"{entry['report']}: {entry['decision']}, either {values['either']:.3f}, paper macro-F1 "
                f"{values['macro_f1_paper']:.3f}, exact {values['exact']:.3f}, QWK {values['qwk']:.3f}"
            )
        print(f"Best by {args.select}: {best['report']}. The test split was not read.")
        return
    if key(validation[0]) < key(best):
        raise SystemExit(
            f"{args.chosen} is not the best candidate on the validation split by {args.select}: "
            f"{best['report']} is. The test split was not read."
        )

    # The light model and the baselines, chosen exactly as sentence_eval does.
    data = {split: corpus.load(split) for split in ("train", "dev")}
    words = {split: [sentence_words(s.text) for s in data[split]] for split in data}
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
    detokenized = [detokenize(text) for text in test_texts]
    light_name = f"Light model: {light.name}"
    previous_name = f"Previous transformer: {previous['name']}" if previous else None
    chosen_name = f"Chosen: {chosen['name']}"
    predictions = {
        "Majority class": np.full(len(test), majority_level),
        "Readability (Flesch–Kincaid)": readability.predict(np.array([[fk_grade(s)] for s in test_words])),
        light_name: light.predict(light.rows(test_texts, test_words)),
    }
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
        "chosen": chosen,
        "previous": previous,
        "light_model": light.name,
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
