import { Markdown } from "@/components/markdown";
import { observerDocument } from "@/lib/repository";

export const metadata = { title: "Portrait · interested" };

export default async function PortraitPage() {
  const portrait = await observerDocument("portrait.md");

  return (
    <article className="max-w-2xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-sm font-semibold tracking-tight">Portrait</h1>
        <p className="text-xs leading-5 text-muted-foreground">
          지금 이 사람이 무엇에 붙들려 있는지에 대한 관찰자의 짧은 판정. 갱신될 때마다 앞의 것은
          지워진다.
        </p>
      </header>

      {portrait === null ? (
        <p className="text-sm text-muted-foreground">아직 판정이 쓰이지 않았다.</p>
      ) : (
        <Markdown>{portrait}</Markdown>
      )}
    </article>
  );
}
