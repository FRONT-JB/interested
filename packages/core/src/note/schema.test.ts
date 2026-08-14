import { describe, expect, it } from "vitest";

import { noteFrontmatterSchema } from "./schema";

const validFrontmatter = {
  source: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  title: "서버 컴포넌트가 지운 경계",
  date: "2026-08-14",
  take: "데이터를 어디서 가져오느냐가 아니라 어디서 렌더하느냐가 경계였다.",
  concepts: ["rsc", "data-fetching"],
};

describe("noteFrontmatterSchema", () => {
  it("Source·제목·작성일·Take·Concept이 갖춰진 frontmatter를 읽는다", () => {
    const result = noteFrontmatterSchema.safeParse(validFrontmatter);

    expect(result.success).toBe(true);
  });

  it("Source가 URL이 아니면 거부한다", () => {
    const result = noteFrontmatterSchema.safeParse({
      ...validFrontmatter,
      source: "유튜브에서 본 영상",
    });

    expect(result.success).toBe(false);
  });

  it("Source가 없으면 거부한다", () => {
    const { source, ...withoutSource } = validFrontmatter;
    const result = noteFrontmatterSchema.safeParse(withoutSource);

    expect(result.success).toBe(false);
  });

  it("Concept이 한글이면 거부한다", () => {
    const result = noteFrontmatterSchema.safeParse({
      ...validFrontmatter,
      concepts: ["서버-컴포넌트"],
    });

    expect(result.success).toBe(false);
  });

  it("Concept에 대문자나 공백이 섞이면 거부한다", () => {
    expect(
      noteFrontmatterSchema.safeParse({ ...validFrontmatter, concepts: ["RSC"] }).success,
    ).toBe(false);
    expect(
      noteFrontmatterSchema.safeParse({ ...validFrontmatter, concepts: ["server components"] })
        .success,
    ).toBe(false);
  });

  it("Concept이 하나도 없으면 거부한다", () => {
    const result = noteFrontmatterSchema.safeParse({ ...validFrontmatter, concepts: [] });

    expect(result.success).toBe(false);
  });

  it("같은 Concept이 한 Note 안에서 중복되면 거부한다", () => {
    const result = noteFrontmatterSchema.safeParse({
      ...validFrontmatter,
      concepts: ["rsc", "rsc"],
    });

    expect(result.success).toBe(false);
  });

  it("하이픈으로 이어진 소문자 영숫자 Concept은 통과한다", () => {
    const result = noteFrontmatterSchema.safeParse({
      ...validFrontmatter,
      concepts: ["rsc", "react-19", "esm"],
    });

    expect(result.success).toBe(true);
  });

  it("제목이나 Take가 비어 있으면 거부한다", () => {
    expect(noteFrontmatterSchema.safeParse({ ...validFrontmatter, title: "" }).success).toBe(false);
    expect(noteFrontmatterSchema.safeParse({ ...validFrontmatter, take: "   " }).success).toBe(
      false,
    );
  });

  it("작성일이 YYYY-MM-DD가 아니면 거부한다", () => {
    expect(
      noteFrontmatterSchema.safeParse({ ...validFrontmatter, date: "2026-8-4" }).success,
    ).toBe(false);
    expect(
      noteFrontmatterSchema.safeParse({ ...validFrontmatter, date: "2026년 8월 14일" }).success,
    ).toBe(false);
  });

  it("형식에 없는 키가 있으면 거부한다", () => {
    const result = noteFrontmatterSchema.safeParse({ ...validFrontmatter, tags: ["react"] });

    expect(result.success).toBe(false);
  });

  it("YAML이 Date로 넘긴 작성일을 YYYY-MM-DD로 읽는다", () => {
    const result = noteFrontmatterSchema.safeParse({
      ...validFrontmatter,
      date: new Date("2026-08-14T00:00:00.000Z"),
    });

    expect(result.success && result.data.date).toBe("2026-08-14");
  });
});
