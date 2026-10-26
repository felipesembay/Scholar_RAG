"""Bake-off of parsing/OCR engines on your own files.

For each file in INPUT_DIR, runs every engine that applies to its type and records time,
pages, extracted characters, OCR'd pages, tables and sections. If a reference transcript
`<file name>.gt.txt` (e.g. `artigo.pdf.gt.txt`) sits next to the file, it also reports
CER (character error rate, lower is better) against it.

Engines:
  pymupdf            PyMuPDF native text only (no OCR)        - PDF
  pdfplumber         pdfplumber + Tesseract on textless pages  - PDF (ScholarRAG default)
  docling-tesseract  Docling layout + Tesseract                - PDF, images, DOCX, PPTX, HTML
  docling-easyocr    Docling layout + EasyOCR                  - PDF, images
  tesseract          Tesseract on the image                    - images
  native             ScholarRAG parser for the format          - DOCX, PPTX, XLSX, ...

Usage (from repo root):
    uv run python scripts/benchmark_parsers.py samples/ [--engines pdfplumber,docling-tesseract]
Writes docs/benchmark_parsers.md and the extracted text of each run to docs/benchmark_out/.
"""

import argparse
import os
import re
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src"))

from ingestion.models import Block  # noqa: E402
from ingestion.pipeline import IMAGE_EXTENSIONS, PARSERS, ingestion_config  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
DOCLING_FORMATS = {".pdf", ".docx", ".pptx", ".html", ".htm"} | IMAGE_EXTENSIONS


def _pymupdf(path, cfg):
    import fitz

    with fitz.open(path) as pdf:
        return [Block(p.get_text(), page=i) for i, p in enumerate(pdf, start=1)]


def _pdfplumber(path, cfg):
    from ingestion.pdf import parse_pdf

    return parse_pdf(path, cfg)[0]


def _docling(ocr):
    def run(path, cfg):
        from ingestion.docling_parser import parse_with_docling

        return parse_with_docling(path, dict(cfg, docling_ocr=ocr))[0]

    return run


def _native(path, cfg):
    return PARSERS[os.path.splitext(path)[1].lower()](path, cfg)


ENGINES = {
    "pymupdf": (_pymupdf, {".pdf"}),
    "pdfplumber": (_pdfplumber, {".pdf"}),
    "docling-tesseract": (_docling("tesseract"), DOCLING_FORMATS),
    "docling-easyocr": (_docling("easyocr"), {".pdf"} | IMAGE_EXTENSIONS),
    "tesseract": (_native, IMAGE_EXTENSIONS),
    "native": (_native, set(PARSERS) - IMAGE_EXTENSIONS),
}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def cer(hypothesis: str, reference: str) -> float:
    from rapidfuzz.distance import Levenshtein

    reference = _normalize(reference)
    return Levenshtein.distance(_normalize(hypothesis), reference) / max(len(reference), 1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input_dir")
    parser.add_argument("--engines", default=",".join(ENGINES), help="comma-separated subset")
    parser.add_argument("--out", default=os.path.join(ROOT, "docs", "benchmark_parsers.md"))
    args = parser.parse_args()

    cfg = ingestion_config({"enrich_doi": False})
    engines = [e for e in args.engines.split(",") if e in ENGINES]
    out_dir = os.path.join(os.path.dirname(args.out), "benchmark_out")
    os.makedirs(out_dir, exist_ok=True)

    rows = []
    files = sorted(f for f in os.listdir(args.input_dir) if not f.endswith(".gt.txt"))
    for file_name in files:
        path = os.path.join(args.input_dir, file_name)
        ext = os.path.splitext(file_name)[1].lower()
        reference_path = path + ".gt.txt"
        reference = open(reference_path, encoding="utf-8").read() if os.path.exists(reference_path) else None
        for engine in engines:
            run, formats = ENGINES[engine]
            if ext not in formats:
                continue
            start = time.time()
            try:
                blocks = run(path, cfg)
                error = ""
            except Exception as e:  # keep benchmarking the other engines/files
                blocks, error = [], f"{type(e).__name__}: {e}"[:80]
            elapsed = time.time() - start
            text = "\n\n".join(b.text for b in blocks)
            with open(os.path.join(out_dir, f"{file_name}.{engine}.txt"), "w", encoding="utf-8") as f:
                f.write(text)
            pages = len({b.page for b in blocks if b.page}) or 1
            rows.append(
                {
                    "file": file_name,
                    "engine": engine,
                    "s": elapsed,
                    "s/page": elapsed / pages,
                    "pages": pages,
                    "chars": len(text),
                    "ocr_pages": len({b.page for b in blocks if b.kind == "ocr"}),
                    "tables": sum(b.kind == "table" for b in blocks),
                    "sections": len({b.section for b in blocks if b.section}),
                    "cer": f"{cer(text, reference):.3f}" if reference and not error else "",
                    "error": error,
                }
            )
            print(f"{file_name:40} {engine:18} {elapsed:6.1f}s chars={len(text):7} {error}")

    columns = ["file", "engine", "s", "s/page", "pages", "chars", "ocr_pages", "tables", "sections", "cer", "error"]
    lines = [
        "# Benchmark de parsers / OCR",
        "",
        f"Arquivos: `{args.input_dir}` — CER só quando existe `<arquivo>.gt.txt` (menor = melhor).",
        "",
        "| " + " | ".join(columns) + " |",
        "|" + "---|" * len(columns),
    ]
    for row in rows:
        cells = [f"{row[c]:.2f}" if isinstance(row[c], float) else str(row[c]) for c in columns]
        lines.append("| " + " | ".join(cells) + " |")
    with open(args.out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"\nRelatório: {args.out}\nTextos extraídos: {out_dir}")


if __name__ == "__main__":
    main()
