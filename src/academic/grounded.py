"""Grounded answers: numbered sources in, verified citations out.

The LLM only ever writes [n] markers pointing at the sources it was given. Citation text,
pages and the reference list are produced by academic.citations from the project library,
and markers pointing at sources that do not exist are dropped — so the answer cannot
contain an invented reference.
"""

import re

from academic.citations import cite, reference_list
from academic.library import load_library, role_of
from core.llm import chat_completion

MARKER_RE = re.compile(r"\[(\d+(?:\s*[,;]\s*\d+)*)\]")
RESULTS_LABEL = "resultados desta pesquisa"
MATERIAL_LABEL = "material de apoio"

GROUNDED_PROMPT = """Você é um assistente de pesquisa acadêmica. Responda usando SOMENTE as fontes numeradas abaixo.

Regras:
- Depois de cada afirmação baseada nas fontes, indique a(s) fonte(s) entre colchetes, por exemplo [1] ou [2, 3].
- Use apenas números de fontes listadas abaixo. Nunca escreva nomes de autores, anos, páginas ou referências por conta própria: eles são inseridos automaticamente a partir dos números.
- Fontes marcadas como RESULTADOS DO AUTOR são resultados da pesquisa do usuário: apresente-os como resultados desta pesquisa, não como literatura.
- Fontes marcadas como MATERIAL DE APOIO (aulas, slides, códigos, dados) não são literatura publicada: use-as para explicar e indique-as com [n], mas nunca as apresente como obra de um autor nem as use como única base de uma afirmação científica.
- Se as fontes não forem suficientes para responder, diga claramente o que não foi encontrado nelas.
- Responda no idioma da pergunta, em markdown, de forma clara e objetiva.
{extra}
Fontes:
{sources}

Pergunta: {question}"""


def _entry(library: dict, metadata: dict) -> dict:
    """Library entry for a chunk; falls back to chunk metadata for indexes without a library."""
    entry = library.get("entries", {}).get(metadata.get("source"))
    if entry:
        return entry
    return {
        k: metadata[k] for k in ("title", "authors", "year", "doi", "venue") if metadata.get(k)
    } or {"title": metadata.get("source", "Documento")}


def build_sources(hits: list, library: dict, style: str) -> list[dict]:
    """hits: [(Document, distance)] in rank order -> numbered sources with their citation."""
    sources = []
    for n, (doc, _distance) in enumerate(hits, start=1):
        meta = doc.metadata
        if meta.get("role") == "results":
            role, entry = "results", None
            title, citation = meta.get("source"), f"({RESULTS_LABEL})"
        elif role_of(library, meta.get("source")) == "material":
            role, entry = "material", None  # never a work: no entry, so never a reference
            title, citation = meta.get("source"), f"({MATERIAL_LABEL}: {meta.get('source')})"
        else:
            role, entry = "literature", _entry(library, meta)
            title, citation = entry.get("title"), cite([(entry, meta.get("page"))], style)
        sources.append(
            {
                "n": n,
                "source": meta.get("source"),
                "page": meta.get("page"),
                "page_end": meta.get("page_end"),
                "role": role,
                "title": title,
                "citation": citation,
                "text": doc.page_content,
                "_entry": entry,
            }
        )
    return sources


def format_sources_for_prompt(sources: list[dict]) -> str:
    blocks = []
    for s in sources:
        if s["role"] == "results":
            label = f"RESULTADOS DO AUTOR — {s['source']}"
        elif s["role"] == "material":
            page = f", p. {s['page']}" if s.get("page") else ""
            label = f"MATERIAL DE APOIO (não é literatura) — arquivo {s['source']}{page}"
        else:
            page = f", p. {s['page']}" if s.get("page") else ""
            label = f"{s['title']} — arquivo {s['source']}{page}"
        blocks.append(f"[{s['n']}] {label}\n{s['text']}")
    return "\n\n".join(blocks)


def render_citations(raw: str, sources: list[dict], style: str) -> tuple[str, list[int], list[str]]:
    """Replaces [n] markers by formatted citations linked to #src-n; drops invalid markers."""
    by_n = {s["n"]: s for s in sources}
    used: list[int] = []
    dropped: list[str] = []

    def replace(match: re.Match) -> str:
        numbers = [int(x) for x in re.split(r"\s*[,;]\s*", match.group(1))]
        valid = [n for n in numbers if n in by_n]
        dropped.extend(str(n) for n in numbers if n not in by_n)
        if not valid:
            return ""
        used.extend(n for n in valid if n not in used)
        literature = [
            (by_n[n]["_entry"], by_n[n]["page"]) for n in valid if by_n[n]["role"] == "literature"
        ]
        parts = []
        if literature:
            parts.append(cite(literature, style)[1:-1])
        material = list(
            dict.fromkeys(by_n[n]["source"] for n in valid if by_n[n]["role"] == "material")
        )
        if material:
            parts.append(f"{MATERIAL_LABEL}: {', '.join(material)}")
        if any(by_n[n]["role"] == "results" for n in valid):
            parts.append(RESULTS_LABEL)
        anchor = "-".join(str(n) for n in valid)
        return f"[({'; '.join(parts)})](#src-{anchor})"

    text = MARKER_RE.sub(replace, raw)
    text = re.sub(r"[ \t]+([.,;:])", r"\1", text)  # "afirmação ." left by dropped markers
    return text, used, dropped


def grounded_answer(
    question: str,
    hits: list,
    project_dir: str,
    history: list | None = None,
    extra_instructions: str = "",
    temperature: float = 0,
) -> dict:
    library = load_library(project_dir)
    style = library.get("style", "abnt")
    sources = build_sources(hits, library, style)
    prompt = GROUNDED_PROMPT.format(
        extra=f"\nInstruções do projeto:\n{extra_instructions}\n" if extra_instructions else "",
        sources=format_sources_for_prompt(sources),
        question=question,
    )
    raw = chat_completion(list(history or []) + [{"role": "user", "content": prompt}], temperature)
    answer, used, dropped = render_citations(raw, sources, style)

    cited_entries, seen = [], set()
    for n in used:
        source = sources[n - 1]
        if source["role"] == "literature" and source["source"] not in seen:
            seen.add(source["source"])
            cited_entries.append(source["_entry"])
    if cited_entries:
        answer += "\n\n" + reference_list(cited_entries, style)

    public = [{k: v for k, v in s.items() if not k.startswith("_")} for s in sources]
    return {
        "answer": answer,
        "raw": raw,
        "sources": public,
        "used": used,
        "dropped_markers": dropped,
        "style": style,
    }
