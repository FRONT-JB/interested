import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * 마크다운 본문을 그린다. Note도 Portrait도 Arc도 마크다운이 정본이므로
 * (ADR-0011) 화면에서 그것을 다시 쓰지 않고 그대로 그린다.
 *
 * `compact`는 좌측 패널처럼 좁은 자리를 위한 것이다. 크기만 다르고 규칙은 같다.
 */
export function Markdown({ children, compact = false }: { children: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "text-foreground/90",
        compact ? "space-y-3 text-[13px] leading-6" : "space-y-5 text-[15.5px] leading-[1.85]",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: content }) => (
            <h1 className="text-foreground font-heading mt-2 text-2xl font-medium tracking-tight">
              {content}
            </h1>
          ),
          h2: ({ children: content }) => (
            <h2
              className={cn(
                "text-foreground font-heading font-medium tracking-tight",
                compact ? "mt-6 text-base" : "mt-14 mb-1 text-xl",
              )}
            >
              {content}
            </h2>
          ),
          h3: ({ children: content }) => (
            <h3 className="text-foreground font-heading mt-8 font-medium">{content}</h3>
          ),
          p: ({ children: content }) => <p>{content}</p>,
          ul: ({ children: content }) => (
            <ul className="marker:text-seal/60 list-disc space-y-2 pl-5">{content}</ul>
          ),
          ol: ({ children: content }) => (
            <ol className="marker:text-muted-foreground list-decimal space-y-2 pl-5">{content}</ol>
          ),
          /*
            인용 블록은 Arc에서 본인의 말이라는 표시다 (ADR-0010). 관찰자의 문단과
            눈으로 갈리지 않으면 그 표시가 화면에서 사라진다. 색띠가 아니라 지면을
            들여 세우고 인주색 실선 하나로 자리를 표시한다.
          */
          blockquote: ({ children: content }) => (
            <blockquote className="border-seal/45 text-foreground my-6 space-y-3 border-l pl-5">
              {content}
            </blockquote>
          ),
          code: ({ children: content }) => (
            <code className="bg-muted/70 text-foreground rounded-[3px] px-[0.35em] py-[0.1em] font-mono text-[0.85em]">
              {content}
            </code>
          ),
          a: ({ href, children: content }) => (
            <a
              href={href}
              className="decoration-seal/50 hover:decoration-seal underline decoration-1 underline-offset-[3px] transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              {content}
            </a>
          ),
          hr: () => <hr className="border-border my-10" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
