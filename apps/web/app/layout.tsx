import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "interested",
  description: "내가 무엇에 관심을 두고 있는지를 기록하고, 관찰자가 그걸 읽어 나를 서술하는 저장소.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
