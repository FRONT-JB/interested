import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * 마크다운 본문을 그린다. Note도 Portrait도 Arc도 마크다운이 정본이므로
 * (ADR-0011) 화면에서 그것을 다시 쓰지 않고 그대로 그린다.
 *
 * 본문은 DESIGN.md의 `docs-prose-block` — body-md(16/1.5) `{colors.charcoal}`,
 * 최대폭 720px. `compact`는 좌측 패널처럼 좁은 자리를 위한 것이고 크기만 다르다.
 */
export function Markdown({ children, compact = false }: { children: string; compact?: boolean }) {
  return (
    <div className={cn("text-charcoal", compact ? "type-caption space-y-2.5" : "type-body space-y-4")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: content }) => (
            <h1 className="type-heading-md text-ink mt-2">{content}</h1>
          ),
          h2: ({ children: content }) => (
            <h2
              className={cn("text-ink", compact ? "type-card-title mt-5" : "type-heading-sm mt-9")}
            >
              {content}
            </h2>
          ),
          h3: ({ children: content }) => (
            <h3 className="type-card-title text-ink mt-7">{content}</h3>
          ),
          p: ({ children: content }) => <p>{content}</p>,
          ul: ({ children: content }) => (
            <ul className="marker:text-stone list-disc space-y-2 pl-5">{content}</ul>
          ),
          ol: ({ children: content }) => (
            <ol className="marker:text-stone list-decimal space-y-2 pl-5">{content}</ol>
          ),
          /*
            인용 블록은 Arc에서 본인의 말이라는 표시다 (ADR-0010). 관찰자의 문단과
            눈으로 갈리지 않으면 그 표시가 화면에서 사라진다. 색띠를 두르는 대신
            `{colors.surface}` 판 위에 얹어 자리를 바꾼다.
          */
          blockquote: ({ children: content }) => (
            <blockquote className="bg-surface text-ink my-5 space-y-2.5 rounded-xl px-5 py-4">
              {content}
            </blockquote>
          ),
          /* DESIGN.md — docs 인라인 코드: surface 배경에 rounded.xs */
          code: ({ children: content }) => (
            <code className="bg-surface text-ink rounded-xs px-1.5 py-0.5 font-mono text-[0.9em]">
              {content}
            </code>
          ),
          a: ({ href, children: content }) => (
            <a
              href={href}
              className="text-ink underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              {content}
            </a>
          ),
          hr: () => <hr className="border-hairline my-8" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
