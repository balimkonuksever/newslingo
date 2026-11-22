# CEFR sentence classifier: sentence-level evaluation, 2026-11-04

Written by `python -I -m newslingo_ml.sentence_eval`. Do not edit by hand; rerun it.

## Setup

- Data: CEFR-SP, Wiki-Auto subset, revision `2ba4a5005fbff68ab0f863891cf977c50fdcda29`, CC BY-SA 3.0. Card: `ml/datasets/cefr-sp.md`.
- Gold level: the higher of the two annotators' levels. *Either annotator* counts a prediction as right when it matches one of them.
- Selection: every candidate was scored on the validation split only, and the best by either-annotator accuracy (ties broken by QWK) was chosen before the test split was read. The test split was scored once, for the chosen model and the baselines.
- Seed 20261104. Code at `759b05c0a9f5395b690a45e6008536f1e45095a7`. Python 3.13.5, numpy 2.5.4, scikit-learn 1.9.1, scipy 1.18.1.
- Intervals are 95% bootstrap intervals over test sentences (1,000 resamples).

## Data

| Split | Sentences | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|---|
| train | 5990 | 41 | 303 | 1762 | 2434 | 1359 | 91 |
| dev | 701 | 6 | 10 | 131 | 299 | 188 | 67 |
| test | 762 | 4 | 11 | 139 | 354 | 182 | 72 |

Levels are each sentence's gold (higher) level.

## Human reference

On the test split the two annotators give the same level for 36.5% of sentences and are within one level for 100.0%; their QWK is 0.675.

## Test split

| Model | Either annotator | Exact | Within one level | MAE | Macro-F1 | QWK |
|---|---|---|---|---|---|---|
| Majority class | 64.0% (60.8%–67.6%) | 46.5% (43.3%–50.0%) | 88.6% (86.4%–90.8%) | 0.65 | 0.106 | 0.000 |
| Readability (Flesch–Kincaid) | 71.7% (68.5%–74.8%) | 45.8% (42.5%–49.6%) | 91.6% (89.6%–93.4%) | 0.63 | 0.215 | 0.390 |
| ridge (smoothing 2, alpha 10) | 78.9% (76.1%–81.9%) | 48.7% (45.4%–52.5%) | 94.0% (92.3%–95.5%) | 0.58 | 0.277 | 0.505 |

Chosen model: ridge (smoothing 2, alpha 10). Majority class: B2.

### Confusion matrix of the chosen model on the test split

Rows are gold levels, columns predicted levels.

| Gold | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|
| A1 | 0 | 3 | 1 | 0 | 0 | 0 |
| A2 | 0 | 3 | 7 | 1 | 0 | 0 |
| B1 | 0 | 5 | 91 | 43 | 0 | 0 |
| B2 | 0 | 0 | 99 | 245 | 10 | 0 |
| C1 | 0 | 0 | 11 | 140 | 31 | 0 |
| C2 | 0 | 0 | 2 | 31 | 38 | 1 |

## Validation split, every candidate

| Model | Either annotator | Exact | Within one level | MAE | Macro-F1 | QWK |
|---|---|---|---|---|---|---|
| Majority class | 62.1% | 42.7% | 88.2% | 0.70 | 0.100 | 0.000 |
| Readability (Flesch–Kincaid) | 68.9% | 42.4% | 92.0% | 0.66 | 0.205 | 0.419 |
| logistic (smoothing 2, C 0.03) | 73.6% | 50.5% | 98.0% | 0.52 | 0.330 | 0.613 |
| logistic (smoothing 2, C 0.1) | 74.0% | 51.4% | 97.9% | 0.51 | 0.370 | 0.624 |
| logistic (smoothing 2, C 0.3) | 74.5% | 51.9% | 97.7% | 0.50 | 0.452 | 0.632 |
| logistic (smoothing 2, C 1) | 73.8% | 51.2% | 97.7% | 0.51 | 0.452 | 0.629 |
| logistic (smoothing 2, C 3) | 73.6% | 51.2% | 97.7% | 0.51 | 0.425 | 0.628 |
| ridge (smoothing 2, alpha 0.1) | 76.9% | 48.8% | 94.9% | 0.56 | 0.387 | 0.576 |
| ridge (smoothing 2, alpha 1) | 76.9% | 48.8% | 94.9% | 0.56 | 0.387 | 0.576 |
| ridge (smoothing 2, alpha 10) | 76.9% | 48.8% | 94.9% | 0.56 | 0.388 | 0.577 |
| logistic (smoothing 5, C 0.03) | 72.9% | 49.1% | 97.9% | 0.53 | 0.301 | 0.599 |
| logistic (smoothing 5, C 0.1) | 72.8% | 49.4% | 97.6% | 0.53 | 0.343 | 0.599 |
| logistic (smoothing 5, C 0.3) | 72.8% | 50.1% | 97.3% | 0.53 | 0.437 | 0.611 |
| logistic (smoothing 5, C 1) | 72.8% | 49.8% | 97.6% | 0.53 | 0.436 | 0.617 |
| logistic (smoothing 5, C 3) | 72.8% | 49.8% | 97.6% | 0.53 | 0.454 | 0.618 |
| ridge (smoothing 5, alpha 0.1) | 76.3% | 49.6% | 93.7% | 0.57 | 0.385 | 0.549 |
| ridge (smoothing 5, alpha 1) | 76.3% | 49.6% | 93.7% | 0.57 | 0.385 | 0.549 |
| ridge (smoothing 5, alpha 10) | 76.3% | 49.6% | 93.7% | 0.57 | 0.386 | 0.550 |
| logistic (smoothing 10, C 0.03) | 71.3% | 47.8% | 97.6% | 0.55 | 0.293 | 0.584 |
| logistic (smoothing 10, C 0.1) | 71.3% | 47.6% | 97.4% | 0.55 | 0.335 | 0.585 |
| logistic (smoothing 10, C 0.3) | 71.5% | 47.9% | 97.6% | 0.55 | 0.430 | 0.601 |
| logistic (smoothing 10, C 1) | 71.8% | 48.2% | 97.6% | 0.54 | 0.441 | 0.606 |
| logistic (smoothing 10, C 3) | 72.2% | 48.6% | 97.4% | 0.54 | 0.443 | 0.606 |
| ridge (smoothing 10, alpha 0.1) | 75.7% | 49.6% | 93.4% | 0.57 | 0.434 | 0.545 |
| ridge (smoothing 10, alpha 1) | 75.9% | 49.8% | 93.4% | 0.57 | 0.436 | 0.546 |
| ridge (smoothing 10, alpha 10) | 76.0% | 49.5% | 93.7% | 0.57 | 0.411 | 0.549 |
| logistic (smoothing 20, C 0.03) | 69.8% | 46.5% | 96.9% | 0.57 | 0.308 | 0.559 |
| logistic (smoothing 20, C 0.1) | 70.9% | 47.8% | 97.0% | 0.55 | 0.402 | 0.577 |
| logistic (smoothing 20, C 0.3) | 70.9% | 47.8% | 96.9% | 0.55 | 0.424 | 0.579 |
| logistic (smoothing 20, C 1) | 70.8% | 47.5% | 97.0% | 0.56 | 0.423 | 0.580 |
| logistic (smoothing 20, C 3) | 70.5% | 47.2% | 96.9% | 0.56 | 0.397 | 0.573 |
| ridge (smoothing 20, alpha 0.1) | 74.9% | 48.6% | 93.0% | 0.58 | 0.431 | 0.523 |
| ridge (smoothing 20, alpha 1) | 74.9% | 48.6% | 93.0% | 0.58 | 0.431 | 0.523 |
| ridge (smoothing 20, alpha 10) | 75.0% | 48.8% | 93.2% | 0.58 | 0.433 | 0.528 |

## Not yet measured

- A zero-shot LLM on a seeded sample of the test split (ML roadmap item 1).
- Article-level accuracy on texts the user labels (milestone C).
