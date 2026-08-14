import { describe, expect, it } from "vitest";

import { judgeObserverVerbs } from "./verbs.ts";

describe("judgeObserverVerbs", () => {
  it("허용 동사만 쓴 문장은 통과한다", () => {
    const verdict = judgeObserverVerbs(
      [
        "이 사람은 `rsc`에 관심이 있다.",
        "지난 주에 읽었다가 이번 주에 다시 돌아왔다.",
        "관심은 `css`로 옮겨갔고 지금은 그쪽을 조사하고 있다.",
      ].join("\n"),
    );

    expect(verdict).toEqual({ outcome: "pass" });
  });

  it.each([
    ["습득했다", "`rsc`를 습득했다."],
    ["익혔다", "서버 컴포넌트를 익혔다."],
    ["이해했다", "데이터 흐름을 이해했다."],
    ["능숙하다", "이제 `css`에 능숙하다."],
  ])("금지 동사 %s 가 들어가면 잡힌다", (_verb, text) => {
    const verdict = judgeObserverVerbs(text);

    expect(verdict.outcome).toBe("forbidden");
  });

  it("잡힌 자리를 글자 그대로 돌려준다", () => {
    const verdict = judgeObserverVerbs("`rsc`를 습득했고 `css`도 익혔다.");

    expect(verdict).toEqual({
      outcome: "forbidden",
      found: [
        { found: "습득", reason: expect.any(String) },
        { found: "익혔", reason: expect.any(String) },
      ],
    });
  });

  it("같은 금지 동사가 두 번 나와도 한 번만 보고한다", () => {
    const verdict = judgeObserverVerbs("습득했다. 또 습득했다.");

    expect(verdict.outcome === "forbidden" && verdict.found).toHaveLength(1);
  });

  it("코드 표기 안의 이름은 검사하지 않는다", () => {
    // 저장소 이름은 밖에서 들어온 이름이고 관찰자의 주장이 아니다. 이름 하나가
    // 갱신을 영구히 세우면 게이트가 관찰자를 멈추게 한다.
    const verdict = judgeObserverVerbs("푸시가 몰린 곳은 `FRONT-JB/익힌-것` 9회.");

    expect(verdict).toEqual({ outcome: "pass" });
  });

  it("코드 표기 밖의 같은 글자는 잡는다", () => {
    expect(judgeObserverVerbs("`rsc`를 익혔다.").outcome).toBe("forbidden");
  });

  it("빈 글은 통과한다", () => {
    expect(judgeObserverVerbs("")).toEqual({ outcome: "pass" });
  });
});
