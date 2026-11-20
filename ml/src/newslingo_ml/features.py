"""Sentence features: length, readability, and how hard each word was in training.

The word levels come from the training split only. Training sentences get
their word features out of fold, so no sentence's own label leaks into them.
"""

import math
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from sklearn.model_selection import KFold

from newslingo_ml.text import detokenize, syllables, words

FEATURE_NAMES = (
    "log_words",
    "mean_chars",
    "mean_syllables",
    "share_polysyllabic",
    "share_long",
    "fk_grade",
    "word_level_mean",
    "word_level_top3",
    "word_level_max",
    "share_unknown",
)
LONG_WORD = 7
TOP_WORDS = 3


def sentence_words(text: str) -> list[str]:
    return words(detokenize(text))


@dataclass(frozen=True)
class WordLevels:
    """Each training word's mean level, smoothed toward the overall mean."""

    levels: dict[str, float]
    global_mean: float
    smoothing: float

    @classmethod
    def fit(
        cls, sentences: Sequence[Sequence[str]], targets: Sequence[float], smoothing: float
    ) -> "WordLevels":
        sums: dict[str, float] = {}
        counts: dict[str, int] = {}
        for sentence, target in zip(sentences, targets, strict=True):
            for word in set(sentence):
                sums[word] = sums.get(word, 0.0) + target
                counts[word] = counts.get(word, 0) + 1
        global_mean = float(np.mean(targets))
        levels = {
            word: (sums[word] + smoothing * global_mean) / (counts[word] + smoothing)
            for word in sums
        }
        return cls(levels, global_mean, smoothing)


def fk_grade(sentence: Sequence[str]) -> float:
    """The Flesch–Kincaid grade level of a single sentence."""
    if not sentence:
        return 0.0
    mean_syllables = sum(syllables(word) for word in sentence) / len(sentence)
    return 0.39 * len(sentence) + 11.8 * mean_syllables - 15.59


def features(sentence: Sequence[str], table: WordLevels) -> list[float]:
    count = len(sentence)
    if count == 0:
        return [0.0] * 6 + [table.global_mean] * 3 + [1.0]

    chars = [len(word.replace("'", "")) for word in sentence]
    word_syllables = [syllables(word) for word in sentence]
    known = sorted((table.levels[w] for w in sentence if w in table.levels), reverse=True)
    if not known:
        known = [table.global_mean]

    return [
        math.log1p(count),
        sum(chars) / count,
        sum(word_syllables) / count,
        sum(1 for s in word_syllables if s >= 3) / count,
        sum(1 for c in chars if c >= LONG_WORD) / count,
        fk_grade(sentence),
        sum(known) / len(known),
        sum(known[:TOP_WORDS]) / len(known[:TOP_WORDS]),
        known[0],
        sum(1 for w in sentence if w not in table.levels) / count,
    ]


def matrix(sentences: Sequence[Sequence[str]], table: WordLevels) -> np.ndarray:
    return np.array([features(sentence, table) for sentence in sentences])


def out_of_fold_matrix(
    sentences: Sequence[Sequence[str]],
    targets: Sequence[float],
    smoothing: float,
    seed: int,
    folds: int = 5,
) -> np.ndarray:
    """Training features, each row's word levels fit without that row."""
    targets = np.asarray(targets, dtype=float)
    rows = np.zeros((len(sentences), len(FEATURE_NAMES)))
    splitter = KFold(n_splits=folds, shuffle=True, random_state=seed)
    for fit_index, held_index in splitter.split(rows):
        table = WordLevels.fit(
            [sentences[i] for i in fit_index], targets[fit_index], smoothing
        )
        for i in held_index:
            rows[i] = features(sentences[i], table)
    return rows
