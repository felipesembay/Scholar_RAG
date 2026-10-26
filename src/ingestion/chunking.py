"""Structure-aware chunking: respects sections, keeps tables whole, tracks page ranges."""

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ingestion.models import ParsedDocument

DOC_METADATA_KEYS = ("title", "authors", "year", "doi", "venue", "citekey", "role")


def _splitter(chunk_size: int) -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=0,
        separators=["\n\n", "\n", ". ", "; ", ", ", " ", ""],
        keep_separator="end",  # sentences end with their period instead of starting with it
    )


def _split_table(markdown: str, chunk_size: int) -> list[str]:
    lines = markdown.split("\n")
    header, rows = lines[:2], lines[2:]
    pieces, current = [], []
    for row in rows:
        if current and len("\n".join(header + current + [row])) > chunk_size:
            pieces.append("\n".join(header + current))
            current = []
        current.append(row)
    pieces.append("\n".join(header + current))
    return pieces


def _tail(text: str, overlap: int) -> str:
    if overlap <= 0 or len(text) <= overlap:
        return ""
    tail = text[-overlap:]
    space = tail.find(" ")
    return tail[space + 1 :] if space != -1 else tail


def chunk_document(parsed: ParsedDocument, chunk_size: int, chunk_overlap: int) -> list[Document]:
    base = {"source": parsed.source, "parser": parsed.parser}
    base.update({k: parsed.metadata[k] for k in DOC_METADATA_KEYS if parsed.metadata.get(k)})
    # pieces leave room for the overlap carried into the next chunk
    splitter = _splitter(max(chunk_size - chunk_overlap - 1, 1))
    chunks: list[Document] = []
    state = {"parts": [], "pages": [], "kinds": set(), "section": None}

    def emit(text, pages, kind, section):
        pages = [p for p in pages if p is not None]
        meta = dict(base, chunk_type=kind)
        if pages:
            meta["page"], meta["page_end"] = min(pages), max(pages)
        if section:
            meta["section"] = section
            if not text.startswith(section):
                text = f"{section}\n{text}"  # heading as context for retrieval
        chunks.append(Document(page_content=text, metadata=meta))

    def flush(carry: bool = False):
        if not state["parts"]:
            return
        text = "\n".join(state["parts"])
        kind = "ocr" if "ocr" in state["kinds"] else "text"
        emit(text, state["pages"], kind, state["section"])
        tail = _tail(text, chunk_overlap) if carry else ""
        last_page = state["pages"][-1:] if carry else []
        state.update(parts=[tail] if tail else [], pages=last_page, kinds=set())

    for block in parsed.blocks:
        if block.kind == "table":
            flush()
            for piece in _split_table(block.text, chunk_size):
                emit(piece, [block.page], "table", block.section)
            continue
        if block.section != state["section"]:
            flush()
            state.update(parts=[], pages=[], section=block.section)
        for piece in splitter.split_text(block.text):
            current = sum(len(p) + 1 for p in state["parts"])
            if state["parts"] and current + len(piece) > chunk_size:
                flush(carry=True)
            state["parts"].append(piece)
            state["pages"].append(block.page)
            state["kinds"].add(block.kind)
    flush()
    return chunks


def chunk_documents(parsed_docs, parameters: dict) -> list[Document]:
    model = parameters["Model"]
    return [
        chunk
        for parsed in parsed_docs
        for chunk in chunk_document(parsed, model["chunk_size"], model["chunk_overlap"])
    ]
