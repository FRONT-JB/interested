import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/markdown";
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
    <article className="max-w-[46rem]">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground font-mono text-[11.5px] tracking-wide transition-colors"
      >
        ← Notes
      </Link>

      <header className="mt-10 space-y-6">
        <time className="text-muted-foreground block font-mono text-[11.5px] tracking-wide">
          {note.date}
        </time>

        <h1 className="font-heading text-[1.85rem] leading-[1.45] font-medium tracking-tight text-balance sm:text-[2.15rem]">
          {note.title}
        </h1>

        {/*
          Take는 원문의 주장이 아니라 내가 건진 것이다 (ADR-0003). 무엇을 얻었는지가
          본문보다 먼저 읽히도록 앞에 두되, 색띠로 표시하지 않고 라벨과 크기로 세운다.
        */}
        <div className="space-y-2 pt-2">
          <h2 className="text-seal font-mono text-[10.5px] tracking-[0.18em] uppercase">Take</h2>

          <p className="font-heading max-w-[38ch] text-[1.2rem] leading-[1.7] font-normal text-pretty">
            {note.take}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2">
          {note.concepts.map((concept) => (
            <span key={concept} className="text-muted-foreground font-mono text-[11.5px]">
              {concept}
            </span>
          ))}
        </div>

        {/* Note는 원문을 대체하지 않는다 (ADR-0003). 원문으로 가는 길이 늘 열려 있다. */}
        <a
          href={note.source}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-seal decoration-border hover:decoration-seal inline-block text-[12.5px] underline decoration-1 underline-offset-[3px] transition-colors"
        >
          원문 보기
        </a>
      </header>

      <hr className="border-border mt-12 mb-12" />

      <Markdown>{body}</Markdown>
    </article>
  );
}
