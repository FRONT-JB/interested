import { Markdown } from "@/components/markdown";
import { observerDocument } from "@/lib/repository";

export const metadata = { title: "Arc · interested" };

export default async function ArcPage() {
  const arc = await observerDocument("arc.md");

  return (
    <article className="max-w-[720px]">
      <p className="type-label text-stone">Arc</p>

      <h1 className="type-heading-lg mt-4 max-w-[22ch] text-balance">길어지기만 하는 하나의 서사</h1>

      <div className="mt-5 max-w-[60ch] space-y-3">
        <p className="type-subtitle text-slate">
          시작하기 전 무엇에 끌렸는지에서 출발해, Note가 쌓일 때마다 살이 붙습니다.
        </p>

        {/*
          두 목소리가 한 문서에 있다 (ADR-0010). 어느 쪽이 누구의 말인지가 화면에서
          사라지면 그 규칙이 문서 밖에서만 사는 규칙이 된다. 그래서 읽기 전에 밝힌다.
        */}
        <p className="type-body-sm text-steel">
          목소리가 둘입니다. 회색 판 위에 얹힌 문단은 제가 쓴 것이고, 날짜로 시작하는 줄은 AI
          관찰자가 Note 한 편마다 덧붙인 것입니다. 성취를 말하는 문장은 제 자리에만 있을 수
          있습니다.
        </p>

        <p className="type-body-sm text-steel">
          Portrait이 매번 지워지는 지금의 얼굴이라면, 이 문서는 지워지지 않습니다.
        </p>
      </div>

      <hr className="border-hairline mt-10 mb-10" />

      {arc === null ? (
        <p className="type-body text-steel">아직 씨앗이 놓이지 않았습니다.</p>
      ) : (
        <Markdown>{arc}</Markdown>
      )}
    </article>
  );
}
