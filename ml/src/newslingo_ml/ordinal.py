"""Cut points that turn a regression score into a level.

Rounding a score at x.5 treats every level as equally wide, which the data
need not agree with. The cut points here are fit on out-of-fold predictions
for the training split, never on the validation or test split.
"""

from collections.abc import Sequence

import numpy as np

LEVEL_COUNT = 6


def apply_cutpoints(scores: np.ndarray, cuts: Sequence[float]) -> np.ndarray:
    """Level 1 below the first cut, level 2 below the second, and so on."""
    return np.searchsorted(np.asarray(cuts), scores, side="right") + 1


def either_accuracy(predicted: np.ndarray, level_a: np.ndarray, level_b: np.ndarray) -> float:
    return float(np.mean((predicted == level_a) | (predicted == level_b)))


def fit_cutpoints(
    scores: np.ndarray,
    level_a: np.ndarray,
    level_b: np.ndarray,
    passes: int = 4,
    limit: int = 400,
) -> list[float]:
    """Coordinate ascent on either-annotator accuracy, from the rounding cuts.

    Each cut tries the midpoints between neighbouring scores, so no score ever
    sits exactly on a cut, where a rounding error could tip its level.
    """
    values = np.unique(scores)
    cuts = [level + 0.5 for level in range(1, LEVEL_COUNT)]
    best = either_accuracy(apply_cutpoints(scores, cuts), level_a, level_b)
    for _ in range(passes):
        for k in range(len(cuts)):
            low = cuts[k - 1] if k > 0 else min(values[0], cuts[k]) - 1.0
            high = cuts[k + 1] if k < len(cuts) - 1 else max(values[-1], cuts[k]) + 1.0
            edges = np.concatenate(([low], values[(values > low) & (values < high)], [high]))
            options = (edges[:-1] + edges[1:]) / 2
            if len(options) > limit:
                options = options[np.linspace(0, len(options) - 1, limit).astype(int)]
            for value in options:
                trial = cuts[:k] + [float(value)] + cuts[k + 1 :]
                accuracy = either_accuracy(apply_cutpoints(scores, trial), level_a, level_b)
                if accuracy > best + 1e-12:
                    best, cuts = accuracy, trial
    return cuts
