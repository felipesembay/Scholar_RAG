import { useState } from "react";
import { ChevronDown, FileUp, Table, X } from "lucide-react";
import MarkdownWithCitations from "./MarkdownWithCitations";
import type { ArticleSection, ImportPreview } from "../../academic_services.ts";

export type ImportTarget = string; // existing section id | "__new__" | "__skip__"
export interface ImportAssignment {
  title: string;
  markdown: string;
  target: ImportTarget;
  mode: "replace" | "append";
}

const SYNONYMS: Record<string, string[]> = {
  resumo: ["resumo", "abstract"],
  introducao: ["introducao", "introduction"],
  literatura: ["revisao da literatura", "revisao de literatura", "referencial teorico", "trabalhos relacionados", "fundamentacao teorica", "literature review", "related work"],
  metodologia: ["metodologia", "metodos", "materiais e metodos", "metodo", "methodology", "methods"],
  dados: ["dados", "base de dados", "data"],
  resultados: ["resultados", "resultados e discussao", "results", "discussao"],
  conclusao: ["conclusao", "conclusoes", "consideracoes finais", "conclusion", "conclusions"],
};

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^[\d.\s]+/, "").trim();

const REFERENCE_TITLES = ["referencias", "referencias bibliograficas", "references", "bibliografia"];

function guessTarget(title: string, sections: ArticleSection[]): ImportTarget {
  const key = normalize(title);
  if (REFERENCE_TITLES.includes(key)) return "__skip__"; // the export builds the reference list
  const exact = sections.find((s) => normalize(s.title) === key);
  if (exact) return exact.id;
  const synonym = Object.entries(SYNONYMS).find(([, names]) => names.includes(key));
  if (synonym && sections.some((s) => s.id === synonym[0])) return synonym[0];
  return "__new__";
}

export default function ImportDocumentModal({ preview, sections, onCancel, onApply }: {
  preview: ImportPreview;
  sections: ArticleSection[];
  onCancel: () => void;
  onApply: (assignments: ImportAssignment[], title: string) => void;
}) {
  const [rows, setRows] = useState<ImportAssignment[]>(() =>
    preview.sections.map((s) => {
      const target = guessTarget(s.title, sections);
      const existing = sections.find((x) => x.id === target);
      return { title: s.title, markdown: s.markdown, target, mode: existing?.draft.trim() ? "append" : "replace" };
    }),
  );
  const [open, setOpen] = useState<number | null>(null);
  const [useTitle, setUseTitle] = useState(Boolean(preview.title));
  const set = (i: number, patch: Partial<ImportAssignment>) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const replacing = rows.filter((r) => r.mode === "replace" && sections.find((s) => s.id === r.target)?.draft.trim());

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30 backdrop-blur-[2px]" onClick={onCancel}>
      <div
        className="h-full w-full max-w-3xl overflow-y-auto bg-surface border-l border-line shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Importar documento"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="section-title flex items-center gap-2"><FileUp className="w-5 h-5 text-primary" /> Importar documento</div>
            <div className="body-text-sm break-all">{preview.file_name} · {preview.sections.length} seção(ões) detectada(s)</div>
          </div>
          <button className="sr-button ghost !h-8 !px-2" onClick={onCancel} aria-label="Fechar"><X className="w-4 h-4" /></button>
        </div>

        <p className="body-text-sm">
          Escolha para onde vai cada parte. Tabelas, negrito, itálico e listas foram mantidos; figuras aparecem como
          <em> [figura não importada]</em>. Citações que já estavam no seu texto continuam como texto e não entram
          automaticamente nas referências.
        </p>

        {preview.title && (
          <label className="flex items-center gap-2 text-[14px] text-ink-soft">
            <input type="checkbox" checked={useTitle} onChange={(e) => setUseTitle(e.target.checked)} />
            Usar o título do documento: <strong className="text-ink">{preview.title}</strong>
          </label>
        )}

        <ol className="space-y-3">
          {rows.map((row, i) => {
            const meta = preview.sections[i];
            return (
              <li key={i} className="rounded-xl border border-line">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    className="sr-button ghost !h-8 !px-1.5"
                    onClick={() => setOpen(open === i ? null : i)}
                    aria-expanded={open === i}
                    aria-label={open === i ? "Ocultar prévia" : "Ver prévia"}
                    title={open === i ? "Ocultar prévia" : "Ver prévia"}
                  >
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`} />
                  </button>
                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      className="sr-input !h-8 !text-[14px] font-medium w-full"
                      value={row.title}
                      onChange={(e) => set(i, { title: e.target.value })}
                      aria-label="Título da seção importada"
                    />
                    <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      {meta.words} palavras
                      {meta.tables > 0 && <span className="inline-flex items-center gap-1"><Table className="w-3 h-3" /> {meta.tables} tabela(s)</span>}
                    </span>
                  </div>
                  <select className="sr-input pr-8 !h-9 !text-[13px] w-52" value={row.target} onChange={(e) => {
                    const target = e.target.value;
                    const existing = sections.find((s) => s.id === target);
                    set(i, { target, mode: existing?.draft.trim() ? "append" : "replace" });
                  }} aria-label={`Destino de ${row.title}`}>
                    {sections.map((s) => <option key={s.id} value={s.id}>→ {s.title}</option>)}
                    <option value="__new__">+ Nova seção</option>
                    <option value="__skip__">Não importar</option>
                  </select>
                  {row.target !== "__new__" && row.target !== "__skip__" && (
                    <select className="sr-input pr-8 !h-9 !text-[13px] w-40" value={row.mode} onChange={(e) => set(i, { mode: e.target.value as "replace" | "append" })} aria-label="Modo">
                      <option value="append">Acrescentar ao fim</option>
                      <option value="replace">Substituir</option>
                    </select>
                  )}
                </div>
                {open === i && (
                  <div className="max-h-80 overflow-auto border-t border-line px-4 py-3 font-serif text-[14px] text-ink">
                    <MarkdownWithCitations text={row.markdown || "*(seção sem texto)*"} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {replacing.length > 0 && (
          <div className="rounded-lg border border-line bg-warning-soft px-4 py-2.5 text-[13px] text-ink-soft">
            {replacing.length} seção(ões) com texto serão <strong>substituídas</strong>. O rascunho anterior e suas fontes serão descartados.
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-line">
          <button className="sr-button secondary" onClick={onCancel}>Cancelar</button>
          <button
            className="sr-button primary"
            disabled={rows.every((r) => r.target === "__skip__")}
            onClick={() => onApply(rows.filter((r) => r.target !== "__skip__"), useTitle ? preview.title : "")}
          >
            Importar
          </button>
        </div>
      </div>
    </div>
  );
}
