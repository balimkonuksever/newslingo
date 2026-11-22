import numpy as np
import pytest

from newslingo_ml.corpus import Sentence
from newslingo_ml.extended import (
    EXTENDED_NAMES,
    Tables,
    extended_features,
    out_of_fold_extended_matrix,
    passives,
    word_pairs,
)
from newslingo_ml.features import WordLevels, sentence_words
from newslingo_ml.ordinal import apply_cutpoints, fit_cutpoints


def row(text: str, tables: Tables) -> dict[str, float]:
    values = extended_features(text, sentence_words(text), tables)
    return dict(zip(EXTENDED_NAMES, values, strict=True))


EMPTY = Tables(WordLevels({}, 3.0, 2.0), WordLevels({}, 3.0, 2.0))


def test_word_pairs_follow_the_sentence():
    assert word_pairs(["the", "old", "house"]) == ["the old", "old house"]


@pytest.mark.parametrize(
    ("text", "count"),
    [
        ("The bridge was built in 1900 .", 1),
        ("The letters were carefully written .", 1),
        ("She is happy .", 0),
        ("It was raining and they were sad .", 0),
        ("He was born here and was quickly knighted .", 2),
    ],
)
def test_passives(text, count):
    assert passives(sentence_words(text)) == count


def test_structure_features_count_punctuation_connectives_and_names():
    values = row(
        "However , the plan ( which Smith wrote in 2019 ) failed ; Paris objected .", EMPTY
    )
    assert values["commas"] == 1
    assert values["other_punctuation"] == 3  # ( ) ;
    assert values["share_connectives"] == pytest.approx(2 / 10)  # however, which
    assert values["share_capitalised"] == pytest.approx(2 / 10)  # Smith, Paris
    assert values["share_digits"] > 0


def test_pair_levels_use_known_pairs_and_count_unknown_ones():
    tables = Tables(
        WordLevels({"heavy": 4.0, "rain": 2.0}, 3.0, 2.0),
        WordLevels({"heavy rain": 5.0}, 3.0, 2.0),
    )
    values = row("Heavy rain fell .", tables)
    assert values["pair_level_max"] == 5.0
    assert values["share_unknown_pairs"] == pytest.approx(1 / 2)


def test_out_of_fold_rows_never_use_their_own_label():
    # Each word occurs in one sentence only, so out of fold every word is unknown.
    texts = [f"{'abcdefghij'[i] * 3}x {'klmnopqrst'[i] * 3}y ." for i in range(10)]
    targets = [1.0, 6.0] * 5
    rows = out_of_fold_extended_matrix(texts, targets, smoothing=2.0, seed=1)
    names = list(EXTENDED_NAMES)
    assert np.all(rows[:, names.index("share_unknown")] == 1.0)
    assert np.all(rows[:, names.index("share_unknown_pairs")] == 1.0)


def test_cutpoints_map_scores_to_levels():
    assert apply_cutpoints(np.array([1.0, 1.6, 3.49, 3.5, 9.0]), [1.5, 2.5, 3.5, 4.5, 5.5]).tolist() == [
        1, 2, 3, 4, 6
    ]


def test_fitted_cutpoints_move_to_where_the_levels_change():
    # Scores run high: level 3 sentences score about 3.8, level 4 about 4.8.
    scores = np.array([3.7, 3.8, 3.9, 4.7, 4.8, 4.9])
    level = np.array([3, 3, 3, 4, 4, 4])
    cuts = fit_cutpoints(scores, level, level)
    assert apply_cutpoints(scores, cuts).tolist() == level.tolist()
    assert cuts == sorted(cuts)


def test_sentence_targets_split_between_annotators():
    from newslingo_ml.transformer import decisions, soft_targets

    targets = soft_targets([Sentence("x", 3, 4), Sentence("y", 2, 2)])
    assert targets[0].tolist() == [0, 0, 0.5, 0.5, 0, 0]
    assert targets[1].tolist() == [0, 1.0, 0, 0, 0, 0]

    import torch

    # Most weight on B2, but the expected level is between B1 and B2.
    logits = torch.log(torch.tensor([[0.01, 0.01, 0.45, 0.5, 0.02, 0.01]]))
    chosen = decisions(logits)
    assert chosen["most likely"].tolist() == [4]
    assert chosen["expected"].tolist() == [4]
