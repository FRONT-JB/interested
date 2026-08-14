import { describe, expect, it } from "vitest";

import type { Note } from "../repository/read.ts";
import { selectArcEntries } from "./entry.ts";

function note({
  path,
  date,
  concepts,
}: {
  path: string;
  date: string;
  concepts: string[];
}): Note {
  return {
    path,
    date,
    concepts,
    source: `https://example.com/${path}`,
    title: path,
    take: "건진 것.",
  };
}

const first = note({
  path: "notes/2026-07-08-parameter-object.md",
  date: "2026-07-08",
  concepts: ["parameter-object-pattern", "query-object"],
});

const second = note({
  path: "notes/2026-07-10-query-object.md",
  date: "2026-07-10",
  concepts: ["query-object"],
});

const third = note({
  path: "notes/2026-08-15-deferred-processing.md",
  date: "2026-08-15",
  concepts: ["deferred-processing", "query-object"],
});

const empty = { covered: null, notes: null };

describe("selectArcEntries", () => {
  it("도장이 없으면 Note 전부가 항목이 된다", () => {
    const { entries } = selectArcEntries({ notes: [first, second], stamp: empty });

    expect(entries.map(({ path }) => path)).toEqual([first.path, second.path]);
  });

  it("워터마크 뒤의 Note만 항목이 된다", () => {
    const { entries } = selectArcEntries({
      notes: [first, second, third],
      stamp: { covered: second.path, notes: 2 },
    });

    expect(entries.map(({ path }) => path)).toEqual([third.path]);
  });

  it("Note가 한 편도 없으면 항목도 없다", () => {
    expect(selectArcEntries({ notes: [], stamp: empty })).toEqual({ entries: [], behind: 0 });
  });

  it("들어온 순서가 뒤섞여도 이름 순으로 담는다", () => {
    const { entries } = selectArcEntries({ notes: [third, first, second], stamp: empty });

    expect(entries.map(({ path }) => path)).toEqual([first.path, second.path, third.path]);
  });

  it("대문자가 섞인 이름도 담은 것을 다시 담지 않는다", () => {
    // 줄을 세우는 방법과 담을 것을 고르는 방법이 갈리면 이미 담은 Note가 다시
    // 붙는다. Arc는 지워지지 않으므로 그 항목은 손으로 지워야 한다.
    const upper = note({ path: "notes/2026-08-16-Beta.md", date: "2026-08-16", concepts: ["beta"] });
    const lower = note({ path: "notes/2026-08-16-alpha.md", date: "2026-08-16", concepts: ["alpha"] });
    const notes = [upper, lower];

    const { entries } = selectArcEntries({ notes, stamp: empty });
    const last = entries.at(-1) as (typeof entries)[number];

    expect(
      selectArcEntries({ notes, stamp: { covered: last.path, notes: last.noteNumber } }),
    ).toEqual({ entries: [], behind: 0 });
  });

  it("저장소의 몇 번째 Note인지를 함께 센다", () => {
    const { entries } = selectArcEntries({ notes: [first, second, third], stamp: empty });

    expect(entries.map(({ noteNumber }) => noteNumber)).toEqual([1, 2, 3]);
  });

  it("처음 나온 Concept은 첫 등장이고 직전이 없다", () => {
    const { entries } = selectArcEntries({ notes: [first], stamp: empty });

    expect(entries[0]?.concepts).toEqual([
      { concept: "parameter-object-pattern", appearance: 1, previousDate: null, weeksSince: null },
      { concept: "query-object", appearance: 1, previousDate: null, weeksSince: null },
    ]);
  });

  it("다시 나온 Concept은 몇 번째인지와 직전 날짜를 함께 센다", () => {
    const { entries } = selectArcEntries({
      notes: [first, second, third],
      stamp: { covered: second.path, notes: 2 },
    });

    expect(entries[0]?.concepts).toEqual([
      { concept: "deferred-processing", appearance: 1, previousDate: null, weeksSince: null },
      // 2026-07-10은 2026-W28, 2026-08-15는 2026-W33이다.
      { concept: "query-object", appearance: 3, previousDate: "2026-07-10", weeksSince: 5 },
    ]);
  });

  it("같은 주에 다시 나오면 간격이 0주다", () => {
    const { entries } = selectArcEntries({
      notes: [first, second],
      stamp: { covered: first.path, notes: 1 },
    });

    expect(entries[0]?.concepts).toEqual([
      { concept: "query-object", appearance: 2, previousDate: "2026-07-08", weeksSince: 0 },
    ]);
  });

  it("재료는 그 Note까지의 기록만 센다 — 뒤에 온 Note는 셈에 없다", () => {
    const { entries } = selectArcEntries({ notes: [first, second, third], stamp: empty });

    // 첫 항목을 쓸 때 `query-object`는 아직 한 번밖에 나오지 않았다.
    expect(entries[0]?.concepts.at(-1)?.appearance).toBe(1);
    expect(entries[1]?.concepts.at(-1)?.appearance).toBe(2);
    expect(entries[2]?.concepts.at(-1)?.appearance).toBe(3);
  });
});

describe("워터마크 앞에 뒤늦게 들어온 Note", () => {
  it("담기지 않은 편 수를 센다", () => {
    // 앞선 실행은 1편을 담았는데 워터마크 뒤에 2편이 있다 — 이름이 앞서는 Note가
    // 뒤늦게 들어왔다는 뜻이다.
    const { entries, behind } = selectArcEntries({
      notes: [first, second],
      stamp: { covered: second.path, notes: 1 },
    });

    expect(entries).toEqual([]);
    expect(behind).toBe(1);
  });

  it("앞선 실행이 센 편 수와 맞으면 0이다", () => {
    const { behind } = selectArcEntries({
      notes: [first, second],
      stamp: { covered: second.path, notes: 2 },
    });

    expect(behind).toBe(0);
  });

  it("도장에 편 수가 적혀 있지 않으면 세지 않는다", () => {
    const { behind } = selectArcEntries({
      notes: [first, second],
      stamp: { covered: second.path, notes: null },
    });

    expect(behind).toBe(0);
  });
});
