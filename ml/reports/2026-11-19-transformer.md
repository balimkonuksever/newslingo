# CEFR sentence classifier: average of 4 runs (3 × distilroberta-base, 1 × FacebookAI/roberta-base), 2026-11-19

Written by `python -I -m newslingo_ml.transformer_eval`. Do not edit by hand; rerun it.

## Setup

- Data: CEFR-SP, Wiki-Auto subset, revision `2ba4a5005fbff68ab0f863891cf977c50fdcda29`, CC BY-SA 3.0. Card: `ml/datasets/cefr-sp.md`. Gold level and metrics as in the sentence-level report.
- The paper's macro-F1 is the metric the CEFR-SP paper reports (Arase et al., 2022): a prediction that matches either annotator is right, and a miss is scored against whichever annotator the model matches more often (`metrics.paper_gold`). The other macro-F1 uses the higher of the two levels.
- Chosen: average of 4 runs (3 × distilroberta-base, 1 × FacebookAI/roberta-base), read as its most likely level, from `reports/2026-11-19-ensemble-dev-all-four.json`:
  - `distilroberta-base-lr3e-05-e4`: `distilroberta-base` (revision `fb53ab8802853c8e4fbdbcd0529f21fc6f459b2b`, Apache 2.0), 4 epochs at learning rate 3e-05, batch 32, seed 20261104; epoch 3 kept (`reports/2026-11-13-transformer-dev-distilroberta-base-lr3e-05-e4.json`).
  - `distilroberta-base-lr3e-05-e4-w0.2`: `distilroberta-base` (revision `fb53ab8802853c8e4fbdbcd0529f21fc6f459b2b`, Apache 2.0), 4 epochs at learning rate 3e-05, batch 32, seed 20261104, class weights α 0.2; epoch 1 kept (`reports/2026-11-19-transformer-dev-distilroberta-base-lr3e-05-e4-w0.2.json`).
  - `distilroberta-base-lr3e-05-e4-w0.5`: `distilroberta-base` (revision `fb53ab8802853c8e4fbdbcd0529f21fc6f459b2b`, Apache 2.0), 4 epochs at learning rate 3e-05, batch 32, seed 20261104, class weights α 0.5; epoch 1 kept (`reports/2026-11-19-transformer-dev-distilroberta-base-lr3e-05-e4-w0.5.json`).
  - `roberta-base-lr2e-05-e4`: `FacebookAI/roberta-base` (revision `e2da8e2f811d1448a5b465c236feacd80ffbac7b`, MIT), 4 epochs at learning rate 2e-05, batch 32, seed 20261104; epoch 3 kept (`reports/2026-11-19-transformer-dev-roberta-base-lr2e-05-e4.json`).
- Selection: every candidate below was scored on the validation split, and the chosen one has the best paper's macro-F1 (ties broken by QWK). The test split was then read for the chosen model, the previous transformer, the light model and the two baselines.
- Previous transformer: distilroberta-base, read as its expected level, from `reports/2026-11-13-transformer-dev-distilroberta-base-lr3e-05-e4.json` (reported on 2026-11-13).
- The light model is the one `newslingo_ml.sentence_eval` chooses: ridge (smoothing 2, alpha 10).
- This report's code is at `130633b12ccd45204cb69a062e34116e24ff6bc8`. Training on Apple's MPS is not bit-for-bit deterministic, so a rerun can differ slightly.
- Intervals are 95% bootstrap intervals over test sentences (1,000 resamples).

## Human reference

On the test split the two annotators give the same level for 36.5% of sentences and are within one level for 100.0%; their QWK is 0.675.

## Test split

| Model | Either annotator | Paper's macro-F1 | Exact | Within one level | MAE | Macro-F1, higher level | QWK |
|---|---|---|---|---|---|---|---|
| Majority class | 64.0% (60.8%–67.6%) | 13.0% (12.6%–13.5%) | 46.5% (43.3%–50.0%) | 88.6% (86.4%–90.8%) | 0.65 | 0.106 | 0.000 |
| Readability (Flesch–Kincaid) | 71.7% (68.5%–74.8%) | 35.4% (33.3%–37.3%) | 45.8% (42.5%–49.6%) | 91.6% (89.6%–93.4%) | 0.63 | 0.215 | 0.390 |
| Light model: ridge (smoothing 2, alpha 10) | 78.9% (76.1%–81.9%) | 48.1% (42.0%–54.8%) | 48.7% (45.4%–52.5%) | 94.0% (92.3%–95.5%) | 0.58 | 0.277 | 0.505 |
| Previous transformer: distilroberta-base | 86.7% (84.4%–89.2%) | 65.3% (58.7%–71.5%) | 50.1% (46.7%–53.9%) | 97.1% (95.9%–98.3%) | 0.53 | 0.349 | 0.682 |
| Chosen: average of 4 runs (3 × distilroberta-base, 1 × FacebookAI/roberta-base) | 86.9% (84.5%–89.2%) | 77.3% (67.7%–86.0%) | 49.3% (46.1%–53.0%) | 97.0% (95.7%–98.2%) | 0.54 | 0.426 | 0.690 |

- Either-annotator accuracy, chosen minus previous: +0.1 points (paired 95% interval -1.2 to +1.3).
- Paper's macro-F1, chosen minus previous: +12.0 points (paired 95% interval +2.3 to +22.2).
- Either-annotator accuracy, chosen minus light model: +8.0 points (paired 95% interval +4.7 to +11.4).

### F1 for each level, the paper's way

| Model | A1 | A2 | B1 | B2 | C1 | C2 | Macro |
|---|---|---|---|---|---|---|---|
| Previous transformer: distilroberta-base | 0.0% | 71.4% | 87.9% | 87.7% | 89.3% | 55.6% | 65.3% |
| Chosen: average of 4 runs (3 × distilroberta-base, 1 × FacebookAI/roberta-base) | 40.0% | 77.9% | 87.2% | 88.1% | 88.1% | 82.4% | 77.3% |
| Test sentences at each level (higher level) | 4 | 11 | 139 | 354 | 182 | 72 | |

For reference, the CEFR-SP paper's Table 6 (Arase et al., 2022). Its models were trained on all three parts of CEFR-SP and scored on the whole test set, so the numbers are not directly comparable with those above, which use the Wikipedia part only:

| Model | A1 | A2 | B1 | B2 | C1 | C2 | Macro |
|---|---|---|---|---|---|---|---|
| BERT, no loss weights | 12.8% | 83.6% | 87.0% | 86.7% | 82.9% | 76.8% | 71.7% |
| BERT with loss weights | 72.7% | 82.7% | 85.5% | 86.4% | 84.9% | 83.6% | 82.5% |
| Prototypes with loss weights (the paper's model) | 78.0% | 81.4% | 86.5% | 85.9% | 85.4% | 89.7% | 84.5% |

### Confusion matrix of the chosen model on the test split

Rows are gold (higher) levels, columns predicted levels.

| Gold | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|
| A1 | 1 | 2 | 1 | 0 | 0 | 0 |
| A2 | 0 | 11 | 0 | 0 | 0 | 0 |
| B1 | 0 | 36 | 93 | 9 | 1 | 0 |
| B2 | 0 | 7 | 154 | 178 | 15 | 0 |
| C1 | 0 | 0 | 11 | 91 | 79 | 1 |
| C2 | 0 | 0 | 0 | 3 | 55 | 14 |

## Validation split, every candidate

| Candidate | Decision | Either annotator | Paper's macro-F1 | Exact | QWK | Chosen |
|---|---|---|---|---|---|---|
| average of 4 runs (3 × distilroberta-base, 1 × FacebookAI/roberta-base) (`reports/2026-11-19-ensemble-dev-all-four.json`) | most likely | 86.3% | 86.5% | 53.6% | 0.744 | yes |
| distilroberta-base (`reports/2026-11-13-transformer-dev-distilroberta-base-lr3e-05-e4.json`) | expected | 86.2% | 83.3% | 51.4% | 0.720 |  |
| distilroberta-base, class weights α 0.2 (`reports/2026-11-19-transformer-dev-distilroberta-base-lr3e-05-e4-w0.2.json`) | expected | 82.2% | 81.2% | 52.6% | 0.743 |  |
| distilroberta-base, class weights α 0.5 (`reports/2026-11-19-transformer-dev-distilroberta-base-lr3e-05-e4-w0.5.json`) | expected | 85.3% | 83.2% | 51.1% | 0.716 |  |
| FacebookAI/roberta-base (`reports/2026-11-19-transformer-dev-roberta-base-lr2e-05-e4.json`) | most likely | 85.0% | 84.2% | 49.2% | 0.718 |  |
| average of 3 runs (2 × distilroberta-base, 1 × FacebookAI/roberta-base) (`reports/2026-11-19-ensemble-dev-best-three.json`) | most likely | 85.9% | 85.7% | 51.9% | 0.731 |  |

## Not yet measured

- A zero-shot LLM on a seeded sample of the test split (ML roadmap item 1).
- Article-level accuracy on texts the user labels (milestone C).
