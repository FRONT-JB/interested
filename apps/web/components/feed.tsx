"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

/** 피드 한 줄에 필요한 것. 서버가 읽은 Note에서 이만큼만 건너온다. */
export type FeedItem = {
  slug: string;
  date: string;
  title: string;
  concepts: string[];
};

/**
 * Note 피드. 카드가 아니라 줄이다 — 항목을 나누는 것은 상자가 아니라
 * `{colors.hairline}` 한 줄이다.
 *
 * 줄에 손을 얹으면 그 줄이 `{colors.primary}`로 뒤집힌다. DESIGN.md에서 검정은
 * 이 시스템의 지배적인 상호작용 색이므로(`button-primary`), 목록에서 지금 짚고
 * 있는 자리도 같은 색으로 말한다.
 *
 * Concept은 `pill-tab`이고, 손을 얹으면 `pill-tab-active`가 되면서 그 이름을
 * 공유하는 Note만 남는다. Note끼리는 Concept을 거쳐서만 이어지므로(ADR-0001),
 * 이 동작이 곧 저장소의 구조를 손으로 만지게 하는 자리다.
 */
export function Feed({ notes }: { notes: FeedItem[] }) {
  const [linked, setLinked] = useState<string | null>(null);

  return (
    <div className="border-hairline border-b">
      {notes.map((note) => {
        const shares = linked === null || note.concepts.includes(linked);

        return (
          <article
            key={note.slug}
            className={cn(
              "group border-hairline hover:bg-primary relative border-t transition-[background-color,opacity] duration-200",
              shares ? "opacity-100" : "opacity-30",
            )}
          >
            <div className="flex items-start justify-between gap-6 px-0 py-7 sm:gap-10 sm:px-6 sm:py-8">
              <div className="min-w-0 space-y-4">
                {/*
                  줄의 주인공은 Note의 제목이다. Take는 한 문장이라 목록에서 읽으면
                  줄이 길어지고, 무엇을 건졌는지는 들어가서 읽을 자리에 둔다.
                  크기는 DESIGN.md의 display-lg 단계를 따른다.
                */}
                <h2 className="type-display group-hover:text-primary-foreground text-balance transition-colors duration-200">
                  <Link href={`/notes/${note.slug}`} className="before:absolute before:inset-0">
                    {note.title}
                  </Link>
                </h2>

                <div className="relative z-10 flex flex-wrap gap-2 pt-1">
                  {note.concepts.map((concept) => (
                    <span
                      key={concept}
                      onPointerEnter={() => setLinked(concept)}
                      onPointerLeave={() => setLinked(null)}
                      className={cn(
                        "type-body-sm-medium cursor-default rounded-full border px-4 py-1 transition-colors duration-200",
                        linked === concept
                          ? "bg-primary text-primary-foreground border-primary group-hover:bg-primary-foreground group-hover:text-primary group-hover:border-primary-foreground"
                          : "border-hairline text-steel group-hover:border-primary-foreground/25 group-hover:text-primary-foreground/60",
                      )}
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-4 pt-2">
                <time className="type-micro text-stone group-hover:text-primary-foreground/60 transition-colors duration-200">
                  {note.date}
                </time>

                {/* DESIGN.md — button-icon-circular (36px). 줄을 짚었을 때만 나온다. */}
                <span className="border-primary-foreground/25 hidden size-9 shrink-0 items-center justify-center rounded-full border opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:flex">
                  <ArrowRight
                    aria-hidden
                    strokeWidth={1.75}
                    className="text-primary-foreground size-4"
                  />
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
