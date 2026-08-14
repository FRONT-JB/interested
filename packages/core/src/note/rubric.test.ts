import { describe, expect, it } from "vitest";

import { judgeDraft, type NoteDraft } from "./rubric.ts";
import { noteFrontmatterSchema } from "./schema.ts";

/** 게이트를 통과하기에 모자람이 없는 초안. 넘긴 값만 덮어쓴다. */
function draft(overrides: Partial<NoteDraft> = {}): NoteDraft {
  return {
    source: "https://youtu.be/43sDzyanzR0",
    title: "Parameter Object Pattern은 JavaScript에도 적용할 수 있는가",
    date: "2026-07-08",
    take: "인자가 많다는 것이 아니라 같은 인자 묶음이 여러 함수로 퍼진다는 것이 객체로 묶을 신호였다.",
    concepts: ["parameter-object-pattern", "stamp-coupling"],
    sourceClaim: "원문은 함수 인자가 많아질 때 관련 값을 하나의 객체로 묶으라고 말한다.",
    harvest:
      "내가 건진 것은 그 결론이 아니라 언제 묶을지 판별하는 기준이다. 인자 개수는 신호가 아니었고, 거의 같은 묶음을 서너 군데가 반복해서 받기 시작할 때가 묶을 때다.",
    application:
      "검색 조건, API request DTO, pagination과 filter option, service method의 options 자리에 쓸 생각이다.",
    doubt:
      "고수준과 저수준의 경계가 코드에서 자명하지 않아서, 애매할 때마다 판단이 필요하다면 그건 규칙보다 감각에 가깝다고 본다.",
    ...overrides,
  };
}

const vocabulary = ["parameter-object-pattern", "stamp-coupling", "rsc", "data-fetching"];

function judge(overrides: Partial<NoteDraft> = {}, existing: string[] = vocabulary) {
  return judgeDraft({ draft: draft(overrides), vocabulary: existing });
}

describe("judgeDraft — 재료 부족은 되묻는다", () => {
  it("재료가 갖춰진 초안은 통과한다", () => {
    const verdict = judge();

    expect(verdict.outcome).toBe("pass");
  });

  it("관점이 얇으면 초안을 내놓지 않고 되묻는다", () => {
    const verdict = judge({ harvest: "좋은 내용이었다." });

    expect(verdict.outcome).toBe("ask-back");
    expect(verdict).not.toHaveProperty("corrected");
    expect(verdict.outcome === "ask-back" && verdict.askBack.map(({ field }) => field)).toContain(
      "harvest",
    );
  });

  it("관점 자리에 원문 요약을 되풀이하면 되묻는다", () => {
    const verdict = judge({
      harvest:
        "원문은 함수 인자가 많아질 때 관련 값을 하나의 객체로 묶으라고 말한다. 원문은 인자가 많아질 때 관련 값을 하나의 객체로 묶으라고 다시 말한다.",
    });

    expect(verdict.outcome).toBe("ask-back");
    expect(verdict.outcome === "ask-back" && verdict.askBack.map(({ field }) => field)).toContain(
      "harvest",
    );
  });

  it("어디에 쓸 생각인지가 비어 있으면 되묻는다", () => {
    const verdict = judge({ application: "   " });

    expect(verdict.outcome).toBe("ask-back");
    expect(verdict.outcome === "ask-back" && verdict.askBack.map(({ field }) => field)).toContain(
      "application",
    );
  });

  it("미심쩍은 대목을 회피하면 되묻는다", () => {
    const verdict = judge({ doubt: "딱히 없다." });

    expect(verdict.outcome).toBe("ask-back");
    expect(verdict.outcome === "ask-back" && verdict.askBack.map(({ field }) => field)).toContain(
      "doubt",
    );
  });

  it("Take가 원문을 가리키는 말로 시작하면 되묻는다", () => {
    const verdict = judge({
      take: "저자는 인자가 세 개를 넘으면 객체로 묶으라고 권한다는 이야기를 길게 풀어놓는다.",
    });

    expect(verdict.outcome).toBe("ask-back");
    expect(verdict.outcome === "ask-back" && verdict.askBack.map(({ field }) => field)).toContain(
      "take",
    );
  });

  it("Take가 원문 요약과 대부분 겹치면 되묻는다", () => {
    const verdict = judge({
      take: "함수 인자가 많아질 때 관련 값을 하나의 객체로 묶으라고 말한다.",
    });

    expect(verdict.outcome).toBe("ask-back");
    expect(verdict.outcome === "ask-back" && verdict.askBack.map(({ field }) => field)).toContain(
      "take",
    );
  });

  it("Take가 한 문장의 수확이 되기에 너무 짧으면 되묻는다", () => {
    const verdict = judge({ take: "좋았다." });

    expect(verdict.outcome).toBe("ask-back");
    expect(verdict.outcome === "ask-back" && verdict.askBack.map(({ field }) => field)).toContain(
      "take",
    );
  });

  it("되묻는 항목마다 사람에게 그대로 던질 질문이 붙는다", () => {
    const verdict = judge({ harvest: "좋은 내용이었다." });

    expect(verdict.outcome === "ask-back" && verdict.askBack[0]?.question.length).toBeGreaterThan(0);
  });
});

describe("judgeDraft — 형식 위반은 말없이 고친다", () => {
  it("경어체가 섞이면 되묻지 않고 평서체로 고친다", () => {
    const verdict = judge({
      harvest:
        "제가 건진 것은 그 결론이 아니라 언제 묶을지 판별하는 기준입니다. 인자 개수는 신호가 아니었고, 거의 같은 묶음을 서너 군데가 반복해서 받기 시작할 때가 묶을 때입니다.",
    });

    expect(verdict.outcome).toBe("pass");
    expect(verdict.outcome === "pass" && verdict.corrected.harvest).toContain("내가 건진 것은");
    expect(verdict.outcome === "pass" && verdict.corrected.harvest).not.toMatch(/입니다|습니다/);
    expect(verdict.outcome === "pass" && verdict.corrections.map(({ field }) => field)).toContain(
      "harvest",
    );
  });

  it("합쇼체 종결형을 평서체로 되돌린다", () => {
    const verdict = judge({
      title: "Parameter Object Pattern을 JavaScript에도 적용할 수 있습니다",
      doubt:
        "고수준과 저수준의 경계가 코드에서 자명하지 않습니다. 애매할 때마다 판단이 필요하다면 그건 규칙보다 감각에 가깝다고 봅니다.",
    });

    expect(verdict.outcome === "pass" && verdict.corrected.title).toMatch(/적용할 수 있다$/);
    expect(verdict.outcome === "pass" && verdict.corrected.doubt).toContain("자명하지 않다");
    expect(verdict.outcome === "pass" && verdict.corrected.doubt).toContain("가깝다고 본다");
  });

  it("해요체와 겸양 1인칭도 평서체 1인칭으로 고친다", () => {
    const verdict = judge({
      application:
        "저는 검색 조건과 API request DTO에 쓸 생각이에요. 저도 pagination과 filter option 자리에 이미 써 봤어요.",
    });

    expect(verdict.outcome === "pass" && verdict.corrected.application).toBe(
      "나는 검색 조건과 API request DTO에 쓸 생각이다. 나도 pagination과 filter option 자리에 이미 써 봤다.",
    );
  });

  it("과거형과 형용사 종결형은 제대로 고친다 — 아래 한계와 갈리는 자리다", () => {
    const verdict = judge({
      doubt:
        "경계가 코드에서 자명하지 않았습니다. 고수준과 저수준의 거리가 생각보다 가깝습니다. 판단이 필요한 자리가 계속 나왔습니다.",
    });

    expect(verdict.outcome === "pass" && verdict.corrected.doubt).toBe(
      "경계가 코드에서 자명하지 않았다. 고수준과 저수준의 거리가 생각보다 가깝다. 판단이 필요한 자리가 계속 나왔다.",
    );
  });

  it("고치지 못하는 경어체는 잡았다고 하지 않는다", () => {
    const verdict = judge({
      doubt:
        "고수준과 저수준의 경계가 코드에서 자명하지 않네요. 애매할 때마다 판단이 필요하다면 그건 규칙보다 감각에 가깝다고 보거든요.",
    });

    expect(verdict.outcome === "pass" && verdict.corrections).toEqual([]);
  });

  it("경어체가 없으면 아무것도 고치지 않는다", () => {
    const verdict = judge();

    expect(verdict.outcome === "pass" && verdict.corrections).toEqual([]);
  });

  it("Concept이 대문자나 공백을 담고 있으면 slug로 고친다", () => {
    const verdict = judge({ concepts: ["Stamp Coupling", "React 19"] }, ["stamp-coupling"]);

    expect(verdict.outcome === "pass" && verdict.corrected.concepts).toEqual([
      "stamp-coupling",
      "react-19",
    ]);
  });

  it("Concept이 한글이면 영어 이름을 지어내지 않고 지운 뒤 무엇을 지웠는지 남긴다", () => {
    const verdict = judge({ concepts: ["parameter-object-pattern", "매개변수 객체"] });

    expect(verdict.outcome).toBe("pass");
    expect(verdict.outcome === "pass" && verdict.corrected.concepts).toEqual([
      "parameter-object-pattern",
    ]);
    expect(verdict.outcome === "pass" && verdict.corrections).toContainEqual(
      expect.objectContaining({ field: "concepts", before: "매개변수 객체", after: null }),
    );
  });

  it("새 Concept 이름이 기존 어휘의 변형이면 기존 이름으로 맞춘다", () => {
    const verdict = judge({ concepts: ["Data Fetching", "stamp-couplings"] });

    expect(verdict.outcome === "pass" && verdict.corrected.concepts).toEqual([
      "data-fetching",
      "stamp-coupling",
    ]);
  });

  it("기존 어휘에 없는 Concept은 새 이름 그대로 둔다", () => {
    const verdict = judge({ concepts: ["query-object"] });

    expect(verdict.outcome === "pass" && verdict.corrected.concepts).toEqual(["query-object"]);
    expect(verdict.outcome === "pass" && verdict.corrections).toEqual([]);
  });

  it("고쳐 놓고 보니 같아진 Concept은 하나만 남긴다", () => {
    const verdict = judge({ concepts: ["RSC", "rsc"] });

    expect(verdict.outcome === "pass" && verdict.corrected.concepts).toEqual(["rsc"]);
  });
});

/**
 * 여기 적힌 것은 맞는 교정이 아니라 지금의 한계다. 맞는 평서체는 `닿는다`와
 * `보인다`이고, 아래 테스트는 게이트가 그렇게 하지 못한다는 사실을 못 박는다.
 *
 * 두 자리 모두 동사와 형용사를 사전 없이 가를 수 없어서 생긴다. `-습니다`는
 * 받침 있는 형용사(`가깝습니다` → `가깝다`)와 모든 과거형(`나왔습니다` →
 * `나왔다`)에서는 맞지만, 받침 있는 동사에서는 `-는다`가 돼야 할 것이 `-다`로
 * 잘린다. `-입니다`는 명사 뒤 서술격 조사(`문제입니다` → `문제이다`)로 읽는
 * 쪽을 택했고, 그래서 어간이 `이`로 끝나는 동사(`보입니다`)의 어간을 자른다.
 *
 * 순서를 바꿔서 풀리지 않는다. `입니다` 규칙을 빼고 ㅂ니다 규칙에 맡기면
 * `보입니다`는 `보인다`로 맞게 나오지만 훨씬 흔한 `문제입니다`가 `문제인다`라는
 * 비문이 된다. 지금 순서는 더 흔한 쪽을 살리고 열화를 비문 대신 기본형으로
 * 떨어뜨린 선택이다.
 *
 * 이 자리를 손대는 사람에게 — 이 테스트를 지우지 말고 고쳐서 통과시켜라.
 * 기대값이 `닿는다`, `보인다`로 바뀌면 그때 한계가 사라진 것이다.
 */
describe("judgeDraft — 경어체 교정이 틀리게 고치는 자리", () => {
  it("받침 있는 동사 어간은 -는다가 아니라 -다로 잘린다", () => {
    const verdict = judge({
      application:
        "지금 붙잡고 있는 검색 필터 훅에 바로 닿습니다. 인자 묶음이 네 군데로 퍼져 있어서 묶을 자리를 이미 찾았습니다.",
    });

    // 맞는 교정은 `닿는다`다.
    expect(verdict.outcome === "pass" && verdict.corrected.application).toContain("바로 닿다");
  });

  it("어간이 이로 끝나는 동사는 서술격 조사로 읽혀 어간이 잘린다", () => {
    const verdict = judge({
      application:
        "지금 붙잡고 있는 검색 필터 훅에서 인자 묶음이 네 군데로 퍼져 있어 묶을 자리가 분명히 보입니다.",
    });

    // 맞는 교정은 `보인다`다.
    expect(verdict.outcome === "pass" && verdict.corrected.application).toContain("분명히 보이다");
  });

  it("명사 뒤 서술격 조사는 같은 규칙에서 맞게 나온다 — 위 한계와 맞바꾼 것이다", () => {
    const verdict = judge({
      doubt:
        "원문이 짚지 않은 것은 중간 계층입니다. 고수준과 저수준의 경계가 자명하다는 전제가 이 글의 약한 자리다.",
    });

    expect(verdict.outcome === "pass" && verdict.corrected.doubt).toContain("중간 계층이다");
  });
});

describe("judgeDraft — 두 경로는 서로 다른 자리로 간다", () => {
  it("재료가 부족하면 형식 위반을 고친 초안을 내놓지 않는다", () => {
    const verdict = judge({
      harvest: "좋은 내용이었습니다.",
      concepts: ["Stamp Coupling"],
    });

    expect(verdict.outcome).toBe("ask-back");
    expect(verdict).not.toHaveProperty("corrected");
    expect(verdict).not.toHaveProperty("corrections");
  });

  it("형식만 어긋난 초안은 되물을 것을 만들지 않는다", () => {
    const verdict = judge({ concepts: ["Stamp Coupling"] });

    expect(verdict.outcome).toBe("pass");
    expect(verdict).not.toHaveProperty("askBack");
  });

  it("되물을 것과 고친 것은 한 배열에 섞이지 않는다", () => {
    const asked = judge({ harvest: "좋은 내용이었다.", concepts: ["Stamp Coupling"] });
    const corrected = judge({ concepts: ["Stamp Coupling"] });

    expect(
      asked.outcome === "ask-back" &&
        asked.askBack.every((entry) => "question" in entry && !("after" in entry)),
    ).toBe(true);
    expect(
      corrected.outcome === "pass" &&
        corrected.corrections.every((entry) => "after" in entry && !("question" in entry)),
    ).toBe(true);
  });
});

describe("judgeDraft — 통과한 초안", () => {
  it("통과한 초안의 frontmatter는 Note 스키마를 만족한다", () => {
    const verdict = judge({
      title: "Parameter Object Pattern을 JavaScript에도 적용할 수 있습니다",
      concepts: ["Data Fetching", "RSC"],
    });

    expect(verdict.outcome).toBe("pass");

    if (verdict.outcome !== "pass") {
      return;
    }

    const { source, title, date, take, concepts } = verdict.corrected;
    const parsed = noteFrontmatterSchema.safeParse({ source, title, date, take, concepts });

    expect(parsed.success).toBe(true);
  });

  it("게이트는 넘겨받은 초안을 고쳐 쓰지 않는다", () => {
    const original = draft({ concepts: ["Stamp Coupling"] });
    const before = structuredClone(original);

    judgeDraft({ draft: original, vocabulary });

    expect(original).toEqual(before);
  });
});
