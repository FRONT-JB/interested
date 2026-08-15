import { Markdown } from "@/components/markdown";
import { observerDocument } from "@/lib/repository";

export const metadata = { title: "Portrait · interested" };

export default async function PortraitPage() {
  const portrait = await observerDocument("portrait.md");

  return (
    <article className="max-w-[46rem]">
      <h1 className="text-seal font-mono text-[10.5px] tracking-[0.18em] uppercase">Portrait</h1>

      <div className="mt-6 max-w-[52ch] space-y-4">
        <p className="font-heading text-[1.3rem] leading-[1.65] font-normal text-pretty">
          지금 이 사람이 무엇에 붙들려 있는지에 대한, 관찰자가 내놓는 짧은 판정입니다.
        </p>

        <p className="text-muted-foreground text-[13.5px] leading-6">
          쌓인 Note와 GitHub 공개 활동을 재료로 AI가 문장을 쓰고, 감사를 통과한 것만 파일이 됩니다.
          관측되는 동사만 씁니다 — <span className="text-foreground">읽었다</span>,{" "}
          <span className="text-foreground">돌아왔다</span>,{" "}
          <span className="text-foreground">관심이 있다</span>는 쓰고{" "}
          <span className="text-foreground">익혔다</span>,{" "}
          <span className="text-foreground">이해했다</span>는 쓰지 않습니다. 읽었다는 사실에서
          관심은 따라 나오지만 습득은 따라 나오지 않기 때문입니다.
        </p>

        <p className="text-muted-foreground text-[13.5px] leading-6">
          Note나 Trail이 커밋될 때, 그리고 하루 한 번 다시 쓰입니다. 갱신될 때마다 앞의 판정은
          지워집니다.
        </p>
      </div>

      <hr className="border-border mt-12 mb-12" />

      {portrait === null ? (
        <p className="text-muted-foreground text-[14px] leading-7">아직 판정이 쓰이지 않았습니다.</p>
      ) : (
        <Markdown>{portrait}</Markdown>
      )}
    </article>
  );
}
