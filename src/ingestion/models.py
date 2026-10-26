from dataclasses import dataclass, field


@dataclass
class Block:
    """A contiguous piece of a document, in reading order."""

    text: str
    page: int | None = None  # 1-based page / slide number when the format has one
    kind: str = "text"  # text | table | ocr | formula
    section: str | None = None  # nearest heading above this block


@dataclass
class ParsedDocument:
    source: str  # file name
    blocks: list[Block]
    parser: str
    metadata: dict = field(default_factory=dict)  # title, authors, year, doi, venue
    ocr_pages: list[int] = field(default_factory=list)
