import numpy as np
import pytest

from newslingo_ml.corpus import Sentence
from newslingo_ml.features import (
    FEATURE_NAMES,
    WordLevels,
    features,
    fk_grade,
    out_of_fold_matrix,
    sentence_words,
)
from newslingo_ml.metrics import annotator_agreement, scores
from newslingo_ml.sentence_eval import round_levels
from newslingo_ml.text import detokenize, syllables, words


def test_detokenize_joins_the_corpus_tokens_back():
    assert detokenize("He did n't go , and it 's ( mostly ) fine .") == (
        "He didn't go, and it's (mostly) fine."
    )


def test_words_match_for_corpus_and_article_text():
    corpus = sentence_words("The firm 's plan did n't work .")
    article = sentence_words("The firm’s plan didn't work.")
    assert corpus == article == ["the", "firm's", "plan", "didn't", "work"]


def test_words_skip_numbers_and_punctuation():
    assert words("In 2019, £20,000 was paid.") == ["in", "was", "paid"]


@pytest.mark.parametrize(
    ("word", "count"),
    [("cat", 1), ("make", 1), ("table", 2), ("chocolate", 3), ("the", 1), ("rhythm", 1)],
)
def test_syllables(word, count):
    assert syllables(word) == count


def test_word_levels_smooth_toward_the_mean():
    table = WordLevels.fit([["easy"], ["easy"], ["hard"]], [2.0, 2.0, 5.0], smoothing=1.0)
    assert table.global_mean == 3.0
    assert table.levels["easy"] == pytest.approx((4.0 + 3.0) / 3)
    assert table.levels["hard"] == pytest.approx((5.0 + 3.0) / 2)


def test_features_use_known_words_and_count_unknown_ones():
    table = WordLevels({"cat": 2.0, "philosophy": 5.0}, global_mean=3.0, smoothing=1.0)
    row = dict(zip(FEATURE_NAMES, features(["the", "cat", "philosophy"], table), strict=True))
    assert row["word_level_mean"] == pytest.approx(3.5)
    assert row["word_level_max"] == 5.0
    assert row["share_unknown"] == pytest.approx(1 / 3)
    assert row["fk_grade"] == pytest.approx(fk_grade(["the", "cat", "philosophy"]))


def test_out_of_fold_rows_never_use_their_own_label():
    # Each word occurs once, so out of fold every word is unknown.
    sentences = [[f"word{i}"] for i in range(10)]
    rows = out_of_fold_matrix(sentences, list(range(10)), smoothing=1.0, seed=1)
    assert np.all(rows[:, FEATURE_NAMES.index("share_unknown")] == 1.0)


def test_round_levels_rounds_half_up_and_clips():
    assert round_levels(np.array([0.2, 2.5, 3.5, 3.49, 7.0])).tolist() == [1, 3, 4, 3, 6]


def test_scores_credit_either_annotator():
    sentences = [Sentence("a", 3, 4), Sentence("b", 2, 2)]
    result = scores(np.array([3, 3]), sentences)
    assert result["either"] == 0.5
    assert result["exact"] == 0.0
    assert result["adjacent"] == 1.0
    assert annotator_agreement(sentences)["exact"] == 0.5
