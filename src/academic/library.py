"""Project library: one bibliographic entry per literature file, in projects/<p>/library.json.

Entries are keyed by file name (what chunks carry in metadata.source), so editing an author
or year changes citations immediately, without re-indexing. Fields the user edited are
listed in entry["edited"] and survive re-indexing; citekeys never change once assigned.

Each entry has a role: "literature" (citable work, goes to the reference list) or "material"
(course slides, code, data, images: used as context, never cited as a work). The default comes
from the file type and name; the author can change it, and it applies at query time.
"""

import json
import os
import re

from academic.citations import STYLES, make_citekey

LIBRARY_FILE = "library.json"
EDITABLE_FIELDS = {
    "type", "authors", "title", "year", "venue", "volume", "issue", "pages", "publisher",
    "place", "edition", "editors", "doi", "url", "accessed", "degree", "institution",
    "page_offset", "role",
}  # fmt: skip
ENTRY_TYPES = {"article", "book", "chapter", "thesis", "web", "misc"}
BOOK_MIN_PAGES = 60
ROLES = {"literature", "material"}
MATERIAL_EXTENSIONS = {
    ".r", ".py", ".ipynb", ".rmd", ".qmd",  # code and notebooks
    ".csv", ".xlsx", ".xls", ".json", ".yaml", ".yml",  # data
    ".pptx", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp",  # slides and images
}  # fmt: skip
MATERIAL_NAME_RE = re.compile(
    r"\b(aulas?|slides?|lista|exerc[ií]cios?|atividades?|apostila|lecture|notas de aula)\b",
    re.IGNORECASE,
)


def default_role(source: str) -> str:
    """Material for code, data, slides and images, and for PDFs named like class material."""
    if os.path.splitext(source)[1].lower() in MATERIAL_EXTENSIONS:
        return "material"
    stem = re.sub(r"[_\-]+", " ", os.path.splitext(source)[0])
    return "material" if MATERIAL_NAME_RE.search(stem) else "literature"


def role_of(library: dict, source: str) -> str:
    """Role of a library file; entries created before roles existed fall back to the default."""
    entry = library.get("entries", {}).get(source) or {}
    return entry.get("role") or default_role(source)


def library_path(project_dir: str) -> str:
    return os.path.join(project_dir, LIBRARY_FILE)


def load_library(project_dir: str) -> dict:
    path = library_path(project_dir)
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {"style": "abnt", "entries": {}}


def save_library(project_dir: str, library: dict) -> None:
    with open(library_path(project_dir), "w", encoding="utf-8") as f:
        json.dump(library, f, ensure_ascii=False, indent=2)


def _title_from_filename(source: str) -> str:
    stem = os.path.splitext(source)[0]
    stem = re.sub(r"\s*\((z-lib\.org|libgen[^)]*)\)", "", stem, flags=re.IGNORECASE)
    return re.sub(r"[_\s]+", " ", stem).strip()


def entry_from_parsed(parsed) -> dict:
    meta = parsed.metadata
    pdf_pages = max((b.page or 0 for b in parsed.blocks), default=0)
    if meta.get("venue"):
        kind = "article"
    elif pdf_pages >= BOOK_MIN_PAGES:
        kind = "book"
    else:
        kind = "misc"
    entry = {
        "type": kind,
        "title": meta.get("title") or _title_from_filename(parsed.source),
        "authors": list(meta.get("authors") or []),
        "year": meta.get("year"),
        "venue": meta.get("venue"),
        "doi": meta.get("doi"),
        "pdf_pages": pdf_pages or None,
        "parser": parsed.parser,
        "role": default_role(parsed.source),
    }
    return {k: v for k, v in entry.items() if v not in (None, "", [])}


def sync_library(project_dir: str, parsed_docs: list) -> dict:
    """Creates/refreshes entries for the given literature files; drops entries of removed files."""
    library = load_library(project_dir)
    old = library.get("entries", {})
    taken = {e["citekey"] for s, e in old.items() if e.get("citekey")}
    entries = {}
    for parsed in parsed_docs:
        auto = entry_from_parsed(parsed)
        previous = old.get(parsed.source)
        if previous:
            edited = previous.get("edited", [])
            entry = {**auto, **{k: previous[k] for k in edited if k in previous}}
            entry.update(citekey=previous["citekey"], edited=edited)
        else:
            entry = {**auto, "edited": []}
            entry["citekey"] = make_citekey(entry, taken)
            taken.add(entry["citekey"])
        entries[parsed.source] = entry
    library["entries"] = entries
    save_library(project_dir, library)
    return library


def update_entry(project_dir: str, source: str, fields: dict) -> dict:
    library = load_library(project_dir)
    entry = library["entries"].get(source)
    if entry is None:
        raise KeyError(source)
    unknown = set(fields) - EDITABLE_FIELDS
    if unknown:
        raise ValueError(f"Campos não editáveis: {sorted(unknown)}")
    if "type" in fields and fields["type"] not in ENTRY_TYPES:
        raise ValueError(f"Tipo inválido: {fields['type']}")
    if "role" in fields and fields["role"] not in ROLES:
        raise ValueError(f"Papel inválido: {fields['role']} (use literature ou material)")
    for key, value in fields.items():
        if value in (None, "", []):
            entry.pop(key, None)
        else:
            entry[key] = value
    entry["edited"] = sorted(set(entry.get("edited", [])) | set(fields))
    save_library(project_dir, library)
    return entry


def set_style(project_dir: str, style: str) -> None:
    if style not in STYLES:
        raise ValueError(f"Estilo inválido: {style} (use {', '.join(STYLES)})")
    library = load_library(project_dir)
    library["style"] = style
    save_library(project_dir, library)
