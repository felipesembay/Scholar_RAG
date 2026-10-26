"""Deterministic citation and reference formatting (ABNT NBR 10520 / NBR 6023, APA 7).

Everything here is plain code over library entries, never LLM output, so a reference can
only exist if the document is in the project library.

Entry fields (all optional except title): type (article | book | chapter | thesis | web | misc),
authors ["Family, Given"], title, year, venue (journal / book title for chapters), volume,
issue, pages ("10-20"), publisher, place, edition, editors, doi, url, accessed (YYYY-MM-DD),
degree, institution.

Styles:
  abnt      parenthetical surname in uppercase: (SILVA, 2021, p. 4)  — widely required by programs
  abnt2023  NBR 10520:2023 mixed case:          (Silva, 2021, p. 4)
  apa       APA 7:                              (Silva, 2021, p. 4)
Markdown output: **bold** (ABNT highlight) and *italic* (APA).
"""

import re
from datetime import date

from unidecode import unidecode

STYLES = ("abnt", "abnt2023", "apa")
SUFFIXES = {"junior", "júnior", "jr", "jr.", "filho", "neto", "sobrinho", "segundo"}
MONTHS_PT = [
    "jan.",
    "fev.",
    "mar.",
    "abr.",
    "maio",
    "jun.",
    "jul.",
    "ago.",
    "set.",
    "out.",
    "nov.",
    "dez.",
]


# ---------------------------------------------------------------------------- names


def parse_name(name: str) -> tuple[str, str]:
    """'Silva, Ana Maria' or 'Ana Maria da Silva' -> ('Silva', 'Ana Maria da')."""
    name = " ".join(name.split())
    if "," in name:
        family, given = (p.strip() for p in name.split(",", 1))
        return family, given
    parts = name.split(" ")
    if len(parts) == 1:
        return parts[0], ""
    if len(parts) > 2 and parts[-1].lower() in SUFFIXES:  # "Pedro Souza Filho" -> "Souza Filho"
        return " ".join(parts[-2:]), " ".join(parts[:-2])
    return parts[-1], " ".join(parts[:-1])


def _initials(given: str) -> str:
    """'Ana Maria da' -> 'A. M.' (particles dropped, hyphenated names kept: 'J.-P.')."""
    out = []
    for part in given.split():
        if part.lower() in {"da", "de", "do", "das", "dos", "e", "van", "von", "del", "di"}:
            continue
        out.append("-".join(p[0].upper() + "." for p in part.split("-") if p))
    return " ".join(out)


def _families(entry: dict) -> list[str]:
    return [parse_name(a)[0] for a in entry.get("authors") or []]


# ---------------------------------------------------------------------------- in-text


def _anchor(entry: dict, upper: bool) -> str:
    """Author part of a citation; falls back to the first word of the title (ABNT rule)."""
    families = _families(entry)
    if not families:
        first = (entry.get("title") or "S. título").split()[0].strip(".,:;")
        return f"{first.upper()}..." if upper else f"{first}..."
    case = (lambda s: s.upper()) if upper else (lambda s: s)
    if len(families) <= 3:
        return "; ".join(case(f) for f in families)
    return f"{case(families[0])} et al."


def _apa_anchor(entry: dict, narrative: bool = False) -> str:
    families = _families(entry)
    if not families:
        return f"*{entry.get('title') or 'S. título'}*"
    if len(families) == 1:
        return families[0]
    if len(families) == 2:
        return f"{families[0]} {'and' if narrative else '&'} {families[1]}"
    return f"{families[0]} et al."


def citation_page(entry: dict, pdf_page: int | None) -> int | None:
    """Maps a PDF page index to the printed page.

    page_offset (user-set, e.g. -14 when printed page 1 is PDF page 15) wins; otherwise an
    article's page range ("10-20") is used; otherwise the PDF page is kept.
    """
    if not pdf_page:
        return None
    if entry.get("page_offset") not in (None, ""):
        printed = pdf_page + int(entry["page_offset"])
        return printed if printed > 0 else pdf_page
    match = re.match(r"\s*(\d+)\s*[-–]\s*(\d+)", str(entry.get("pages") or ""))
    if match:
        first, last = int(match.group(1)), int(match.group(2))
        printed = first + pdf_page - 1
        if first <= printed <= last:
            return printed
    return pdf_page


def _pages_label(pages: list[int]) -> str:
    """[199, 200, 205] -> 'p. 199-200, 205' (ABNT/APA: same work, several pages)."""
    pages = sorted(set(pages))
    if not pages:
        return ""
    ranges, start, prev = [], pages[0], pages[0]
    for page in pages[1:] + [None]:
        if page is not None and page == prev + 1:
            prev = page
            continue
        ranges.append(f"{start}-{prev}" if prev != start else str(start))
        if page is not None:
            start = prev = page
    return f"p. {', '.join(ranges)}"


def _work_label(entry: dict, style: str) -> str:
    if style == "apa":
        return f"{_apa_anchor(entry)}, {entry.get('year') or 'n.d.'}"
    return f"{_anchor(entry, upper=(style == 'abnt'))}, {entry.get('year') or '[s. d.]'}"


def cite_one(entry: dict, page: int | None, style: str) -> str:
    """Single item inside a parenthetical citation, without the parentheses."""
    page = citation_page(entry, page)
    return _work_label(entry, style) + (f", p. {page}" if page else "")


def cite(items: list[tuple[dict, int | None]], style: str = "abnt") -> str:
    """Parenthetical citation: (SILVA, 2021, p. 4; SOUZA, 2020). Pages of the same work merge."""
    order: list[str] = []
    pages: dict[str, list[int]] = {}
    for entry, page in items:
        label = _work_label(entry, style)
        if label not in pages:
            order.append(label)
            pages[label] = []
        printed = citation_page(entry, page)
        if printed:
            pages[label].append(printed)
    parts = [label + (f", {_pages_label(pages[label])}" if pages[label] else "") for label in order]
    return "(" + "; ".join(parts) + ")"


def cite_narrative(entry: dict, style: str = "abnt") -> str:
    """Author as part of the sentence: Silva e Souza (2021) / Silva et al. (2021)."""
    year = entry.get("year") or ("n.d." if style == "apa" else "[s. d.]")
    if style == "apa":
        return f"{_apa_anchor(entry, narrative=True)} ({year})"
    families = _families(entry)
    if not families:
        return f"{_anchor(entry, upper=False)} ({year})"
    if len(families) == 1:
        names = families[0]
    elif len(families) <= 3:
        names = ", ".join(families[:-1]) + " e " + families[-1]
    else:
        names = f"{families[0]} et al."
    return f"{names} ({year})"


# ---------------------------------------------------------------------------- references


def _abnt_author(name: str) -> str:
    family, given = parse_name(name)
    return f"{family.upper()}, {given}" if given else family.upper()


def _abnt_authors(entry: dict) -> str:
    authors = entry.get("authors") or []
    return "; ".join(_abnt_author(a) for a in authors)


def _abnt_access(entry: dict) -> str:
    parts = []
    if entry.get("doi"):
        parts.append(f"DOI: {entry['doi']}.")
    if entry.get("url"):
        accessed = entry.get("accessed") or date.today().isoformat()
        y, m, d = (int(x) for x in accessed.split("-"))
        parts.append(f"Disponível em: {entry['url']}. Acesso em: {d} {MONTHS_PT[m - 1]} {y}.")
    return (" " + " ".join(parts)) if parts else ""


def reference_abnt(entry: dict) -> str:
    """NBR 6023:2018 reference (markdown, highlight in bold)."""
    kind = entry.get("type") or "misc"
    authors = _abnt_authors(entry)
    title = (entry.get("title") or "[Sem título]").rstrip(".")
    year = entry.get("year") or "[s. d.]"
    place = entry.get("place") or "[S. l.]"
    publisher = entry.get("publisher") or "[s. n.]"
    head = f"{authors.rstrip('.')}. " if authors else ""  # "LIMA, J." must not become "LIMA, J.."

    if not authors and kind != "article":
        # NBR 6023: no author -> entry by the title, first word in uppercase, no highlight
        first, *rest = title.split(" ", 1)
        ref = first.upper() + (f" {rest[0]}" if rest else "") + "."
        if entry.get("edition"):
            ref += f" {entry['edition']}. ed."
        return ref + f" {place}: {publisher}, {year}." + _abnt_access(entry)

    if kind == "article":
        if not authors:  # no author: first word of the title in uppercase is the entry point
            first, *rest = title.split(" ", 1)
            head, title = "", first.upper() + (f" {rest[0]}" if rest else "")
        ref = f"{head}{title}. **{entry.get('venue') or '[Periódico não informado]'}**"
        if entry.get("place"):
            ref += f", {entry['place']}"
        for prefix, key in (("v.", "volume"), ("n.", "issue"), ("p.", "pages")):
            if entry.get(key):
                ref += f", {prefix} {entry[key]}"
        ref += f", {year}."
    elif kind == "chapter":
        editors = "; ".join(_abnt_author(e) for e in entry.get("editors") or [])
        book = f"In: {editors} (org.). " if editors else "In: "
        ref = f"{head}{title}. {book}**{entry.get('venue') or '[Livro não informado]'}**."
        ref += f" {place}: {publisher}, {year}."
        if entry.get("pages"):
            ref += f" p. {entry['pages']}."
    elif kind == "thesis":
        degree = entry.get("degree") or "Dissertação (Mestrado)"
        ref = f"{head}**{title}**. {year}. {degree} – {entry.get('institution') or '[Instituição]'}, {place}, {year}."
    elif kind == "web":
        ref = f"{head}**{title}**. {place}, {year}."
    else:  # book / misc
        ref = f"{head}**{title}**."
        if entry.get("edition"):
            ref += f" {entry['edition']}. ed."
        ref += f" {place}: {publisher}, {year}."
    return ref + _abnt_access(entry)


def _apa_author(name: str) -> str:
    family, given = parse_name(name)
    initials = _initials(given)
    return f"{family}, {initials}" if initials else family


def _apa_authors(entry: dict) -> str:
    names = [_apa_author(a) for a in entry.get("authors") or []]
    if not names:
        return ""
    if len(names) == 1:
        return names[0]
    return ", ".join(names[:-1]) + ", & " + names[-1]


def reference_apa(entry: dict) -> str:
    """APA 7 reference (markdown, italics)."""
    kind = entry.get("type") or "misc"
    authors = _apa_authors(entry)
    year = entry.get("year") or "n.d."
    title = (entry.get("title") or "[Untitled]").rstrip(".")
    doi = (
        f" https://doi.org/{entry['doi']}"
        if entry.get("doi")
        else (f" {entry['url']}" if entry.get("url") else "")
    )

    if kind == "article":
        lead = f"{authors} ({year}). {title}." if authors else f"{title}. ({year})."
        ref = f"{lead} *{entry.get('venue') or '[Journal]'}*"
        if entry.get("volume"):
            ref += f", *{entry['volume']}*"
            if entry.get("issue"):
                ref += f"({entry['issue']})"
        if entry.get("pages"):
            ref += f", {str(entry['pages']).replace('-', '–')}"
        return ref + "." + doi
    if kind == "chapter":
        editors = entry.get("editors") or []
        eds = ""
        if editors:
            names = [f"{_initials(parse_name(e)[1])} {parse_name(e)[0]}".strip() for e in editors]
            eds = f"{' & '.join(names)} ({'Eds.' if len(names) > 1 else 'Ed.'}), "
        pages = f" (pp. {str(entry['pages']).replace('-', '–')})" if entry.get("pages") else ""
        ref = f"{authors} ({year}). {title}. In {eds}*{entry.get('venue') or '[Book]'}*{pages}."
        return ref + (f" {entry['publisher']}." if entry.get("publisher") else "") + doi
    edition = f" ({entry['edition']} ed.)" if entry.get("edition") else ""
    lead = (
        f"{authors} ({year}). *{title}*{edition}." if authors else f"*{title}*{edition}. ({year})."
    )
    if kind == "thesis":
        lead += f" [{entry.get('degree') or 'Master’s thesis'}, {entry.get('institution') or 'Institution'}]."
    elif entry.get("publisher"):
        lead += f" {entry['publisher']}."
    return lead + doi


def reference(entry: dict, style: str = "abnt") -> str:
    return reference_apa(entry) if style == "apa" else reference_abnt(entry)


def _sort_key(entry: dict):
    families = _families(entry)
    lead = families[0] if families else (entry.get("title") or "")
    return (
        unidecode(lead).lower(),
        str(entry.get("year") or ""),
        unidecode(entry.get("title") or "").lower(),
    )


def reference_list(entries: list[dict], style: str = "abnt") -> str:
    """Alphabetical reference list (markdown), one reference per paragraph."""
    title = "REFERÊNCIAS" if style.startswith("abnt") else "References"
    refs = [reference(e, style) for e in sorted(entries, key=_sort_key)]
    return f"## {title}\n\n" + "\n\n".join(refs)


# ---------------------------------------------------------------------------- BibTeX


def make_citekey(entry: dict, taken: set[str]) -> str:
    """silva2021, silva2021a, ... (stable once assigned: the library never rewrites keys)."""
    families = _families(entry)
    lead = families[0] if families else (entry.get("title") or "doc").split()[0]
    base = re.sub(r"[^a-z0-9]", "", unidecode(lead).lower()) or "doc"
    base += str(entry.get("year") or "")
    key, suffix = base, 0
    while key in taken:
        key = base + "abcdefghijklmnopqrstuvwxyz"[suffix % 26] * (1 + suffix // 26)
        suffix += 1
    return key


def _bib_escape(value: str) -> str:
    return (
        str(value).replace("&", r"\&").replace("%", r"\%").replace("_", r"\_").replace("#", r"\#")
    )


def bibtex(entries: list[dict]) -> str:
    kinds = {
        "article": "article",
        "book": "book",
        "chapter": "incollection",
        "thesis": "mastersthesis",
        "web": "online",
    }
    out = []
    for e in sorted(entries, key=_sort_key):
        fields = {
            "author": " and ".join(e.get("authors") or []),
            "title": e.get("title"),
            "year": e.get("year"),
            "journal" if e.get("type") == "article" else "booktitle": e.get("venue")
            if e.get("type") in {"article", "chapter"}
            else None,
            "volume": e.get("volume"),
            "number": e.get("issue"),
            "pages": str(e["pages"]).replace("-", "--") if e.get("pages") else None,
            "publisher": e.get("publisher"),
            "address": e.get("place"),
            "edition": e.get("edition"),
            "school": e.get("institution"),
            "doi": e.get("doi"),
            "url": e.get("url"),
        }
        body = ",\n".join(f"  {k} = {{{_bib_escape(v)}}}" for k, v in fields.items() if v)
        out.append(f"@{kinds.get(e.get('type'), 'misc')}{{{e['citekey']},\n{body}\n}}")
    return "\n\n".join(out) + "\n"
