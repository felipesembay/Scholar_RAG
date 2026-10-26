"""Single entry point for chat LLM calls.

OpenAI, OpenRouter and Ollama all expose the OpenAI chat API, so one client covers them;
the provider is chosen by LLM_BASE_URL / LLM_MODEL / LLM_API_KEY in .env.
"""

from functools import lru_cache

from openai import OpenAI

from core.config import load_parameters


@lru_cache(maxsize=4)
def _client(api_key: str, base_url: str | None) -> OpenAI:
    return OpenAI(
        api_key=api_key,
        base_url=base_url,
        default_headers={"X-Title": "ScholarRAG"},  # app name shown on OpenRouter
    )


def get_llm_client() -> OpenAI:
    model_cfg = load_parameters()["Model"]
    return _client(model_cfg.get("key"), model_cfg.get("base_url") or None)


def chat_completion(messages: list, temperature: float = 0, model: str | None = None) -> str:
    """Sends chat messages to the configured LLM and returns the reply text."""
    model = model or load_parameters()["Model"]["model_name"]
    response = get_llm_client().chat.completions.create(
        model=model, temperature=temperature, messages=messages
    )
    return response.choices[0].message.content.strip()


def writing_model() -> str:
    """Model for article writing (LLM_MODEL_WRITING); falls back to the chat model."""
    model_cfg = load_parameters()["Model"]
    return model_cfg.get("writing_model") or model_cfg["model_name"]


def review_model() -> str:
    """Model for the full article review (LLM_MODEL_REVIEW); falls back to the writing model."""
    return load_parameters()["Model"].get("review_model") or writing_model()
