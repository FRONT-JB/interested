import { describe, expect, it } from "vitest";

import type { GitHubActivity } from "./activity.ts";
import { contrastCandidates } from "./contrast.ts";
import type { PortraitStanding } from "./standing.ts";

function standing(dominant: PortraitStanding["dominant"]): PortraitStanding {
  return {
    noteCount: 3,
    weekCount: 2,
    latestWeek: "2026-W33",
    latestDate: "2026-08-14",
    dominant,
    concepts: dominant.map(({ concept }) => ({ concept, noteCount: 1 })),
  };
}

function activity(repositories: GitHubActivity["repositories"]): GitHubActivity {
  return {
    login: "octocat",
    since: "2026-08-08",
    until: "2026-08-14",
    pushes: repositories.reduce((total, { pushes }) => total + pushes, 0),
    repositories,
  };
}

describe("contrastCandidates", () => {
  it("지배 Concept과 푸시가 가장 몰린 저장소가 한 쌍이 된다", () => {
    const candidates = contrastCandidates({
      standing: standing([{ concept: "rsc", weeks: 3 }]),
      activity: activity([
        { repository: "octocat/interested", pushes: 9, language: "CSS" },
        { repository: "octocat/dev-pulse", pushes: 3, language: "TypeScript" },
      ]),
    });

    expect(candidates).toEqual([
      {
        concept: "rsc",
        repository: "octocat/interested",
        language: "CSS",
        pushes: 9,
        aligned: false,
      },
    ]);
  });

  it("푸시가 간 곳의 언어가 관심과 같으면 대비가 아니라 일치다", () => {
    const candidates = contrastCandidates({
      standing: standing([{ concept: "css", weeks: 1 }]),
      activity: activity([{ repository: "octocat/interested", pushes: 4, language: "CSS" }]),
    });

    expect(candidates[0]?.aligned).toBe(true);
  });

  it("지배 Concept이 여럿이면 후보도 그만큼 나온다", () => {
    const candidates = contrastCandidates({
      standing: standing([
        { concept: "css", weeks: 2 },
        { concept: "rsc", weeks: 1 },
      ]),
      activity: activity([{ repository: "octocat/interested", pushes: 4, language: "CSS" }]),
    });

    expect(candidates.map(({ concept, aligned }) => ({ concept, aligned }))).toEqual([
      { concept: "css", aligned: true },
      { concept: "rsc", aligned: false },
    ]);
  });

  it("언어를 모르면 일치라고 말하지 않는다", () => {
    const candidates = contrastCandidates({
      standing: standing([{ concept: "css", weeks: 1 }]),
      activity: activity([{ repository: "octocat/interested", pushes: 4, language: null }]),
    });

    expect(candidates).toEqual([
      {
        concept: "css",
        repository: "octocat/interested",
        language: null,
        pushes: 4,
        aligned: false,
      },
    ]);
  });

  it("푸시가 없으면 견줄 것이 없어 후보도 없다", () => {
    expect(
      contrastCandidates({ standing: standing([{ concept: "rsc", weeks: 1 }]), activity: activity([]) }),
    ).toEqual([]);
  });

  it("지배 Concept이 없으면 후보도 없다", () => {
    expect(
      contrastCandidates({
        standing: standing([]),
        activity: activity([{ repository: "octocat/interested", pushes: 4, language: "CSS" }]),
      }),
    ).toEqual([]);
  });
});
