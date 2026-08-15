import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { feedNotes, noteBySlug } from "@/lib/repository";

export async function generateStaticParams() {
  return (await feedNotes()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/notes/[slug]">) {
  const found = await noteBySlug((await params).slug);

  return found === null ? {} : { title: found.note.title, description: found.note.take };
}

export default async function NotePage({ params }: PageProps<"/notes/[slug]">) {
  const found = await noteBySlug((await params).slug);

  if (found === null) {
    notFound();
  }

  const { note, body } = found;

  return (
    <article className="max-w-2xl space-y-8">
      <Link href="/" className="inline-block text-xs text-muted-foreground hover:text-foreground">
        ← Notes
      </Link>

      <header className="space-y-4">
        <time className="block font-mono text-xs text-muted-foreground">{note.date}</time>

        <h1 className="text-2xl leading-9 font-semibold tracking-tight text-balance">{note.title}</h1>

        {/* Take는 원문의 주장이 아니라 내가 건진 것이다 (ADR-0003). 본문 앞에 따로
            두어 무엇을 얻었는지가 먼저 읽히게 한다. */}
        <p className="border-l-2 border-foreground pl-4 text-[15px] leading-7 font-medium">
          {note.take}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {note.concepts.map((concept) => (
            <Badge key={concept} variant="secondary" className="font-mono text-[11px] font-normal">
              {concept}
            </Badge>
          ))}
        </div>

        {/* Note는 원문을 대체하지 않는다 (ADR-0003). 원문으로 가는 길이 늘 열려 있다. */}
        <a
          href={note.source}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          원문 보기
        </a>
      </header>

      <Separator />

      <Markdown>{body}</Markdown>
    </article>
  );
}
