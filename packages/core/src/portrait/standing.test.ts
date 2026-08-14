import { describe, expect, it } from "vitest";

import type { Note } from "../repository/read.ts";
import { standingOf } from "./standing.ts";

let sourceCount = 0;

/** 이미 읽힌 Note 한 편. 판정은 파일을 읽지 않으므로 값만 있으면 된다. */
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

describe("standingOf", () => {
  it("가장 최근에 Note를 쓴 주와 그 날짜가 나온다", () => {
    const standing = standingOf([note("2026-08-12", ["rsc"]), note("2026-08-03", ["css"])]);

    expect(standing.latestWeek).toBe("2026-W33");
    expect(standing.latestDate).toBe("2026-08-12");
    expect(standing.noteCount).toBe(2);
    expect(standing.weekCount).toBe(2);
  });

  it("가장 최근 주에 가장 몰린 Concept이 지배 Concept이다", () => {
    const standing = standingOf([
      note("2026-08-10", ["rsc"]),
      note("2026-08-12", ["rsc", "css"]),
      note("2026-08-03", ["css"]),
    ]);

    expect(standing.dominant).toEqual([{ concept: "rsc", weeks: 1 }]);
  });

  it("연속으로 나타난 주 수를 함께 센다", () => {
    const standing = standingOf([
      note("2026-07-28", ["rsc"]),
      note("2026-08-05", ["rsc"]),
      note("2026-08-12", ["rsc"]),
    ]);

    expect(standing.dominant).toEqual([{ concept: "rsc", weeks: 3 }]);
  });

  it("Note가 없는 주를 만나면 연속이 거기서 끊긴다", () => {
    const standing = standingOf([note("2026-07-28", ["rsc"]), note("2026-08-12", ["rsc"])]);

    expect(standing.dominant).toEqual([{ concept: "rsc", weeks: 1 }]);
  });

  it("그 주에 나오지 않은 Concept은 연속을 잇지 못한다", () => {
    const standing = standingOf([
      note("2026-07-28", ["rsc"]),
      note("2026-08-05", ["css"]),
      note("2026-08-12", ["rsc"]),
    ]);

    expect(standing.dominant).toEqual([{ concept: "rsc", weeks: 1 }]);
  });

  it("동률이면 지배 Concept이 여럿 나온다", () => {
    const standing = standingOf([
      note("2026-08-05", ["css"]),
      note("2026-08-10", ["rsc"]),
      note("2026-08-12", ["css"]),
    ]);

    expect(standing.dominant).toEqual([
      { concept: "css", weeks: 2 },
      { concept: "rsc", weeks: 1 },
    ]);
  });

  it("저장소 전체 누적 빈도가 함께 나온다", () => {
    const standing = standingOf([
      note("2026-08-05", ["rsc"]),
      note("2026-08-12", ["rsc", "css"]),
    ]);

    expect(standing.concepts).toEqual([
      { concept: "rsc", noteCount: 2 },
      { concept: "css", noteCount: 1 },
    ]);
  });

  it("Note가 한 편도 없으면 빈 판정이 나오고 예외가 나지 않는다", () => {
    expect(standingOf([])).toEqual({
      noteCount: 0,
      weekCount: 0,
      latestWeek: null,
      latestDate: null,
      dominant: [],
      concepts: [],
    });
  });
});
