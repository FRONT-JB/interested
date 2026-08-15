import Link from "next/link";

import { Markdown } from "@/components/markdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { observerDocument } from "@/lib/repository";

/**
 * 좌측 고정 패널. 위는 사람이 하는 말이고 아래는 관찰자가 하는 말이다.
 *
 * Portrait을 링크 뒤에 감추지 않고 여기에 그대로 편다. 이 저장소의 컨셉이
 * "관찰자가 나를 서술한다"인데 그 서술이 한 번 더 눌러야 나오면, 첫 화면에서
 * 컨셉이 사라진다. Arc는 반대로 진입점만 둔다 — 길어지기만 하는 문서라 패널에
 * 펴 놓을 수 있는 길이가 아니다 (ADR-0010).
 *
 * 폭과 항목 모양은 DESIGN.md의 문서 사이드바를 따른다 — 데스크톱에서 고정폭으로
 * 남고 1024px 아래에서 위로 접힌다.
 */
export async function SidePanel() {
  const portrait = await observerDocument("portrait.md");

  return (
    <aside className="border-hairline flex flex-col gap-10 border-b px-6 pt-12 pb-12 sm:px-8 lg:sticky lg:top-0 lg:h-dvh lg:w-[340px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-8 lg:pt-24 lg:pb-12">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <Link href="/" className="type-heading-sm tracking-[-0.4px]">
            읽은 것을 남깁니다
          </Link>

          <ThemeToggle />
        </div>

        <p className="type-body-sm text-slate">
          유튜브·블로그·X에서 읽은 것 하나마다 Note를 한 편 씁니다. 요약이 아니라 거기서 무엇을
          건졌는지를 적습니다.
        </p>
      </div>

      <section className="space-y-4">
        <div className="space-y-3">
          {/* DESIGN.md — badge-new. 브랜드 코랄은 정체를 가리키는 자리에만 쓴다. */}
          <span className="type-caption-bold bg-brand-coral inline-block rounded-full px-2.5 py-1 text-white">
            PORTRAIT
          </span>

          {/*
            아래 문단이 누구의 말인지를 먼저 밝힌다. 밝히지 않으면 읽는 쪽은 이것을
            자기소개로 읽고, 그러면 관찰자가 한 말이 본인이 한 말이 된다.
          */}
          <p className="type-caption text-steel">
            아래 문단은 제가 쓰지 않았습니다. AI 관찰자가 쌓인 Note와 GitHub 활동을 읽어 저를
            서술한 것이고, 갱신될 때마다 앞의 것은 지워집니다.
          </p>
        </div>

        {portrait === null ? (
          <p className="type-body-sm text-steel">아직 판정이 쓰이지 않았습니다.</p>
        ) : (
          <Markdown compact>{portrait}</Markdown>
        )}

        <Link
          href="/portrait"
          className="type-body-sm-medium text-ink inline-block underline-offset-4 hover:underline"
        >
          Portrait이 무엇인지
        </Link>
      </section>

      <section className="space-y-3">
        <span className="type-caption-bold border-hairline text-steel inline-block rounded-full border px-2.5 py-1">
          ARC
        </span>

        <p className="type-caption text-steel">
          지금의 얼굴이 매번 지워지는 자리라면, Arc는 지워지지 않고 길어지기만 하는 자취입니다.
        </p>

        <Link
          href="/arc"
          className="type-body-sm-medium text-ink inline-block underline-offset-4 hover:underline"
        >
          자취 읽기
        </Link>
      </section>

      <p className="type-micro text-stone mt-auto">
        마크다운이 정본이고 이 화면은 그것을 읽어 그립니다.
      </p>
    </aside>
  );
}
