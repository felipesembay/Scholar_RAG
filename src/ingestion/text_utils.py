import re


def clean_text(text: str) -> str:
    """Normalizes whitespace but keeps line/paragraph breaks (needed for chunking)."""
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "")
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)  # de-hyphenate words broken across lines
    text = re.sub(r"[ \t\f\v]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def rows_to_markdown(rows: list[list]) -> str:
    """Converts table rows (first row = header) to a markdown table."""
    rows = [
        ["" if c is None else re.sub(r"\s+", " ", str(c)).strip() for c in r] for r in rows if r
    ]
    rows = [r for r in rows if any(r)]
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    lines = ["| " + " | ".join(rows[0]) + " |", "| " + " | ".join(["---"] * width) + " |"]
    lines += ["| " + " | ".join(r) + " |" for r in rows[1:]]
    return "\n".join(lines)
