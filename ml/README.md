# Newslingo ML

The CEFR difficulty classifier, milestone C in `IMPLEMENTATION_PLAN.md`. This is a Python project of its own (ADR-002): the Node app runs the exported model, and nothing here runs in pull-request CI.

## Setup

```bash
cd ml
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pip install --no-deps -e .
```

Python 3.13. `requirements.txt` pins every package; update it with `.venv/bin/pip freeze --exclude-editable > requirements.txt` after a change.

## Commands

Run them from `ml/`. The `-I` flag keeps Python from importing modules from the current directory, since the downloaded data is untrusted.

| Command                                             | What it does                                                                                                                                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.venv/bin/python -I -m newslingo_ml.corpus`        | Downloads CEFR-SP's Wiki-Auto files at the pinned revision into `data/raw/`, which git ignores, and checks their SHA-256 digests.                                                                                    |
| `.venv/bin/python -I -m newslingo_ml.sentence_eval` | Trains the baselines and candidates, chooses one on the validation split, scores the test split once, and writes `reports/<date>-sentence-level.md` and `.json` and the chosen model to `models/cefr-sentence.json`. |
| `.venv/bin/python -I -m pytest`                     | Unit tests for the text rules, features and metrics.                                                                                                                                                                 |

## Rules

These come from the project's agent instructions and ADR-002.

- The test split is read only after a model is chosen on the validation split, and nothing is tuned on it.
- Every result sits beside its baselines: the majority class and a Flesch–Kincaid readability formula.
- Every reported number is reproducible from a committed script, the pinned data and the fixed seed. Reports record the code commit, data revision and package versions. Commit the code before a run, so the report names a commit that holds it.
- Reports are written by the scripts and committed as they are. Never edit one by hand; rerun it.
- Every dataset has a card in `datasets/` before it is used.

## Layout

| Path                | What it holds                                                                        |
| ------------------- | ------------------------------------------------------------------------------------ |
| `data/cefr-sp.json` | The data manifest: source, revision, licence, and each file's path, digest and rows. |
| `datasets/`         | Dataset cards.                                                                       |
| `src/newslingo_ml/` | Loading, text rules, features, metrics and the evaluation script.                    |
| `models/`           | Exported models, which the Node app loads.                                           |
| `reports/`          | Evaluation reports, one per run.                                                     |
| `tests/`            | pytest tests.                                                                        |
