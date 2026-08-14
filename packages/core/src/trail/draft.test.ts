import { describe, expect, it } from "vitest";

import type { Note } from "../repository/read.ts";
import { renderTrailDraft } from "./draft.ts";
import type { WeekTally } from "./tally.ts";

const rscNote: Note = {
  path: "notes/2026-08-10-서버-컴포넌트.md",
  source: "https://example.com/1",
  title: "서버 컴포넌트",
  date: "2026-08-10",
  take: "내가 거기서 건진 것.",
  concepts: ["rsc", "data-fetching"],
};

const secondNote: Note = {
  path: "notes/2026-08-14-데이터-가져오기.md",
  source: "https://example.com/2",
  title: "데이터 가져오기",
  date: "2026-08-14",
  take: "내가 거기서 건진 것 둘.",
  concepts: ["rsc"],
};

/** 집계 결과 하나. 표현은 이 값만 보고 만들어지므로 여기서 손으로 짓는다. */
function tally(overrides: Partial<WeekTally> = {}): WeekTally {
  return {
    week: "2026-W33",
    start: "2026-08-10",
    end: "2026-08-16",
    notes: [rscNote, secondNote],
    concepts: [
      { concept: "rsc", noteCount: 2, rank: 1 },
      { concept: "data-fetching", noteCount: 1, rank: 2 },
    ],
    dominant: ["rsc"],
    movement: {
      entered: ["data-fetching"],
      left: ["css"],
      moved: [{ concept: "rsc", from: 2, to: 1 }],
    },
    ...overrides,
  };
}

describe("renderTrailDraft", () => {
  it("집계 결과 하나를 Trail 초안 한 편으로 조립한다", () => {
    expect(renderTrailDraft(tally())).toBe(
      [
        "---",
        "week: 2026-W33",
        "start: 2026-08-10",
        "end: 2026-08-16",
        "---",
        "",
        "# 2026-W33",
        "",
        "2026-08-10부터 2026-08-16까지 Note 2편을 썼다.",
        "",
        "> 하이라이트 한 줄 — 여기는 사람이 쓴다.",
        "",
        "## 몰린 곳",
        "",
        "- `rsc` 2편",
        "- `data-fetching` 1편",
        "",
        "이번 주는 `rsc`에 가장 몰렸다.",
        "",
        "## 옮겨간 곳",
        "",
        "- 새로 등장 — `data-fetching`",
        "- 사라짐 — `css`",
        "- 순위 변동 — `rsc` 2위에서 1위로",
        "",
        "## 읽은 것",
        "",
        "- [서버 컴포넌트](https://example.com/1) — 내가 거기서 건진 것.",
        "- [데이터 가져오기](https://example.com/2) — 내가 거기서 건진 것 둘.",
        "",
      ].join("\n"),
    );
  });

  it("하이라이트 한 줄은 사람이 채우도록 자리만 표시해 둔다", () => {
    const draft = renderTrailDraft(tally());

    expect(draft).toContain("> 하이라이트 한 줄 — 여기는 사람이 쓴다.");
  });

  it("지배 Concept이 동률이면 여럿을 그대로 적는다", () => {
    const draft = renderTrailDraft(
      tally({
        dominant: ["css", "rsc"],
        concepts: [
          { concept: "css", noteCount: 2, rank: 1 },
          { concept: "rsc", noteCount: 2, rank: 1 },
        ],
      }),
    );

    expect(draft).toContain("이번 주는 `css`, `rsc`에 똑같이 몰렸다.");
  });

  it("여러 Concept을 나열할 때는 쉼표로 잇는다 — 조사를 붙이지 않는다", () => {
    const draft = renderTrailDraft(
      tally({
        dominant: ["parameter-object-pattern", "query-object", "stamp-coupling"],
        movement: {
          entered: ["parameter-object-pattern", "query-object", "stamp-coupling"],
          left: [],
          moved: [],
        },
      }),
    );

    expect(draft).toContain(
      "이번 주는 `parameter-object-pattern`, `query-object`, `stamp-coupling`에 똑같이 몰렸다.",
    );
    expect(draft).toContain(
      "- 새로 등장 — `parameter-object-pattern`, `query-object`, `stamp-coupling`",
    );
    expect(draft).not.toContain("`와 ");
    expect(draft).not.toContain("`과 ");
  });

  it("이동이 없으면 옮겨간 곳을 적지 않는다", () => {
    const draft = renderTrailDraft(
      tally({ movement: { entered: [], left: [], moved: [] } }),
    );

    expect(draft).not.toContain("## 옮겨간 곳");
    expect(draft).toContain("## 몰린 곳");
  });

  it("Note가 없는 주에도 초안이 나오고 예외가 나지 않는다", () => {
    const empty = renderTrailDraft({
      week: "2026-W34",
      start: "2026-08-17",
      end: "2026-08-23",
      notes: [],
      concepts: [],
      dominant: [],
      movement: { entered: [], left: [], moved: [] },
    });

    expect(empty).toBe(
      [
        "---",
        "week: 2026-W34",
        "start: 2026-08-17",
        "end: 2026-08-23",
        "---",
        "",
        "# 2026-W34",
        "",
        "2026-08-17부터 2026-08-23까지 쓴 Note가 없다.",
        "",
      ].join("\n"),
    );
  });

  it("관측 가능한 동사만 쓴다 — 익혔다 이해했다 같은 말이 초안에 없다", () => {
    const drafts = [
      renderTrailDraft(tally()),
      renderTrailDraft(tally({ dominant: ["css", "rsc"] })),
      renderTrailDraft(tally({ notes: [], concepts: [], dominant: [] })),
    ];

    for (const draft of drafts) {
      for (const forbidden of ["익혔", "익숙", "이해했", "습득", "능숙", "배웠", "정복"]) {
        expect(draft).not.toContain(forbidden);
      }
    }
  });
});
