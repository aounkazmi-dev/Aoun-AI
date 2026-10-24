import math
from pathlib import Path

import pytest

from backend import kb
from backend.config import settings


def document(path: Path, text: str, public=True):
    path.write_text(
        f"---\nvisibility: {'public' if public else 'private'}\n---\n# Example\n\n{text}", encoding="utf-8"
    )


def test_privacy_comments_and_explicit_visibility(tmp_path):
    document(
        tmp_path / "public.md",
        "## Contact\nEmail: public@example.com\nPhone: private-value\n<!-- secret draft -->",
    )
    document(tmp_path / "private.md", "private details", public=False)
    (tmp_path / "unmarked.md").write_text("# Unmarked\nnot approved", encoding="utf-8")
    chunks = kb.build_chunks(tmp_path)
    assert len(chunks) == 1
    assert "public@example.com" in chunks[0].text
    assert "private-value" not in chunks[0].text
    assert "secret draft" not in chunks[0].text


def test_long_paragraph_and_short_facts_are_preserved(tmp_path):
    document(tmp_path / "long.md", "## Fact\nYes.\n## Long\n" + "x" * 5000)
    chunks = kb.build_chunks(tmp_path)
    assert all(len(c.text) <= kb.MAX_CHUNK_CHARS for c in chunks)
    assert any("Yes." in c.text for c in chunks)
    assert sum(c.text.split("\n\n", 1)[1].count("x") for c in chunks if c.section == "Long") == 5000


def test_content_ids_do_not_shift_with_unrelated_documents(tmp_path):
    document(tmp_path / "z.md", "## Evidence\nThis is a fact.")
    original = kb.build_chunks(tmp_path)[0].id
    document(tmp_path / "a.md", "Earlier document")
    assert next(c.id for c in kb.build_chunks(tmp_path) if c.source == "z.md") == original


def test_private_core_profile_is_rejected(tmp_path, monkeypatch):
    document(tmp_path / "profile.md", "Private profile", public=False)
    monkeypatch.setenv("KB_DIR", str(tmp_path))
    settings.cache_clear()
    with pytest.raises(ValueError, match="not explicitly public"):
        kb.load_core_profile()


@pytest.mark.parametrize("vector,dimensions", [([0, 0], 2), ([1, 2], 3), ([float("nan")], 1)])
def test_bad_vectors_rejected(vector, dimensions):
    with pytest.raises(ValueError):
        kb.normalize(vector, dimensions)


def test_normalize():
    result = kb.normalize([3, 4], 2)
    assert result == [0.6, 0.8]
    assert math.isclose(sum(v * v for v in result), 1)


def test_corpus_has_no_phone_fields():
    chunks = kb.build_chunks()
    assert len({c.source for c in chunks}) == 16
    assert not any("Phone:" in c.text for c in chunks)
