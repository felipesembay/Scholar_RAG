"""Re-index existing projects (e.g. FAISS + MiniLM) into the configured backend/embedding.

Reads each project's original files from projects/<name>/files, so vectors are recomputed
with the current embedding model. metadata.json, KB-only projects and the old faiss_db
folder are left untouched (FAISS stays usable for benchmarks).

Usage (from repo root):
    PROJECTS_DIR=projects uv run python scripts/reindex_projects.py            # all projects
    PROJECTS_DIR=projects uv run python scripts/reindex_projects.py Bitcoin   # one project
    ... --backend faiss                                                       # force backend
"""

import argparse
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src"))

from core.config import load_parameters  # noqa: E402
from core.vectorstore import build_vectorstore, default_backend, read_index_info  # noqa: E402
from helper_methods import get_projects_dir  # noqa: E402
from academic.indexing import prepare_documents  # noqa: E402
from ingestion import parse_file  # noqa: E402


def reindex(project_dir: str, backend: str, parameters: dict) -> None:
    name = os.path.basename(project_dir)
    files_dir = os.path.join(project_dir, "files")
    if os.path.exists(os.path.join(project_dir, "KB.txt")):
        print(f"[SKIP] {name}: projeto KB (sem índice vetorial)")
        return
    if not os.path.isdir(files_dir):
        print(f"[SKIP] {name}: sem pasta files/")
        return

    parsed_docs = []
    for file_name in sorted(os.listdir(files_dir)):
        try:
            parsed = parse_file(os.path.join(files_dir, file_name))
        except Exception as e:
            print(f"   [WARN] {name}/{file_name}: erro na leitura ({e})")
            continue
        if parsed:
            parsed_docs.append(parsed)
            if parsed.ocr_pages:
                print(f"   [OCR] {name}/{file_name}: {len(parsed.ocr_pages)} página(s)")
        else:
            print(f"   [WARN] {name}/{file_name}: sem texto extraído")
    if not parsed_docs:
        print(f"[SKIP] {name}: nenhum texto")
        return

    documents = prepare_documents(project_dir, parsed_docs, parameters)
    start = time.time()
    build_vectorstore(project_dir, documents, backend=backend)
    info = read_index_info(project_dir)
    print(
        f"[OK] {name}: {len(parsed_docs)} arquivos, {len(documents)} chunks em {time.time() - start:.0f}s "
        f"-> {info['backend']} / {info['embedding']} {info.get('index', '')}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("projects", nargs="*", help="nomes dos projetos (padrão: todos)")
    parser.add_argument("--backend", choices=["elasticsearch", "faiss"], default=None)
    args = parser.parse_args()

    projects_dir = get_projects_dir()
    backend = args.backend or default_backend()
    parameters = load_parameters()
    names = args.projects or sorted(
        n for n in os.listdir(projects_dir) if os.path.isdir(os.path.join(projects_dir, n))
    )
    print(f"Reindexando {len(names)} projeto(s) de {projects_dir} -> {backend}")
    for name in names:
        try:
            reindex(os.path.join(projects_dir, name), backend, parameters)
        except Exception as e:
            print(f"[ERRO] {name}: {e}")


if __name__ == "__main__":
    main()
