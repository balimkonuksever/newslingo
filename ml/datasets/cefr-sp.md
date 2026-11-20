# Dataset card: CEFR-SP, Wiki-Auto subset

The training and test data for Newslingo's CEFR difficulty classifier (milestone C).

## Source

- Repository: <https://github.com/yukiar/CEFR-SP>, revision `2ba4a5005fbff68ab0f863891cf977c50fdcda29` (2024-09-17), files under `CEFR-SP/Wiki-Auto/`.
- Paper: Yuki Arase, Satoru Uchida and Tomoyuki Kajiwara. 2022. CEFR-Based Sentence Difficulty Annotation and Assessment. EMNLP 2022. <https://aclanthology.org/2022.emnlp-main.416>
- Download and check: `python -I -m newslingo_ml.corpus`. The SHA-256 digest and row count of each file are recorded in `ml/data/cefr-sp.json`, and every read checks them. The raw files stay out of git.

## Licence

CC BY-SA 3.0, as the corpus README states for the Wiki-Auto portion, which comes from English Wikipedia and Simple English Wikipedia. Commercial use and adaptation are allowed with attribution, and anything derived from it is shared under the same licence. The word levels in `ml/models/cefr-sentence.json` are derived from it and say so.

Not used: the SCoRE portion (CC BY-NC-SA 4.0, non-commercial) and the Newsela-Auto portion, which needs a Newsela data agreement (decision log, 2026-09-25).

## Contents

English sentences from Wiki-Auto's aligned Wikipedia and Simple Wikipedia articles. Two English-education professionals, annotators A and B, each gave every sentence a CEFR level from 1 (A1) to 6 (C2). The text is tokenized: punctuation and contractions are split off, as in `did n't go ,`.

Each line is tab-separated: the sentence, annotator A's level, annotator B's level.

## Splits

The published train, validation (`dev`) and test splits, used as published. Levels below are each sentence's higher label.

| Split | Sentences | A1  | A2  | B1    | B2    | C1    | C2  | Annotators agree exactly |
| ----- | --------- | --- | --- | ----- | ----- | ----- | --- | ------------------------ |
| train | 5,990     | 41  | 303 | 1,762 | 2,434 | 1,359 | 91  | 43.9%                    |
| dev   | 701       | 6   | 10  | 131   | 299   | 188   | 67  | 38.9%                    |
| test  | 762       | 4   | 11  | 139   | 354   | 182   | 72  | 36.5%                    |

The two annotators never differ by more than one level.

## How Newslingo uses it

- The gold level is the higher of the two labels. Both labels are kept, so a prediction can also be scored as matching either annotator.
- Models and settings are chosen on the validation split. `newslingo_ml.sentence_eval` reads the test split only after choosing, and scores it once.

## Limitations

- Encyclopaedia sentences, not news. Newslingo's articles are news and explainers, so the sentence-level numbers are an upper bound on what to expect from articles until the article-level evaluation measures it.
- Few A1 and A2 sentences: 344 of 5,990 in training and 15 of 762 in test. Newslingo writes A2 articles, so the low end is the least supported.
- The validation and test splits hold far more C2 sentences (about 10%) than the training split (1.5%).
- Sentence levels, not article levels. An article's level is derived from its sentences and measured separately.
