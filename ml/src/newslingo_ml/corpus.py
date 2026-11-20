"""The pinned CEFR-SP files: download, digest check and loading.

The manifest in ml/data/cefr-sp.json names the source revision and each
file's SHA-256 digest. Every read checks the digest, so a changed or
truncated download is never trained or evaluated on.
"""

import hashlib
import json
import urllib.request
from dataclasses import dataclass
from pathlib import Path

ML_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ML_ROOT / "data" / "cefr-sp.json"
RAW_DIR = ML_ROOT / "data" / "raw" / "cefr-sp"
SPLITS = ("train", "dev", "test")
LEVELS = (1, 2, 3, 4, 5, 6)
LEVEL_NAMES = {1: "A1", 2: "A2", 3: "B1", 4: "B2", 5: "C1", 6: "C2"}


@dataclass(frozen=True)
class Sentence:
    """One annotated sentence, with both annotators' levels (1 = A1 … 6 = C2)."""

    text: str
    level_a: int
    level_b: int

    @property
    def high(self) -> int:
        """The higher of the two levels: the gold label for exact metrics."""
        return max(self.level_a, self.level_b)

    @property
    def mean(self) -> float:
        return (self.level_a + self.level_b) / 2


def load_manifest() -> dict:
    return json.loads(MANIFEST_PATH.read_text())


def raw_path(split: str) -> Path:
    return RAW_DIR / Path(load_manifest()["files"][split]["path"]).name


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fetch() -> None:
    """Download any missing file at the pinned revision, then check every digest."""
    manifest = load_manifest()
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for split in SPLITS:
        entry = manifest["files"][split]
        target = raw_path(split)
        if not target.exists():
            url = (
                "https://raw.githubusercontent.com/yukiar/CEFR-SP/"
                f"{manifest['revision']}/{entry['path']}"
            )
            with urllib.request.urlopen(url, timeout=60) as response:
                target.write_bytes(response.read())
        verify(split)
        print(f"{split}: {target.name} matches its recorded digest")


def verify(split: str) -> Path:
    entry = load_manifest()["files"][split]
    path = raw_path(split)
    if not path.exists():
        raise FileNotFoundError(f"{path} is missing: run python -I -m newslingo_ml.corpus")
    digest = sha256(path)
    if digest != entry["sha256"]:
        raise ValueError(f"{path.name} has digest {digest}, expected {entry['sha256']}")
    return path


def load(split: str) -> list[Sentence]:
    path = verify(split)
    sentences = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        fields = line.split("\t")
        if len(fields) != 3:
            raise ValueError(f"{path.name}:{number} has {len(fields)} fields, expected 3")
        text, a, b = fields
        level_a, level_b = int(a), int(b)
        if level_a not in LEVELS or level_b not in LEVELS:
            raise ValueError(f"{path.name}:{number} has a level outside 1–6")
        sentences.append(Sentence(text, level_a, level_b))
    expected = load_manifest()["files"][split]["rows"]
    if len(sentences) != expected:
        raise ValueError(f"{path.name} has {len(sentences)} rows, expected {expected}")
    return sentences


if __name__ == "__main__":
    fetch()
