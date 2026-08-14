import { describe, expect, it } from "vitest";

import { auditArcEntry } from "./audit.ts";
import { arcBrief } from "./brief.ts";
import type { ArcEntryFacts } from "./entry.ts";
import { renderArcEntry } from "./render.ts";

const facts: ArcEntryFacts = {
  path: "notes/2026-08-15-deferred-processing.md",
  date: "2026-08-15",
  noteNumber: 4,
  concepts: [
    { concept: "deferred-processing", appearance: 1, previousDate: null, weeksSince: null },
    { concept: "query-object", appearance: 3, previousDate: "2026-07-08", weeksSince: 5 },
  ],
};

const brief = arcBrief(facts);

function audit(entry: string): string[] {
  return auditArcEntry({ entry, brief });
}

describe("auditArcEntry", () => {
  it("재료대로 쓴 항목은 통과한다", () => {
    expect(
      audit("`deferred-processing`가 처음 나왔고 `query-object`는 3번째 등장이다."),
    ).toEqual([]);
  });

  it("관측되지 않는 동사가 걸린다", () => {
    expect(audit("`query-object`를 이제 익혔다.").join(" ")).toContain("익혔");
  });

  it("재료에 없는 숫자가 걸린다", () => {
    expect(audit("`query-object`는 9번째 등장이다.").join(" ")).toContain("9");
  });

  it("재료에 없는 이름이 걸린다", () => {
    expect(audit("`rsc`가 처음 나왔다.").join(" ")).toContain("rsc");
  });

  it("인용 블록이 걸린다 — 그 자리는 본인의 말이다", () => {
    expect(audit("> `deferred-processing`가 처음 나왔다.").join(" ")).toContain("인용 블록");
  });

  it("제목이 걸린다", () => {
    expect(audit("# Arc\n\n`deferred-processing`가 처음 나왔다.").join(" ")).toContain("제목");
  });

  it("목록이 걸린다 — 항목은 문단 하나다", () => {
    expect(audit("- `deferred-processing`가 처음 나왔다.").join(" ")).toContain("목록");
  });

  it("이 항목의 날짜를 문장에서 다시 적으면 걸린다", () => {
    // 날짜는 항목 앞에 코드가 붙인다. 문장이 다시 적으면 한 항목에 같은 날이
    // 두 번 놓인다.
    expect(audit("2026-08-15에 `deferred-processing`가 처음 나왔다.").join(" ")).toContain(
      "다시 적었다",
    );
  });

  it("직전 등장 날짜는 적을 수 있다", () => {
    expect(audit("`query-object`는 직전이 2026-07-08이었고 3번째 등장이다.")).toEqual([]);
  });

  it("같은 날에 Note를 두 편 썼으면 그 날짜를 적어도 걸리지 않는다", () => {
    // 직전 등장이 같은 날이면 적어야 할 글자가 항목 앞의 날짜와 같다. 여기서
    // 되돌리면 지시를 따른 문장이 매번 걸려 조립 항목만 남는다.
    const sameDay = arcBrief({
      ...facts,
      concepts: [
        { concept: "query-object", appearance: 2, previousDate: facts.date, weeksSince: 0 },
      ],
    });

    expect(
      auditArcEntry({
        entry: `\`query-object\`는 2번째 등장이고 직전은 ${facts.date}다 — 같은 주다.`,
        brief: sameDay,
      }),
    ).toEqual([]);
  });

  it("줄이 둘 이상이면 걸린다 — 둘째 줄은 날짜 없이 놓인다", () => {
    expect(audit("`deferred-processing`가 처음 나왔고\n`query-object`는 3번째다").join(" ")).toContain(
      "한 줄이다",
    );
  });

  it("날짜를 한글 표기로 적으면 걸린다", () => {
    expect(audit("2026년 7월 8일에 나온 `query-object`가 다시 나왔다.").join(" ")).toContain(
      "적힌 형태",
    );
  });

  it("경어체가 걸린다", () => {
    expect(audit("`deferred-processing`가 처음 나왔습니다.").join(" ")).toContain("경어체");
  });

  it("코드 블록이 걸린다", () => {
    expect(audit("```\n처음 나왔다.\n```").join(" ")).toContain("코드 블록");
  });

  it("빈 항목이 걸린다", () => {
    expect(audit("   ").join(" ")).toContain("비어 있다");
  });

  it("길어지면 걸린다 — 항목은 서사에 붙는 한 줄이다", () => {
    expect(audit("나왔다 ".repeat(150)).join(" ")).toContain("400자");
  });

  it("두 문장을 쓰면 걸린다 — 문장이 늘어나는 자리가 해석이 들어오는 자리다", () => {
    const two = "`deferred-processing`가 처음 나왔다. 무엇이 다시 돌아올지는 정해지지 않았다.";

    expect(audit(two).join(" ")).toContain("한 문장이다");
  });
});

describe("조립 항목", () => {
  it("모델이 되돌려져도 붙는 문장이므로 감사를 통과한다", () => {
    expect(auditArcEntry({ entry: renderArcEntry(facts), brief })).toEqual([]);
  });

  it("처음 나온 것만 있어도 통과한다", () => {
    const onlyFirst: ArcEntryFacts = {
      ...facts,
      noteNumber: 1,
      concepts: [facts.concepts[0] as (typeof facts.concepts)[number]],
    };

    expect(
      auditArcEntry({ entry: renderArcEntry(onlyFirst), brief: arcBrief(onlyFirst) }),
    ).toEqual([]);
  });

  it("같은 주에 돌아온 것만 있어도 통과한다", () => {
    const sameWeek: ArcEntryFacts = {
      ...facts,
      concepts: [
        { concept: "query-object", appearance: 2, previousDate: "2026-08-13", weeksSince: 0 },
      ],
    };

    expect(auditArcEntry({ entry: renderArcEntry(sameWeek), brief: arcBrief(sameWeek) })).toEqual([]);
  });
});
