"""Vector store factory for project indexes.

Each project folder holds an index_info.json recording the backend, the embedding model
and (for Elasticsearch) the physical index name. The project folder stays the source of
truth: restoring a folder backup also restores which index the project points to.
Indexes created before index_info.json existed are FAISS + MiniLM.
"""

import json
import os

from langchain_community.vectorstores import FAISS

from core import es_store
from core.config import load_parameters
from core.embeddings import LEGACY_EMBEDDING, default_embedding_name, get_embeddings

FAISS_DIRNAME = "faiss_db"
INDEX_INFO = "index_info.json"


def _faiss_dir(project_dir: str) -> str:
    return os.path.join(project_dir, FAISS_DIRNAME)


def default_backend() -> str:
    return load_parameters()["Vectorstore"].get("backend", "elasticsearch")


def index_info_path(project_dir: str) -> str:
    return os.path.join(project_dir, INDEX_INFO)


def read_index_info(project_dir: str) -> dict:
    for path in (index_info_path(project_dir), os.path.join(_faiss_dir(project_dir), INDEX_INFO)):
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                return json.load(f)
    return {"backend": "faiss", "embedding": LEGACY_EMBEDDING}


def _write_index_info(project_dir: str, info: dict) -> None:
    with open(index_info_path(project_dir), "w", encoding="utf-8") as f:
        json.dump(info, f, indent=4)


def build_vectorstore(project_dir: str, documents: list, backend: str | None = None):
    """Embeds documents with the default embedding model and persists a new project index."""
    backend = backend or default_backend()
    model_name = default_embedding_name()
    embeddings = get_embeddings(model_name)
    os.makedirs(project_dir, exist_ok=True)

    if backend == "faiss":
        vectorstore = FAISS.from_documents(documents, embeddings)
        vectorstore.save_local(_faiss_dir(project_dir))
        _write_index_info(project_dir, {"backend": "faiss", "embedding": model_name})
        return vectorstore

    if backend == "elasticsearch":
        vectors = embeddings.embed_documents([d.page_content for d in documents])
        client = es_store.get_es_client()
        index = es_store.new_index_name(os.path.basename(os.path.normpath(project_dir)))
        es_store.create_index(client, index, dims=len(vectors[0]))
        try:
            es_store.bulk_index(client, index, documents, vectors)
        except Exception:
            client.indices.delete(index=index, ignore_unavailable=True)
            raise
        _write_index_info(
            project_dir, {"backend": "elasticsearch", "embedding": model_name, "index": index}
        )
        return es_store.ElasticsearchHybridStore(client, index, embeddings)

    raise ValueError(f"Unknown vectorstore backend: {backend}")


def load_vectorstore(project_dir: str):
    """Loads a project index with the backend and embedding model it was built with."""
    info = read_index_info(project_dir)
    embeddings = get_embeddings(info["embedding"])
    if info["backend"] == "elasticsearch":
        return es_store.ElasticsearchHybridStore(
            es_store.get_es_client(), info["index"], embeddings
        )
    return FAISS.load_local(
        _faiss_dir(project_dir), embeddings, allow_dangerous_deserialization=True
    )


def prune_orphan_indexes(projects_dir: str) -> list[str]:
    """Deletes Elasticsearch indexes no project folder points to anymore."""
    live = set()
    if os.path.isdir(projects_dir):
        for name in os.listdir(projects_dir):
            info = read_index_info(os.path.join(projects_dir, name))
            if info.get("backend") == "elasticsearch":
                live.add(info["index"])
    return es_store.prune_orphan_indexes(live)


def replace_source(project_dir: str, source: str, documents: list) -> int:
    """Replaces one file's chunks in the project index (Elasticsearch only); [] just deletes."""
    info = read_index_info(project_dir)
    if info.get("backend") != "elasticsearch":
        raise NotImplementedError(
            "Atualização incremental só no backend Elasticsearch; reindexe o projeto."
        )
    client = es_store.get_es_client()
    deleted = es_store.delete_source(client, info["index"], source)
    if documents:
        vectors = get_embeddings(info["embedding"]).embed_documents(
            [d.page_content for d in documents]
        )
        es_store.bulk_index(client, info["index"], documents, vectors)
    return deleted
