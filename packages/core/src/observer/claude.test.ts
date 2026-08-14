import { describe, expect, it } from "vitest";

import { claudeCodeWriter } from "./claude.ts";

describe("claudeCodeWriter", () => {
  it("실행 파일을 찾지 못하면 실패로 끝난다", async () => {
    const attempt = await claudeCodeWriter({ command: "interested-없는-명령" })("아무 프롬프트");

    expect("failed" in attempt).toBe(true);
  });

  it("빈 답은 실패로 둔다", async () => {
    // `true`는 무엇을 받아도 아무것도 내놓지 않는다. 빈 산문을 통과시키면
    // 감사가 형식으로 걸러 낸 뒤 이유가 "제목이 없다"가 되어 한 겹 멀어진다.
    const attempt = await claudeCodeWriter({ command: "true" })("아무 프롬프트");

    expect(attempt).toEqual({ failed: "true가 빈 답을 냈다" });
  });
});
