import { describe, expect, it } from "vitest";

import type { Note } from "../repository/read.ts";
import { tallyWeek, tallyWeeks } from "./tally.ts";

let sourceCount = 0;

/** 이미 읽힌 Note 한 편. 집계는 파일을 읽지 않으므로 값만 있으면 된다. */
function note(date: string, concepts: string[]): Note {
  sourceCount += 1;

  return {
    path: `notes/${date}-${sourceCount}.md`,
    source: `https://example.com/${sourceCount}`,
    title: `제목 ${sourceCount}`,
    date,
    take: "내가 거기서 건진 것.",
    concepts,
  };
}

describe("tallyWeeks", () => {
  it("주 경계를 넘는 Note가 각각 맞는 주에 묶인다", () => {
    const weeks = tallyWeeks([note("2026-08-16", ["rsc"]), note("2026-08-17", ["css"])]);

    expect(weeks.map(({ week }) => week)).toEqual(["2026-W33", "2026-W34"]);
    expect(weeks.map(({ notes }) => notes.length)).toEqual([1, 1]);
  });

  it("해를 넘는 Note도 각각 맞는 주에 묶인다", () => {
    const weeks = tallyWeeks([note("2025-12-28", ["rsc"]), note("2025-12-29", ["css"])]);

    expect(weeks.map(({ week }) => week)).toEqual(["2025-W52", "2026-W01"]);
  });

  it("Note가 있는 주만 오래된 순으로 나온다", () => {
    const weeks = tallyWeeks([note("2026-08-17", ["css"]), note("2026-08-03", ["rsc"])]);

    expect(weeks.map(({ week }) => week)).toEqual(["2026-W32", "2026-W34"]);
  });

  it("Note가 한 편도 없으면 빈 목록이 나오고 예외가 나지 않는다", () => {
    expect(tallyWeeks([])).toEqual([]);
  });
});

describe("tallyWeek", () => {
  it("주 식별자와 그 주의 첫날 마지막날을 함께 돌려준다", () => {
    const tally = tallyWeek({ notes: [note("2026-08-14", ["rsc"])], week: "2026-W33" });

    expect(tally.week).toBe("2026-W33");
    expect(tally.start).toBe("2026-08-10");
    expect(tally.end).toBe("2026-08-16");
  });

  it("그 주 밖의 Note는 세지 않는다", () => {
    const tally = tallyWeek({
      notes: [note("2026-08-09", ["css"]), note("2026-08-14", ["rsc"]), note("2026-08-17", ["css"])],
      week: "2026-W33",
    });

    expect(tally.notes.map(({ date }) => date)).toEqual(["2026-08-14"]);
  });

  it("편중 — 누적 빈도 순위가 계산된다", () => {
    const tally = tallyWeek({
      notes: [
        note("2026-08-10", ["rsc", "data-fetching"]),
        note("2026-08-12", ["rsc"]),
        note("2026-08-14", ["css"]),
      ],
      week: "2026-W33",
    });

    expect(tally.concepts).toEqual([
      { concept: "rsc", noteCount: 2, rank: 1 },
      { concept: "css", noteCount: 1, rank: 2 },
      { concept: "data-fetching", noteCount: 1, rank: 2 },
    ]);
  });

  it("등장 횟수가 같은 Concept은 같은 순위를 나눠 갖는다", () => {
    const tally = tallyWeek({
      notes: [
        note("2026-08-10", ["rsc", "css"]),
        note("2026-08-12", ["rsc", "css"]),
        note("2026-08-14", ["data-fetching"]),
      ],
      week: "2026-W33",
    });

    expect(tally.concepts).toEqual([
      { concept: "css", noteCount: 2, rank: 1 },
      { concept: "rsc", noteCount: 2, rank: 1 },
      { concept: "data-fetching", noteCount: 1, rank: 3 },
    ]);
  });

  it("그 주의 지배 Concept이 산출된다", () => {
    const tally = tallyWeek({
      notes: [note("2026-08-10", ["rsc", "css"]), note("2026-08-12", ["rsc"])],
      week: "2026-W33",
    });

    expect(tally.dominant).toEqual(["rsc"]);
  });

  it("지배 Concept이 동률이면 여럿을 그대로 내놓는다", () => {
    const tally = tallyWeek({
      notes: [note("2026-08-10", ["rsc", "css"]), note("2026-08-12", ["rsc", "css"])],
      week: "2026-W33",
    });

    expect(tally.dominant).toEqual(["css", "rsc"]);
  });

  describe("이동", () => {
    const notes = [
      note("2026-08-03", ["rsc"]),
      note("2026-08-05", ["rsc"]),
      note("2026-08-07", ["css"]),
      note("2026-08-10", ["css"]),
      note("2026-08-12", ["css"]),
      note("2026-08-14", ["data-fetching"]),
    ];

    it("이번 주에 새로 등장한 Concept이 식별된다", () => {
      const tally = tallyWeek({ notes, week: "2026-W33" });

      expect(tally.movement.entered).toEqual(["data-fetching"]);
    });

    it("지난 주에 있다가 사라진 Concept이 식별된다", () => {
      const tally = tallyWeek({ notes, week: "2026-W33" });

      expect(tally.movement.left).toEqual(["rsc"]);
    });

    it("순위가 바뀐 Concept은 지난 주 순위와 함께 식별된다", () => {
      const tally = tallyWeek({ notes, week: "2026-W33" });

      expect(tally.movement.moved).toEqual([{ concept: "css", from: 2, to: 1 }]);
    });

    it("순위가 그대로인 Concept은 변동에 오르지 않는다", () => {
      const tally = tallyWeek({
        notes: [
          note("2026-08-03", ["rsc", "css"]),
          note("2026-08-05", ["rsc"]),
          note("2026-08-10", ["rsc", "css"]),
          note("2026-08-12", ["rsc"]),
        ],
        week: "2026-W33",
      });

      expect(tally.movement.moved).toEqual([]);
    });
  });

  it("Note가 한 편도 없는 저장소에서도 예외가 나지 않는다", () => {
    const tally = tallyWeek({ notes: [], week: "2026-W33" });

    expect(tally).toEqual({
      week: "2026-W33",
      start: "2026-08-10",
      end: "2026-08-16",
      notes: [],
      concepts: [],
      dominant: [],
      movement: { entered: [], left: [], moved: [] },
    });
  });

  it("직전 주가 통째로 비어 있으면 이번 주 Concept이 모두 새로 등장이다", () => {
    const tally = tallyWeek({
      notes: [note("2026-08-10", ["rsc"]), note("2026-08-12", ["css"])],
      week: "2026-W33",
    });

    expect(tally.movement).toEqual({ entered: ["css", "rsc"], left: [], moved: [] });
  });

  it("요청한 주에만 Note가 없으면 지난 주 Concept이 모두 사라짐으로 남는다", () => {
    const tally = tallyWeek({
      notes: [note("2026-08-03", ["rsc"]), note("2026-08-05", ["css"])],
      week: "2026-W33",
    });

    expect(tally.notes).toEqual([]);
    expect(tally.concepts).toEqual([]);
    expect(tally.dominant).toEqual([]);
    expect(tally.movement).toEqual({ entered: [], left: ["css", "rsc"], moved: [] });
  });
});
