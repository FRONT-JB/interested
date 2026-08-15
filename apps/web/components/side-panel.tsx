import Link from "next/link";

import { Separator } from "@/components/ui/separator";

/**
 * 좌측 고정 패널. 인삿말과 관찰자의 두 문서로 가는 진입점이다.
 *
 * Portrait과 Arc가 피드 밖에 있는 것은 둘이 Note가 아니기 때문이다. 하나는 지금의
 * 얼굴이라 늘 지워지고 하나는 지나온 자취라 지워지지 않는다 (ADR-0010).
 */
export function SidePanel() {
  return (
    <aside className="flex flex-col gap-8 border-b border-border px-6 py-10 md:sticky md:top-0 md:h-dvh md:w-[22rem] md:shrink-0 md:border-r md:border-b-0 md:px-10 md:py-14">
      <div className="space-y-4">
        <Link href="/" className="block text-sm font-semibold tracking-tight">
          읽은 것을 남깁니다
        </Link>

        <p className="text-sm leading-6 text-muted-foreground">
          유튜브·블로그·X에서 읽은 것 하나마다 Note를 한 편 씁니다. 요약이 아니라 거기서 무엇을
          건졌는지를 적습니다.
        </p>

        <p className="text-sm leading-6 text-muted-foreground">
          Note가 쌓이면 관찰자가 그걸 읽어 저를 서술합니다. 지금 무엇에 붙들려 있는지는 Portrait에,
          지나온 자취는 Arc에 남습니다.
        </p>
      </div>

      <Separator />

      <nav className="space-y-1">
        <PanelLink href="/portrait" name="Portrait" note="지금의 얼굴 — 갱신될 때마다 지워진다" />
        <PanelLink href="/arc" name="Arc" note="지나온 자취 — 길어지기만 한다" />
      </nav>

      <p className="mt-auto text-xs leading-5 text-muted-foreground">
        마크다운이 정본이고 이 화면은 그것을 읽어 그린다.
      </p>
    </aside>
  );
}

function PanelLink({ href, name, note }: { href: string; name: string; note: string }) {
  return (
    <Link
      href={href}
      className="-mx-2 flex flex-col gap-0.5 rounded-md px-2 py-2 transition-colors hover:bg-accent"
    >
      <span className="text-sm font-medium">{name}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </Link>
  );
}
