"""Elasticsearch hybrid store (BM25 + dense kNN fused with RRF).

Exposes the same `similarity_search_with_score` contract as LangChain's FAISS store:
results are (Document, distance) where distance is the squared L2 distance between
normalized vectors (2 - 2*cos), so the existing "lower is better" thresholds keep working.
"""

import re
import time
from functools import lru_cache

import numpy as np
from elasticsearch import Elasticsearch, helpers
from langchain_core.documents import Document
from unidecode import unidecode

from core.config import load_parameters

RRF_K = 60  # standard reciprocal rank fusion constant
ORPHAN_MIN_AGE_S = 30 * 60  # never prune indexes younger than this (may still be building)

INDEX_SETTINGS = {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "analysis": {
        "analyzer": {
            # accent-insensitive matching for PT/EN corpora ("avaliacao" finds "avaliação")
            "folding": {"tokenizer": "standard", "filter": ["lowercase", "asciifolding"]}
        }
    },
}


def _es_config() -> dict:
    return load_parameters()["Vectorstore"]


@lru_cache(maxsize=1)
def _client(url: str, user: str, password: str) -> Elasticsearch:
    return Elasticsearch(url, basic_auth=(user, password) if password else None, request_timeout=60)


def get_es_client() -> Elasticsearch:
    cfg = _es_config()
    return _client(cfg["es_url"], cfg.get("es_user") or "elastic", cfg.get("es_password") or "")


def index_prefix() -> str:
    return f"{_es_config().get('index_prefix', 'scholar')}-"


def new_index_name(project_name: str) -> str:
    """Unique, ES-safe index name for a new version of a project's index."""
    slug = re.sub(r"[^a-z0-9]+", "-", unidecode(project_name).lower()).strip("-")[:60] or "project"
    return f"{index_prefix()}{slug}-{time.strftime('%Y%m%d%H%M%S')}"


def create_index(client: Elasticsearch, index: str, dims: int) -> None:
    client.indices.create(
        index=index,
        settings=INDEX_SETTINGS,
        mappings={
            "properties": {
                "text": {"type": "text", "analyzer": "folding"},
                "vector": {
                    "type": "dense_vector",
                    "dims": dims,
                    "index": True,
                    "similarity": "cosine",
                },
                "metadata": {
                    "type": "object",
                    "properties": {"source": {"type": "keyword"}},
                },
            }
        },
    )


def bulk_index(client: Elasticsearch, index: str, documents: list, vectors: list) -> None:
    actions = (
        {
            "_index": index,
            "_source": {"text": doc.page_content, "vector": vec, "metadata": doc.metadata},
        }
        for doc, vec in zip(documents, vectors, strict=True)
    )
    helpers.bulk(client, actions, chunk_size=500, refresh="wait_for")


def prune_orphan_indexes(live_indexes: set[str]) -> list[str]:
    """Deletes this app's indexes not referenced by any project (older than ORPHAN_MIN_AGE_S)."""
    client = get_es_client()
    now_ms = time.time() * 1000
    rows = client.cat.indices(index=f"{index_prefix()}*", h="index,creation.date", format="json")
    deleted = []
    for row in rows:
        name, created = row["index"], float(row["creation.date"])
        if name not in live_indexes and now_ms - created > ORPHAN_MIN_AGE_S * 1000:
            client.indices.delete(index=name)
            deleted.append(name)
    return deleted


def _rrf(rankings: list[list[str]]) -> dict[str, float]:
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (RRF_K + rank + 1)
    return scores


class ElasticsearchHybridStore:
    """Read side of a project index: hybrid retrieval with FAISS-compatible scores."""

    def __init__(self, client: Elasticsearch, index: str, embeddings) -> None:
        self.client = client
        self.index = index
        self.embeddings = embeddings

    def similarity_search_with_score(self, query: str, k: int = 4) -> list[tuple[Document, float]]:
        q = np.asarray(self.embeddings.embed_query(query), dtype=np.float32)
        q /= np.linalg.norm(q) or 1.0
        candidates = max(k * 3, 20)
        source = ["text", "metadata", "vector"]

        dense = self.client.search(
            index=self.index,
            knn={
                "field": "vector",
                "query_vector": q.tolist(),
                "k": candidates,
                "num_candidates": max(candidates * 5, 100),
            },
            size=candidates,
            source=source,
        )["hits"]["hits"]
        lexical = self.client.search(
            index=self.index,
            query={"match": {"text": query}},
            size=candidates,
            source=source,
        )["hits"]["hits"]

        hits = {h["_id"]: h["_source"] for h in dense + lexical}
        fused = _rrf([[h["_id"] for h in dense], [h["_id"] for h in lexical]])
        top_ids = sorted(fused, key=fused.get, reverse=True)[:k]

        results = []
        for doc_id in top_ids:
            src = hits[doc_id]
            v = np.asarray(src["vector"], dtype=np.float32)
            cos = float(q @ v / (np.linalg.norm(v) or 1.0))
            doc = Document(page_content=src["text"], metadata=src.get("metadata") or {})
            results.append((doc, 2.0 - 2.0 * cos))
        return results


def delete_source(client: Elasticsearch, index: str, source: str) -> int:
    """Removes every chunk of one file from an index; returns how many were deleted."""
    response = client.delete_by_query(
        index=index, query={"term": {"metadata.source": source}}, refresh=True, conflicts="proceed"
    )
    return response.get("deleted", 0)
