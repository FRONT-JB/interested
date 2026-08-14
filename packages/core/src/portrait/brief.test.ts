import { describe, expect, it } from "vitest";

import type { ActivityOutcome } from "./activity.ts";
import { factsFingerprint, portraitBrief, portraitPrompt } from "./brief.ts";
import { contrastCandidates } from "./contrast.ts";
import type { PortraitStanding } from "./standing.ts";

const standing: PortraitStanding = {
  noteCount: 5,
  weekCount: 2,
  latestWeek: "2026-W33",
  latestDate: "2026-08-14",
  dominant: [{ concept: "rsc", weeks: 3 }],
  concepts: [
    { concept: "rsc", noteCount: 3 },
    { concept: "css", noteCount: 2 },
  ],
};

const activity: ActivityOutcome = {
  activity: {
    login: "octocat",
    since: "2026-08-08",
    until: "2026-08-14",
    pushes: 9,
    repositories: [{ repository: "octocat/interested", pushes: 9, language: "CSS" }],
  },
};

function brief(outcome: ActivityOutcome = activity, model: PortraitStanding = standing) {
  return portraitBrief({
    standing: model,
    activity: outcome,
    contrasts:
      "activity" in outcome ? contrastCandidates({ standing: model, activity: outcome.activity }) : [],
  });
}

const empty: PortraitStanding = {
  noteCount: 0,
  weekCount: 0,
  latestWeek: null,
  latestDate: null,
  dominant: [],
  concepts: [],
};

describe("portraitBrief", () => {
  it("집계된 사실이 한 줄씩 들어간다", () => {
    const facts = brief().facts.join("\n");

    expect(facts).toContain("5편");
    expect(facts).toContain("2026-W33");
    expect(facts).toContain("`rsc` 3주");
    expect(facts).toContain("9회");
  });

  it("활동 기간이 Note를 잰 주와 다르다는 것을 재료에 밝힌다", () => {
    expect(brief().facts.join("\n")).toContain("Note를 잰 주와 다르다");
  });

  it("Note가 없으면 그 사실만 들어가고 관심을 지어내지 않는다", () => {
    const facts = brief(activity, empty).facts.join("\n");

    expect(facts).toContain("아직 Note가 한 편도 없다");
    expect(facts).not.toContain("가장 몰린");
  });

  it("조회에 실패하면 그 사실이 재료가 된다", () => {
    const facts = brief({ unavailable: "`https://api.github.com` 가 403으로 답했다" }).facts.join("\n");

    expect(facts).toContain("조회하지 못했다");
    expect(facts).toContain("403");
  });

  it("쓸 수 있는 이름에 Concept·저장소·언어가 모이고 중복이 없다", () => {
    expect(brief().names).toEqual(["rsc", "css", "octocat/interested", "CSS"]);
  });

  it("대비 후보가 재료에 들어간다", () => {
    expect(brief().facts.join("\n")).toContain("대비 후보");
  });
});

describe("portraitPrompt", () => {
  it("재료와 금지 동사와 이름 목록을 한 자리에 담는다", () => {
    const prompt = portraitPrompt(brief());

    expect(prompt).toContain("# Portrait");
    expect(prompt).toContain("습득했다");
    expect(prompt).toContain("`octocat/interested`");
    expect(prompt).toContain("새 숫자를 만들지 않는다");
  });
});

describe("factsFingerprint", () => {
  it("같은 재료면 같은 지문이다", () => {
    expect(factsFingerprint(brief())).toBe(factsFingerprint(brief()));
  });

  it("사실이 달라지면 지문도 달라진다", () => {
    expect(factsFingerprint(brief())).not.toBe(factsFingerprint(brief(activity, empty)));
  });
});
