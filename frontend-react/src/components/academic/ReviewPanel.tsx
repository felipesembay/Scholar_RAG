import { useMemo, useState } from "react";
import { AlertOctagon, AlertTriangle, BookOpen, Bot, CheckCircle2, ClipboardCheck, EyeOff, Hand, Lightbulb, Loader2, RefreshCw, RotateCcw, Wand2, X } from "lucide-react";
import type { ArticleReview, ReviewIssue, Severity } from "../../academic_services.ts";

export const SEVERITY: Record<Severity, { label: string; icon: React.ReactNode; tone: string }> = {
  critico: { label: "Crítico", icon: <AlertOctagon className="w-4 h-4" />, tone: "text-destructive bg-destructive-soft" },
  importante: { label: "Importante", icon: <AlertTriangle className="w-4 h-4" />, tone: "text-warning bg-warning-soft" },
  sugestao: { label: "Sugestão", icon: <Lightbulb className="w-4 h-4" />, tone: "text-primary bg-primary-soft" },
};

const SCORE_LABELS: Record<string, string> = {
  estrutura: "Estrutura", argumentacao: "Argumentação", fundamentacao: "Fundamentação",
  resultados: "Resultados", clareza: "Clareza", normas: "Normas",
};

type Filter = Severity | "todos" | "pendentes";

const fixable = (i: ReviewIssue) => i.correcao === "texto" && !i.status;

export default function ReviewPanel({ review, stale, model, running, fixing, onRun, onClose, onOpenIssue, onFix, onSetStatus }: {
  review?: ArticleReview;
  stale: boolean;
  model?: string;
  running: boolean;
  fixing: boolean;
  onRun: () => void;
  onClose: () => void;
  onOpenIssue: (issue: ReviewIssue) => void;
  onFix: (issueIds: string[]) => void;
  onSetStatus: (issueIds: string[], status: "corrigido" | "ignorado" | null) => void;
}) {
  const [filter, setFilter] = useState<Filter>("pendentes");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const all = review?.issues ?? [];
  const issues = all.filter((i) =>
    filter === "todos" ? true : filter === "pendentes" ? !i.status : i.gravidade === filter,
  );
  const selectable = useMemo(() => issues.filter(fixable).map((i) => i.id), [issues]);
  const chosen = [...selected].filter((id) => all.some((i) => i.id === id && fixable(i)));
  const allVisibleChosen = selectable.length > 0 && selectable.every((id) => selected.has(id));
  const pending = all.filter((i) => !i.status).length;

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      selectable.forEach((id) => (allVisibleChosen ? next.delete(id) : next.add(id)));
      return next;
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-surface border-l border-line shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Análise do artigo"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="section-title flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-primary" /> Análise do artigo</div>
              <div className="body-text-sm">
                {review ? <>{new Date(review.at).toLocaleString("pt-BR")} · {review.model}</> : <>Modelo: {model ?? "—"}</>}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="sr-button secondary" onClick={onRun} disabled={running || fixing}>
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {running ? "Analisando…" : review ? "Analisar novamente" : "Analisar agora"}
              </button>
              <button className="sr-button ghost !h-9 !px-2" onClick={onClose} aria-label="Fechar"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {running && (
            <div className="rounded-lg border border-line bg-primary-soft px-4 py-3 text-[13px] text-ink-soft">
              O revisor está lendo o artigo inteiro e os trechos das fontes citadas. Pode levar alguns minutos.
            </div>
          )}

          {!review && !running && (
            <div className="rounded-xl border border-dashed border-line-strong px-5 py-8 text-center body-text-sm space-y-2">
              <p>Ainda não há análise deste artigo.</p>
              <p>
                Ela combina verificações automáticas (pendências, citações sem vínculo, referências incompletas, tabelas sem
                legenda, numeração) com a leitura completa por um modelo revisor, que confere se cada citação sustenta o que
                o texto afirma.
              </p>
            </div>
          )}

          {review && (
            <>
              {stale && (
                <div className="flex items-start gap-2 rounded-lg border border-line bg-warning-soft px-4 py-2.5 text-[13px] text-ink-soft">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
                  O artigo mudou depois desta análise. Os apontamentos podem não corresponder mais ao texto — analise de novo
                  depois de aplicar as correções.
                </div>
              )}

              {review.summary && (
                <section className="space-y-2">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-ink"><Bot className="w-4 h-4 text-primary" /> Parecer do revisor</div>
                  <p className="font-serif text-[15px] leading-relaxed text-ink">{review.summary}</p>
                </section>
              )}

              {Object.keys(review.scores).length > 0 && (
                <section className="grid grid-cols-3 gap-2">
                  {Object.entries(review.scores).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-line px-3 py-2">
                      <div className="text-[12px] text-muted-foreground">{SCORE_LABELS[key] ?? key}</div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-[20px] font-semibold ${value < 5 ? "text-destructive" : value < 7 ? "text-warning" : "text-success"}`}>{value}</span>
                        <span className="text-[12px] text-muted-foreground">/10</span>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              <section className="space-y-3">
                <div className="flex flex-wrap gap-1 rounded-lg bg-surface-muted p-1 w-fit" role="tablist" aria-label="Filtrar apontamentos">
                  {(["pendentes", "critico", "importante", "sugestao", "todos"] as const).map((key) => (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={filter === key}
                      onClick={() => setFilter(key)}
                      className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${filter === key ? "bg-surface text-ink shadow-sm" : "text-muted-foreground hover:text-ink"}`}
                    >
                      {key === "todos" ? `Todos (${all.length})`
                        : key === "pendentes" ? `Pendentes (${pending})`
                        : `${SEVERITY[key].label} (${review.counts[key] ?? 0})`}
                    </button>
                  ))}
                </div>

                {selectable.length > 0 && (
                  <label className="flex items-center gap-2 text-[13px] text-ink-soft cursor-pointer w-fit">
                    <input type="checkbox" checked={allVisibleChosen} onChange={toggleAll} />
                    Selecionar todos os corrigíveis desta lista ({selectable.length})
                  </label>
                )}

                {issues.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center body-text-sm">Nenhum apontamento aqui.</div>
                ) : (
                  <ol className="space-y-2">
                    {issues.map((issue) => {
                      const canFix = fixable(issue);
                      return (
                        <li key={issue.id} className={`flex gap-3 rounded-xl border px-4 py-3 ${selected.has(issue.id) && canFix ? "border-primary bg-primary-soft/40" : "border-line"} ${issue.status ? "opacity-60" : ""}`}>
                          <div className="pt-0.5">
                            <input
                              type="checkbox"
                              disabled={!canFix}
                              checked={canFix && selected.has(issue.id)}
                              onChange={() => toggle(issue.id)}
                              aria-label={canFix ? "Marcar para corrigir" : "Não corrigível automaticamente"}
                              title={canFix ? "Marcar para corrigir" : issue.status ? `Já ${issue.status}` : issue.dica}
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <button
                              type="button"
                              className="block w-full text-left space-y-1.5 disabled:cursor-default"
                              onClick={() => onOpenIssue(issue)}
                              disabled={!issue.secao_id}
                              title={issue.secao_id ? "Ir para a seção" : undefined}
                            >
                              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                                <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${SEVERITY[issue.gravidade].tone}`}>
                                  {SEVERITY[issue.gravidade].icon} {SEVERITY[issue.gravidade].label}
                                </span>
                                <span className="font-medium text-ink">{issue.secao}</span>
                                <span className="text-muted-foreground">· {issue.categoria}</span>
                                {issue.status && (
                                  <span className="inline-flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 font-medium text-success">
                                    <CheckCircle2 className="w-3 h-3" /> {issue.status}
                                  </span>
                                )}
                                <span className="ml-auto text-muted-foreground">{issue.origem === "revisor" ? "revisor" : "verificação automática"}</span>
                              </div>
                              <div className="text-[14px] text-ink">{issue.problema}</div>
                              {issue.trecho && (
                                <blockquote className="border-l-2 border-line-strong pl-3 font-serif text-[13px] text-ink-soft">“{issue.trecho}”</blockquote>
                              )}
                              {issue.sugestao && <div className="text-[13px] text-muted-foreground">→ {issue.sugestao}</div>}
                            </button>
                            <div className="flex flex-wrap items-center gap-2">
                              {issue.correcao !== "texto" && !issue.status && (
                                <span className="inline-flex items-center gap-1 text-[12px] text-ink-soft">
                                  {issue.correcao === "biblioteca" ? <BookOpen className="w-3.5 h-3.5" /> : <Hand className="w-3.5 h-3.5" />}
                                  {issue.dica && issue.dica !== issue.sugestao ? issue.dica : issue.correcao === "biblioteca" ? "Ação na Biblioteca" : "Correção manual"}
                                </span>
                              )}
                              <span className="ml-auto flex gap-1">
                                {issue.status ? (
                                  <button className="sr-button ghost !h-7 !px-2 !text-[12px]" onClick={() => onSetStatus([issue.id], null)}>
                                    <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                                  </button>
                                ) : (
                                  <>
                                    {issue.correcao !== "texto" && (
                                      <button className="sr-button ghost !h-7 !px-2 !text-[12px]" onClick={() => onSetStatus([issue.id], "corrigido")}>
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Já resolvi
                                      </button>
                                    )}
                                    <button className="sr-button ghost !h-7 !px-2 !text-[12px]" onClick={() => onSetStatus([issue.id], "ignorado")}>
                                      <EyeOff className="w-3.5 h-3.5" /> Ignorar
                                    </button>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>

        {review && (
          <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-surface px-6 py-3">
            <span className="body-text-sm mr-auto">
              {chosen.length ? (() => {
                const sections = new Set(all.filter((i) => chosen.includes(i.id)).map((i) => i.secao_id)).size;
                return `${chosen.length} apontamento(s) em ${sections} seção(ões) → ${sections} chamada(s) a ${model ?? "o modelo revisor"}${model?.endsWith(":free") ? " (grátis)" : ""}`;
              })() : "Marque o que deseja corrigir."}
            </span>
            <button className="sr-button primary" disabled={!chosen.length || fixing || running} onClick={() => onFix(chosen)}>
              {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {fixing ? "Preparando correções…" : `Corrigir selecionados (${chosen.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
