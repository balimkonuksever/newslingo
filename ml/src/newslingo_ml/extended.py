"""Extended sentence features: the basic ones, plus word pairs and structure.

Every feature is a plain rule over a sentence's words and punctuation, so the
app can run a TypeScript copy of it. Word-pair levels, like word levels, come
from the training split only, and out of fold for training sentences, so no
sentence's own label leaks into its features.
"""

import re
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from sklearn.model_selection import KFold

from newslingo_ml.features import FEATURE_NAMES, WordLevels, features, sentence_words
from newslingo_ml.text import detokenize

EXTENDED_NAMES = FEATURE_NAMES + (
    "word_level_median",
    "word_level_second",
    "share_hard_words",
    "pair_level_mean",
    "pair_level_max",
    "share_unknown_pairs",
    "commas",
    "other_punctuation",
    "share_connectives",
    "passives",
    "share_digits",
    "share_capitalised",
    "share_very_long",
)

# A word at or above this level (between B2 and C1) counts as hard.
HARD_WORD = 4.5
VERY_LONG_WORD = 10

# Words that join clauses or ideas; learners meet most of them late.
CONNECTIVES = frozenset(
    {
        "although", "though", "whereas", "while", "whilst", "because", "unless",
        "whether", "whenever", "wherever", "until", "since", "once", "which",
        "whom", "whose", "however", "therefore", "moreover", "furthermore",
        "nevertheless", "nonetheless", "despite", "thus", "hence", "whereby",
        "albeit", "notwithstanding", "accordingly", "consequently",
    }
)
BE_FORMS = frozenset({"is", "are", "was", "were", "be", "been", "being"})
IRREGULAR_PARTICIPLES = frozenset(
    {
        "born", "built", "known", "given", "taken", "made", "written", "seen",
        "found", "held", "led", "won", "sold", "shown", "done", "left", "kept",
        "brought", "bought", "caught", "taught", "thought", "told", "sent",
        "spent", "set", "put", "run", "drawn", "grown", "thrown", "chosen",
        "spoken", "broken", "stolen", "beaten", "hidden", "forgotten", "begun",
        "sung", "hung", "struck", "bound", "laid", "paid", "said", "heard",
        "felt", "lost", "meant", "met", "read", "understood", "worn", "torn",
    }
)

_TOKEN = re.compile(r"\S+")
_OTHER_PUNCTUATION = re.compile(r"[;:()\[\]\"“”–—]|(?<=\s)-(?=\s)")
# A capitalised word that does not start the sentence: mostly names.
_CAPITALISED = re.compile(r"(?<=\s)[A-Z][a-z]+")


def word_pairs(sentence: Sequence[str]) -> list[str]:
    return [f"{first} {second}" for first, second in zip(sentence, sentence[1:])]


def passives(sentence: Sequence[str]) -> int:
    """A form of "be" followed, perhaps after an -ly word, by a participle."""
    count = 0
    for index, word in enumerate(sentence):
        if word not in BE_FORMS:
            continue
        following = sentence[index + 1 : index + 3]
        if following and following[0].endswith("ly") and len(following) > 1:
            following = following[1:]
        if following and (
            following[0].endswith("ed") or following[0] in IRREGULAR_PARTICIPLES
        ):
            count += 1
    return count


@dataclass(frozen=True)
class Tables:
    """Word levels and word-pair levels, both fit on training sentences."""

    words: WordLevels
    pairs: WordLevels

    @classmethod
    def fit(
        cls,
        sentences: Sequence[Sequence[str]],
        targets: Sequence[float],
        smoothing: float,
    ) -> "Tables":
        return cls(
            WordLevels.fit(sentences, targets, smoothing),
            WordLevels.fit([word_pairs(s) for s in sentences], targets, smoothing),
        )


def extended_features(text: str, sentence: Sequence[str], tables: Tables) -> list[float]:
    basic = features(sentence, tables.words)
    count = max(len(sentence), 1)
    plain = detokenize(text)
    tokens = _TOKEN.findall(plain)

    known = sorted(
        (tables.words.levels[w] for w in sentence if w in tables.words.levels), reverse=True
    ) or [tables.words.global_mean]
    pairs = word_pairs(sentence)
    known_pairs = [tables.pairs.levels[p] for p in pairs if p in tables.pairs.levels] or [
        tables.pairs.global_mean
    ]

    return basic + [
        float(np.median(known)),
        known[1] if len(known) > 1 else known[0],
        sum(1 for level in known if level >= HARD_WORD) / len(known),
        sum(known_pairs) / len(known_pairs),
        max(known_pairs),
        sum(1 for p in pairs if p not in tables.pairs.levels) / max(len(pairs), 1),
        float(plain.count(",")),
        float(len(_OTHER_PUNCTUATION.findall(plain))),
        sum(1 for w in sentence if w in CONNECTIVES) / count,
        float(passives(sentence)),
        sum(1 for t in tokens if any(c.isdigit() for c in t)) / max(len(tokens), 1),
        len(_CAPITALISED.findall(plain)) / count,
        sum(1 for w in sentence if len(w.replace("'", "")) >= VERY_LONG_WORD) / count,
    ]


def extended_matrix(texts: Sequence[str], tables: Tables) -> np.ndarray:
    return np.array(
        [extended_features(text, sentence_words(text), tables) for text in texts]
    )


def out_of_fold_extended_matrix(
    texts: Sequence[str],
    targets: Sequence[float],
    smoothing: float,
    seed: int,
    folds: int = 5,
) -> np.ndarray:
    """Training features, each row's word and pair levels fit without that row."""
    targets = np.asarray(targets, dtype=float)
    sentences = [sentence_words(text) for text in texts]
    rows = np.zeros((len(texts), len(EXTENDED_NAMES)))
    splitter = KFold(n_splits=folds, shuffle=True, random_state=seed)
    for fit_index, held_index in splitter.split(rows):
        tables = Tables.fit([sentences[i] for i in fit_index], targets[fit_index], smoothing)
        for i in held_index:
            rows[i] = extended_features(texts[i], sentences[i], tables)
    return rows
