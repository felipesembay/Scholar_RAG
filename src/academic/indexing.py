"""Builds the chunk list of a project: literature (cited) + the author's own results."""

import os

from academic.library import sync_library
from ingestion import chunk_documents, parse_file

RESULTS_DIRNAME = "resultados"
RESULTS_EXTENSIONS = {".md", ".txt"}


def results_dir(project_dir: str) -> str:
    return os.path.join(project_dir, RESULTS_DIRNAME)


def parse_results(project_dir: str) -> list:
    """The author's results (markdown); indexed for retrieval, never listed as references."""
    folder = results_dir(project_dir)
    if not os.path.isdir(folder):
        return []
    parsed_docs = []
    for name in sorted(os.listdir(folder)):
        if os.path.splitext(name)[1].lower() in RESULTS_EXTENSIONS:
            parsed = parse_file(os.path.join(folder, name), _no_enrich())
            if parsed:
                parsed_docs.append(parsed)
    return parsed_docs


def _no_enrich() -> dict:
    from ingestion.pipeline import ingestion_config

    return ingestion_config({"enrich_doi": False})


def tag_results(parsed_docs: list) -> list:
    for parsed in parsed_docs:
        parsed.metadata = {"role": "results", "title": parsed.source}
    return parsed_docs


def prepare_documents(
    project_dir: str, literature: list, parameters: dict, results: list | None = None
) -> list:
    """Syncs the library, tags chunks with citekey/role and chunks everything."""
    library = sync_library(project_dir, literature)
    for parsed in literature:
        parsed.metadata["citekey"] = library["entries"][parsed.source]["citekey"]
        parsed.metadata["role"] = "literature"
    results = tag_results(results if results is not None else parse_results(project_dir))
    return chunk_documents(list(literature) + results, parameters)


def index_results_file(project_dir: str, file_name: str, parameters: dict) -> int:
    """(Re)indexes one results file incrementally; returns the number of chunks indexed."""
    from core.vectorstore import replace_source

    path = os.path.join(results_dir(project_dir), file_name)
    parsed = parse_file(path, _no_enrich()) if os.path.exists(path) else None
    documents = chunk_documents(tag_results([parsed]), parameters) if parsed else []
    replace_source(project_dir, file_name, documents)
    return len(documents)
