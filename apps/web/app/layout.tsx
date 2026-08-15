import type { Metadata } from "next";
import { Gothic_A1, Hahmlet } from "next/font/google";

import { SidePanel } from "@/components/side-panel";

import "./globals.css";

/**
 * 표제는 한글 세리프다. 개발자 화면의 반사적 선택(Pretendard·Noto Sans KR·Inter)
 * 대신 미술관 캡션과 문학 출판물 쪽의 목소리를 쓴다 — 이 저장소가 파는 것이
 * 없고 읽히기만 하는 자리이기 때문이다.
 */
const display = Hahmlet({
  // 서브셋을 지정하지 않는다. 지정하면 그 목록에 한글이 없어 본문만 이 얼굴이
  // 되고 한글은 폴백으로 떨어진다 — 이 화면은 대부분이 한글이므로 그러면 표제
  // 서체를 쓰지 않는 것과 같다. 서브셋을 비우면 unicode-range로 나뉜 한글 조각까지
  // 함께 실린다.
  preload: false,
  weight: ["300", "400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

/** 본문은 조용한 한글 산세리프. 무게가 넓어 위계를 만들 수 있다. */
const body = Gothic_A1({
  preload: false,
  weight: ["300", "400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "interested",
  description: "내가 무엇에 관심을 두고 있는지를 기록하고, 관찰자가 그걸 읽어 나를 서술하는 저장소.",
};

/**
 * 칠하기 전에 테마를 정한다. 이 한 줄이 없으면 다크를 고른 사람에게 흰 화면이
 * 한 번 번쩍인다. localStorage에 아무것도 없으면 시스템 설정을 따른다.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-[78rem] flex-col lg:flex-row">
          <SidePanel />

          {/* 지면. 좌측이 말하는 자리라면 여기는 기록이 놓이는 자리다. */}
          <main className="min-w-0 flex-1 px-6 pt-10 pb-24 sm:px-10 lg:px-16 lg:pt-24">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
