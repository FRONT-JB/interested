import Link from "next/link";

import { Markdown } from "@/components/markdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { observerDocument } from "@/lib/repository";

/**
 * 좌측 고정 패널. 위는 사람이 하는 말이고 아래는 관찰자가 하는 말이다.
 *
 * Portrait을 링크 뒤에 감추지 않고 여기에 그대로 편다. 이 저장소의 컨셉이
 * "관찰자가 나를 서술한다"인데 그 서술이 한 번 더 눌러야 나오면, 첫 화면에서
 * 컨셉이 사라진다. Arc는 반대로 진입점만 둔다 — 그것은 길어지기만 하는 문서라
 * 패널에 펴 놓을 수 있는 길이가 아니다 (ADR-0010).
 */
export async function SidePanel() {
  const portrait = await observerDocument("portrait.md");

  return (
    <aside className="border-border flex flex-col gap-10 border-b px-6 pt-10 pb-12 sm:px-10 lg:sticky lg:top-0 lg:h-dvh lg:w-[24rem] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-10 lg:pt-24 lg:pb-10">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <Link
            href="/"
            className="font-heading hover:text-seal text-[1.35rem] leading-8 font-medium tracking-tight transition-colors"
          >
            읽은 것을 남깁니다
          </Link>

          <ThemeToggle />
        </div>

        <p className="text-muted-foreground text-[13.5px] leading-6">
          유튜브·블로그·X에서 읽은 것 하나마다 Note를 한 편 씁니다. 요약이 아니라 거기서 무엇을
          건졌는지를 적습니다.
        </p>
      </div>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-seal font-mono text-[10.5px] tracking-[0.18em] uppercase">Portrait</h2>

          {/*
            아래 문단이 누구의 말인지를 먼저 밝힌다. 밝히지 않으면 읽는 쪽은 이것을
            자기소개로 읽고, 그러면 관찰자가 한 말이 본인이 한 말이 된다.
          */}
          <p className="text-muted-foreground text-[12.5px] leading-5">
            아래 문단은 제가 쓰지 않았습니다. AI 관찰자가 쌓인 Note와 GitHub 활동을 읽어 저를
            서술한 것이고, 갱신될 때마다 앞의 것은 지워집니다.
          </p>
        </div>

        {portrait === null ? (
          <p className="text-muted-foreground text-[13px] leading-6">아직 판정이 쓰이지 않았습니다.</p>
        ) : (
          <Markdown compact>{portrait}</Markdown>
        )}

        <Link
          href="/portrait"
          className="text-muted-foreground hover:text-foreground decoration-border hover:decoration-seal inline-block text-[12px] underline decoration-1 underline-offset-[3px] transition-colors"
        >
          Portrait이 무엇인지
        </Link>
      </section>

      <section className="space-y-2">
        <h2 className="text-muted-foreground font-mono text-[10.5px] tracking-[0.18em] uppercase">
          Arc
        </h2>

        <p className="text-muted-foreground text-[12.5px] leading-5">
          지금의 얼굴이 매번 지워지는 자리라면, Arc는 지워지지 않고 길어지기만 하는 자취입니다.
        </p>

        <Link
          href="/arc"
          className="text-foreground decoration-border hover:decoration-seal inline-block text-[13px] underline decoration-1 underline-offset-[3px] transition-colors"
        >
          자취 읽기
        </Link>
      </section>

      <p className="text-muted-foreground/70 mt-auto text-[11.5px] leading-5">
        마크다운이 정본이고 이 화면은 그것을 읽어 그립니다.
      </p>
    </aside>
  );
}
