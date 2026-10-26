"""Full article review before saving/exporting: deterministic checks + a strong LLM reviewer.

The checks are cheap and exact (pending markers, unlinked citations, incomplete references,
table captions, numbering...). The reviewer reads the whole article together with the excerpts
of the sources each section cites, so it can flag claims the cited excerpt does not support.
Its excerpts are verified against the text; the report is stored with a hash of the content,
so the screen knows when it went stale.
"""

import hashlib
import json
import re
import unicodedata
from datetime import datetime

from academic.article import ANCHOR_RE, CITATION_LINK_RE, plain_text, table_rows
from academic.library import role_of
from core.llm import chat_completion, review_model

SEVERITIES = ("critico", "importante", "sugestao")
SOURCE_EXCERPT_CHARS = 1200
PENDING_RE = re.compile(r"\[PENDENTE:[^\]]*\]")
FIGURE_RE = re.compile(r"\[figura não importada\]")
# (SILVA, 2021) / (Silva; Souza, 2021, p. 4) / Silva (2021) written by hand, outside citation links
PLAIN_CITATION_RE = re.compile(
    r"(?<!\[)\(([A-ZÀ-Ú][^()\[\]]{1,120}?,\s*(?:19|20)\d{2}[a-z]?(?:,\s*p\.\s*[\d\-–]+)?)\)"
    r"|\b([A-ZÀ-Ú][a-zà-ú]+(?:\s+et\s+al\.)?)\s+\(((?:19|20)\d{2})[a-z]?\)"
)
REFERENCES_TITLES = {"referencias", "referencias bibliograficas", "references", "bibliografia"}

REVIEW_PROMPT = """Você é um revisor sênior de periódico científico (nível International Journal of Forecasting) e
orientador de mestrado. Faça uma revisão completa e rigorosa do artigo abaixo, em português.

Avalie:
1. estrutura: as seções cumprem seu papel? falta algo esperado em um artigo empírico?
2. argumentacao: coerência entre objetivo, método, resultados e conclusão; afirmações exageradas.
3. fundamentacao: afirmações que exigem fonte e não têm; citações cujo trecho da fonte NÃO sustenta a
   afirmação (use os trechos das fontes fornecidos); material de apoio usado como se fosse literatura.
4. resultados: números do texto que não batem com as tabelas, métricas sem definição, testes mal interpretados.
5. clareza: ambiguidades, repetições, frases longas, termos não definidos.
6. normas: legendas de tabelas/figuras, numeração de seções, formato de citações (ABNT/APA), tom impessoal.

Regras para a resposta:
- Responda SOMENTE com um objeto JSON, sem texto antes ou depois, no formato:
{{"resumo": "avaliação geral em 3 a 6 frases",
  "notas": {{"estrutura": 0-10, "argumentacao": 0-10, "fundamentacao": 0-10, "resultados": 0-10, "clareza": 0-10, "normas": 0-10}},
  "problemas": [{{"gravidade": "critico|importante|sugestao", "categoria": "estrutura|argumentacao|fundamentacao|resultados|clareza|normas",
                  "secao": "título exato da seção", "trecho": "cópia literal de até 200 caracteres do texto do artigo",
                  "problema": "o que está errado", "sugestao": "como corrigir"}}]}}
- "trecho" deve ser cópia exata do artigo (para localizar o problema); use "" se o problema for da seção inteira.
- Liste no máximo {max_issues} problemas, dos mais graves para os menos graves. Não invente problemas.
- Não reescreva o artigo; aponte e sugira.

Artigo: {title}

{article}

Trechos das fontes citadas, por seção (o número [n] corresponde às citações daquela seção):
{sources}"""


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text or "").encode("ascii", "ignore").decode()
    return re.sub(r"^[\d.\s]+", "", text.lower()).strip()


def content_hash(article: dict) -> str:
    payload = json.dumps(
        [article.get("title", "")]
        + [[s["title"], s.get("draft", "")] for s in article["sections"]],
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


def _issue(severity, category, section, problem, suggestion="", excerpt="", source="verificacao"):
    return {
        "gravidade": severity,
        "categoria": category,
        "secao": section["title"] if section else "Geral",
        "secao_id": section["id"] if section else None,
        "trecho": excerpt,
        "problema": problem,
        "sugestao": suggestion,
        "origem": source,
    }


def _blocks(draft: str) -> list[str]:
    return [b.strip() for b in re.split(r"\n\s*\n", draft or "") if b.strip()]


def check_article(article: dict, library: dict) -> list[dict]:
    """Exact, model-free checks."""
    issues = []
    entries = library.get("entries", {})
    seen_paragraphs: dict[str, str] = {}
    heading_tops: list[tuple[dict, int]] = []

    for section in article["sections"]:
        draft = section.get("draft", "")
        if not draft.strip():
            issues.append(
                _issue(
                    "importante",
                    "estrutura",
                    section,
                    "Seção sem texto.",
                    "Escreva, importe ou gere o rascunho.",
                )
            )
            continue
        if _normalize(section["title"]) in REFERENCES_TITLES:
            issues.append(
                _issue(
                    "importante", "normas", section,
                    "Seção de referências escrita à mão: a exportação já gera a lista a partir das citações, e as duas ficariam duplicadas.",
                    "Remova esta seção; para obras que ainda não estão na Biblioteca, adicione os PDFs ao projeto.",
                )
            )  # fmt: skip

        for match in PENDING_RE.finditer(draft):
            issues.append(
                _issue(
                    "critico",
                    "fundamentacao",
                    section,
                    "Trecho pendente no texto.",
                    "Resolva o ponto ou remova o marcador.",
                    match.group(0),
                )
            )
        if FIGURE_RE.search(draft):
            issues.append(
                _issue(
                    "importante",
                    "normas",
                    section,
                    "Figura não importada (só o marcador ficou no texto).",
                    "Insira a figura no documento final, com legenda e fonte.",
                )
            )

        text_only = CITATION_LINK_RE.sub("", draft)
        for match in PLAIN_CITATION_RE.finditer(text_only):
            issues.append(
                _issue(
                    "importante", "fundamentacao", section,
                    "Citação escrita à mão, sem vínculo com a Biblioteca: não entra automaticamente nas referências.",
                    "Confira se a obra está na Biblioteca; se estiver, gere ou continue o trecho para que a citação seja vinculada.",
                    match.group(0),
                )
            )  # fmt: skip

        by_n = {s["n"]: s for s in section.get("sources", [])}
        cited = {
            n
            for anchor in ANCHOR_RE.findall(draft)
            for n in map(int, filter(None, anchor.split("-")))
        }
        reported: set[str] = set()  # one warning per work and section, not per citation
        for n in sorted(cited):
            source = by_n.get(n)
            if (
                not source
                or source["role"] != "literature"
                or role_of(library, source["source"]) != "literature"
                or source["source"] in reported
            ):
                continue
            reported.add(source["source"])
            entry = entries.get(source["source"], {})
            if not entry.get("authors") or not entry.get("year"):
                issues.append(
                    _issue(
                        "critico", "normas", section,
                        f"Obra citada sem autor ou ano na Biblioteca ({source['source']}): a citação e a referência saem incompletas.",
                        "Complete autor e ano na Biblioteca.", source.get("citation", ""),
                    )
                )  # fmt: skip

        blocks = _blocks(draft)
        for i, block in enumerate(blocks):
            if table_rows(block):
                around = " ".join(blocks[max(0, i - 1) : i] + blocks[i + 1 : i + 2])
                if not re.search(r"\b(Tabela|Table|Quadro)\s+\d+", around):
                    issues.append(
                        _issue(
                            "importante",
                            "normas",
                            section,
                            "Tabela sem legenda numerada logo acima ou abaixo.",
                            "Adicione “Tabela N – Título” acima e a fonte abaixo (ABNT).",
                            block.splitlines()[0][:200],
                        )
                    )
                continue
            if block.startswith("#"):
                number = re.match(r"^#+\s+(\d+)[.\s]", block)
                if number:
                    heading_tops.append((section, int(number.group(1))))
                continue
            key = re.sub(r"\s+", " ", plain_text(block)).strip().lower()
            if len(key) > 80:
                if key in seen_paragraphs:
                    issues.append(
                        _issue(
                            "importante",
                            "clareza",
                            section,
                            f"Parágrafo repetido (também em “{seen_paragraphs[key]}”).",
                            "Remova a repetição.",
                            plain_text(block)[:200],
                        )
                    )
                else:
                    seen_paragraphs[key] = section["title"]

        if section.get("words") and len(plain_text(draft).split()) < section["words"] * 0.4:
            issues.append(
                _issue(
                    "sugestao",
                    "estrutura",
                    section,
                    f"Seção bem mais curta que a meta ({len(plain_text(draft).split())} de ~{section['words']} palavras).",
                    "Desenvolva a seção ou ajuste a meta.",
                )
            )

    tops = []
    for section, number in heading_tops:
        if not tops or tops[-1][1] != number:
            tops.append((section, number))
    for (prev_section, prev), (section, number) in zip(tops, tops[1:], strict=False):
        if number not in (prev, prev + 1):
            issues.append(
                _issue(
                    "importante", "normas", section,
                    f"Numeração de seções salta de {prev} ({prev_section['title']}) para {number}.",
                    "Renumere as seções e subseções em sequência.",
                )
            )  # fmt: skip
    return issues


def _article_for_review(article: dict) -> str:
    parts = []
    for section in article["sections"]:
        if section.get("draft", "").strip():
            body = CITATION_LINK_RE.sub(lambda m: m.group(1), section["draft"])
            parts.append(f"## {section['title']}\n\n{body.strip()}")
    return "\n\n".join(parts)


def _sources_for_review(article: dict) -> str:
    out = []
    for section in article["sections"]:
        draft = section.get("draft", "")
        cited = sorted(
            {n for a in ANCHOR_RE.findall(draft) for n in map(int, filter(None, a.split("-")))}
        )
        by_n = {s["n"]: s for s in section.get("sources", [])}
        lines = []
        for n in cited:
            s = by_n.get(n)
            if not s:
                continue
            kind = {"material": "MATERIAL DE APOIO", "results": "RESULTADOS DO AUTOR"}.get(
                s["role"], "LITERATURA"
            )
            text = re.sub(r"\s+", " ", s.get("text", ""))[:SOURCE_EXCERPT_CHARS]
            lines.append(f"[{n}] {kind} {s.get('citation', '')} — {text}")
        if lines:
            out.append(f"### {section['title']}\n" + "\n".join(lines))
    return "\n\n".join(out) or "(nenhuma citação vinculada às fontes do projeto)"


def _parse_json(raw: str) -> dict:
    match = re.search(r"\{.*\}", raw, re.S)
    if not match:
        raise ValueError("O revisor não devolveu JSON.")
    return json.loads(match.group(0))


def _section_text(section: dict) -> str:
    rendered = CITATION_LINK_RE.sub(lambda m: m.group(1), section.get("draft", ""))
    return re.sub(r"\s+", " ", plain_text(rendered))


def _locate(issue: dict, article: dict) -> dict:
    """Maps the reviewer's section to an id and keeps the excerpt only if it is literal text of
    the article; a literal excerpt also fixes a wrong or missing section title."""
    wanted = _normalize(issue.get("secao", ""))
    section = next((s for s in article["sections"] if _normalize(s["title"]) == wanted), None)
    excerpt = re.sub(r"\s+", " ", str(issue.get("trecho") or "").strip().strip('“”"'))
    if excerpt:
        if section is None or excerpt not in _section_text(section):
            holder = next((s for s in article["sections"] if excerpt in _section_text(s)), None)
            section = holder or section
            excerpt = excerpt if holder else ""
    severity = issue.get("gravidade") if issue.get("gravidade") in SEVERITIES else "sugestao"
    return _issue(
        severity, str(issue.get("categoria") or "geral"), section, str(issue.get("problema") or ""),
        str(issue.get("sugestao") or ""), excerpt, source="revisor",
    )  # fmt: skip


def review_article(article: dict, library: dict, max_issues: int = 40) -> dict:
    checks = check_article(article, library)
    model = review_model()
    prompt = REVIEW_PROMPT.format(
        max_issues=max_issues,
        title=article.get("title") or "(sem título)",
        article=_article_for_review(article),
        sources=_sources_for_review(article),
    )
    raw = chat_completion([{"role": "user", "content": prompt}], temperature=0, model=model)
    data = _parse_json(raw)
    llm_issues = [_locate(i, article) for i in data.get("problemas", []) if i.get("problema")]
    order = {s: i for i, s in enumerate(SEVERITIES)}
    issues = sorted(checks + llm_issues, key=lambda i: order[i["gravidade"]])
    return {
        "at": _now(),
        "model": model,
        "hash": content_hash(article),
        "summary": str(data.get("resumo") or ""),
        "scores": {
            k: v for k, v in (data.get("notas") or {}).items() if isinstance(v, (int, float))
        },
        "issues": issues,
        "counts": {s: sum(1 for i in issues if i["gravidade"] == s) for s in SEVERITIES},
    }
