import type { Metadata } from "next";

import { SidePanel } from "@/components/side-panel";

import "./globals.css";

export const metadata: Metadata = {
  title: "interested",
  description: "내가 무엇에 관심을 두고 있는지를 기록하고, 관찰자가 그걸 읽어 나를 서술하는 저장소.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col md:flex-row">
          <SidePanel />
          <main className="min-w-0 flex-1 px-6 py-10 md:px-12 md:py-14">{children}</main>
        </div>
      </body>
    </html>
  );
}
