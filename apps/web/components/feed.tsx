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
  take: string;
  concepts: string[];
};

/**
 * Note 피드. 카드가 아니라 줄이다 — 기록 한 편은 지면 위의 한 칸이지 담긴
 * 물건이 아니다. 항목을 나누는 것은 상자가 아니라 가로선 하나다.
 *
 * 줄에 손을 얹으면 그 줄이 통째로 뒤집힌다. 목록에서 지금 무엇을 짚고 있는지를
 * 색이 아니라 지면의 반전으로 말하는 방식이고, 커서를 따라 읽는 자리가 한 눈에
 * 든다.
 *
 * Concept에 손을 얹으면 그 이름을 공유하는 다른 Note가 남고 나머지는 물러난다.
 * Note끼리는 Concept을 거쳐서만 이어지므로(ADR-0001), 이 동작이 곧 저장소의
 * 구조를 손으로 만지게 하는 자리다. 장식이 아니라 구조의 노출이다.
 */
export function Feed({ notes }: { notes: FeedItem[] }) {
  const [linked, setLinked] = useState<string | null>(null);

  return (
    <div className="border-foreground/15 border-b">
      {notes.map((note) => {
        const shares = linked === null || note.concepts.includes(linked);

        return (
          <article
            key={note.slug}
            className={cn(
              "group border-foreground/15 hover:bg-foreground relative border-t transition-[background-color,opacity] duration-200",
              shares ? "opacity-100" : "opacity-25",
            )}
          >
            <div className="flex items-start justify-between gap-6 px-1 py-9 sm:gap-10 sm:px-6 sm:py-11">
              <div className="min-w-0 space-y-3.5">
                {/*
                  지면에서 가장 큰 것은 제목이 아니라 Take다. 늘어선 것이 글 목록이
                  아니라 수확으로 읽혀야 한다 (ADR-0011). 줄 전체가 링크가 되도록
                  이 글자에서 판을 펴 둔다.
                */}
                <h2 className="font-heading group-hover:text-background text-[1.5rem] leading-[1.4] font-semibold tracking-tight text-pretty transition-colors duration-200 sm:text-[1.95rem] lg:text-[2.35rem] lg:leading-[1.35]">
                  <Link href={`/notes/${note.slug}`} className="before:absolute before:inset-0">
                    {note.take}
                  </Link>
                </h2>

                <p className="text-muted-foreground group-hover:text-background/55 max-w-[58ch] text-[13.5px] leading-6 transition-colors duration-200">
                  {note.title}
                </p>

                <div className="relative z-10 flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                  {note.concepts.map((concept) => (
                    <span
                      key={concept}
                      onPointerEnter={() => setLinked(concept)}
                      onPointerLeave={() => setLinked(null)}
                      className={cn(
                        "cursor-default font-mono text-[11.5px] transition-colors duration-200",
                        linked === concept
                          ? "text-seal group-hover:text-background"
                          : "text-muted-foreground group-hover:text-background/55 hover:text-foreground",
                      )}
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-4 pt-1.5">
                <time className="text-muted-foreground group-hover:text-background/55 font-mono text-[11.5px] tracking-wide transition-colors duration-200">
                  {note.date}
                </time>

                <ArrowRight
                  aria-hidden
                  strokeWidth={1.5}
                  className="text-background hidden size-5 -translate-x-1.5 opacity-0 transition-[opacity,transform] duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-0 group-hover:opacity-100 sm:block"
                />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
