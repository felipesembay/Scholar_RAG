"""Cached embedding models (loaded once per process, on GPU when available)."""

from functools import lru_cache

from langchain_huggingface import HuggingFaceEmbeddings

from core.config import load_parameters

# Model used by indexes created before index_info.json existed (built without normalization)
LEGACY_EMBEDDING = "sentence-transformers/all-MiniLM-L6-v2"


def default_embedding_name() -> str:
    return load_parameters()["Model"]["embedding"]


@lru_cache(maxsize=2)
def get_embeddings(model_name: str | None = None) -> HuggingFaceEmbeddings:
    import torch

    model_name = model_name or default_embedding_name()
    model_kwargs = {"device": "cpu"}
    if torch.cuda.is_available():
        # fp16 halves VRAM: bge-m3 in fp32 with batch 32 OOMs on 8 GB cards
        model_kwargs = {"device": "cuda", "model_kwargs": {"torch_dtype": torch.float16}}
    return HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs,
        encode_kwargs={"normalize_embeddings": model_name != LEGACY_EMBEDDING, "batch_size": 8},
    )
