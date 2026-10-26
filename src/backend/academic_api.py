"""Academic endpoints: library, citation style, references, BibTeX, author results, article."""

import os
import tempfile
from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Body, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import PlainTextResponse, Response

from academic import article as art
from academic.doc_import import import_document
from academic.review import content_hash, review_article
from academic.revise import annotate_issues, apply_revision, revise_section, set_issue_status
from academic import library as lib
from academic.citations import bibtex, cite, reference, reference_list
from academic.indexing import RESULTS_EXTENSIONS, index_results_file, results_dir
from core.config import load_parameters
from core.llm import review_model, writing_model
from helper_methods import get_projects_dir

router = APIRouter(prefix="/academic", tags=["Academic"])


def _project_dir(project: str) -> str:
    if not project or os.path.basename(project) != project or project in {".", ".."}:
        raise HTTPException(status_code=400, detail="Nome de projeto inválido")
    path = os.path.join(get_projects_dir(), project)
    if not os.path.isdir(path):
        raise HTTPException(status_code=404, detail=f"Projeto não encontrado: {project}")
    return path


def _attachment(file_name: str) -> dict:
    """Content-Disposition that survives accents in project names (headers are latin-1)."""
    return {"Content-Disposition": f"attachment; filename*=UTF-8''{quote(file_name)}"}


def _safe_file_name(name: str) -> str:
    name = os.path.basename(name or "")
    if not name or name.startswith("."):
        raise HTTPException(status_code=400, detail="Nome de arquivo inválido")
    return name


@router.get("/{project}/library")
async def get_library(project: str):
    library = lib.load_library(_project_dir(project))
    style = library.get("style", "abnt")
    entries = []
    for source, entry in sorted(library.get("entries", {}).items()):
        role = lib.role_of(library, source)
        literature = role == "literature"
        entries.append(
            {
                "source": source,
                **entry,
                "role": role,
                "citation": cite([(entry, None)], style) if literature else f"(material de apoio: {source})",
                "reference": reference(entry, style) if literature else "",
            }
        )
    return {"style": style, "entries": entries}


def _literature(library: dict) -> list[dict]:
    """Citable works only: material de apoio never goes to references or BibTeX."""
    return [
        entry
        for source, entry in library.get("entries", {}).items()
        if lib.role_of(library, source) == "literature"
    ]


@router.put("/{project}/library/{source:path}")
async def update_library_entry(project: str, source: str, fields: dict = Body(...)):
    try:
        entry = lib.update_entry(_project_dir(project), source, fields)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Documento não está na biblioteca: {source}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"source": source, **entry}


@router.put("/{project}/style")
async def set_citation_style(project: str, payload: dict = Body(...)):
    try:
        lib.set_style(_project_dir(project), payload.get("style", ""))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"style": payload["style"]}


@router.get("/{project}/references")
async def get_references(project: str, style: str | None = None):
    library = lib.load_library(_project_dir(project))
    style = style or library.get("style", "abnt")
    return {"style": style, "markdown": reference_list(_literature(library), style)}


@router.get("/{project}/bibtex", response_class=PlainTextResponse)
async def get_bibtex(project: str):
    library = lib.load_library(_project_dir(project))
    return PlainTextResponse(
        bibtex(_literature(library)),
        headers=_attachment(f"{project}.bib"),
    )


@router.get("/{project}/results")
async def list_results(project: str):
    folder = results_dir(_project_dir(project))
    if not os.path.isdir(folder):
        return {"files": []}
    files = [
        {
            "file_name": name,
            "size": os.path.getsize(os.path.join(folder, name)),
            "modified": datetime.fromtimestamp(os.path.getmtime(os.path.join(folder, name))).isoformat(timespec="seconds"),
        }
        for name in sorted(os.listdir(folder))
        if os.path.splitext(name)[1].lower() in RESULTS_EXTENSIONS
    ]
    return {"files": files}


@router.post("/{project}/results")
async def upload_results(project: str, files: list[UploadFile] = File(...)):
    project_dir = _project_dir(project)
    os.makedirs(results_dir(project_dir), exist_ok=True)
    parameters = load_parameters()
    indexed = {}
    for upload in files:
        name = _safe_file_name(upload.filename)
        if os.path.splitext(name)[1].lower() not in RESULTS_EXTENSIONS:
            raise HTTPException(status_code=422, detail=f"Resultados devem ser .md ou .txt: {name}")
        with open(os.path.join(results_dir(project_dir), name), "wb") as f:
            f.write(await upload.read())
        try:
            indexed[name] = index_results_file(project_dir, name, parameters)
        except NotImplementedError as e:
            raise HTTPException(status_code=409, detail=str(e))
    return {"indexed_chunks": indexed}


@router.delete("/{project}/results/{file_name}")
async def delete_results(project: str, file_name: str):
    project_dir = _project_dir(project)
    name = _safe_file_name(file_name)
    path = os.path.join(results_dir(project_dir), name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Arquivo não encontrado: {name}")
    os.remove(path)
    try:
        index_results_file(project_dir, name, load_parameters())  # file gone -> chunks removed
    except NotImplementedError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"deleted": name}


@router.get("/{project}/article")
async def get_article(project: str):
    project_dir = _project_dir(project)
    article = art.load_article(project_dir)
    review = annotate_issues(article.get("review"))
    return {
        **article,
        "writing_model": writing_model(),
        "review_model": review_model(),
        "review_stale": bool(review) and review.get("hash") != content_hash(article),
    }


@router.put("/{project}/article")
async def put_article(project: str, payload: dict = Body(...)):
    return art.update_article(_project_dir(project), payload)


@router.post("/{project}/article/reset")
async def reset_article(project: str, payload: dict = Body(default={})):
    """Deletes the article and starts over (blank or default layout); a backup is kept."""
    return art.reset_article(
        _project_dir(project), str(payload.get("title") or ""), payload.get("template") == "vazio"
    )


@router.post("/{project}/article/sections/{section_id}/generate")
async def generate_article_section(project: str, section_id: str):
    project_dir = _project_dir(project)
    try:
        return await run_in_threadpool(art.generate_section, project_dir, section_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Seção não encontrada: {section_id}")


@router.post("/{project}/article/sections/{section_id}/continue")
async def continue_article_section(project: str, section_id: str, payload: dict = Body(default={})):
    project_dir = _project_dir(project)
    try:
        return await run_in_threadpool(
            art.continue_section,
            project_dir,
            section_id,
            str(payload.get("instruction") or ""),
            int(payload.get("words") or 300),
        )
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Seção não encontrada: {section_id}")


@router.post("/{project}/article/review")
async def review_article_endpoint(project: str):
    """Full review of the saved article (checks + strong LLM); the report is stored with it."""
    project_dir = _project_dir(project)
    article, library = art.load_article(project_dir), lib.load_library(project_dir)
    if not any(s.get("draft", "").strip() for s in article["sections"]):
        raise HTTPException(status_code=422, detail="O artigo ainda não tem texto para analisar.")
    try:
        review = await run_in_threadpool(review_article, article, library)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"Falha na análise: {e}")
    article = art.load_article(project_dir)  # reload: keep edits saved while the review ran
    article["review"] = annotate_issues(review)
    art.save_article(project_dir, article)
    return {**review, "stale": review["hash"] != content_hash(article)}


@router.post("/{project}/article/revise")
async def revise_article(project: str, payload: dict = Body(...)):
    """Proposals (not saved) fixing the selected review issues, one per section."""
    project_dir = _project_dir(project)
    review = annotate_issues(art.load_article(project_dir).get("review"))
    if not review:
        raise HTTPException(status_code=422, detail="Analise o artigo antes de corrigir.")
    wanted = set(payload.get("issue_ids") or [])
    selected = [i for i in review["issues"] if i["id"] in wanted and i["correcao"] == "texto"]
    if not selected:
        raise HTTPException(status_code=422, detail="Nenhum apontamento selecionado pode ser corrigido no texto.")
    by_section: dict[str, list] = {}
    for issue in selected:
        by_section.setdefault(issue["secao_id"], []).append(issue)
    proposals, errors = [], []
    for section_id, issues in by_section.items():
        try:
            proposals.append(await run_in_threadpool(revise_section, project_dir, section_id, issues))
        except KeyError:
            errors.append({"section_id": section_id, "error": "Seção não existe mais."})
        except Exception as e:  # one failing section must not lose the others
            errors.append({"section_id": section_id, "error": str(e)})
    return {"proposals": proposals, "errors": errors}


@router.post("/{project}/article/revise/apply")
async def apply_article_revision(project: str, payload: dict = Body(...)):
    project_dir = _project_dir(project)
    if not payload.get("section_id") or not isinstance(payload.get("draft"), str):
        raise HTTPException(status_code=422, detail="Informe section_id e draft.")
    try:
        saved = apply_revision(
            project_dir,
            str(payload["section_id"]),
            payload["draft"],
            list(payload.get("sources") or []),
            list(payload.get("issue_ids") or []),
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Seção não encontrada.")
    return {**saved, "review": annotate_issues(saved.get("review"))}


@router.put("/{project}/article/review/status")
async def set_review_issue_status(project: str, payload: dict = Body(...)):
    """Marks issues as ignored/fixed by hand, or clears the mark (status null)."""
    status = payload.get("status")
    if status not in ("corrigido", "ignorado", None):
        raise HTTPException(status_code=422, detail="Status deve ser corrigido, ignorado ou null.")
    saved = set_issue_status(_project_dir(project), list(payload.get("issue_ids") or []), status)
    return annotate_issues(saved.get("review"))


@router.post("/{project}/article/import")
async def import_article_document(project: str, file: UploadFile = File(...)):
    """Converts the author's DOCX/PDF/Markdown into markdown sections (preview, not saved)."""
    _project_dir(project)
    name = _safe_file_name(file.filename)
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, name)
        with open(path, "wb") as f:
            f.write(await file.read())
        try:
            return await run_in_threadpool(import_document, path, name)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))


@router.get("/{project}/article/export")
async def export_article(project: str, format: str = "md"):
    project_dir = _project_dir(project)
    article, library = art.load_article(project_dir), lib.load_library(project_dir)
    if format == "docx":
        return Response(
            art.to_docx(article, library),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers=_attachment(f"{project}-artigo.docx"),
        )
    if format == "tex":
        return Response(
            art.to_latex_zip(article, library),
            media_type="application/zip",
            headers=_attachment(f"{project}-artigo-latex.zip"),
        )
    if format != "md":
        raise HTTPException(status_code=422, detail="Formato deve ser md, docx ou tex")
    return PlainTextResponse(
        art.to_markdown(article, library),
        media_type="text/markdown; charset=utf-8",
        headers=_attachment(f"{project}-artigo.md"),
    )
