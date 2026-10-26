"""Layout-aware path (reading order, headings, tables, formulas) with Tesseract as OCR engine."""

from functools import lru_cache

from ingestion.models import Block
from ingestion.text_utils import clean_text

DOCLING_EXTENSIONS = {".pdf", ".docx", ".pptx", ".html", ".htm", ".xml", ".md"} | {
    ".png",
    ".jpg",
    ".jpeg",
    ".tif",
    ".tiff",
    ".bmp",
    ".webp",
}


EASYOCR_LANGS = {"por": "pt", "eng": "en", "spa": "es", "fra": "fr", "deu": "de"}


@lru_cache(maxsize=4)
def _converter(lang: tuple[str, ...], ocr_engine: str):
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import (
        EasyOcrOptions,
        PdfPipelineOptions,
        TesseractCliOcrOptions,
    )
    from docling.document_converter import DocumentConverter, ImageFormatOption, PdfFormatOption

    if ocr_engine == "easyocr":  # GPU-friendly alternative, kept for benchmarks
        ocr_options = EasyOcrOptions(lang=[EASYOCR_LANGS.get(code, code) for code in lang])
    else:
        ocr_options = TesseractCliOcrOptions(lang=list(lang))
    options = PdfPipelineOptions(do_ocr=True, do_table_structure=True, ocr_options=ocr_options)
    return DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=options),
            InputFormat.IMAGE: ImageFormatOption(pipeline_options=options),
        }
    )


def parse_with_docling(path: str, cfg: dict) -> tuple[list[Block], dict]:
    from docling_core.types.doc import DocItemLabel

    skip = {DocItemLabel.PAGE_HEADER, DocItemLabel.PAGE_FOOTER, DocItemLabel.PICTURE}
    headings = {DocItemLabel.SECTION_HEADER, DocItemLabel.TITLE}

    lang = tuple(cfg["ocr_lang"].split("+"))
    doc = _converter(lang, cfg.get("docling_ocr", "tesseract")).convert(path).document
    blocks, section, title = [], None, None
    for item, _level in doc.iterate_items():
        label = getattr(item, "label", None)
        if label in skip:
            continue
        prov = getattr(item, "prov", None)
        page = prov[0].page_no if prov else None
        if label == DocItemLabel.TABLE:
            text, kind = item.export_to_markdown(doc=doc), "table"
        else:
            text = clean_text(getattr(item, "text", "") or "")
            kind = "formula" if label == DocItemLabel.FORMULA else "text"
        if not text:
            continue
        if label in headings:
            section = text
            title = title or (text if label == DocItemLabel.TITLE else None)
        blocks.append(Block(text, page=page, kind=kind, section=section))
    return blocks, {"title": title} if title else {}
