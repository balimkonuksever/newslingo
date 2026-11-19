import numpy as np
import pytest

from newslingo_ml.corpus import Sentence
from newslingo_ml.metrics import level_f1, paper_gold, scores
from newslingo_ml.weighting import class_weights, label_counts


def test_paper_gold_uses_the_matched_annotator_and_breaks_ties_toward_lower():
    sentences = [Sentence("a", 3, 4), Sentence("b", 2, 3), Sentence("c", 5, 5), Sentence("d", 1, 2)]
    # a matches the higher level, b the lower; c and d miss. The predictions
    # match lower and higher levels once each, so misses take the lower level.
    assert paper_gold(np.array([4, 2, 4, 3]), sentences).tolist() == [4, 2, 5, 1]


def test_paper_gold_misses_take_the_side_matched_more_often():
    sentences = [Sentence("a", 3, 4), Sentence("b", 2, 3), Sentence("c", 1, 2)]
    assert paper_gold(np.array([4, 3, 4]), sentences).tolist() == [4, 3, 2]


def test_paper_macro_f1_credits_either_annotator():
    sentences = [Sentence("a", 1, 2), Sentence("b", 4, 5), Sentence("c", 6, 6)]
    predicted = np.array([2, 4, 6])
    result = scores(predicted, sentences)
    assert result["either"] == 1.0
    assert result["macro_f1_paper"] == 1.0
    assert result["macro_f1"] < 1.0
    assert level_f1(predicted, sentences) == {1: 0.0, 2: 1.0, 3: 0.0, 4: 1.0, 5: 0.0, 6: 1.0}


def test_label_counts_count_annotator_b_only_when_it_differs():
    counts = label_counts([Sentence("a", 3, 4), Sentence("b", 3, 3)])
    assert counts.tolist() == [0, 0, 2, 1, 0, 0]


SKEWED = (
    [Sentence("a", 1, 1)] * 2
    + [Sentence("b", 2, 2)] * 6
    + [Sentence("c", 3, 3)] * 30
    + [Sentence("d", 4, 4)] * 40
    + [Sentence("e", 5, 5)] * 20
    + [Sentence("f", 6, 6)] * 2
)


def test_alpha_one_weights_every_level_equally():
    assert class_weights(SKEWED, 1.0) == pytest.approx(np.ones(6), rel=1e-3)


def test_alpha_zero_weights_by_inverse_frequency():
    weights = class_weights(SKEWED, 0.0)
    ratio = label_counts(SKEWED) / len(SKEWED)
    assert weights == pytest.approx(1 / (6 * ratio), rel=1e-3)


def test_batch_parts_add_up_to_the_whole_batch_loss():
    import torch

    from newslingo_ml.transformer import part_loss

    torch.manual_seed(0)
    logits = torch.randn(7, 6)
    targets = torch.softmax(torch.randn(7, 6), dim=-1)
    weights = torch.tensor([3.0, 2.0, 1.0, 0.5, 1.0, 2.5])
    whole = part_loss(logits, targets, weights, 7)
    parts = part_loss(logits[:4], targets[:4], weights, 7) + part_loss(logits[4:], targets[4:], weights, 7)
    assert float(parts) == pytest.approx(float(whole), rel=1e-6)


def test_rare_levels_weigh_more_and_the_mean_weight_stays_one():
    weights = class_weights(SKEWED, 0.2)
    ratio = label_counts(SKEWED) / len(SKEWED)
    assert weights[0] > weights[1] > weights[2] > weights[3]
    assert float(ratio @ weights) == pytest.approx(1.0, rel=1e-3)
