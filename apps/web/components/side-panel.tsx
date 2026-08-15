import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Markdown } from "@/components/markdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { observerDocument } from "@/lib/repository";

/**
 * 좌측 고정 패널. 워드마크 하나와 관찰자의 말이 전부다.
 *
 * 인삿말을 두지 않는다. 이 자리에서 사람이 자기를 소개하면 아래의 Portrait과
 * 같은 목소리로 읽히는데, Portrait은 본인이 아니라 관찰자가 쓴 문단이다.
 *
 * Portrait을 링크 뒤에 감추지 않고 여기에 그대로 편다. 이 저장소의 컨셉이
 * "관찰자가 나를 서술한다"인데 그 서술이 한 번 더 눌러야 나오면, 첫 화면에서
 * 컨셉이 사라진다. Arc는 반대로 진입점만 두고 패널 맨 아래에 둔다 — 길어지기만
 * 하는 문서라 여기에 펴 놓을 수 있는 길이가 아니다 (ADR-0010).
 */
export async function SidePanel() {
  const portrait = await observerDocument("portrait.md");

  return (
    <aside className="border-hairline flex flex-col gap-6 border-b px-6 pt-10 pb-10 sm:px-8 lg:sticky lg:top-0 lg:h-dvh lg:w-[340px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-8 lg:pt-16 lg:pb-10">
      <div className="flex items-center justify-between gap-4">
        {/* 워드마크. 저장소 이름이 곧 이 화면이 하는 말이라 다른 인삿말을 두지 않는다. */}
        <Link href="/" className="type-card-title tracking-[0.14em] uppercase">
          Interested
        </Link>

        <ThemeToggle />
      </div>

      <section className="space-y-4">
        <SectionLabel>Portrait</SectionLabel>

        {/*
          아래 문단이 누구의 말인지를 먼저 밝힌다. 밝히지 않으면 읽는 쪽은 이것을
          자기소개로 읽고, 그러면 관찰자가 한 말이 본인이 한 말이 된다.
        */}
        <p className="type-caption text-steel">
          아래 문단은 제가 쓰지 않았습니다. AI 관찰자가 쌓인 Note와 GitHub 활동을 읽어 저를
          서술한 것이고, 갱신될 때마다 앞의 것은 지워집니다.
        </p>

        {portrait === null ? (
          <p className="type-body-sm text-steel">아직 판정이 쓰이지 않았습니다.</p>
        ) : (
          <Markdown compact>{portrait}</Markdown>
        )}

        <PanelLink href="/portrait">Portrait이 무엇인지</PanelLink>
      </section>

      {/*
        Arc는 Portrait 아래에 온다. 패널 바닥에 붙여 두면 Note가 적은 날 두 절
        사이가 화면 높이만큼 벌어지는데, 그 빈자리는 구조가 아니라 사고다.
        경계는 여백이 아니라 선 하나로 말한다.
      */}
      <section className="border-hairline space-y-3 border-t pt-6">
        <SectionLabel>Arc</SectionLabel>

        <p className="type-caption text-steel">
          지금의 얼굴이 매번 지워지는 자리라면, Arc는 지워지지 않고 길어지기만 하는 자취입니다.
        </p>

        <PanelLink href="/arc">자취 읽기</PanelLink>
      </section>
    </aside>
  );
}

/** 절의 이름. 칩에 담지 않고 글자만 둔다. */
function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="type-label text-stone">{children}</h2>
  );
}

/**
 * 다른 화면으로 가는 자리. 밑줄 친 글자만 두면 본문과 섞여 읽히므로, 판을 깔고
 * 화살표를 붙여 "여기서 화면이 바뀐다"를 형태로 말한다. DESIGN.md의
 * `sidebar-nav-item` 모양이다.
 */
function PanelLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="type-body-sm-medium text-ink hover:bg-surface -mx-3 flex items-center justify-between gap-3 rounded-sm px-3 py-2.5 transition-colors duration-200"
    >
      {children}
      <ArrowRight aria-hidden strokeWidth={1.75} className="text-stone size-4 shrink-0" />
    </Link>
  );
}
