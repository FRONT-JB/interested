import { Markdown } from "@/components/markdown";
import { observerDocument } from "@/lib/repository";

export const metadata = { title: "Arc · interested" };

export default async function ArcPage() {
  const arc = await observerDocument("arc.md");

  return (
    <article className="max-w-[46rem]">
      <h1 className="text-muted-foreground font-mono text-[10.5px] tracking-[0.18em] uppercase">
        Arc
      </h1>

      <div className="mt-6 max-w-[52ch] space-y-4">
        <p className="font-heading text-[1.3rem] leading-[1.65] font-normal text-pretty">
          시작하기 전 무엇에 끌렸는지에서 출발해, Note가 쌓일 때마다 길어지기만 하는 하나의
          서사입니다.
        </p>

        {/*
          두 목소리가 한 문서에 있다 (ADR-0010). 어느 쪽이 누구의 말인지가 화면에서
          사라지면 그 규칙이 문서 밖에서만 사는 규칙이 된다. 그래서 읽기 전에 먼저 밝힌다.
        */}
        <p className="text-muted-foreground text-[13.5px] leading-6">
          목소리가 둘입니다. 인주색 선으로 들여쓴 문단은 제가 쓴 것이고, 날짜로 시작하는 줄은 AI
          관찰자가 Note 한 편마다 덧붙인 것입니다. 성취를 말하는 문장은 제 자리에만 있을 수
          있습니다.
        </p>

        <p className="text-muted-foreground text-[13.5px] leading-6">
          Portrait이 매번 지워지는 지금의 얼굴이라면, 이 문서는 지워지지 않습니다.
        </p>
      </div>

      <hr className="border-border mt-12 mb-12" />

      {arc === null ? (
        <p className="text-muted-foreground text-[14px] leading-7">아직 씨앗이 놓이지 않았습니다.</p>
      ) : (
        <Markdown>{arc}</Markdown>
      )}
    </article>
  );
}
