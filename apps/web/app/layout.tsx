import type { Metadata } from "next";

import { SidePanel } from "@/components/side-panel";

import "./globals.css";

export const metadata: Metadata = {
  title: "interested",
  description: "내가 무엇에 관심을 두고 있는지를 기록하고, 관찰자가 그걸 읽어 나를 서술하는 저장소.",
};

/**
 * 칠하기 전에 테마를 정한다. 이 한 줄이 없으면 다크를 고른 사람에게 흰 화면이
 * 한 번 번쩍인다. localStorage에 아무것도 없으면 시스템 설정을 따른다.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

/**
 * Pretendard. 한 얼굴로 한글과 라틴을 모두 낸다 — DESIGN.md는 DM Sans를 적고
 * 있지만 그 얼굴에는 한글이 없어 화면의 대부분이 폴백으로 떨어진다. 서체만
 * 바꾸고 크기·무게·자간의 위계는 그 문서를 그대로 따른다.
 *
 * Google Fonts에 없어 `next/font`로 싣지 못한다. 동적 서브셋 CSS를 쓰면 화면에
 * 나온 글자에 해당하는 조각만 내려온다.
 */
const pretendard =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="stylesheet" href={pretendard} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        {/* DESIGN.md — 1280px max-width with 32px gutters */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[1280px] flex-col lg:flex-row">
          <SidePanel />

          {/*
            DESIGN.md — 96px(`spacing.hero`)는 마케팅 상단의 값이고, 읽는 지면은
            64px(`spacing.section`)로 조인다. 이 화면은 훑고 읽는 자리다.
          */}
          <main className="min-w-0 flex-1 px-6 pt-10 pb-16 sm:px-8 lg:px-10 lg:pt-16">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
