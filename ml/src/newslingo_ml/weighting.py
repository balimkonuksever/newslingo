"""Loss weights that make rare CEFR levels count for more in training.

The CEFR-SP paper (Arase et al., 2022) weights each level's loss by its
smoothed frequency over its frequency: with ratio_i the share of training
labels at level i, the weight is (ratio_i ** alpha / sum_j ratio_j ** alpha)
/ ratio_i. Alpha 1 weights every level equally; alpha 0 weights by inverse
frequency. The paper chose 0.2 on its validation split. The frequency-weighted
mean of the weights is 1, so the loss keeps its scale.
"""

from collections.abc import Sequence

import numpy as np

from newslingo_ml.corpus import LEVELS, Sentence

EPSILON = 1e-5


def label_counts(sentences: Sequence[Sentence]) -> np.ndarray:
    """How many training labels each level has, counting annotator B's level
    only where it differs from annotator A's, as the paper's code does."""
    counts = np.zeros(len(LEVELS))
    for sentence in sentences:
        counts[sentence.level_a - 1] += 1
        if sentence.level_b != sentence.level_a:
            counts[sentence.level_b - 1] += 1
    return counts


def class_weights(sentences: Sequence[Sentence], alpha: float) -> np.ndarray:
    ratio = label_counts(sentences)
    ratio = ratio / ratio.sum()
    smoothed = ratio**alpha / np.sum(ratio**alpha)
    return smoothed / (ratio + EPSILON)
