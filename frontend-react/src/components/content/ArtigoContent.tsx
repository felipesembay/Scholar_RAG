import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ClipboardCheck, CornerDownRight, Download, Eye, FileUp, Loader2, PenLine, Plus, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { useToast } from "../ui/Toast";
import MarkdownWithCitations from "../academic/MarkdownWithCitations";
import SourcesPanel from "../academic/SourcesPanel";
import ImportDocumentModal, { type ImportAssignment } from "../academic/ImportDocumentModal";
import ReviewPanel, { SEVERITY } from "../academic/ReviewPanel";
import RevisionModal, { type RevisionProgress } from "../academic/RevisionModal";
import {
  continueSection,
  downloadArticle,
  generateSection,
  getArticle,
  importArticleDocument,
  reviewArticle,
  reviseArticle,
  applyRevision,
  setIssueStatus,
  resetArticle,
  saveArticle,
  type Article,
  type ArticleSection,
  type ImportPreview,
  type ReviewIssue,
  type RevisionProposal,
} from "../../academic_services.ts";

interface ProjectLike {
  name: string;
}

const FIELD = "block text-[12px] font-medium text-muted-foreground space-y-1";
const PENDING_RE = /\[PENDENTE:[^\]]*\]/g;

const wordCount = (text: string) =>
  text.replace(/\]\(#src-[\d-]+\)/g, "]").split(/\s+/).filter(Boolean).length;

// what a review is about: when this changes, the review no longer matches the text
const contentKey = (a: Article | null) =>
  a ? JSON.stringify([a.title, a.sections.map((s) => [s.title, s.draft])]) : "";

const errorDetail = (error: unknown) =>
  (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? String(error);

function SectionStatus({ section }: { section: ArticleSection }) {
  const pending = section.draft.match(PENDING_RE)?.length ?? 0;
  const color = !section.draft.trim() ? "bg-line-strong" : pending ? "bg-warning" : "bg-success";
  const label = !section.draft.trim() ? "Sem rascunho" : pending ? `${pending} pendência(s)` : "Rascunho pronto";
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${color}`} title={label} aria-label={label} />;
}

export default function ArtigoContent({ projects, selectedProject }: {
  projects: ProjectLike[];
  selectedProject?: ProjectLike | null;
}) {
  const { showSuccess, showError } = useToast();
  const [project, setProject] = useState<string>(selectedProject?.name ?? projects[0]?.name ?? "");
  const [article, setArticle] = useState<Article | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [highlighted, setHighlighted] = useState<number[]>([]);
  const [nextStep, setNextStep] = useState("");
  const [nextWords, setNextWords] = useState(300);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewedKey, setReviewedKey] = useState<string | null>(null);
  const [focusIssue, setFocusIssue] = useState<ReviewIssue | null>(null);
  const [exportGate, setExportGate] = useState<"md" | "docx" | "tex" | null>(null);
  const [fixing, setFixing] = useState(false);
  const [revision, setRevision] = useState<{ proposals: RevisionProposal[]; errors: { section_id: string; error: string }[] } | null>(null);
  const [revisionProgress, setRevisionProgress] = useState<RevisionProgress>({ done: 0, total: 0, current: "", stopped: false });
  const stopRevision = useRef(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTemplate, setResetTemplate] = useState<"vazio" | "padrao">("vazio");
  const [resetKeepTitle, setResetKeepTitle] = useState(true);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const data = await getArticle(project);
      setArticle(data);
      setReviewedKey(data.review && !data.review_stale ? contentKey(data) : null);
      setSelectedId((id) => (data.sections.some((s) => s.id === id) ? id : data.sections[0]?.id ?? ""));
      setDirty(false);
    } catch (error) {
      showError("Erro ao carregar o artigo", errorDetail(error));
    } finally {
      setLoading(false);
    }
  }, [project, showError]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!project && projects.length) setProject(projects[0].name);
  }, [projects, project]);
  useEffect(() => { setHighlighted([]); setEditingDraft(false); setNextStep(""); setFocusIssue((f) => (f?.secao_id === selectedId ? f : null)); }, [selectedId]);

  const section = article?.sections.find((s) => s.id === selectedId);
  const currentKey = useMemo(() => contentKey(article), [article]);
  const reviewStale = Boolean(article?.review) && currentKey !== reviewedKey;
  const issuesBySection = useMemo(() => {
    const counts: Record<string, number> = {};
    (article?.review?.issues ?? []).forEach((i) => { if (i.secao_id && !i.status) counts[i.secao_id] = (counts[i.secao_id] ?? 0) + 1; });
    return counts;
  }, [article?.review]);

  const change = (update: (a: Article) => Article) => {
    setArticle((a) => (a ? update(a) : a));
    setDirty(true);
  };
  const setField = <K extends keyof ArticleSection>(key: K, value: ArticleSection[K]) =>
    change((a) => ({ ...a, sections: a.sections.map((s) => (s.id === selectedId ? { ...s, [key]: value } : s)) }));

  const persist = async (current: Article | null = article) => {
    if (!current) return null;
    const saved = await saveArticle(project, { title: current.title, sections: current.sections });
    setArticle((a) => ({ ...saved, writing_model: a?.writing_model, review_model: a?.review_model }));
    setDirty(false);
    return saved;
  };

  const onSave = async () => {
    try {
      await persist();
      showSuccess("Artigo salvo", project);
    } catch (error) {
      showError("Erro ao salvar", errorDetail(error));
    }
  };

  const onGenerate = async () => {
    if (!section) return;
    if (section.draft.trim() && !window.confirm(`Substituir o rascunho atual de "${section.title}"?`)) return;
    setGenerating(section.id);
    try {
      if (dirty) await persist(); // generation reads the saved article (goal, notes, other sections)
      const generated = await generateSection(project, section.id);
      setArticle((a) => (a ? { ...a, sections: a.sections.map((s) => (s.id === generated.id ? generated : s)) } : a));
      const dropped = generated.generated?.dropped.length ?? 0;
      showSuccess(
        "Rascunho gerado",
        `${generated.title} · ${generated.sources.length} fontes consultadas${dropped ? ` · ${dropped} citação(ões) inválida(s) removida(s)` : ""}`,
      );
    } catch (error) {
      showError("Erro ao gerar a seção", errorDetail(error));
    } finally {
      setGenerating(null);
    }
  };

  const onContinue = async () => {
    if (!section) return;
    setGenerating(section.id);
    try {
      if (dirty) await persist(); // continuation reads the saved draft (including your own text)
      const continued = await continueSection(project, section.id, nextStep, nextWords);
      setArticle((a) => (a ? { ...a, sections: a.sections.map((s) => (s.id === continued.id ? continued : s)) } : a));
      setEditingDraft(false);
      setNextStep("");
      const dropped = continued.generated?.dropped.length ?? 0;
      showSuccess(
        "Texto continuado",
        `${wordCount(continued.draft) - wordCount(section.draft)} palavras acrescentadas${dropped ? ` · ${dropped} citação(ões) inválida(s) removida(s)` : ""}`,
      );
    } catch (error) {
      showError("Erro ao continuar a seção", errorDetail(error));
    } finally {
      setGenerating(null);
    }
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const preview = await importArticleDocument(project, file);
      if (!preview.sections.length) showError("Nada para importar", `${file.name} não tem texto legível.`);
      else setImportPreview(preview);
    } catch (error) {
      showError("Erro ao ler o documento", errorDetail(error));
    } finally {
      setImporting(false);
      if (importInput.current) importInput.current.value = "";
    }
  };

  const applyImport = (assignments: ImportAssignment[], title: string) => {
    if (!article) return;
    const sections = [...article.sections];
    let firstId = "";
    assignments.forEach((item, i) => {
      if (item.target === "__new__") {
        const id = `secao-${Date.now().toString(36)}-${i}`;
        sections.push({ id, title: item.title, goal: "", notes: "", words: 500, use_sources: true, draft: item.markdown, sources: [] });
        firstId ||= id;
        return;
      }
      const index = sections.findIndex((s) => s.id === item.target);
      if (index < 0) return;
      const current = sections[index];
      sections[index] =
        item.mode === "replace"
          ? { ...current, draft: item.markdown, sources: [], generated: undefined } // old citations go with the old draft
          : { ...current, draft: [current.draft.trim(), item.markdown].filter(Boolean).join("\n\n") };
      firstId ||= current.id;
    });
    change((a) => ({ ...a, title: title || a.title, sections }));
    setImportPreview(null);
    if (firstId) setSelectedId(firstId);
    showSuccess("Documento importado", `${assignments.length} parte(s) aplicada(s). Revise e clique em Salvar.`);
  };

  const addSection = () => {
    const id = `secao-${Date.now().toString(36)}`;
    change((a) => ({
      ...a,
      sections: [...a.sections, { id, title: "Nova seção", goal: "", notes: "", words: 500, use_sources: true, draft: "", sources: [] }],
    }));
    setSelectedId(id);
  };

  const moveSection = (offset: number) =>
    change((a) => {
      const i = a.sections.findIndex((s) => s.id === selectedId);
      const j = i + offset;
      if (i < 0 || j < 0 || j >= a.sections.length) return a;
      const sections = [...a.sections];
      [sections[i], sections[j]] = [sections[j], sections[i]];
      return { ...a, sections };
    });

  const removeSection = () => {
    if (!section || !window.confirm(`Remover a seção "${section.title}" e seu rascunho?`)) return;
    const rest = article!.sections.filter((s) => s.id !== section.id);
    change((a) => ({ ...a, sections: rest }));
    setSelectedId(rest[0]?.id ?? "");
  };

  const onReset = async () => {
    try {
      const fresh = await resetArticle(project, resetKeepTitle ? article?.title ?? "" : "", resetTemplate);
      setResetOpen(false);
      setReviewedKey(null);
      showSuccess(
        "Artigo recomeçado",
        resetTemplate === "vazio" ? "Em branco: adicione as seções com “+ Seção” ou importe um documento." : "Estrutura padrão criada.",
      );
      setArticle((a) => ({ ...fresh, writing_model: a?.writing_model, review_model: a?.review_model }));
      setSelectedId(fresh.sections[0]?.id ?? "");
      setDirty(false);
    } catch (error) {
      showError("Erro ao recomeçar", errorDetail(error));
    }
  };

  const onReview = async () => {
    setReviewing(true);
    try {
      const saved = dirty ? await persist() : article; // the review reads the saved article
      const review = await reviewArticle(project);
      setArticle((a) => (a ? { ...a, review } : a));
      setReviewedKey(review.stale ? null : contentKey(saved));
      const { critico = 0, importante = 0, sugestao = 0 } = review.counts;
      showSuccess("Análise concluída", `${critico} crítico(s) · ${importante} importante(s) · ${sugestao} sugestão(ões)`);
    } catch (error) {
      showError("Erro na análise", errorDetail(error));
    } finally {
      setReviewing(false);
    }
  };

  // one request per section: proposals show up as they are ready and the author can stop
  // before the remaining sections are sent to the (possibly paid) model
  const onFix = async (issueIds: string[]) => {
    const issues = (article?.review?.issues ?? []).filter((i) => issueIds.includes(i.id) && i.secao_id);
    const order = (article?.sections ?? []).map((s) => s.id);
    const groups = [...new Set(issues.map((i) => i.secao_id as string))]
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      .map((id) => ({ id, ids: issues.filter((i) => i.secao_id === id).map((i) => i.id) }));
    if (!groups.length) return;
    setFixing(true);
    stopRevision.current = false;
    setReviewOpen(false);
    setRevision({ proposals: [], errors: [] });
    try {
      if (dirty) await persist(); // corrections are built from the saved text
      for (let k = 0; k < groups.length; k++) {
        if (stopRevision.current) {
          setRevisionProgress({ done: k, total: groups.length, current: "", stopped: true });
          return;
        }
        const title = article?.sections.find((s) => s.id === groups[k].id)?.title ?? groups[k].id;
        setRevisionProgress({ done: k, total: groups.length, current: title, stopped: false });
        try {
          const result = await reviseArticle(project, groups[k].ids);
          setRevision((r) => r && { proposals: [...r.proposals, ...result.proposals], errors: [...r.errors, ...result.errors] });
        } catch (error) {
          setRevision((r) => r && { ...r, errors: [...r.errors, { section_id: title, error: errorDetail(error) }] });
        }
      }
      setRevisionProgress({ done: groups.length, total: groups.length, current: "", stopped: false });
    } catch (error) {
      showError("Erro ao preparar correções", errorDetail(error));
      setRevisionProgress((p) => ({ ...p, current: "" }));
    } finally {
      setFixing(false);
    }
  };

  const onAcceptRevision = async (proposal: RevisionProposal) => {
    try {
      const saved = await applyRevision(project, proposal);
      setArticle((a) => ({ ...saved, writing_model: a?.writing_model, review_model: a?.review_model }));
      setDirty(false);
      return true;
    } catch (error) {
      showError(`Erro ao aplicar a correção em ${proposal.title}`, errorDetail(error));
      return false;
    }
  };

  const onSetStatus = async (issueIds: string[], status: "corrigido" | "ignorado" | null) => {
    try {
      const review = await setIssueStatus(project, issueIds, status);
      setArticle((a) => (a ? { ...a, review } : a));
    } catch (error) {
      showError("Erro ao atualizar o apontamento", errorDetail(error));
    }
  };

  const openIssue = (issue: ReviewIssue) => {
    if (!issue.secao_id) return;
    setReviewOpen(false);
    setFocusIssue(issue);
    setSelectedId(issue.secao_id);
  };

  const onExport = async (format: "md" | "docx" | "tex", confirmed = false) => {
    if (!confirmed && (!article?.review || reviewStale)) {
      setExportGate(format);
      return;
    }
    try {
      if (dirty) await persist();
      await downloadArticle(project, format);
    } catch (error) {
      showError("Erro ao exportar", errorDetail(error));
    }
  };

  const totalWords = article?.sections.reduce((n, s) => n + wordCount(s.draft), 0) ?? 0;
  const pending = section?.draft.match(PENDING_RE)?.length ?? 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl px-8 py-8 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1 min-w-[280px]">
            <h1 className="page-title flex items-center gap-2.5">
              <PenLine className="w-6 h-6 text-primary" /> Escrita do artigo
            </h1>
            <p className="page-subtitle">
              Rascunho seção a seção, com citações verificadas a partir das fontes do projeto.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className={FIELD}>Projeto
              <select
                className="sr-input pr-8 w-48"
                value={project}
                onChange={(e) => {
                  if (dirty && !window.confirm("Há alterações não salvas. Trocar de projeto mesmo assim?")) return;
                  setProject(e.target.value);
                }}
              >
                {projects.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </label>
            <button
              className="sr-button secondary"
              onClick={() => setResetOpen(true)}
              disabled={!article}
              title="Apaga o artigo atual (uma cópia de segurança é guardada) e começa de novo"
            >
              <Trash2 className="w-4 h-4" /> Recomeçar
            </button>
            <input
              ref={importInput}
              type="file"
              accept=".docx,.pdf,.md,.markdown,.txt"
              className="hidden"
              onChange={(e) => onImportFile(e.target.files?.[0])}
            />
            <button
              className="sr-button secondary"
              onClick={() => importInput.current?.click()}
              disabled={!article || importing}
              title="Trazer seu texto (Word, PDF ou Markdown) com tabelas preservadas"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />} Importar documento
            </button>
            <button
              className="sr-button secondary"
              onClick={() => setReviewOpen(true)}
              disabled={!article}
              title="Análise completa antes de exportar"
            >
              {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />} Analisar
              {article?.review && (
                <span className={`ml-1 rounded px-1.5 text-[12px] font-semibold ${reviewStale ? "bg-surface-muted text-muted-foreground" : (article.review.counts.critico ?? 0) > 0 ? SEVERITY.critico.tone : "bg-success-soft text-success"}`}>
                  {reviewStale ? "desatualizada" : (article.review.counts.critico ?? 0) > 0 ? `${article.review.counts.critico} crítico(s)` : "ok"}
                </span>
              )}
            </button>
            <button className="sr-button secondary" onClick={() => onExport("md")} disabled={!article}>
              <Download className="w-4 h-4" /> Markdown
            </button>
            <button className="sr-button secondary" onClick={() => onExport("docx")} disabled={!article}>
              <Download className="w-4 h-4" /> DOCX
            </button>
            <button className="sr-button secondary" onClick={() => onExport("tex")} disabled={!article} title="main.tex + referencias.bib (abnTeX2 ou natbib/APA)">
              <Download className="w-4 h-4" /> LaTeX
            </button>
            <button className="sr-button primary" onClick={onSave} disabled={!dirty}>
              <Save className="w-4 h-4" /> {dirty ? "Salvar" : "Salvo"}
            </button>
          </div>
        </header>

        {loading || !article ? (
          <div className="sr-card px-5 py-10 body-text-sm text-center">
            {loading ? "Carregando…" : projects.length ? "Selecione um projeto." : "Crie um projeto para começar."}
          </div>
        ) : (
          <>
            <section className="sr-card px-5 py-4 flex flex-wrap items-end gap-4">
              <label className={`${FIELD} flex-1 min-w-[320px]`}>Título do artigo
                <input
                  className="sr-input"
                  value={article.title}
                  onChange={(e) => change((a) => ({ ...a, title: e.target.value }))}
                  placeholder="Ex.: Previsão da taxa de crescimento de preços de imóveis com modelos fatoriais"
                />
              </label>
              <div className="body-text-sm space-y-0.5 pb-1">
                <div>Modelo de escrita: <span className="font-medium text-ink">{article.writing_model ?? "—"}</span></div>
                <div>{totalWords.toLocaleString("pt-BR")} palavras · estrutura: {article.template === "em-branco" ? "em branco" : "artigo empírico (IJF)"}</div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <nav className="sr-card overflow-hidden self-start" aria-label="Seções do artigo">
                <div className="px-4 py-3 border-b border-line section-title">Seções</div>
                <ol className="py-1">
                  {article.sections.map((s, i) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] transition-colors ${
                          s.id === selectedId ? "bg-primary-soft text-primary font-medium" : "text-ink hover:bg-surface-muted"
                        }`}
                      >
                        <span className="w-5 text-[12px] text-muted-foreground">{i + 1}.</span>
                        <span className="flex-1 truncate">{s.title}</span>
                        {issuesBySection[s.id] && !reviewStale && (
                          <span className="rounded bg-surface-muted px-1.5 text-[11px] font-semibold text-ink-soft" title="Apontamentos da análise">{issuesBySection[s.id]}</span>
                        )}
                        {generating === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <SectionStatus section={s} />}
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="flex gap-1 border-t border-line p-2">
                  <button className="sr-button ghost !h-8 !px-2 flex-1 !text-[13px]" onClick={addSection}>
                    <Plus className="w-3.5 h-3.5" /> Seção
                  </button>
                  <button className="sr-button ghost !h-8 !px-2" title="Mover para cima" onClick={() => moveSection(-1)}><ArrowUp className="w-4 h-4" /></button>
                  <button className="sr-button ghost !h-8 !px-2" title="Mover para baixo" onClick={() => moveSection(1)}><ArrowDown className="w-4 h-4" /></button>
                  <button className="sr-button ghost !h-8 !px-2" title="Excluir o artigo e recomeçar" onClick={() => setResetOpen(true)}><RotateCcw className="w-4 h-4" /></button>
                </div>
              </nav>

              {section ? (
                <div className="space-y-6 min-w-0">
                  <section className="sr-card px-5 py-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
                      <label className={FIELD}>Título da seção
                        <input className="sr-input" value={section.title} onChange={(e) => setField("title", e.target.value)} />
                      </label>
                      <label className={FIELD}>Palavras (aprox.)
                        <input
                          className="sr-input"
                          type="number"
                          min={50}
                          step={50}
                          value={section.words}
                          onChange={(e) => setField("words", Number(e.target.value) || 0)}
                        />
                      </label>
                    </div>
                    <label className={FIELD}>Objetivo da seção — o que ela precisa cobrir
                      <textarea className="sr-input" rows={2} value={section.goal} onChange={(e) => setField("goal", e.target.value)} />
                    </label>
                    <label className={FIELD}>Suas orientações — tópicos, argumentos, ordem, o que enfatizar
                      <textarea
                        className="sr-input"
                        rows={3}
                        value={section.notes}
                        onChange={(e) => setField("notes", e.target.value)}
                        placeholder="Ex.: comparar modelos fatoriais globais vs. com clusters; destacar a lacuna em dados regionais do Brasil."
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-[14px] text-ink-soft cursor-pointer">
                        <input type="checkbox" checked={section.use_sources} onChange={(e) => setField("use_sources", e.target.checked)} />
                        Buscar nas fontes do projeto
                        <span className="text-muted-foreground text-[12px]">(desmarcado: sintetiza as outras seções, como no Resumo e na Conclusão)</span>
                      </label>
                      <div className="ml-auto flex gap-2">
                        <button className="sr-button ghost !h-9 !px-2" title="Remover seção" onClick={removeSection}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                        <button className="sr-button primary" onClick={onGenerate} disabled={generating !== null}>
                          {generating === section.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {generating === section.id ? "Gerando…" : section.draft.trim() ? "Gerar novamente" : "Gerar rascunho"}
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="sr-card">
                    <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-line">
                      <h2 className="section-title mr-auto">Rascunho</h2>
                      {section.generated && (
                        <span className="body-text-sm">
                          {new Date(section.generated.at).toLocaleString("pt-BR")} · {section.generated.model}
                        </span>
                      )}
                      <span className="body-text-sm">{wordCount(section.draft)} palavras</span>
                      <button className="sr-button secondary !h-8 !text-[13px]" onClick={() => setEditingDraft((v) => !v)}>
                        {editingDraft ? <><Eye className="w-3.5 h-3.5" /> Visualizar</> : <><PenLine className="w-3.5 h-3.5" /> Editar</>}
                      </button>
                    </div>
                    {focusIssue && focusIssue.secao_id === section.id && (
                      <div className={`flex items-start gap-3 border-b border-line px-5 py-3 text-[13px] ${SEVERITY[focusIssue.gravidade].tone}`}>
                        <span className="mt-0.5 shrink-0">{SEVERITY[focusIssue.gravidade].icon}</span>
                        <div className="min-w-0 flex-1 space-y-1 text-ink">
                          <div className="font-medium">{focusIssue.problema}</div>
                          {focusIssue.trecho && <div className="font-serif text-ink-soft">“{focusIssue.trecho}”</div>}
                          {focusIssue.sugestao && <div className="text-ink-soft">→ {focusIssue.sugestao}</div>}
                        </div>
                        <button className="sr-button ghost !h-7 !px-1.5" onClick={() => setFocusIssue(null)} aria-label="Fechar apontamento">✕</button>
                      </div>
                    )}
                    {pending > 0 && (
                      <div className="flex items-start gap-3 border-b border-line bg-warning-soft px-5 py-2.5 text-[13px] text-ink-soft">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
                        <span>
                          <strong className="font-semibold text-ink">{pending} trecho(s) [PENDENTE]</strong> — as fontes não sustentam esse ponto.
                          Adicione documentos ou resultados ao projeto, ou escreva o trecho você mesmo.
                        </span>
                      </div>
                    )}
                    <div className="px-5 py-4">
                      {editingDraft ? (
                        <>
                          <textarea
                            className="sr-input font-mono text-[13px] leading-relaxed"
                            rows={18}
                            value={section.draft}
                            onChange={(e) => setField("draft", e.target.value)}
                          />
                          <p className="body-text-sm mt-2">
                            Citações ficam como links <code>[(AUTOR, ano, p. x)](#src-n)</code>. Apague o link inteiro para remover uma citação:
                            a lista de referências é montada a partir das que permanecerem.
                          </p>
                        </>
                      ) : section.draft.trim() ? (
                        <div className="font-serif text-[16px] leading-relaxed text-ink">
                          <MarkdownWithCitations text={section.draft} onCitationClick={setHighlighted} />
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center body-text-sm">
                          Defina o objetivo e suas orientações e clique em <strong>Gerar rascunho</strong> — ou, se já
                          começou a escrever, clique em <strong>Editar</strong>, cole seu texto e use <strong>Continuar escrevendo</strong>.
                        </div>
                      )}
                      {section.draft.trim() && (
                        <div className="mt-4 rounded-xl border border-line bg-surface-muted/50 p-3 space-y-2">
                          <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
                            <CornerDownRight className="w-4 h-4 text-primary" /> Continuar escrevendo a partir do fim do texto
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <input
                              className="sr-input flex-1 min-w-[260px]"
                              value={nextStep}
                              onChange={(e) => setNextStep(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter" && generating === null) onContinue(); }}
                              placeholder="Próximo passo (opcional) — ex.: agora apresente as limitações dos modelos fatoriais"
                            />
                            <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                              <input
                                className="sr-input !w-20"
                                type="number"
                                min={50}
                                step={50}
                                value={nextWords}
                                onChange={(e) => setNextWords(Number(e.target.value) || 300)}
                                aria-label="Palavras a acrescentar"
                              />
                              palavras
                            </label>
                            <button className="sr-button primary" onClick={onContinue} disabled={generating !== null}>
                              {generating === section.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              {generating === section.id ? "Escrevendo…" : "Continuar"}
                            </button>
                          </div>
                          <p className="text-[12px] text-muted-foreground">
                            Lê o que já está escrito — seu ou gerado — e acrescenta novos parágrafos ao final, sem alterar o texto existente.
                          </p>
                        </div>
                      )}
                      <SourcesPanel sources={section.sources ?? []} highlighted={highlighted} />
                    </div>
                  </section>
                </div>
              ) : (
                <div className="sr-card px-5 py-10 body-text-sm text-center space-y-3">
                  <p>Artigo em branco. Construa parte a parte:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button className="sr-button primary" onClick={addSection}><Plus className="w-4 h-4" /> Adicionar seção</button>
                    <button className="sr-button secondary" onClick={() => importInput.current?.click()}><FileUp className="w-4 h-4" /> Importar documento</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {reviewOpen && article && (
        <ReviewPanel
          review={article.review}
          stale={reviewStale}
          model={article.review_model}
          running={reviewing}
          fixing={fixing}
          onRun={onReview}
          onClose={() => setReviewOpen(false)}
          onOpenIssue={openIssue}
          onFix={onFix}
          onSetStatus={onSetStatus}
        />
      )}
      {revision && (
        <RevisionModal
          proposals={revision.proposals}
          errors={revision.errors}
          progress={revisionProgress}
          onAccept={onAcceptRevision}
          onStop={() => { stopRevision.current = true; }}
          onClose={() => {
            if (fixing && !window.confirm("Fechar para as correções restantes? As propostas ainda não aceitas serão descartadas.")) return;
            stopRevision.current = true;
            setRevision(null);
          }}
        />
      )}
      {resetOpen && article && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-[2px] p-4" onClick={() => setResetOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Recomeçar o artigo">
            <div className="section-title flex items-center gap-2"><Trash2 className="w-5 h-5 text-destructive" /> Excluir o artigo e recomeçar</div>
            <p className="body-text-sm">
              Todas as seções, rascunhos e a análise deste artigo serão apagados. Uma cópia de segurança fica em
              <code> projects/{project}/article_backups/</code>. A Biblioteca e as fontes do projeto não são afetadas.
            </p>
            <fieldset className="space-y-2">
              <legend className="text-[13px] font-medium text-ink mb-1">Começar com</legend>
              {([
                ["vazio", "Em branco", "Sem seções. Você adiciona parte a parte com “+ Seção” ou “Importar documento”."],
                ["padrao", "Estrutura padrão", "Resumo, Introdução, Revisão da literatura, Metodologia, Dados, Resultados e Conclusão."],
              ] as const).map(([value, label, hint]) => (
                <label key={value} className={`flex gap-3 rounded-xl border px-4 py-3 cursor-pointer ${resetTemplate === value ? "border-primary bg-primary-soft/40" : "border-line"}`}>
                  <input type="radio" name="reset-template" checked={resetTemplate === value} onChange={() => setResetTemplate(value)} className="mt-1" />
                  <span>
                    <span className="block font-medium text-ink text-[14px]">{label}</span>
                    <span className="block text-[13px] text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            {article.title && (
              <label className="flex items-center gap-2 text-[13px] text-ink-soft">
                <input type="checkbox" checked={resetKeepTitle} onChange={(e) => setResetKeepTitle(e.target.checked)} />
                Manter o título: <strong className="text-ink truncate">{article.title}</strong>
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button className="sr-button secondary" onClick={() => setResetOpen(false)}>Cancelar</button>
              <button className="sr-button primary !bg-destructive hover:!bg-destructive/90" onClick={onReset}>
                <Trash2 className="w-4 h-4" /> Excluir e recomeçar
              </button>
            </div>
          </div>
        </div>
      )}
      {exportGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-[2px] p-4" onClick={() => setExportGate(null)}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Exportar sem análise">
            <div className="section-title flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-primary" /> Analisar antes de exportar?</div>
            <p className="body-text-sm">
              {article?.review
                ? "O artigo mudou desde a última análise. Recomendo analisar de novo para conferir citações, números e normas antes de gerar o arquivo."
                : "Este artigo ainda não foi analisado. A análise confere citações, números das tabelas, normas e coerência antes de gerar o arquivo."}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button className="sr-button ghost" onClick={() => setExportGate(null)}>Cancelar</button>
              <button className="sr-button secondary" onClick={() => { const f = exportGate; setExportGate(null); onExport(f, true); }}>
                Exportar mesmo assim
              </button>
              <button className="sr-button primary" onClick={() => { setExportGate(null); setReviewOpen(true); onReview(); }}>
                Analisar agora
              </button>
            </div>
          </div>
        </div>
      )}
      {importPreview && article && (
        <ImportDocumentModal
          preview={importPreview}
          sections={article.sections}
          onCancel={() => setImportPreview(null)}
          onApply={applyImport}
        />
      )}
    </div>
  );
}
