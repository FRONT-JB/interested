import { describe, expect, it } from "vitest";

import { auditBriefing, type BriefingClaim } from "./briefing.ts";

const transcript =
  "I actually put all of my tags into this little preference folder over here. " +
  "That way the agent isn't inventing new tags every time it goes through.";

function audit(claims: BriefingClaim[], durationSeconds = 1159) {
  return auditBriefing({ claims, transcript, durationSeconds });
}

describe("auditBriefing", () => {
  it("자막에 있는 인용은 통과시킨다", () => {
    expect(audit([{ kind: "quote", text: "I actually put all of my tags" }])).toEqual([]);
  });

  it("자막에 없는 인용을 잡는다", () => {
    const [finding] = audit([{ kind: "quote", text: "I never use tags at all" }]);

    expect(finding?.reason).toBe("원문에서 이 문장을 찾지 못했다");
  });

  it("문장 부호와 대소문자만 다른 인용은 같은 것으로 본다", () => {
    // 자동 자막에는 문장 부호가 없어서, 글자 그대로 견주면 멀쩡한 인용이 걸린다.
    expect(audit([{ kind: "quote", text: "THAT WAY, the agent isn't inventing new tags!" }])).toEqual(
      [],
    );
  });

  it("빈 인용을 잡는다", () => {
    const [finding] = audit([{ kind: "quote", text: "   " }]);

    expect(finding?.reason).toBe("인용이 비어 있다");
  });

  it("영상 길이 안의 시각을 가리키는 덩어리는 통과시킨다", () => {
    expect(audit([{ kind: "outline", at: 658, text: "Karpathy의 gist를 출처로 든다" }])).toEqual([]);
  });

  it("영상 길이를 넘는 시각을 잡는다", () => {
    // 설명란 타임라인이 실제 길이를 넘는 항목을 달아 두는 일이 있다.
    const [finding] = audit([{ kind: "outline", at: 1188, text: "언급한 도구" }]);

    expect(finding?.reason).toContain("1159초");
  });

  it("시각이 음수인 덩어리를 잡는다", () => {
    const [finding] = audit([{ kind: "outline", at: -1, text: "도입" }]);

    expect(finding?.reason).toBe("시각이 없거나 음수다");
  });

  it("링크가 붙은 조사는 통과시킨다", () => {
    expect(
      audit([{ kind: "agent", text: "Karpathy의 gist는 …", link: "https://gist.github.com/x" }]),
    ).toEqual([]);
  });

  it("링크 없는 조사를 잡는다 — 대조할 원본이 자막에 없기 때문이다", () => {
    const [finding] = audit([{ kind: "agent", text: "Exa는 검색 API다", link: null }]);

    expect(finding?.reason).toBe("조사한 내용인데 링크가 없다");
  });

  it("열리지 않는 주소는 링크로 치지 않는다", () => {
    const [finding] = audit([{ kind: "agent", text: "…", link: "docs/adr/0009.md" }]);

    expect(finding?.reason).toBe("조사한 내용인데 링크가 없다");
  });

  it("걸린 자리를 배열의 자리로 돌려준다", () => {
    const findings = audit([
      { kind: "quote", text: "I actually put all of my tags" },
      { kind: "agent", text: "…", link: null },
      { kind: "outline", at: 9999, text: "…" },
    ]);

    expect(findings.map(({ index }) => index)).toEqual([1, 2]);
  });

  it("걸린 것이 없으면 빈 배열이다", () => {
    expect(audit([])).toEqual([]);
  });
});
