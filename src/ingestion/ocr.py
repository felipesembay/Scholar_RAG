"""Tesseract OCR (CPU-only, no model downloads: works the same on host and in Docker)."""

import pytesseract
from PIL import Image, ImageOps

from ingestion.text_utils import clean_text


def ocr_image(image: Image.Image, lang: str = "por+eng") -> str:
    # Tesseract binarizes internally; grayscale is enough and safer than a global threshold
    gray = ImageOps.grayscale(ImageOps.exif_transpose(image))
    return clean_text(pytesseract.image_to_string(gray, lang=lang, config="--psm 3"))


def ocr_pdf_page(fitz_page, lang: str = "por+eng", dpi: int = 300) -> str:
    pix = fitz_page.get_pixmap(dpi=dpi)
    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    return ocr_image(image, lang)


def ocr_image_file(path: str, lang: str = "por+eng") -> list[str]:
    """OCRs every frame of an image file (multi-page TIFFs included)."""
    texts = []
    with Image.open(path) as img:
        for frame in range(getattr(img, "n_frames", 1)):
            img.seek(frame)
            texts.append(ocr_image(img.convert("RGB"), lang))
    return texts
