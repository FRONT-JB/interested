import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * 마크다운 본문을 그린다. Note도 Portrait도 Arc도 마크다운이 정본이므로
 * (ADR-0011) 화면에서 그것을 다시 쓰지 않고 그대로 그린다.
 *
 * 문단 사이 간격과 글자 크기만 정한다. 본문의 구조는 파일이 들고 있다.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-4 text-[15px] leading-7 text-foreground/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: content }) => (
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{content}</h1>
          ),
          h2: ({ children: content }) => (
            <h2 className="mt-8 text-lg font-semibold tracking-tight text-foreground">{content}</h2>
          ),
          h3: ({ children: content }) => (
            <h3 className="mt-6 font-semibold text-foreground">{content}</h3>
          ),
          p: ({ children: content }) => <p>{content}</p>,
          ul: ({ children: content }) => (
            <ul className="list-disc space-y-1 pl-5 marker:text-muted-foreground">{content}</ul>
          ),
          ol: ({ children: content }) => (
            <ol className="list-decimal space-y-1 pl-5 marker:text-muted-foreground">{content}</ol>
          ),
          // 인용 블록은 Arc에서 본인의 말이라는 표시다 (ADR-0010). 관찰자의 문단과
          // 눈으로 갈리지 않으면 그 표시가 화면에서 사라진다.
          blockquote: ({ children: content }) => (
            <blockquote className="space-y-3 border-l-2 border-foreground/25 pl-4 text-foreground">
              {content}
            </blockquote>
          ),
          code: ({ children: content }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">{content}</code>
          ),
          a: ({ href, children: content }) => (
            <a
              href={href}
              className="underline underline-offset-4 hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              {content}
            </a>
          ),
          hr: () => <hr className="border-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
