"""Word and syllable handling.

Kept deliberately simple, because the app runs the classifier from Node and
needs a TypeScript copy of these rules that gives the same features.
"""

import re

# CEFR-SP is tokenized ("do n't", "chocolate ,"); article text is not. Joining
# the split forms back gives both the same words.
_DETOKENIZE = (
    (re.compile(r" (n't|'s|'re|'ve|'ll|'d|'m)(?![a-z])", re.IGNORECASE), r"\1"),
    (re.compile(r" ([,.;:!?%)\]])"), r"\1"),
    (re.compile(r"([(\[$]) "), r"\1"),
)
_WORD = re.compile(r"[a-z]+(?:'[a-z]+)*")
_VOWEL_GROUP = re.compile(r"[aeiouy]+")


def detokenize(sentence: str) -> str:
    for pattern, replacement in _DETOKENIZE:
        sentence = pattern.sub(replacement, sentence)
    return sentence


def words(text: str) -> list[str]:
    """Lower-case words: runs of letters, with inner apostrophes ("don't")."""
    return _WORD.findall(text.lower().replace("’", "'"))


def syllables(word: str) -> int:
    """A vowel-group estimate of a word's syllables, at least one."""
    bare = word.replace("'", "")
    count = len(_VOWEL_GROUP.findall(bare))
    # A final silent "e", as in "make", but not "le" as in "table".
    if count > 1 and bare.endswith("e") and not bare.endswith("le"):
        count -= 1
    return max(count, 1)
