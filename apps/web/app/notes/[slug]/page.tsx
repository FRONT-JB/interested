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
    /* DESIGN.md — docs-prose-block: 본문 최대폭 720px */
    <article className="max-w-[720px]">
      <Link href="/" className="type-body-sm-medium text-steel hover:text-ink transition-colors">
        ← Notes
      </Link>

      <header className="mt-10 space-y-6">
        <time className="type-micro text-stone block">{note.date}</time>

        <h1 className="type-heading-lg text-balance">{note.title}</h1>

        {/*
          Take는 원문의 주장이 아니라 내가 건진 것이다 (ADR-0003). 무엇을 얻었는지가
          본문보다 먼저 읽히도록 앞에 두고, `{colors.surface}` 판 위에 얹어 세운다.
        */}
        <div className="bg-surface space-y-2 rounded-xl px-6 py-5">
          <span className="type-caption-bold text-brand-coral block">TAKE</span>
          <p className="type-subtitle text-ink text-pretty">{note.take}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {note.concepts.map((concept) => (
            <span
              key={concept}
              className="type-body-sm-medium border-hairline text-steel rounded-full border px-4 py-1"
            >
              {concept}
            </span>
          ))}
        </div>

        {/*
          Note는 원문을 대체하지 않는다 (ADR-0003). 원문으로 가는 길이 늘 열려 있고,
          모양은 DESIGN.md의 button-secondary — 외곽선 알약이다.
        */}
        <a
          href={note.source}
          target="_blank"
          rel="noreferrer"
          className="type-body-sm-medium border-ink text-ink hover:bg-primary hover:text-primary-foreground inline-flex items-center rounded-full border px-6 py-2.5 transition-colors duration-200"
        >
          원문 보기
        </a>
      </header>

      <hr className="border-hairline mt-12 mb-12" />

      <Markdown>{body}</Markdown>
    </article>
  );
}
