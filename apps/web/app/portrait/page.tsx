import { Markdown } from "@/components/markdown";
import { observerDocument } from "@/lib/repository";

export const metadata = { title: "Portrait · interested" };

export default async function PortraitPage() {
  const portrait = await observerDocument("portrait.md");

  return (
    <article className="max-w-[720px]">
      <p className="type-label text-brand-coral">Portrait</p>

      <h1 className="type-heading-lg mt-4 max-w-[20ch] text-balance">
        관찰자가 내놓는 짧은 판정
      </h1>

      <div className="mt-5 max-w-[60ch] space-y-3">
        <p className="type-subtitle text-slate">
          쌓인 Note와 GitHub 공개 활동을 재료로 AI가 문장을 쓰고, 감사를 통과한 것만 파일이 됩니다.
        </p>

        <p className="type-body-sm text-steel">
          관측되는 동사만 씁니다 — <span className="text-ink">읽었다</span>,{" "}
          <span className="text-ink">돌아왔다</span>, <span className="text-ink">관심이 있다</span>는
          쓰고 <span className="text-ink">익혔다</span>, <span className="text-ink">이해했다</span>는
          쓰지 않습니다. 읽었다는 사실에서 관심은 따라 나오지만 습득은 따라 나오지 않기
          때문입니다.
        </p>

        <p className="type-body-sm text-steel">
          Note나 Trail이 커밋될 때, 그리고 하루 한 번 다시 쓰입니다. 갱신될 때마다 앞의 판정은
          지워집니다.
        </p>
      </div>

      <hr className="border-hairline mt-10 mb-10" />

      {portrait === null ? (
        <p className="type-body text-steel">아직 판정이 쓰이지 않았습니다.</p>
      ) : (
        <Markdown>{portrait}</Markdown>
      )}
    </article>
  );
}
