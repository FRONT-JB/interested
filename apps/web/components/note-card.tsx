import Link from "next/link";

import type { FeedNote } from "@/lib/repository";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 피드의 한 항목. Take를 제목보다 앞세우는 것은, 늘어선 것이 글이 아니라 수확으로
 * 읽히게 하기 위해서다 (ADR-0011). Take는 원문의 주장이 아니라 내가 건진 것이다
 * (ADR-0003).
 */
export function NoteCard({ note }: { note: FeedNote }) {
  return (
    // 피드의 항목은 낱개의 상자가 아니라 이어지는 줄이다. 상자 테두리(`ring`)를
    // 끄고 아래 선 하나만 남긴다.
    <Card className="rounded-none border-b border-border bg-transparent py-0 ring-0 transition-colors hover:bg-accent/40">
      <CardContent className="px-0 py-8">
        <Link href={`/notes/${note.slug}`} className="block space-y-3">
          <time className="block font-mono text-xs text-muted-foreground">{note.date}</time>

          <p className="text-lg leading-8 font-medium tracking-tight text-balance">{note.take}</p>

          <p className="text-sm leading-6 text-muted-foreground">{note.title}</p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {note.concepts.map((concept) => (
              <Badge key={concept} variant="secondary" className="font-mono text-[11px] font-normal">
                {concept}
              </Badge>
            ))}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
