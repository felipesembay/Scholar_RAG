import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, BookOpen, Copy, Download, FileText, Pencil, Trash2, Upload, X } from "lucide-react";
import { useToast } from "../ui/Toast";
import MarkdownWithCitations from "../academic/MarkdownWithCitations";
import {
  deleteResults,
  downloadBibtex,
  getLibrary,
  getReferences,
  listResults,
  setCitationStyle,
  updateLibraryEntry,
  uploadResults,
  type LibraryEntry,
  type ResultsFile,
} from "../../academic_services.ts";

interface ProjectLike {
  name: string;
}

const STYLES = [
  { value: "abnt", label: "ABNT — (SILVA, 2021)" },
  { value: "abnt2023", label: "ABNT 2023 — (Silva, 2021)" },
  { value: "apa", label: "APA 7 — (Silva, 2021)" },
];
const TYPES = ["article", "book", "chapter", "thesis", "web", "misc"];
const TYPE_LABELS: Record<string, string> = {
  article: "Artigo", book: "Livro", chapter: "Capítulo", thesis: "Tese/Dissertação", web: "Site", misc: "Outro",
};
const TEXT_FIELDS: [keyof LibraryEntry, string][] = [
  ["title", "Título"], ["venue", "Periódico / livro (capítulo)"], ["volume", "Volume"], ["issue", "Número"],
  ["pages", "Páginas (ex.: 10-20)"], ["publisher", "Editora"], ["place", "Local"], ["edition", "Edição"],
  ["doi", "DOI"], ["url", "URL"],
];

const FIELD = "block text-[12px] font-medium text-muted-foreground space-y-1";
const SELECT = "sr-input pr-8";

function EditEntry({ entry, onCancel, onSave }: {
  entry: LibraryEntry;
  onCancel: () => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => ({
    type: entry.type ?? "misc",
    authors: (entry.authors ?? []).join("\n"),
    year: entry.year?.toString() ?? "",
    page_offset: entry.page_offset?.toString() ?? "",
    ...Object.fromEntries(TEXT_FIELDS.map(([k]) => [k, (entry[k] as string | undefined)?.toString() ?? ""])),
  }));
  const set = (key: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const changedFields = () => {
    const fields: Record<string, unknown> = {};
    const authors = form.authors.split("\n").map((a) => a.trim()).filter(Boolean);
    if (authors.join("\n") !== (entry.authors ?? []).join("\n")) fields.authors = authors;
    if (form.type !== entry.type) fields.type = form.type;
    if (form.year !== (entry.year?.toString() ?? "")) fields.year = form.year ? Number(form.year) : null;
    if (form.page_offset !== (entry.page_offset?.toString() ?? ""))
      fields.page_offset = form.page_offset ? Number(form.page_offset) : null;
    TEXT_FIELDS.forEach(([k]) => {
      if (form[k] !== ((entry[k] as string | undefined)?.toString() ?? "")) fields[k] = form[k] || null;
    });
    return fields;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30 backdrop-blur-[2px]" onClick={onCancel}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto bg-surface border-l border-line shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Editar referência"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="section-title">Editar referência</div>
            <div className="body-text-sm break-all">{entry.source}</div>
          </div>
          <button className="sr-button ghost !h-8 !px-2" onClick={onCancel} aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className={FIELD}>Tipo
            <select className={SELECT} value={form.type} onChange={set("type")}>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <label className={FIELD}>Ano
            <input className="sr-input" type="number" value={form.year} onChange={set("year")} placeholder="2021" />
          </label>
          <label className={`${FIELD} col-span-2`}>Autores — um por linha, “Sobrenome, Nome”
            <textarea className="sr-input" rows={3} value={form.authors} onChange={set("authors")} placeholder={"Silva, Ana Maria\nSouza, Bruno"} />
          </label>
          {TEXT_FIELDS.map(([key, label]) => (
            <label key={key} className={`${FIELD} ${key === "title" || key === "venue" ? "col-span-2" : ""}`}>{label}
              <input className="sr-input" value={form[key]} onChange={set(key)} />
            </label>
          ))}
          <label className={`${FIELD} col-span-2`}>Deslocamento de página
            <input className="sr-input" type="number" value={form.page_offset} onChange={set("page_offset")} placeholder="-14" />
            <span className="block font-normal">Página impressa = página do PDF + valor. Útil para livros com capa e sumário.</span>
          </label>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-line">
          <button className="sr-button secondary" onClick={onCancel}>Cancelar</button>
          <button className="sr-button primary" onClick={() => onSave(changedFields())}>Salvar alterações</button>
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-[12px] font-medium text-ink-soft">
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

export default function BibliotecaContent({ projects, selectedProject }: {
  projects: ProjectLike[];
  selectedProject?: ProjectLike | null;
}) {
  const { showSuccess, showError } = useToast();
  const [project, setProject] = useState<string>(selectedProject?.name ?? projects[0]?.name ?? "");
  const [style, setStyle] = useState("abnt");
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [references, setReferences] = useState("");
  const [results, setResults] = useState<ResultsFile[]>([]);
  const [editing, setEditing] = useState<LibraryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"literature" | "material">("literature");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const [library, refs, files] = await Promise.all([getLibrary(project), getReferences(project), listResults(project)]);
      setStyle(library.style);
      setEntries(library.entries);
      setReferences(refs.markdown);
      setResults(files);
    } catch (error) {
      showError("Erro ao carregar a biblioteca", String(error));
    } finally {
      setLoading(false);
    }
  }, [project, showError]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!project && projects.length) setProject(projects[0].name);
  }, [projects, project]);

  const changeStyle = async (value: string) => {
    await setCitationStyle(project, value);
    showSuccess("Estilo atualizado", STYLES.find((s) => s.value === value)?.label ?? value);
    load();
  };

  const saveEntry = async (fields: Record<string, unknown>) => {
    if (!editing) return;
    if (!Object.keys(fields).length) { setEditing(null); return; }
    try {
      await updateLibraryEntry(project, editing.source, fields);
      showSuccess("Referência atualizada", editing.source);
      setEditing(null);
      load();
    } catch (error) {
      showError("Erro ao salvar", String(error));
    }
  };

  const changeRole = async (entry: LibraryEntry, role: "literature" | "material") => {
    try {
      await updateLibraryEntry(project, entry.source, { role });
      showSuccess(
        role === "material" ? "Movido para material de apoio" : "Movido para literatura",
        `${entry.source} — ${role === "material" ? "não entra mais nas referências" : "passa a ser citável e entra nas referências"}.`,
      );
      load();
    } catch (error) {
      showError("Erro ao reclassificar", String(error));
    }
  };

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const response = await uploadResults(project, Array.from(files));
      showSuccess("Resultados indexados", Object.entries(response.indexed_chunks).map(([f, n]) => `${f}: ${n} trechos`).join(", "));
      load();
    } catch (error) {
      showError("Erro no upload", String(error));
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removeResults = async (fileName: string) => {
    if (!window.confirm(`Remover ${fileName} do projeto?`)) return;
    await deleteResults(project, fileName);
    showSuccess("Removido", fileName);
    load();
  };

  const copyReferences = async () => {
    const plain = references.replace(/^## .*\n\n/, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
    await navigator.clipboard.writeText(plain);
    showSuccess("Copiado", "Lista de referências copiada (texto sem formatação).");
  };

  const literature = entries.filter((e) => e.role !== "material");
  const material = entries.filter((e) => e.role === "material");
  const shown = tab === "literature" ? literature : material;
  const incomplete = literature.filter((e) => !e.authors?.length || !e.year).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-8 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1 min-w-[280px]">
            <h1 className="page-title flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-primary" /> Biblioteca
            </h1>
            <p className="page-subtitle">Metadados bibliográficos, estilo de citação, referências e seus resultados.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className={FIELD}>Projeto
              <select className={`${SELECT} w-48`} value={project} onChange={(e) => setProject(e.target.value)}>
                {projects.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </label>
            <label className={FIELD}>Estilo de citação
              <select className={`${SELECT} w-60`} value={style} onChange={(e) => changeStyle(e.target.value)}>
                {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>
        </header>

        {incomplete > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-line bg-warning-soft px-4 py-3 text-[14px] text-ink-soft">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
            <span>
              <strong className="font-semibold text-ink">{incomplete} documento(s) sem autor ou ano.</strong>{" "}
              Esses dados definem as citações — revise-os clicando em editar.
            </span>
          </div>
        )}

        <section className="sr-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-line">
            <div className="flex gap-1 rounded-lg bg-surface-muted p-1" role="tablist" aria-label="Tipo de fonte">
              {([["literature", "Literatura", literature.length], ["material", "Material de apoio", material.length]] as const).map(([key, label, n]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${tab === key ? "bg-surface text-ink shadow-sm" : "text-muted-foreground hover:text-ink"}`}
                >
                  {label} <span className="font-normal text-muted-foreground">({n})</span>
                </button>
              ))}
            </div>
            <span className="body-text-sm">
              {tab === "literature"
                ? <>Obras citáveis — as únicas que entram nas referências. Campos em <span className="text-primary font-medium">azul</span> foram editados por você.</>
                : "Aulas, slides, códigos, dados e imagens: usados como contexto, nunca citados como obra nem listados nas referências."}
            </span>
          </div>
          {loading ? (
            <div className="px-5 py-10 body-text-sm text-center">Carregando…</div>
          ) : shown.length === 0 ? (
            <div className="px-5 py-10 body-text-sm text-center">
              {entries.length === 0 ? "Nenhum documento indexado neste projeto." : tab === "literature" ? "Nenhuma obra classificada como literatura." : "Nenhum material de apoio neste projeto."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="bg-surface-muted text-left text-[12px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">Citação</th>
                    <th className="px-3 py-2.5 font-medium">Título</th>
                    {tab === "literature" && <th className="px-3 py-2.5 font-medium">Autores</th>}
                    {tab === "literature" && <th className="px-3 py-2.5 font-medium">Ano</th>}
                    <th className="px-3 py-2.5 font-medium">Tipo</th>
                    <th className="px-3 py-2.5 font-medium">Fonte</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((e) => {
                    const edited = (k: string) => ((e.edited ?? []).includes(k) ? "text-primary" : "");
                    const missing = e.role !== "material" && (!e.authors?.length || !e.year);
                    return (
                      <tr key={e.source} className="align-top hover:bg-surface-muted/60 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap font-medium text-ink">
                          {e.citation}
                          {missing && <AlertTriangle className="inline w-3.5 h-3.5 ml-1.5 -mt-0.5 text-warning" aria-label="Faltam autor ou ano" />}
                        </td>
                        <td className="px-3 py-3 max-w-md">
                          <div className={`font-medium text-ink ${edited("title")}`}>{e.title}</div>
                          <div className="text-[12px] text-muted-foreground truncate" title={e.source}>{e.source}</div>
                        </td>
                        {tab === "literature" && <td className={`px-3 py-3 min-w-[200px] text-ink-soft ${edited("authors")}`}>{(e.authors ?? []).join("; ") || <span className="text-muted-foreground">—</span>}</td>}
                        {tab === "literature" && <td className={`px-3 py-3 text-ink-soft ${edited("year")}`}>{e.year ?? <span className="text-muted-foreground">—</span>}</td>}
                        <td className="px-3 py-3"><TypeBadge type={e.type} /></td>
                        <td className="px-3 py-3">
                          <select
                            className="sr-input pr-8 !h-8 !text-[13px] min-w-[170px]"
                            value={e.role}
                            onChange={(ev) => changeRole(e, ev.target.value as "literature" | "material")}
                            aria-label={`Tipo de fonte de ${e.source}`}
                          >
                            <option value="literature">Literatura</option>
                            <option value="material">Material de apoio</option>
                          </select>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button className="sr-button ghost !h-8 !px-2" title="Editar referência" onClick={() => setEditing(e)}>
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section className="sr-card">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
              <h2 className="section-title mr-auto">Referências</h2>
              <button className="sr-button secondary !h-8 !text-[13px]" onClick={copyReferences}><Copy className="w-3.5 h-3.5" /> Copiar</button>
              <button className="sr-button secondary !h-8 !text-[13px]" onClick={() => downloadBibtex(project)}><Download className="w-3.5 h-3.5" /> BibTeX</button>
            </div>
            <div className="px-5 py-4 font-serif text-[15px] text-ink">
              <MarkdownWithCitations text={references.replace(/^## .*\n\n/, "")} />
            </div>
          </section>

          <section className="sr-card">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
              <h2 className="section-title mr-auto">Seus resultados</h2>
              <input ref={fileInput} type="file" accept=".md,.txt" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
              <button className="sr-button primary !h-8 !text-[13px]" onClick={() => fileInput.current?.click()}>
                <Upload className="w-3.5 h-3.5" /> Enviar .md
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="body-text-sm">
                Markdown com os resultados da sua pesquisa. Entram nas respostas e na escrita como
                “resultados desta pesquisa” — nunca como referência bibliográfica.
              </p>
              {results.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center body-text-sm">
                  Nenhum arquivo de resultados ainda.
                </div>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {results.map((r) => (
                    <li key={r.file_name} className="flex items-center gap-3 px-3 py-2.5 text-[14px]">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 mr-auto">
                        <div className="font-medium text-ink truncate">{r.file_name}</div>
                        <div className="text-[12px] text-muted-foreground">{(r.size / 1024).toFixed(1)} KB · {r.modified.replace("T", " ")}</div>
                      </div>
                      <button className="sr-button ghost !h-8 !px-2" title="Remover" onClick={() => removeResults(r.file_name)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>

      {editing && <EditEntry entry={editing} onCancel={() => setEditing(null)} onSave={saveEntry} />}
    </div>
  );
}
