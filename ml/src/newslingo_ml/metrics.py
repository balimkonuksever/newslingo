"""Sentence-level metrics against CEFR-SP's two annotators.

The two annotators give the same level only about 40% of the time, and never
differ by more than one level, so exact accuracy alone undersells a model.
Each metric says which reference it uses.
"""

from collections.abc import Sequence

import numpy as np
from sklearn.metrics import cohen_kappa_score, confusion_matrix, f1_score

from newslingo_ml.corpus import LEVELS, Sentence


def references(sentences: Sequence[Sentence]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    a = np.array([s.level_a for s in sentences])
    b = np.array([s.level_b for s in sentences])
    return a, b, np.maximum(a, b)


def scores(predicted: np.ndarray, sentences: Sequence[Sentence]) -> dict[str, float]:
    a, b, high = references(sentences)
    return {
        # Matches one of the two annotators: the primary metric.
        "either": float(np.mean((predicted == a) | (predicted == b))),
        "exact": float(np.mean(predicted == high)),
        "adjacent": float(np.mean(np.abs(predicted - high) <= 1)),
        "mae": float(np.mean(np.abs(predicted - high))),
        "macro_f1": float(
            f1_score(high, predicted, labels=LEVELS, average="macro", zero_division=0)
        ),
        "qwk": float(cohen_kappa_score(high, predicted, labels=LEVELS, weights="quadratic")),
    }


def bootstrap_interval(
    predicted: np.ndarray,
    sentences: Sequence[Sentence],
    metric: str,
    seed: int,
    resamples: int = 1000,
) -> tuple[float, float]:
    """A 95% percentile interval for one metric, resampling sentences."""
    rng = np.random.default_rng(seed)
    count = len(sentences)
    values = []
    for _ in range(resamples):
        index = rng.integers(0, count, count)
        values.append(scores(predicted[index], [sentences[i] for i in index])[metric])
    low, high = np.percentile(values, [2.5, 97.5])
    return float(low), float(high)


def annotator_agreement(sentences: Sequence[Sentence]) -> dict[str, float]:
    """How often annotator A matches annotator B: the human reference."""
    a, b, _ = references(sentences)
    return {
        "exact": float(np.mean(a == b)),
        "adjacent": float(np.mean(np.abs(a - b) <= 1)),
        "qwk": float(cohen_kappa_score(a, b, labels=LEVELS, weights="quadratic")),
    }


def confusion(predicted: np.ndarray, sentences: Sequence[Sentence]) -> list[list[int]]:
    _, _, high = references(sentences)
    return confusion_matrix(high, predicted, labels=LEVELS).tolist()
