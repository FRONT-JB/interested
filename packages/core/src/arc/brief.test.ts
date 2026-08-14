import { describe, expect, it } from "vitest";

import { arcBrief, arcPrompt } from "./brief.ts";
import type { ArcEntryFacts } from "./entry.ts";

const firstTime: ArcEntryFacts = {
  path: "notes/2026-07-08-parameter-object.md",
  date: "2026-07-08",
  noteNumber: 1,
  concepts: [
    { concept: "parameter-object-pattern", appearance: 1, previousDate: null, weeksSince: null },
    { concept: "query-object", appearance: 1, previousDate: null, weeksSince: null },
  ],
};

const returning: ArcEntryFacts = {
  path: "notes/2026-08-15-deferred-processing.md",
  date: "2026-08-15",
  noteNumber: 4,
  concepts: [
    { concept: "deferred-processing", appearance: 1, previousDate: null, weeksSince: null },
    { concept: "query-object", appearance: 3, previousDate: "2026-07-08", weeksSince: 5 },
  ],
};

describe("arcBrief", () => {
  it("언제 들어온 몇 번째 Note인지를 첫 사실로 둔다", () => {
    expect(arcBrief(firstTime).facts[0]).toBe(
      "2026-07-08에 Note 한 편이 들어왔다. 저장소의 1번째 Note다.",
    );
  });

  it("처음 나온 이름을 한 줄로 모은다", () => {
    expect(arcBrief(firstTime).facts.join("\n")).toContain(
      "처음 나온 이름 — `parameter-object-pattern`, `query-object`",
    );
  });

  it("처음 나온 이름이 없으면 그 줄을 두지 않는다", () => {
    const brief = arcBrief({
      ...returning,
      concepts: [returning.concepts[1] as (typeof returning.concepts)[number]],
    });

    expect(brief.facts.join("\n")).not.toContain("처음 나온 이름");
  });

  it("다시 나온 이름은 몇 번째인지와 직전, 간격을 함께 적는다", () => {
    expect(arcBrief(returning).facts.join("\n")).toContain(
      "`query-object`는 3번째 등장이고 직전은 2026-07-08다 — 5주 만이다.",
    );
  });

  it("같은 주에 다시 나온 것은 주 수로 적지 않는다", () => {
    const brief = arcBrief({
      ...returning,
      concepts: [{ concept: "query-object", appearance: 2, previousDate: "2026-08-13", weeksSince: 0 }],
    });

    expect(brief.facts.join("\n")).toContain("같은 주에 다시 나왔다");
  });

  it("쓸 수 있는 이름은 그 Note가 참조한 Concept뿐이다", () => {
    expect(arcBrief(returning).names).toEqual(["deferred-processing", "query-object"]);
  });

  it("항목 앞에 붙을 날짜를 함께 들고 있다", () => {
    expect(arcBrief(returning).date).toBe("2026-08-15");
  });

  it("문장에 적어도 되는 날짜는 직전 등장 날짜들이다", () => {
    expect(arcBrief(returning).previousDates).toEqual(["2026-07-08"]);
    expect(arcBrief(firstTime).previousDates).toEqual([]);
  });

  it("Take와 제목은 재료에 넣지 않는다 — 사람이 쓴 문장이다", () => {
    const facts = arcBrief(returning).facts.join("\n");

    expect(facts).not.toContain(returning.path);
    expect(facts).not.toContain("건진");
  });
});

describe("arcPrompt", () => {
  it("사실과 이름을 프롬프트에 싣는다", () => {
    const brief = arcBrief(returning);
    const prompt = arcPrompt(brief);

    for (const fact of brief.facts) {
      expect(prompt).toContain(fact);
    }

    expect(prompt).toContain("`query-object`");
  });

  it("감사가 검사하는 것을 그대로 지시한다", () => {
    const prompt = arcPrompt(arcBrief(returning));

    expect(prompt).toContain("인용 블록");
    expect(prompt).toContain("금지 — 습득했다");
    expect(prompt).toContain("경어체를 쓰지 않는다");
  });

  it("항목 앞에 붙는 날짜를 밝혀 다시 적지 말라고 한다", () => {
    expect(arcPrompt(arcBrief(returning))).toContain("이 Note를 쓴 날(2026-08-15)");
  });
});
