"""Parsers for non-PDF formats. Each returns blocks in reading order."""

import json
import os
import re

import pandas as pd
import yaml

from ingestion.models import Block
from ingestion.ocr import ocr_image_file
from ingestion.text_utils import clean_text, rows_to_markdown

TABLE_ROWS_PER_BLOCK = 40  # big sheets become several table blocks, each with the header
SAMPLE_ROWS = 30  # rows kept from tables larger than cfg["max_table_rows"]
EMPTY_CELLS = {"", "nan", "none"}
ZERO_CELLS = {"0", "0.0"}


def _is_blank_row(row: list[str]) -> bool:
    """Empty, or only zeros next to empty cells (unfilled formula rows in form templates)."""
    values = [c.lower() for c in row]
    if all(v in EMPTY_CELLS for v in values):
        return True
    return all(v in EMPTY_CELLS | ZERO_CELLS for v in values) and any(
        v in EMPTY_CELLS for v in values
    )


def _table_blocks(rows: list[list], section: str | None, max_rows: int) -> list[Block]:
    """Cleans raw sheet rows; large data dumps are summarized instead of fully indexed."""
    rows = [["" if v is None else str(v).strip() for v in row] for row in rows]
    rows = [r for r in rows if not _is_blank_row(r)]
    if not rows:
        return []
    width = max(len(r) for r in rows)
    keep = [j for j in range(width) if any(j < len(r) and r[j] for r in rows)]
    rows = [[r[j] if j < len(r) else "" for j in keep] for r in rows]
    header, body = rows[0], rows[1:]

    if len(body) > max_rows:
        note = (
            f"Tabela grande: {len(body)} linhas x {len(header)} colunas "
            f"({', '.join(c for c in header if c)}). Amostra das primeiras {SAMPLE_ROWS} linhas."
        )
        return [
            Block(note, section=section),
            Block(rows_to_markdown([header] + body[:SAMPLE_ROWS]), kind="table", section=section),
        ]
    return [
        Block(
            rows_to_markdown([header] + body[i : i + TABLE_ROWS_PER_BLOCK]),
            kind="table",
            section=section,
        )
        for i in range(0, max(len(body), 1), TABLE_ROWS_PER_BLOCK)
    ]


def parse_docx(path: str, cfg: dict) -> list[Block]:
    import docx
    from docx.oxml.ns import qn
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    document = docx.Document(path)
    blocks, section = [], None
    for child in document.element.body.iterchildren():
        if child.tag == qn("w:p"):
            paragraph = Paragraph(child, document)
            text = clean_text(paragraph.text)
            if not text:
                continue
            style = (paragraph.style.name or "").lower() if paragraph.style is not None else ""
            if style.startswith(("heading", "título", "titulo", "title")):
                section = text
            blocks.append(Block(text, section=section))
        elif child.tag == qn("w:tbl"):
            rows = [[cell.text for cell in row.cells] for row in Table(child, document).rows]
            markdown = rows_to_markdown(rows)
            if markdown:
                blocks.append(Block(markdown, kind="table", section=section))
    return blocks


def parse_pptx(path: str, cfg: dict) -> list[Block]:
    from pptx import Presentation

    blocks = []
    for number, slide in enumerate(Presentation(path).slides, start=1):
        title = slide.shapes.title.text.strip() if slide.shapes.title is not None else None
        texts = []
        for shape in slide.shapes:
            if shape.has_text_frame and shape.text_frame.text.strip():
                texts.append(shape.text_frame.text)
            elif getattr(shape, "has_table", False) and shape.has_table:
                rows = [[cell.text for cell in row.cells] for row in shape.table.rows]
                blocks.append(
                    Block(rows_to_markdown(rows), page=number, kind="table", section=title)
                )
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame.text.strip():
            texts.append("Notas: " + slide.notes_slide.notes_text_frame.text)
        text = clean_text("\n".join(texts))
        if text:
            blocks.append(Block(text, page=number, section=title))
    return blocks


def parse_spreadsheet(path: str, cfg: dict) -> list[Block]:
    max_rows = cfg.get("max_table_rows", 200)
    if path.lower().endswith(".csv"):
        df = pd.read_csv(path, encoding="utf-8", sep=None, engine="python", header=None, dtype=str)
        return _table_blocks(df.fillna("").values.tolist(), None, max_rows)
    if path.lower().endswith(".xls"):
        sheets = pd.read_excel(path, sheet_name=None, header=None, dtype=str)
        return [
            b
            for name, df in sheets.items()
            for b in _table_blocks(df.fillna("").values.tolist(), str(name), max_rows)
        ]

    from openpyxl import load_workbook

    # data_only: cached formula results instead of formulas; hidden sheets are skipped
    workbook = load_workbook(path, data_only=True, read_only=False)
    blocks = []
    for sheet in workbook.worksheets:
        if sheet.sheet_state != "visible":
            continue
        blocks += _table_blocks(list(sheet.iter_rows(values_only=True)), sheet.title, max_rows)
    workbook.close()
    return blocks


def parse_odt(path: str, cfg: dict) -> list[Block]:
    import odf.opendocument
    from odf import teletype

    def walk(node):  # paragraphs/headings in document order (tables, lists, frames included)
        for child in node.childNodes:
            if getattr(child, "qname", (None, None))[1] in {"p", "h"}:
                yield child
            elif getattr(child, "childNodes", None):
                yield from walk(child)

    document = odf.opendocument.load(path)
    blocks, section = [], None
    for element in walk(document.text):
        text = clean_text(teletype.extractText(element))
        if not text:
            continue
        if element.qname[1] == "h":
            section = text
        blocks.append(Block(text, section=section))
    return blocks


def parse_text(path: str, cfg: dict) -> list[Block]:
    with open(path, encoding="utf-8", errors="replace") as f:
        raw = f.read()
    if path.lower().endswith((".json",)):
        raw = json.dumps(json.loads(raw), ensure_ascii=False, indent=1)
    elif path.lower().endswith((".yaml", ".yml")):
        raw = yaml.dump(yaml.safe_load(raw), allow_unicode=True)

    blocks, section = [], None
    for paragraph in re.split(r"\n\s*\n", raw):
        text = clean_text(paragraph)
        if not text:
            continue
        heading = re.match(r"^#{1,6}\s+(.+)", text)  # markdown headings
        if heading:
            section = heading.group(1).strip()
        blocks.append(Block(text, section=section))
    return blocks


def parse_notebook(path: str, cfg: dict) -> list[Block]:
    """Jupyter notebook: markdown cells as text (headings become sections), code cells as code."""
    with open(path, encoding="utf-8", errors="replace") as f:
        cells = json.load(f).get("cells", [])
    blocks, section = [], None
    for cell in cells:
        source = cell.get("source", "")
        source = "".join(source) if isinstance(source, list) else str(source)
        if not source.strip():
            continue
        if cell.get("cell_type") == "markdown":
            for paragraph in re.split(r"\n\s*\n", source):
                text = clean_text(paragraph)
                heading = re.match(r"^#{1,6}\s+(.+)", text)
                if heading:
                    section = heading.group(1).strip()
                if text:
                    blocks.append(Block(text, section=section))
        elif cell.get("cell_type") == "code":
            blocks.append(Block(f"Código:\n{source.strip()}", section=section))
    return blocks


def parse_code(path: str, cfg: dict) -> list[Block]:
    """R / Python scripts: kept whole per blank-line block, comments included."""
    with open(path, encoding="utf-8", errors="replace") as f:
        raw = f.read()
    label = {".r": "Código R", ".py": "Código Python"}.get(os.path.splitext(path)[1].lower(), "Código")
    return [
        Block(f"{label}:\n{chunk.strip()}")
        for chunk in re.split(r"\n\s*\n\s*\n", raw)
        if chunk.strip()
    ]


def parse_html(path: str, cfg: dict) -> list[Block]:
    from bs4 import BeautifulSoup

    with open(path, encoding="utf-8", errors="replace") as f:
        soup = BeautifulSoup(f.read(), "html.parser")
    for tag in soup(["script", "style", "nav", "footer"]):
        tag.decompose()
    blocks, section = [], None
    for element in soup.find_all(["h1", "h2", "h3", "h4", "p", "li", "table"]):
        if element.name == "table":
            rows = [
                [c.get_text(" ") for c in tr.find_all(["th", "td"])]
                for tr in element.find_all("tr")
            ]
            markdown = rows_to_markdown(rows)
            if markdown:
                blocks.append(Block(markdown, kind="table", section=section))
            continue
        text = clean_text(element.get_text(" "))
        if not text:
            continue
        if element.name in {"h1", "h2", "h3", "h4"}:
            section = text
        blocks.append(Block(text, section=section))
    return blocks


def parse_image(path: str, cfg: dict) -> list[Block]:
    return [
        Block(text, page=i, kind="ocr")
        for i, text in enumerate(ocr_image_file(path, cfg["ocr_lang"]), start=1)
        if text
    ]
