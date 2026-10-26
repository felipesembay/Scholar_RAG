"""Imports the author's own draft (DOCX, PDF or Markdown) as markdown sections.

Unlike ingestion (which feeds retrieval), this keeps the document as the author wrote it:
headings split the sections, tables become markdown tables instead of loose text, bold and
italic survive, lists stay lists and figures leave a visible placeholder. Nothing is saved
here: the screen previews the sections and the author decides where each one goes.
"""

import os
import re

from ingestion.text_utils import rows_to_markdown

IMPORT_EXTENSIONS = {".docx", ".pdf", ".md", ".markdown", ".txt"}
FIGURE_PLACEHOLDER = "*[figura não importada]*"
INTRO_TITLE = "Texto inicial"


def _heading_level(style_name: str) -> int | None:
    """'Heading 2' / 'Título 2' -> 2; 'Title' / 'Título' -> 0 (document title)."""
    name = (style_name or "").strip().lower()
    match = re.match(r"^(heading|título|titulo)\s*(\d)$", name)
    if match:
        return int(match.group(2))
    if name in {"title", "título", "titulo"}:
        return 0
    return None


def _runs_markdown(paragraph) -> str:
    """Paragraph text with **bold** / *italic*; runs with the same formatting are merged first,
    so Word's run splitting never produces '****'. Falls back to plain text if anything
    (fields, odd content) makes the runs disagree with the paragraph text."""
    runs = []
    for item in paragraph.iter_inner_content():  # Run or Hyperlink, in order
        runs.extend(getattr(item, "runs", None) or [item])
    groups: list[list] = []
    for run in runs:
        key = (bool(run.bold), bool(run.italic))
        if groups and groups[-1][0] == key:
            groups[-1][1] += run.text
        else:
            groups.append([key, run.text])
    if "".join(text for _, text in groups).strip() != paragraph.text.strip():
        return paragraph.text.strip()
    parts = []
    for (bold, italic), text in groups:
        lead, core, trail = re.match(r"^(\s*)(.*?)(\s*)$", text, re.S).groups()
        if core and (bold or italic):
            mark = "***" if bold and italic else "**" if bold else "*"
            core = f"{mark}{core}{mark}"
        parts.append(lead + core + trail)
    return "".join(parts).strip()


def _cell_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().replace("|", "\\|")


def _docx_blocks(path: str) -> list[tuple[int | None, str]]:
    """[(heading level or None, markdown)] in document order."""
    import docx
    from docx.oxml.ns import qn
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    document = docx.Document(path)
    blocks: list[tuple[int | None, str]] = []
    for child in document.element.body.iterchildren():
        if child.tag == qn("w:tbl"):
            rows = [[_cell_text(c.text) for c in row.cells] for row in Table(child, document).rows]
            # merged cells repeat in python-docx: collapse identical neighbours
            rows = [[c for i, c in enumerate(r) if i == 0 or c != r[i - 1]] for r in rows]
            table = rows_to_markdown(rows)
            if table:
                blocks.append((None, table))
            continue
        if child.tag != qn("w:p"):
            continue
        paragraph = Paragraph(child, document)
        has_figure = bool(
            child.findall(".//" + qn("w:drawing")) or child.findall(".//" + qn("w:pict"))
        )
        text = paragraph.text.strip()
        style = paragraph.style.name if paragraph.style is not None else ""
        level = _heading_level(style)
        if level is not None and text:
            blocks.append((level, text))
            continue
        if text:
            markdown = _runs_markdown(paragraph)
            is_list = (
                "list" in style.lower()
                or "lista" in style.lower()
                or child.find(".//" + qn("w:numPr")) is not None
            )
            blocks.append((None, f"- {markdown}" if is_list else markdown))
        if has_figure:
            blocks.append((None, FIGURE_PLACEHOLDER))
    return blocks


def _markdown_blocks(text: str) -> list[tuple[int | None, str]]:
    blocks: list[tuple[int | None, str]] = []
    for chunk in re.split(r"\n\s*\n", text):
        chunk = chunk.strip("\n")
        if not chunk.strip():
            continue
        heading = re.match(r"^(#{1,6})\s+(.+)$", chunk.strip())
        if heading and "\n" not in chunk.strip():
            blocks.append((len(heading.group(1)), heading.group(2).strip()))
        else:
            blocks.append((None, chunk.strip()))
    # a single "# " heading opening the file is the document title, not a section
    level_one = [i for i, (level, _) in enumerate(blocks) if level == 1]
    if len(level_one) == 1 and level_one[0] == 0:
        blocks[0] = (0, blocks[0][1])
    return blocks


NUMBERED_HEADING_RE = re.compile(r"^(\d{1,2}(?:\.\d{1,2}){0,2})\.?\s+(\S.{1,90})$")
NAMED_HEADINGS = {
    "resumo", "abstract", "introdução", "introducao", "introduction", "metodologia", "methodology",
    "resultados", "results", "discussão", "discussion", "conclusão", "conclusao", "conclusões",
    "conclusion", "conclusions", "considerações finais", "referências", "referencias", "references",
}  # fmt: skip


class _PdfHeadings:
    """Conservative heading detection for text extracted from PDF.

    Numbered headings must follow the outline (1 -> 2 -> 3, subsections inside the current
    number), which rejects table rows and list items that merely start with a number."""

    def __init__(self) -> None:
        self.top = 0

    def level(self, line: str) -> tuple[int, str] | None:
        text = line.strip()
        if text.lower().rstrip(":") in NAMED_HEADINGS:
            return 1, text.rstrip(":")
        match = NUMBERED_HEADING_RE.match(text)
        if not match or text.endswith((".", ",", ";")) or len(text.split()) > 14:
            return None
        if sum(ch.isdigit() for ch in match.group(2)) > len(match.group(2)) * 0.2:
            return None
        numbers = [int(n) for n in match.group(1).split(".")]
        if len(numbers) == 1 and numbers[0] == self.top + 1:
            self.top = numbers[0]
            return 1, text
        if len(numbers) > 1 and numbers[0] == self.top:
            return len(numbers), text
        return None


def _pdf_blocks(path: str) -> list[tuple[int | None, str]]:
    """PDF has no styles: headings come from _PdfHeadings, tables are kept as tables."""
    from ingestion import parse_file
    from ingestion.pipeline import ingestion_config

    parsed = parse_file(path, ingestion_config({"enrich_doi": False}))
    headings = _PdfHeadings()
    blocks: list[tuple[int | None, str]] = []
    for block in parsed.blocks if parsed else []:
        if block.kind == "table":
            blocks.append((None, block.text.strip()))
            continue
        paragraph: list[str] = []
        for line in block.text.splitlines():
            heading = headings.level(line)
            if heading:
                if paragraph:
                    blocks.append((None, " ".join(paragraph)))
                    paragraph = []
                blocks.append(heading)
            elif line.strip():
                paragraph.append(line.strip())
        if paragraph:
            blocks.append((None, " ".join(paragraph)))
    return blocks


def _split(blocks: list[tuple[int | None, str]]) -> tuple[str, list[dict]]:
    """Top heading level splits sections; deeper headings become ### inside the section."""
    title = next((text for level, text in blocks if level == 0), "")
    levels = [level for level, _ in blocks if level]
    top = min(levels) if levels else None
    sections: list[dict] = []
    current = {"title": INTRO_TITLE, "parts": []}
    for level, text in blocks:
        if level == 0:
            continue
        if level is not None and level == top:
            if current["parts"] or current["title"] != INTRO_TITLE:
                sections.append(current)
            current = {
                "title": re.sub(r"^\d+(\.\d+)*\.?\s+", "", text).strip() or text,
                "parts": [],
            }
        elif level is not None:
            current["parts"].append("#" * min(level - (top or 1) + 2, 4) + " " + text)
        else:
            current["parts"].append(text)
    if current["parts"] or current["title"] != INTRO_TITLE:
        sections.append(current)

    out = []
    for section in sections:
        markdown = _join(section["parts"])
        out.append(
            {
                "title": section["title"],
                "markdown": markdown,
                "words": len(re.sub(r"\|[-\s|]*\|", " ", markdown).split()),
                "tables": len(re.findall(r"^\|[ -|]*---", markdown, re.M)),
            }
        )
    return title, out


def _join(parts: list[str]) -> str:
    """Blank line between blocks, but consecutive list items stay in one list."""
    out = ""
    for part in parts:
        if not out:
            out = part
        elif part.startswith("- ") and out.split("\n")[-1].startswith("- "):
            out += "\n" + part
        else:
            out += "\n\n" + part
    return out


def import_document(path: str, file_name: str) -> dict:
    ext = os.path.splitext(file_name)[1].lower()
    if ext not in IMPORT_EXTENSIONS:
        raise ValueError(
            f"Formato não suportado para importação: {ext} (use DOCX, PDF ou Markdown)"
        )
    if ext == ".docx":
        blocks = _docx_blocks(path)
    elif ext == ".pdf":
        blocks = _pdf_blocks(path)
    else:
        with open(path, encoding="utf-8", errors="replace") as f:
            blocks = _markdown_blocks(f.read())
    title, sections = _split(blocks)
    return {"file_name": file_name, "title": title, "sections": sections}
