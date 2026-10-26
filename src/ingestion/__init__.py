"""Document ingestion: structure-preserving parsing (PDF, Office, images + OCR) and chunking."""

from ingestion.chunking import chunk_documents
from ingestion.pipeline import SUPPORTED_EXTENSIONS, document_text, parse_file

__all__ = ["SUPPORTED_EXTENSIONS", "chunk_documents", "document_text", "parse_file"]
