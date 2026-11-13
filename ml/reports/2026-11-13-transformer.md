# CEFR sentence classifier: a fine-tuned transformer, 2026-11-13

Written by `python -I -m newslingo_ml.transformer_eval`. Do not edit by hand; rerun it.

## Setup

- Data: CEFR-SP, Wiki-Auto subset, revision `2ba4a5005fbff68ab0f863891cf977c50fdcda29`, CC BY-SA 3.0. Card: `ml/datasets/cefr-sp.md`. Gold level and metrics as in the sentence-level report.
- Model: `distilroberta-base` (revision `fb53ab8802853c8e4fbdbcd0529f21fc6f459b2b`, Apache 2.0), fine-tuned on the training split by `python -I -m newslingo_ml.transformer` for 4 epochs: learning rate 3e-05, batch 32, warm-up 0.06, weight decay 0.01, seed 20261104. Each sentence's target puts half its weight on each annotator's level.
- Selection: the epoch and the decision rule were chosen on the validation split only: epoch 3, reading the level as the model's expected level. The test split was then read once, for this model, the light model and the two baselines.
- The light model is the one `newslingo_ml.sentence_eval` chooses: ridge (smoothing 2, alpha 10). Its test scores repeat those of the sentence-level report of 2026-11-04.
- Training code at `8701470fd172040feb42234d48aa5ee5997dbd5b`; this report's code at `5e571da9fac365f12844fe595e6e8ea5f8f51401`. Trained on `mps` with torch 2.15.0 and transformers 5.22.2. Training on Apple's MPS is not bit-for-bit deterministic, so a rerun can differ slightly.
- Intervals are 95% bootstrap intervals over test sentences (1,000 resamples).

## Human reference

On the test split the two annotators give the same level for 36.5% of sentences and are within one level for 100.0%; their QWK is 0.675.

## Test split

| Model | Either annotator | Exact | Within one level | MAE | Macro-F1 | QWK |
|---|---|---|---|---|---|---|
| Majority class | 64.0% (60.8%–67.6%) | 46.5% (43.3%–50.0%) | 88.6% (86.4%–90.8%) | 0.65 | 0.106 | 0.000 |
| Readability (Flesch–Kincaid) | 71.7% (68.5%–74.8%) | 45.8% (42.5%–49.6%) | 91.6% (89.6%–93.4%) | 0.63 | 0.215 | 0.390 |
| Light model: ridge (smoothing 2, alpha 10) | 78.9% (76.1%–81.9%) | 48.7% (45.4%–52.5%) | 94.0% (92.3%–95.5%) | 0.58 | 0.277 | 0.505 |
| Transformer: distilroberta-base | 86.7% (84.4%–89.2%) | 50.1% (46.7%–53.9%) | 97.1% (95.9%–98.3%) | 0.53 | 0.349 | 0.682 |

The transformer matches an annotator on +7.9 points more test sentences than the light model (paired 95% interval +4.6 to +11.2).

### Confusion matrix of the transformer on the test split

Rows are gold levels, columns predicted levels.

| Gold | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|
| A1 | 0 | 3 | 1 | 0 | 0 | 0 |
| A2 | 0 | 11 | 0 | 0 | 0 | 0 |
| B1 | 0 | 25 | 105 | 8 | 1 | 0 |
| B2 | 0 | 4 | 161 | 175 | 14 | 0 |
| C1 | 0 | 0 | 13 | 83 | 86 | 0 |
| C2 | 0 | 0 | 0 | 3 | 64 | 5 |

## Validation split, every epoch

| Epoch | Decision | Either annotator | Exact | Within one level | QWK |
|---|---|---|---|---|---|
| 1 | most likely | 86.0% | 50.4% | 98.4% | 0.681 |
| 1 | expected | 85.3% | 49.6% | 98.6% | 0.668 |
| 2 | most likely | 82.5% | 46.4% | 96.3% | 0.694 |
| 2 | expected | 82.9% | 47.1% | 96.3% | 0.689 |
| 3 | most likely | 85.3% | 51.5% | 97.4% | 0.721 |
| 3 | expected | 86.2% | 51.4% | 97.7% | 0.720 |
| 4 | most likely | 85.4% | 48.8% | 97.7% | 0.705 |
| 4 | expected | 85.6% | 48.6% | 97.7% | 0.702 |

## Not yet measured

- A zero-shot LLM on a seeded sample of the test split (ML roadmap item 1).
- Article-level accuracy on texts the user labels (milestone C).
