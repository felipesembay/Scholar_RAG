"""Fixes the review issues the author selected, section by section, as proposals to approve.

The section is sent back to the model with its verified citations turned into [n] markers
(same numbers, same sources), plus fresh excerpts retrieved for the selected issues and
numbered after the existing ones. The model fixes only the listed issues; the answer goes
through render_citations again, so every citation is still tied to a source. Nothing is
saved here: the screen shows a paragraph diff and the author accepts or rejects it.
"""

import difflib
import re

from academic.article import (
    CITATION_LINK_RE,
    load_article,
    plain_text,
    retrieve,
    save_article,
    table_rows,
)
from academic.grounded import build_sources, format_sources_for_prompt, render_citations
from academic.library import load_library
from academic.review import PLAIN_CITATION_RE
from core.llm import chat_completion, review_model

LINK_TO_MARKER_RE = re.compile(r"\[\((.*?)\)\]\(#src-([\d-]+)\)")
NUMBER_RE = re.compile(r"\d+(?:[.,]\d+)?%?")
REVISION_MAX_NEW_SOURCES = 8

# what a check finding asks for when the fix is not in the text
NOT_IN_TEXT = {
    "Seção sem texto.": "Use Gerar rascunho ou Continuar escrevendo nesta seção.",
    "Figura não importada": "Insira a figura no documento final.",
    "Obra citada sem autor ou ano": "Complete autor e ano na Biblioteca.",
    "Seção bem mais curta que a meta": "Use Continuar escrevendo nesta seção.",
    "Seção de referências escrita à mão": "Remova a seção: a exportação gera as referências.",
}

REVISE_PROMPT = """Você é coautor de um artigo científico e vai corrigir a seção "{section}" a partir de
apontamentos de um revisor. Corrija SOMENTE os problemas listados.

Problemas a corrigir:
{issues}

Regras:
- Devolva a seção inteira corrigida, em markdown, sem título da seção, sem comentários e sem lista de referências.
- Tudo o que não estiver ligado aos problemas deve ser mantido literalmente: frases, subtítulos (###),
  tabelas e números. Tabelas e valores de resultados nunca podem ser alterados, a não ser que o problema
  peça uma legenda (acrescente "Tabela N – título" acima da tabela).
- Marcas como [3] ou [2, 5] são citações já verificadas: mantenha-as junto das afirmações que sustentam.
- Para fundamentar algo, use SOMENTE as fontes numeradas abaixo, indicando-as com [n]. Nunca escreva
  nomes de autores, anos ou páginas por conta própria.
- Citações escritas à mão no texto, como (SILVA, 2021) ou Silva (2021): se uma fonte numerada for a
  mesma obra, troque pela marca [n]; se não houver fonte correspondente, mantenha como está.
- Fontes MATERIAL DE APOIO não são literatura; RESULTADOS DO AUTOR são resultados desta pesquisa.
- Se as fontes não permitirem resolver um problema, não invente: escreva [PENDENTE: o que falta] no ponto.

Texto atual da seção:
{draft}

Fontes numeradas:
{sources}"""


def fix_kind(issue: dict) -> str:
    """'texto' when the fix is an edit of the section, otherwise where the author must act."""
    if not issue.get("secao_id"):
        return "manual"
    for prefix in NOT_IN_TEXT:
        if issue["problema"].startswith(prefix):
            return "biblioteca" if "Biblioteca" in NOT_IN_TEXT[prefix] else "manual"
    return "texto"


def fix_hint(issue: dict) -> str:
    for prefix, hint in NOT_IN_TEXT.items():
        if issue["problema"].startswith(prefix):
            return hint
    return "" if issue.get("secao_id") else "Problema geral do artigo: ajuste manualmente."


def to_markers(draft: str) -> str:
    """[(SILVA, 2021, p. 4)](#src-1-3) -> [1, 3]: the model edits markers, not formatted text."""
    return LINK_TO_MARKER_RE.sub(lambda m: "[" + ", ".join(m.group(2).split("-")) + "]", draft)


def _blocks(text: str) -> list[str]:
    return [b.strip() for b in re.split(r"\n\s*\n", text or "") if b.strip()]


def _visible(block: str) -> str:
    return CITATION_LINK_RE.sub(lambda m: m.group(1), block)


def paragraph_diff(before: str, after: str) -> list[dict]:
    """Paragraph-level diff; changed paragraphs carry word-level segments for highlighting."""
    old, new = _blocks(before), _blocks(after)
    out = []
    matcher = difflib.SequenceMatcher(
        a=[_visible(b) for b in old], b=[_visible(b) for b in new], autojunk=False
    )
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            out.append({"type": "same", "count": i2 - i1})
            continue
        pairs = max(i2 - i1, j2 - j1)
        for k in range(pairs):
            a = _visible(old[i1 + k]) if i1 + k < i2 else ""
            b = _visible(new[j1 + k]) if j1 + k < j2 else ""
            kind = "changed" if a and b else "removed" if a else "added"
            out.append({"type": kind, "segments": _word_segments(a, b)})
    return out


def _word_segments(a: str, b: str) -> list[dict]:
    # a word carries its trailing space, so a replaced phrase reads as one deletion + one addition
    wa, wb = re.findall(r"\s*\S+\s*", a), re.findall(r"\s*\S+\s*", b)
    segments = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=wa, b=wb, autojunk=False).get_opcodes():
        if tag == "equal":
            segments.append({"op": "same", "text": "".join(wa[i1:i2])})
            continue
        if i2 > i1:
            segments.append({"op": "del", "text": "".join(wa[i1:i2])})
        if j2 > j1:
            segments.append({"op": "add", "text": "".join(wb[j1:j2])})
    return segments


def safety_warnings(before: str, after: str) -> list[str]:
    """Results must not drift: tables kept verbatim, numbers of the original still present."""
    warnings = []
    old_tables = [b for b in _blocks(before) if table_rows(b)]
    new_tables = {re.sub(r"\s+", " ", b) for b in _blocks(after) if table_rows(b)}
    changed = [t for t in old_tables if re.sub(r"\s+", " ", t) not in new_tables]
    if changed:
        warnings.append(
            f"{len(changed)} tabela(s) foram alteradas ou removidas. Confira os valores antes de aceitar."
        )

    def numbers(text: str) -> set[str]:  # citation years/pages are not results
        return set(NUMBER_RE.findall(PLAIN_CITATION_RE.sub("", plain_text(text))))

    missing = sorted(numbers(before) - numbers(after), key=len, reverse=True)
    if missing:
        warnings.append(
            "Números que sumiram do texto: "
            + ", ".join(missing[:12])
            + (" …" if len(missing) > 12 else "")
        )
    return warnings


def revise_section(project_dir: str, section_id: str, issues: list[dict]) -> dict:
    article = load_article(project_dir)
    section = next((s for s in article["sections"] if s["id"] == section_id), None)
    if section is None:
        raise KeyError(section_id)
    library = load_library(project_dir)
    style = library.get("style", "abnt")

    # existing sources keep their numbers (n and text are stored); new ones come after them
    entries = library.get("entries", {})
    existing = [
        {
            **s,
            "_entry": (entries.get(s["source"]) or {"title": s.get("title") or s["source"]})
            if s["role"] == "literature"
            else None,
        }
        for s in section.get("sources", [])
    ]
    query = " ".join(
        [section["title"]]
        + [f"{i['problema']} {i.get('trecho', '')} {i.get('sugestao', '')}" for i in issues]
    )
    hits = (
        retrieve(project_dir, query, REVISION_MAX_NEW_SOURCES)
        if section.get("use_sources", True)
        else []
    )
    offset = max((s["n"] for s in existing), default=0)
    known = {(s["source"], s.get("page"), s["text"]) for s in existing}
    fresh = [
        s
        for s in build_sources(hits, library, style)
        if (s["source"], s.get("page"), s["text"]) not in known
    ]
    for k, s in enumerate(fresh, start=1):
        s["n"] = offset + k
    sources = existing + fresh

    issue_lines = "\n".join(
        f"{k}. [{i['gravidade']}] {i['problema']}"
        + (f'\n   Trecho: "{i["trecho"]}"' if i.get("trecho") else "")
        + (f"\n   Sugestão do revisor: {i['sugestao']}" if i.get("sugestao") else "")
        for k, i in enumerate(issues, start=1)
    )
    prompt = REVISE_PROMPT.format(
        section=section["title"],
        issues=issue_lines,
        draft=to_markers(section["draft"]),
        sources=format_sources_for_prompt(sources) or "(nenhuma fonte disponível)",
    )
    model = review_model()
    raw = chat_completion([{"role": "user", "content": prompt}], temperature=0, model=model)
    raw = re.sub(r"^```(?:markdown)?\s*|\s*```$", "", raw.strip())
    draft, used, dropped = render_citations(raw, sources, style)

    return {
        "section_id": section_id,
        "title": section["title"],
        "before": section["draft"],
        "after": draft,
        "sources": [{k: v for k, v in s.items() if not k.startswith("_")} for s in sources],
        "issue_ids": [i["id"] for i in issues],
        "diff": paragraph_diff(section["draft"], draft),
        "warnings": safety_warnings(section["draft"], draft)
        + (
            [f"{len(dropped)} citação(ões) a fontes inexistentes foram removidas."]
            if dropped
            else []
        ),
        "model": model,
    }


def apply_revision(
    project_dir: str, section_id: str, draft: str, sources: list[dict], issue_ids: list[str]
) -> dict:
    """Saves an accepted proposal and marks its issues as fixed in the stored review."""
    article = load_article(project_dir)
    section = next((s for s in article["sections"] if s["id"] == section_id), None)
    if section is None:
        raise KeyError(section_id)
    keys = {"n", "source", "page", "page_end", "role", "title", "citation", "text"}
    section["draft"] = draft
    section["sources"] = [
        {k: v for k, v in s.items() if k in keys}
        for s in sources
        if isinstance(s, dict) and "n" in s
    ]
    for issue in (article.get("review") or {}).get("issues", []):
        if issue.get("id") in issue_ids:
            issue["status"] = "corrigido"
    return save_article(project_dir, article)


def set_issue_status(project_dir: str, issue_ids: list[str], status: str | None) -> dict:
    article = load_article(project_dir)
    for issue in (article.get("review") or {}).get("issues", []):
        if issue.get("id") in issue_ids:
            if status:
                issue["status"] = status
            else:
                issue.pop("status", None)
    return save_article(project_dir, article)


def annotate_issues(review: dict | None) -> dict | None:
    """Stable ids and how each issue gets fixed (also for reviews stored before these fields)."""
    if not review:
        return review
    for k, issue in enumerate(review.get("issues", [])):
        issue.setdefault("id", f"i{k}")
        issue["correcao"] = fix_kind(issue)
        issue["dica"] = fix_hint(issue)
    return review
