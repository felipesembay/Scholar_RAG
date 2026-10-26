import { useState } from "react";
import { AlertTriangle, Check, Eye, Loader2, Square, Wand2, X } from "lucide-react";
import MarkdownWithCitations from "./MarkdownWithCitations";
import type { DiffBlock, RevisionProposal } from "../../academic_services.ts";

type Decision = "pending" | "applying" | "accepted" | "rejected";

function Diff({ blocks }: { blocks: DiffBlock[] }) {
  return (
    <div className="space-y-3 font-serif text-[14px] leading-relaxed text-ink">
      {blocks.map((block, i) =>
        block.type === "same" ? (
          <div key={i} className="text-center text-[12px] font-sans text-muted-foreground">
            · · · {block.count} parágrafo(s) sem alteração · · ·
          </div>
        ) : (
          <p
            key={i}
            className={`rounded-lg border px-3 py-2 ${block.type === "added" ? "border-success/40 bg-success-soft/40" : block.type === "removed" ? "border-destructive/40 bg-destructive-soft/40" : "border-line"}`}
          >
            {block.segments?.map((seg, j) =>
              seg.op === "same" ? (
                <span key={j}>{seg.text}</span>
              ) : seg.op === "del" ? (
                <del key={j} className="bg-destructive-soft text-destructive decoration-destructive/60">{seg.text}</del>
              ) : (
                <ins key={j} className="bg-success-soft text-success no-underline font-medium">{seg.text}</ins>
              ),
            )}
          </p>
        ),
      )}
    </div>
  );
}

export interface RevisionProgress {
  done: number;
  total: number;
  current: string; // section being corrected now ("" when finished or stopped)
  stopped: boolean;
}

export default function RevisionModal({ proposals, errors, progress, onAccept, onStop, onClose }: {
  proposals: RevisionProposal[];
  errors: { section_id: string; error: string }[];
  progress: RevisionProgress;
  onAccept: (proposal: RevisionProposal) => Promise<boolean>;
  onStop: () => void;
  onClose: () => void;
}) {
  const running = Boolean(progress.current);
  const [decision, setDecision] = useState<Record<string, Decision>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const status = (p: RevisionProposal) => decision[p.section_id] ?? "pending";
  const changed = (p: RevisionProposal) => p.diff.some((b) => b.type !== "same");
  const open = proposals.filter((p) => status(p) === "pending");
  const acceptable = open.filter(changed);

  const accept = async (p: RevisionProposal) => {
    setDecision((d) => ({ ...d, [p.section_id]: "applying" }));
    const ok = await onAccept(p);
    setDecision((d) => ({ ...d, [p.section_id]: ok ? "accepted" : "pending" }));
  };
  const acceptAll = async () => {
    for (const p of acceptable) await accept(p); // one save at a time keeps article.json consistent
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-ink/30 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="h-full w-full max-w-4xl overflow-y-auto bg-surface border-l border-line shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Correções propostas"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="section-title flex items-center gap-2"><Wand2 className="w-5 h-5 text-primary" /> Correções propostas</div>
              <div className="body-text-sm">
                Revise cada seção: <del className="bg-destructive-soft text-destructive">removido</del> ·{" "}
                <ins className="bg-success-soft text-success no-underline">acrescentado</ins>. Nada muda no artigo até você aceitar.
              </div>
            </div>
            <button className="sr-button ghost !h-9 !px-2" onClick={onClose} aria-label="Fechar"><X className="w-4 h-4" /></button>
          </div>

          {(running || progress.stopped || progress.done < progress.total) && (
            <div className="rounded-xl border border-line bg-primary-soft/50 px-4 py-3 space-y-2">
              <div className="flex items-center gap-3 text-[13px] text-ink">
                {running && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                <span className="mr-auto">
                  {running
                    ? <>Corrigindo <strong>{progress.current}</strong> — seção {progress.done + 1} de {progress.total}. As propostas aparecem abaixo conforme ficam prontas.</>
                    : progress.stopped
                      ? `Interrompido: ${progress.done} de ${progress.total} seção(ões) corrigidas. As demais não foram enviadas ao modelo.`
                      : `${progress.done} de ${progress.total} seção(ões).`}
                </span>
                {running && (
                  <button className="sr-button secondary !h-8 !text-[13px]" onClick={onStop} title="Termina a seção atual e não envia as próximas">
                    <Square className="w-3.5 h-3.5" /> Parar
                  </button>
                )}
              </div>
              <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          {errors.map((e) => (
            <div key={e.section_id} className="rounded-lg border border-line bg-destructive-soft px-4 py-2.5 text-[13px] text-ink">
              Não foi possível corrigir a seção <strong>{e.section_id}</strong>: {e.error}
            </div>
          ))}

          {proposals.map((p) => {
            const st = status(p);
            const unchanged = !changed(p);
            return (
              <section key={p.section_id} className={`sr-card ${st !== "pending" && st !== "applying" ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-line">
                  <h3 className="section-title mr-auto">{p.title}</h3>
                  <span className="body-text-sm">{p.issue_ids.length} apontamento(s)</span>
                  {st === "accepted" ? (
                    <span className="inline-flex items-center gap-1 text-[13px] font-medium text-success"><Check className="w-4 h-4" /> Aplicada</span>
                  ) : st === "rejected" ? (
                    <span className="text-[13px] text-muted-foreground">Rejeitada</span>
                  ) : (
                    <>
                      <button className="sr-button ghost !h-8 !text-[13px]" onClick={() => setPreview(preview === p.section_id ? null : p.section_id)}>
                        <Eye className="w-3.5 h-3.5" /> {preview === p.section_id ? "Ver diferenças" : "Ver texto final"}
                      </button>
                      <button className="sr-button secondary !h-8 !text-[13px]" disabled={st === "applying"} onClick={() => setDecision((d) => ({ ...d, [p.section_id]: "rejected" }))}>
                        Rejeitar
                      </button>
                      <button className="sr-button primary !h-8 !text-[13px]" disabled={st === "applying" || unchanged} onClick={() => accept(p)}>
                        {st === "applying" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aceitar
                      </button>
                    </>
                  )}
                </div>
                {p.warnings.length > 0 && (
                  <div className="flex items-start gap-2 border-b border-line bg-warning-soft px-5 py-2.5 text-[13px] text-ink">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
                    <ul className="space-y-0.5">{p.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                  </div>
                )}
                <div className="px-5 py-4">
                  {unchanged ? (
                    <div className="body-text-sm">O modelo não propôs alterações para esta seção.</div>
                  ) : preview === p.section_id ? (
                    <div className="font-serif text-[15px] leading-relaxed text-ink"><MarkdownWithCitations text={p.after} /></div>
                  ) : (
                    <Diff blocks={p.diff} />
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-surface px-6 py-3">
          <span className="body-text-sm mr-auto">{open.length} seção(ões) aguardando decisão · modelo {proposals[0]?.model ?? "—"}</span>
          <button className="sr-button secondary" onClick={onClose}>Fechar</button>
          <button className="sr-button primary" disabled={!acceptable.length} onClick={acceptAll}>
            <Check className="w-4 h-4" /> Aceitar todas ({acceptable.length})
          </button>
        </div>
      </div>
    </div>
  );
}
