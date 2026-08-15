import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@interested/core`는 빌드된 결과가 아니라 TypeScript 원본을 내보낸다. 화면이
  // 저장소를 읽는 길을 그 패키지 하나로 두기 위해서다 (`repository/read.ts`).
  transpilePackages: ["@interested/core"],
};

export default nextConfig;
