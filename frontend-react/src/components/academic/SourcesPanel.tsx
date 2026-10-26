import { useState } from 'react';
import { ChevronDown, FileText, FlaskConical, GraduationCap } from 'lucide-react';
import type { Source } from '../../academic_services.ts';

// Numbered sources behind a grounded answer; highlighted ones were clicked in the text.
export default function SourcesPanel({ sources, highlighted }: { sources: Source[]; highlighted: number[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  if (!sources.length) return null;

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface">
      <div className="px-4 py-2.5 border-b border-line text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
        Fontes consultadas · {sources.length}
      </div>
      <ol className="divide-y divide-line">
        {sources.map((s) => {
          const isHighlighted = highlighted.includes(s.n);
          const isOpen = expanded === s.n || isHighlighted;
          const pages = s.page
            ? `p. ${s.page}${s.page_end && s.page_end !== s.page ? `–${s.page_end}` : ''} do PDF`
            : '';
          return (
            <li key={s.n} className={isHighlighted ? 'bg-primary-soft' : ''}>
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left text-[13px] hover:bg-surface-muted/70"
                onClick={() => setExpanded(isOpen ? null : s.n)}
                aria-expanded={isOpen}
              >
                <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded bg-surface-muted px-1 text-[11px] font-semibold text-ink-soft">
                  {s.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold text-ink">{s.citation}</span>
                  <span className="text-muted-foreground"> · {s.title}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                    {s.role === 'results' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 font-medium text-success">
                        <FlaskConical className="h-3 w-3" /> seus resultados
                      </span>
                    ) : s.role === 'material' ? (
                      <span className="inline-flex items-center gap-1 truncate rounded bg-warning-soft px-1.5 py-0.5 font-medium text-warning" title={s.source}>
                        <GraduationCap className="h-3 w-3 shrink-0" /> material de apoio · {s.source}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 truncate"><FileText className="h-3 w-3 shrink-0" /> {s.source}</span>
                    )}
                    {pages && <span className="shrink-0">{pages}</span>}
                  </span>
                </span>
                <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <blockquote className="mx-4 mb-3 ml-12 whitespace-pre-wrap border-l-2 border-primary pl-3 font-serif text-[14px] leading-relaxed text-ink-soft">
                  {s.text}
                </blockquote>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
