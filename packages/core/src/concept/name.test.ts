import { describe, expect, it } from "vitest";

import { conceptCountLine, conceptList } from "./name.ts";

describe("conceptList", () => {
  it("이름을 코드 표기로 감싸 쉼표로 잇는다", () => {
    expect(conceptList(["rsc", "css"])).toBe("`rsc`, `css`");
  });

  it("하나면 쉼표가 붙지 않는다", () => {
    expect(conceptList(["rsc"])).toBe("`rsc`");
  });

  it("이름 뒤에 조사를 붙이지 않는다 — 받침을 판정할 수 없기 때문이다", () => {
    expect(conceptList(["rsc", "css"])).not.toMatch(/[와과은는이가]/u);
  });

  it("빈 목록은 빈 글자다", () => {
    expect(conceptList([])).toBe("");
  });
});

describe("conceptCountLine", () => {
  it("Concept 하나와 Note 편 수를 한 줄로 놓는다", () => {
    expect(conceptCountLine({ concept: "rsc", noteCount: 3 })).toBe("- `rsc` 3편");
  });
});
