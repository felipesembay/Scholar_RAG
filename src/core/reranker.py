"""Cross-encoder reranking (BAAI/bge-reranker-v2-m3: multilingual, query/passage pairs)."""

from functools import lru_cache

from core.config import load_parameters


def reranker_name() -> str | None:
    return load_parameters()["Model"].get("reranker") or None


@lru_cache(maxsize=1)
def get_reranker(model_name: str):
    import torch
    from sentence_transformers import CrossEncoder

    if torch.cuda.is_available():
        return CrossEncoder(
            model_name, device="cuda", max_length=512, model_kwargs={"torch_dtype": torch.float16}
        )
    return CrossEncoder(model_name, device="cpu", max_length=512)


def rerank(query: str, docs_with_scores: list, top_n: int) -> list:
    """Reorders (doc, distance) pairs by cross-encoder relevance; keeps the original distance."""
    name = reranker_name()
    if not name or len(docs_with_scores) <= 1:
        return docs_with_scores[:top_n]
    scores = get_reranker(name).predict(
        [(query, doc.page_content) for doc, _ in docs_with_scores], batch_size=8
    )
    ranked = sorted(
        zip(docs_with_scores, scores, strict=True), key=lambda x: float(x[1]), reverse=True
    )
    for (doc, _), score in ranked:
        doc.metadata["rerank_score"] = float(score)
    return [pair for pair, _ in ranked[:top_n]]
