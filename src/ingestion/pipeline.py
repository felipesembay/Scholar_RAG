"""Chooses a parser per file type and returns a ParsedDocument with blocks + metadata."""

import os

from core.config import load_parameters
from ingestion import office
from ingestion.metadata import build_metadata
from ingestion.models import ParsedDocument

DEFAULTS = {
    "pdf_engine": "pdfplumber",  # pdfplumber (fast) | docling (layout-aware)
    "docling_ocr": "tesseract",  # tesseract | easyocr
    "ocr_lang": "por+eng",
    "ocr_min_chars": 50,  # pages with less native text than this are OCR'd
    "ocr_dpi": 300,
    "enrich_doi": True,
    "max_table_rows": 200,  # larger tables (data dumps) are indexed as summary + sample
}

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}
PARSERS = {
    ".docx": office.parse_docx,
    ".pptx": office.parse_pptx,
    ".xlsx": office.parse_spreadsheet,
    ".xls": office.parse_spreadsheet,
    ".csv": office.parse_spreadsheet,
    ".odt": office.parse_odt,
    ".html": office.parse_html,
    ".htm": office.parse_html,
    **{
        ext: office.parse_text
        for ext in (".txt", ".md", ".json", ".yaml", ".yml", ".rmd", ".qmd", ".tex")
    },
    ".ipynb": office.parse_notebook,
    **{ext: office.parse_code for ext in (".r", ".py")},
    **{ext: office.parse_image for ext in IMAGE_EXTENSIONS},
}
SUPPORTED_EXTENSIONS = {".pdf"} | set(PARSERS)


def ingestion_config(overrides: dict | None = None) -> dict:
    cfg = dict(DEFAULTS)
    cfg.update(load_parameters().get("Ingestion") or {})
    cfg.update(overrides or {})
    return cfg


def parse_file(path: str, cfg: dict | None = None) -> ParsedDocument | None:
    """Parses a file; returns None for unsupported types or files without text."""
    cfg = cfg or ingestion_config()
    ext = os.path.splitext(path)[1].lower()
    parser_meta, ocr_pages = {}, []

    if ext == ".pdf" and cfg["pdf_engine"] == "docling":
        from ingestion.docling_parser import parse_with_docling

        blocks, parser_meta = parse_with_docling(path, cfg)
        parser = f"docling+{cfg['docling_ocr']}"
        ocr_pages = sorted({b.page for b in blocks if b.kind == "ocr" and b.page})
    elif ext == ".pdf":
        from ingestion.pdf import parse_pdf

        blocks, ocr_pages = parse_pdf(path, cfg)
        parser = "pdfplumber+tesseract" if ocr_pages else "pdfplumber"
    elif ext in PARSERS:
        blocks = PARSERS[ext](path, cfg)
        parser = (
            "tesseract" if ext in IMAGE_EXTENSIONS else PARSERS[ext].__name__.removeprefix("parse_")
        )
    else:
        return None

    if not blocks:
        return None
    return ParsedDocument(
        source=os.path.basename(path),
        blocks=blocks,
        parser=parser,
        metadata=build_metadata(path, blocks, parser_meta, cfg["enrich_doi"]),
        ocr_pages=ocr_pages,
    )


def document_text(parsed: ParsedDocument) -> str:
    return "\n\n".join(block.text for block in parsed.blocks)
