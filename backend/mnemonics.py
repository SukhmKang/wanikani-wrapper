import json
import os

_mnemonics: dict = {}


def load_mnemonics() -> None:
    global _mnemonics
    path = os.path.join(os.path.dirname(__file__), "..", "kanji_mnemonics.json")
    try:
        with open(path, encoding="utf-8") as f:
            _mnemonics = json.load(f)
    except FileNotFoundError:
        _mnemonics = {}


def get_kanji_mnemonics(characters: str) -> list[dict]:
    """Return a mnemonic entry for each kanji character found in the string."""
    results = []
    seen = set()
    for char in characters:
        if char in seen:
            continue
        seen.add(char)
        entry = _mnemonics.get(char)
        if entry:
            results.append({
                "kanji": char,
                "mnemonic": entry.get("mnemonic", ""),
            })
    return results


load_mnemonics()
