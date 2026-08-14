import { describe, expect, it } from "vitest";

import { auditProse } from "./audit.ts";
import type { PortraitBrief } from "./brief.ts";

const brief: PortraitBrief = {
  facts: [
    "Note는 지금까지 5편이고 2주에 걸쳐 썼다.",
    "가장 최근에 Note를 쓴 주는 2026-W33이고, 마지막 Note는 2026-08-14에 썼다.",
    "2026-08-08부터 2026-08-14까지 공개 푸시는 9회다.",
    "푸시가 간 저장소 — `octocat/interested` 9회(그 저장소의 주 언어는 `CSS`)",
  ],
  names: ["rsc", "octocat/interested", "CSS"],
};

const good = [
  "# Portrait",
  "",
  "`rsc`에 관심이 있다. 2026-W33에 쓴 Note가 그쪽에 몰렸다.",
  "Note는 지금까지 5편이고 2주에 걸쳐 썼다.",
  "2026-08-08부터 2026-08-14까지 공개 푸시는 9회이고, 그 대부분이 `octocat/interested`로 갔다.",
].join("\n");

describe("auditProse", () => {
  it("사실 안에서 쓴 산문은 통과한다", () => {
    expect(auditProse({ prose: good, brief })).toEqual({ outcome: "pass" });
  });

  it("금지 동사가 들어가면 되돌린다", () => {
    const verdict = auditProse({ prose: `${good}\n\n이제 \`CSS\`에 능숙하다.`, brief });

    expect(verdict.outcome).toBe("rejected");
    expect(verdict.outcome === "rejected" && verdict.reasons.join(" ")).toContain("능숙");
  });

  it("재료에 없는 숫자를 만들면 되돌린다", () => {
    const verdict = auditProse({ prose: `${good}\n\n지난 12주 동안 같은 자리에 있었다.`, brief });

    expect(verdict.outcome).toBe("rejected");
    expect(verdict.outcome === "rejected" && verdict.reasons.join(" ")).toContain("12");
  });

  it("재료에 있는 수를 다른 것을 세는 데 쓰면 되돌린다", () => {
    // 9와 편이 각각 재료에 있으니 숫자만 보면 통과한다. 세는 대상이 바뀐 것은
    // 숫자를 지어낸 것과 다르지 않다.
    const verdict = auditProse({ prose: `${good}\n\n그 저장소에는 Note가 9편 있다.`, brief });

    expect(verdict.outcome).toBe("rejected");
    expect(verdict.outcome === "rejected" && verdict.reasons.join(" ")).toContain("9편");
  });

  it("재료에 있는 수와 단위는 그대로 통과한다", () => {
    const verdict = auditProse({ prose: `${good}\n\n푸시는 9회였다.`, brief });

    expect(verdict).toEqual({ outcome: "pass" });
  });

  it("재료에 없는 이름을 만들면 되돌린다", () => {
    const verdict = auditProse({ prose: `${good}\n\n\`octocat/없는것\`에도 푸시가 갔다.`, brief });

    expect(verdict.outcome).toBe("rejected");
    expect(verdict.outcome === "rejected" && verdict.reasons.join(" ")).toContain("octocat/없는것");
  });

  it("제목 줄이 없으면 되돌린다", () => {
    const verdict = auditProse({ prose: "`rsc`에 관심이 있다.", brief });

    expect(verdict.outcome).toBe("rejected");
  });

  it("설명을 덧붙여 길어지면 되돌린다", () => {
    const verdict = auditProse({ prose: `${good}\n\n${"`rsc`에 관심이 있다. ".repeat(80)}`, brief });

    expect(verdict.outcome).toBe("rejected");
  });

  it("코드 블록으로 감싸 오면 되돌린다", () => {
    const verdict = auditProse({ prose: "```markdown\n# Portrait\n\n`rsc`에 관심이 있다.\n```", brief });

    expect(verdict.outcome).toBe("rejected");
  });

  it("걸린 자리를 여러 개면 여러 개로 돌려준다", () => {
    const verdict = auditProse({
      prose: "# Portrait\n\n`rsc`를 익혔고 지난 12주 동안 `없는/저장소`에 푸시했다.",
      brief,
    });

    expect(verdict.outcome === "rejected" && verdict.reasons.length).toBeGreaterThan(1);
  });
});
