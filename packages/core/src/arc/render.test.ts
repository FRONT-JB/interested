import { describe, expect, it } from "vitest";

import { judgeObserverVerbs } from "../observer/verbs.ts";
import type { ArcEntryFacts } from "./entry.ts";
import { arcEntryLine, renderArcEntry } from "./render.ts";

const facts: ArcEntryFacts = {
  path: "notes/2026-08-15-deferred-processing.md",
  date: "2026-08-15",
  noteNumber: 4,
  concepts: [
    { concept: "deferred-processing", appearance: 1, previousDate: null, weeksSince: null },
    { concept: "query-object", appearance: 3, previousDate: "2026-07-08", weeksSince: 5 },
  ],
};

describe("arcEntryLine", () => {
  it("날짜를 항목 앞에 붙인다", () => {
    expect(arcEntryLine({ date: "2026-08-15", prose: "처음 나왔다." })).toBe(
      "2026-08-15 · 처음 나왔다.",
    );
  });

  it("문장의 앞뒤 빈 줄은 정리한다", () => {
    expect(arcEntryLine({ date: "2026-08-15", prose: "\n처음 나왔다.\n" })).toBe(
      "2026-08-15 · 처음 나왔다.",
    );
  });
});

describe("renderArcEntry", () => {
  it("처음 나온 것과 다시 나온 것을 한 문장에 담는다", () => {
    expect(renderArcEntry(facts)).toBe(
      "저장소의 4번째 Note에서 처음 나온 이름은 `deferred-processing`이고, " +
        "다시 나온 이름은 `query-object`(3번째, 직전 2026-07-08, 5주 만)이다.",
    );
  });

  it("처음 나온 것만 있으면 그 절만 둔다", () => {
    const onlyFirst: ArcEntryFacts = {
      ...facts,
      noteNumber: 1,
      concepts: [facts.concepts[0] as (typeof facts.concepts)[number]],
    };

    expect(renderArcEntry(onlyFirst)).toBe(
      "저장소의 1번째 Note에서 처음 나온 이름은 `deferred-processing`이다.",
    );
  });

  it("같은 주에 돌아온 것은 주 수로 적지 않는다", () => {
    const sameWeek: ArcEntryFacts = {
      ...facts,
      concepts: [
        { concept: "query-object", appearance: 2, previousDate: "2026-08-13", weeksSince: 0 },
      ],
    };

    expect(renderArcEntry(sameWeek)).toContain("같은 주");
  });

  it("어느 재료로 조립해도 한 문장이다", () => {
    const many: ArcEntryFacts = {
      ...facts,
      concepts: [
        { concept: "a", appearance: 1, previousDate: null, weeksSince: null },
        { concept: "b", appearance: 2, previousDate: "2026-07-08", weeksSince: 5 },
        { concept: "c", appearance: 3, previousDate: "2026-08-01", weeksSince: 2 },
      ],
    };

    expect([...renderArcEntry(many).matchAll(/\.(?:\s|$)/gu)]).toHaveLength(1);
  });

  it("어느 재료로 조립해도 금지 동사가 나오지 않는다", () => {
    // 이름이 금지 동사를 품고 있어도 조립은 통과해야 한다. 이름은 코드 표기 안에
    // 있고 게이트는 그 안을 보지 않는다 (`observer/verbs.ts`).
    const risky: ArcEntryFacts = {
      ...facts,
      concepts: [
        { concept: "익힌-것", appearance: 1, previousDate: null, weeksSince: null },
        { concept: "습득", appearance: 2, previousDate: "2026-07-08", weeksSince: 5 },
      ],
    };

    expect(judgeObserverVerbs(renderArcEntry(risky))).toEqual({ outcome: "pass" });
  });
});
