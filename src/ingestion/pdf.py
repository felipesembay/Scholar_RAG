"""Fast PDF path: pdfplumber per page (text + tables), Tesseract only for pages without text."""

import fitz  # PyMuPDF: page rendering for OCR
import pdfplumber

from ingestion.models import Block
from ingestion.ocr import ocr_pdf_page
from ingestion.text_utils import clean_text, rows_to_markdown


def _outside(bboxes):
    def keep(obj):
        if "x0" not in obj or "top" not in obj:
            return True
        cx, cy = (obj["x0"] + obj["x1"]) / 2, (obj["top"] + obj["bottom"]) / 2
        return not any(x0 <= cx <= x1 and top <= cy <= bottom for x0, top, x1, bottom in bboxes)

    return keep


def _table_block(rows: list[list], page: int) -> Block | None:
    """Real tables become markdown; layout boxes / header-only / sparse grids become text."""
    rows = [["" if c is None else " ".join(str(c).split()) for c in r] for r in rows or []]
    rows = [r for r in rows if any(r)]
    if not rows:
        return None
    cells = [c for r in rows for c in r]
    sparse = sum(not c for c in cells) > len(cells) / 2
    if len(rows[0]) < 2 or len(rows) < 2 or sparse:
        text = clean_text("\n".join(" ".join(c for c in r if c) for r in rows))
        return Block(text, page=page) if text else None
    return Block(rows_to_markdown(rows), page=page, kind="table")


def parse_pdf(path: str, cfg: dict) -> tuple[list[Block], list[int]]:
    blocks, ocr_pages = [], []
    with pdfplumber.open(path) as pdf, fitz.open(path) as rendered:
        for number, page in enumerate(pdf.pages, start=1):
            tables = page.find_tables()
            table_blocks = [b for t in tables if (b := _table_block(t.extract(), number))]
            bboxes = [t.bbox for t in tables]
            text_page = page.filter(_outside(bboxes)) if bboxes else page
            text, kind = clean_text(text_page.extract_text() or ""), "text"

            native_chars = len(text) + sum(len(b.text) for b in table_blocks)
            if native_chars < cfg["ocr_min_chars"]:  # scanned page (or image-only)
                ocr_text = ocr_pdf_page(rendered[number - 1], cfg["ocr_lang"], cfg["ocr_dpi"])
                if len(ocr_text) > native_chars:
                    text, kind, table_blocks = ocr_text, "ocr", []
                    ocr_pages.append(number)

            if text:
                blocks.append(Block(text, page=number, kind=kind))
            blocks.extend(table_blocks)
    return blocks, ocr_pages
