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

| Command                                                                                          | What it does                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.venv/bin/python -I -m newslingo_ml.corpus`                                                     | Downloads CEFR-SP's Wiki-Auto files at the pinned revision into `data/raw/`, which git ignores, and checks their SHA-256 digests.                                                                                                                                                                                                                                        |
| `.venv/bin/python -I -m newslingo_ml.sentence_eval`                                              | Trains the baselines and candidates, chooses one on the validation split, scores the test split once, and writes `reports/<date>-sentence-level.md` and `.json` and the chosen model to `models/cefr-sentence.json`.                                                                                                                                                     |
| `.venv/bin/python -I -m newslingo_ml.sentence_eval --dev-only`                                   | Scores every candidate on the validation split and stops, never reading the test split.                                                                                                                                                                                                                                                                                  |
| `.venv/bin/python -I -m newslingo_ml.transformer`                                                | Fine-tunes `distilroberta-base` (or `--model`) on the training split, scores the validation split after every epoch, keeps the best epoch and decision rule in `checkpoints/<run>/`, and writes `reports/<date>-transformer-dev-<run>.json`. Downloads the pretrained model from Hugging Face on first use. Never reads the test split. About 10 minutes on an M1's GPU. |
| `.venv/bin/python -I -m newslingo_ml.transformer_eval reports/<date>-transformer-dev-<run>.json` | Scores that kept transformer once on the test split, beside the light model and the baselines, and writes `reports/<date>-transformer.md` and `.json`.                                                                                                                                                                                                                   |
| `.venv/bin/python -I -m pytest`                                                                  | Unit tests for the text rules, features and metrics.                                                                                                                                                                                                                                                                                                                     |

## Rules

These come from the project's agent instructions and ADR-002.

- The test split is read only after a model is chosen on the validation split, and nothing is tuned on it.
- Every result sits beside its baselines: the majority class and a Flesch–Kincaid readability formula.
- Every reported number is reproducible from a committed script, the pinned data and the fixed seed. Reports record the code commit, data revision and package versions. Commit the code before a run, so the report names a commit that holds it.
- Reports are written by the scripts and committed as they are. Never edit one by hand; rerun it.
- Every dataset has a card in `datasets/` before it is used.
- Every pretrained model's source, revision and licence are recorded before it is used. The transformer starts from Hugging Face's `distilroberta-base`, Apache 2.0, a six-layer distillation of RoBERTa-base trained on OpenWebTextCorpus; each run's report records the exact revision.
- Training on Apple's MPS is not bit-for-bit deterministic: a transformer report states the run it scores, and a rerun can differ slightly.

## Layout

| Path                | What it holds                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `data/cefr-sp.json` | The data manifest: source, revision, licence, and each file's path, digest and rows.                          |
| `datasets/`         | Dataset cards.                                                                                                |
| `src/newslingo_ml/` | Loading, text rules, features, metrics and the evaluation script.                                             |
| `models/`           | Exported models, which the Node app loads.                                                                    |
| `checkpoints/`      | Fine-tuned transformer weights, about 330 MB each. Git ignores them; rebuild with `newslingo_ml.transformer`. |
| `reports/`          | Evaluation reports, one per run.                                                                              |
| `tests/`            | pytest tests.                                                                                                 |
