import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Renders an answer in markdown; citation links (#src-1-3) open the sources they point to.
export default function MarkdownWithCitations({
  text,
  onCitationClick,
}: {
  text: string;
  onCitationClick?: (sourceNumbers: number[]) => void;
}) {
  return (
    <div className="academic-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith('#src-')) {
              const numbers = href.replace('#src-', '').split('-').map(Number);
              return (
                <button
                  type="button"
                  className="inline text-primary font-semibold hover:underline"
                  title="Ver trecho citado"
                  onClick={() => onCitationClick?.(numbers)}
                >
                  {children}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
