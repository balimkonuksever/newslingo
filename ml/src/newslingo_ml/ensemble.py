"""Averages several fine-tuned runs and chooses how to read a level off the
average, on the validation split.

    python -I -m newslingo_ml.ensemble --name <name> reports/<date>-transformer-dev-<run>.json [...]
        [--select macro_f1_paper]

Each run was trained by newslingo_ml.transformer, which chose its epoch on
the validation split. This averages the runs' class probabilities on the
validation split, keeps the decision rule with the best --select metric (ties
broken by QWK) and writes ml/reports/<date>-ensemble-dev-<name>.json, which
newslingo_ml.transformer_eval scores. The test split is never read here.
"""

import argparse
import datetime
import json

import numpy as np

from newslingo_ml import corpus
from newslingo_ml.corpus import ML_ROOT
from newslingo_ml.metrics import scores
from newslingo_ml.sentence_eval import provenance
from newslingo_ml.text import detokenize
from newslingo_ml.transformer import SELECT_METRICS, level_decisions, predict_probabilities


def average_probabilities(members: list[dict], texts: list[str]) -> np.ndarray:
    """The mean of the members' class probabilities. Each member names a
    checkpoint and the maximum length it was trained with."""
    return np.mean(
        [predict_probabilities(m["checkpoint"], texts, m["max_length"]) for m in members], axis=0
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("run_reports", nargs="+", help="dev reports newslingo_ml.transformer wrote")
    parser.add_argument("--name", required=True)
    parser.add_argument("--select", choices=SELECT_METRICS, default="macro_f1_paper")
    parser.add_argument("--date", default=datetime.date.today().isoformat())
    args = parser.parse_args()
    if len(args.run_reports) < 2:
        parser.error("an ensemble needs at least two runs")

    code = provenance()
    runs = [json.loads((ML_ROOT / path).read_text()) for path in args.run_reports]
    members = [
        {
            "report": path,
            "run": run["run"],
            "checkpoint": run["checkpoint"],
            "max_length": run["settings"]["max_length"],
            "settings": run["settings"],
            "pretrained": run["pretrained"],
            "epoch": run["chosen"]["epoch"],
        }
        for path, run in zip(args.run_reports, runs, strict=True)
    ]
    dev = corpus.load("dev")
    probabilities = average_probabilities(members, [detokenize(s.text) for s in dev])
    dev_scores = {name: scores(levels, dev) for name, levels in level_decisions(probabilities).items()}
    decision = max(dev_scores, key=lambda name: (dev_scores[name][args.select], dev_scores[name]["qwk"]))

    result = {
        "date": args.date,
        "name": args.name,
        "provenance": code,
        "members": members,
        "decisions": dev_scores,
        "chosen": {"decision": decision, "select": args.select, "dev": dev_scores[decision]},
    }
    reports = ML_ROOT / "reports"
    (reports / f"{args.date}-ensemble-dev-{args.name}.json").write_text(json.dumps(result, indent=2) + "\n")
    chosen = dev_scores[decision]
    print(
        f"{len(members)} runs averaged, read as the {decision} level (chosen by {args.select}): "
        f"either {chosen['either']:.3f}, paper macro-F1 {chosen['macro_f1_paper']:.3f}, "
        f"QWK {chosen['qwk']:.3f}. The test split was not read."
    )


if __name__ == "__main__":
    main()
