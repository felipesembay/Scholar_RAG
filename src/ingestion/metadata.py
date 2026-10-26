"""Bibliographic metadata: PDF info dict, DOI found in the text, Crossref enrichment."""

import os
import re
from functools import lru_cache
from urllib.parse import quote

import httpx

DOI_RE = re.compile(r"\b(10\.\d{4,9}/[^\s\"'<>]+)", re.IGNORECASE)
CROSSREF_URL = "https://api.crossref.org/works/"
# placeholder values written by PDF generators (Word, LaTeX, scanners, reportlab...)
JUNK_VALUES = {"", "(anonymous)", "anonymous", "untitled", "unknown", "user", "admin", "author"}
JUNK_TITLE_RE = re.compile(
    r"^(microsoft (word|powerpoint) - |untitled|document\d*$|scan)", re.IGNORECASE
)


def _is_junk(value: str, path: str) -> bool:
    value = value.strip()
    stem = os.path.splitext(os.path.basename(path))[0]
    return value.lower() in JUNK_VALUES or value == stem or bool(JUNK_TITLE_RE.match(value))


def find_doi(text: str) -> str | None:
    match = DOI_RE.search(text)
    return match.group(1).rstrip(".,;:)]}") if match else None


def pdf_info(path: str) -> dict:
    import fitz

    with fitz.open(path) as pdf:
        info = pdf.metadata or {}
    meta = {}
    title = (info.get("title") or "").strip()
    if title and not _is_junk(title, path):
        meta["title"] = title
    authors = [a.strip() for a in re.split(r";|&| and ", info.get("author") or "") if a.strip()]
    authors = [a for a in authors if not _is_junk(a, path)]
    if authors:
        meta["authors"] = authors
    # creationDate is when the PDF file was made, not the publication year: never used as year
    return meta


@lru_cache(maxsize=1024)
def crossref_lookup(doi: str) -> dict:
    """Returns {} on any failure: enrichment must never break ingestion."""
    try:
        response = httpx.get(
            CROSSREF_URL + quote(doi), timeout=8, headers={"User-Agent": "ScholarRAG/0.1"}
        )
        response.raise_for_status()
        work = response.json()["message"]
    except Exception:
        return {}
    meta = {"doi": doi}
    if work.get("title"):
        meta["title"] = work["title"][0]
    authors = [
        ", ".join(p for p in (a.get("family"), a.get("given")) if p) for a in work.get("author", [])
    ]
    if any(authors):
        meta["authors"] = [a for a in authors if a]
    issued = (work.get("issued") or {}).get("date-parts") or [[None]]
    if issued[0][0]:
        meta["year"] = int(issued[0][0])
    if work.get("container-title"):
        meta["venue"] = work["container-title"][0]
    return meta


def build_metadata(path: str, blocks: list, parser_meta: dict, enrich: bool) -> dict:
    """Merges sources by reliability: Crossref > parser (Docling title) > PDF info dict."""
    meta = pdf_info(path) if path.lower().endswith(".pdf") else {}
    meta.update({k: v for k, v in parser_meta.items() if v})
    first_pages = "\n".join(b.text for b in blocks if (b.page or 1) <= 2)[:20000]
    doi = find_doi(first_pages)
    if doi:
        meta["doi"] = doi
        if enrich:
            meta.update(crossref_lookup(doi))
    return meta
