import { Markdown } from "@/components/markdown";
import { observerDocument } from "@/lib/repository";

export const metadata = { title: "Arc · interested" };

export default async function ArcPage() {
  const arc = await observerDocument("arc.md");

  return (
    <article className="max-w-2xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-sm font-semibold tracking-tight">Arc</h1>
        {/* 두 목소리가 한 문서에 있다 (ADR-0010). 어느 쪽이 누구의 말인지가 화면에서
            사라지면 그 규칙이 문서 밖에서만 사는 규칙이 된다. */}
        <p className="text-xs leading-5 text-muted-foreground">
          씨앗 위에 Note가 쌓일 때마다 길어지는 하나의 서사. 인용으로 들여쓴 것이 본인의 말이고
          나머지가 관찰자의 말이다.
        </p>
      </header>

      {arc === null ? (
        <p className="text-sm text-muted-foreground">아직 씨앗이 놓이지 않았다.</p>
      ) : (
        <Markdown>{arc}</Markdown>
      )}
    </article>
  );
}
