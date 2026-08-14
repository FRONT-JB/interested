import { describe, expect, it } from "vitest";

import { fetchGitHubActivity, type ActivityOutcome, type GitHubActivity } from "./activity.ts";
import { contrastCandidates } from "./contrast.ts";
import { renderPortrait } from "./render.ts";
import type { PortraitStanding } from "./standing.ts";
import { judgeObserverVerbs } from "./verbs.ts";

const empty: PortraitStanding = {
  noteCount: 0,
  weekCount: 0,
  latestWeek: null,
  latestDate: null,
  dominant: [],
  concepts: [],
};

function standing(overrides: Partial<PortraitStanding> = {}): PortraitStanding {
  return {
    noteCount: 5,
    weekCount: 2,
    latestWeek: "2026-W33",
    latestDate: "2026-08-14",
    dominant: [{ concept: "rsc", weeks: 3 }],
    concepts: [
      { concept: "rsc", noteCount: 3 },
      { concept: "css", noteCount: 2 },
    ],
    ...overrides,
  };
}

function activity(repositories: GitHubActivity["repositories"]): ActivityOutcome {
  return {
    activity: {
      login: "octocat",
      since: "2026-08-08",
      until: "2026-08-14",
      pushes: repositories.reduce((total, { pushes }) => total + pushes, 0),
      repositories,
    },
  };
}

const unavailable: ActivityOutcome = { unavailable: "403으로 답했다" };

/** 재료를 넣으면 나오는 판정 하나. 대비 후보 조립까지가 호출자의 몫이다. */
function render({
  model = standing(),
  outcome = unavailable,
}: { model?: PortraitStanding; outcome?: ActivityOutcome } = {}): string {
  return renderPortrait({
    standing: model,
    activity: outcome,
    contrasts: "activity" in outcome ? contrastCandidates({ standing: model, activity: outcome.activity }) : [],
  });
}

describe("renderPortrait", () => {
  it("지배 Concept과 연속 등장 주 수를 말한다", () => {
    const portrait = render();

    expect(portrait).toContain("`rsc`에 관심이 있다");
    expect(portrait).toContain("3주 연속");
  });

  it("Note를 쓴 주와 편 수를 말한다", () => {
    const portrait = render();

    expect(portrait).toContain("2026-W33");
    expect(portrait).toContain("5편");
    expect(portrait).toContain("2026-08-14");
  });

  it("누적 빈도를 편 수와 함께 늘어놓는다", () => {
    const portrait = render();

    expect(portrait).toContain("- `rsc` 3편");
    expect(portrait).toContain("- `css` 2편");
  });

  it("지배 Concept이 여럿이면 각각의 연속 주 수를 함께 적는다", () => {
    const portrait = render({
      model: standing({
        dominant: [
          { concept: "css", weeks: 2 },
          { concept: "rsc", weeks: 1 },
        ],
      }),
    });

    expect(portrait).toContain("`css`, `rsc`에 관심이 있다");
    expect(portrait).toContain("`css` 2주, `rsc` 1주");
  });

  it("누적 목록이 길면 앞의 여덟 개만 두고 남은 수를 밝힌다", () => {
    const portrait = render({
      model: standing({
        concepts: Array.from({ length: 11 }, (_unused, index) => ({
          concept: `concept-${index}`,
          noteCount: 11 - index,
        })),
      }),
    });

    expect(portrait).toContain("- `concept-7` 4편");
    expect(portrait).not.toContain("- `concept-8`");
    expect(portrait).toContain("- 그 밖에 3개");
  });

  it("Note가 없으면 그 사실을 말하고 관심을 지어내지 않는다", () => {
    const portrait = render({ model: empty });

    expect(portrait).toContain("아직 Note가 없다");
    expect(portrait).not.toContain("관심이 있다");
  });

  it("활동을 조회했으면 기간과 저장소를 밝혀 적는다", () => {
    const portrait = render({
      outcome: activity([
        { repository: "octocat/interested", pushes: 9, language: "TypeScript" },
        { repository: "octocat/dev-pulse", pushes: 3, language: null },
      ]),
    });

    expect(portrait).toContain("2026-08-08부터 2026-08-14까지");
    expect(portrait).toContain("푸시 12회");
    expect(portrait).toContain("- `octocat/interested` 9회 — 주 언어 `TypeScript`");
    expect(portrait).toContain("- `octocat/dev-pulse` 3회");
  });

  it("관심과 활동이 다른 곳을 가리키면 대비로 적는다", () => {
    const portrait = render({
      outcome: activity([{ repository: "octocat/interested", pushes: 9, language: "CSS" }]),
    });

    expect(portrait).toContain("## 대비");
    expect(portrait).toContain("관심이 몰린 곳은 `rsc`");
    expect(portrait).toContain("푸시가 몰린 곳은 `octocat/interested` 9회");
  });

  it("언어는 저장소의 것으로 밝혀 적는다 — 그 창의 푸시가 무슨 언어였는지가 아니다", () => {
    const portrait = render({
      outcome: activity([{ repository: "octocat/interested", pushes: 9, language: "CSS" }]),
    });

    expect(portrait).toContain("그 저장소의 주 언어는 `CSS`");
  });

  it("관심과 활동이 같은 곳을 가리키면 대비가 아니라 일치로 적는다", () => {
    const portrait = render({
      model: standing({ dominant: [{ concept: "css", weeks: 1 }] }),
      outcome: activity([{ repository: "octocat/interested", pushes: 9, language: "CSS" }]),
    });

    expect(portrait).toContain("같은 이름을 가리킨다");
  });

  it("같은 저장소를 가리키는 후보는 한 줄로 모은다", () => {
    const portrait = render({
      model: standing({
        dominant: [
          { concept: "query-object", weeks: 1 },
          { concept: "rsc", weeks: 1 },
        ],
      }),
      outcome: activity([{ repository: "octocat/interested", pushes: 9, language: "TypeScript" }]),
    });

    expect(portrait).toContain("관심이 몰린 곳은 `query-object`, `rsc`, 푸시가 몰린 곳은");
    expect(portrait.match(/푸시가 몰린 곳은/gu)).toHaveLength(1);
  });

  it("일치와 대비가 함께 있으면 대비를 먼저 적는다", () => {
    const portrait = render({
      model: standing({
        dominant: [
          { concept: "css", weeks: 2 },
          { concept: "rsc", weeks: 1 },
        ],
      }),
      outcome: activity([{ repository: "octocat/interested", pushes: 9, language: "CSS" }]),
    });

    expect(portrait.indexOf("관심이 몰린 곳은")).toBeLessThan(portrait.indexOf("같은 이름을 가리킨다"));
  });

  it("GitHub 조회가 실패하면 그 사실을 적고 Note만으로 판정을 쓴다", async () => {
    // 실패 이유를 만드는 쪽과 문장을 쓰는 쪽이 갈려 있으니, 이유를 손으로
    // 지어내지 말고 조회가 실제로 내놓는 값을 그대로 넣는다.
    const outcome = await fetchGitHubActivity({
      login: "octocat",
      since: "2026-08-08",
      until: "2026-08-14",
      fetch: async () => ({ ok: false, status: 403, json: async () => ({}) }),
    });

    const portrait = render({ outcome });

    expect(portrait).toContain("`rsc`에 관심이 있다");
    expect(portrait).toContain("403으로 답했다");
    expect(portrait.match(/조회하지 못했다/gu)).toHaveLength(1);
    expect(portrait).not.toContain("## 대비");
  });

  it("활동이 하나도 없으면 대비 절을 두지 않는다", () => {
    const portrait = render({ outcome: activity([]) });

    expect(portrait).toContain("푸시 0회");
    expect(portrait).not.toContain("## 대비");
  });

  it("어느 재료로 써도 금지 동사가 나오지 않는다", () => {
    const portraits = [
      render(),
      render({ model: empty }),
      render({ model: empty, outcome: activity([]) }),
      render({ outcome: activity([{ repository: "octocat/interested", pushes: 9, language: "CSS" }]) }),
      render({
        model: standing({
          dominant: [
            { concept: "css", weeks: 2 },
            { concept: "rsc", weeks: 1 },
          ],
        }),
        outcome: activity([{ repository: "octocat/interested", pushes: 9, language: null }]),
      }),
    ];

    for (const portrait of portraits) {
      expect(judgeObserverVerbs(portrait)).toEqual({ outcome: "pass" });
    }
  });
});
