import { describe, expect, it } from "vitest";

import { findDuplicateSource } from "./duplicate.ts";

const notes = [
  { path: "notes/2026-07-08-parameter-object-pattern-js.md", source: "https://youtu.be/43sDzyanzR0" },
  { path: "notes/2026-07-10-rsc.md", source: "https://www.example.com/rsc/" },
];

describe("findDuplicateSource", () => {
  it("같은 Source URL로 쓴 Note가 이미 있으면 그 Note를 돌려준다", () => {
    const found = findDuplicateSource({ source: "https://youtu.be/43sDzyanzR0", notes });

    expect(found?.path).toBe("notes/2026-07-08-parameter-object-pattern-js.md");
  });

  it("아직 쓰지 않은 Source면 아무것도 돌려주지 않는다", () => {
    const found = findDuplicateSource({ source: "https://youtu.be/dQw4w9WgXcQ", notes });

    expect(found).toBeNull();
  });

  it("끝 슬래시나 대문자 호스트만 다른 URL도 같은 Source로 본다", () => {
    expect(findDuplicateSource({ source: "https://WWW.Example.com/rsc", notes })?.path).toBe(
      "notes/2026-07-10-rsc.md",
    );
  });

  it("공유 링크에 붙는 추적 파라미터는 무시한다", () => {
    expect(
      findDuplicateSource({ source: "https://youtu.be/43sDzyanzR0?si=abc123&utm_source=x", notes })
        ?.path,
    ).toBe("notes/2026-07-08-parameter-object-pattern-js.md");
  });

  it("재생 위치 `t`는 지우지 않아 같은 영상을 놓친다 — 다른 원문을 같다고 답하지 않기 위해서다", () => {
    // `?t=`는 서비스마다 뜻이 달라서 호스트를 가리지 않고 지울 수 없다. 놓친
    // 중복은 스킬이 사람에게 되묻고, 잘못 잡은 중복은 되물을 기회가 없다.
    expect(findDuplicateSource({ source: "https://youtu.be/43sDzyanzR0?t=42", notes })).toBeNull();
  });

  it("http와 https만 다른 URL도 같은 Source로 본다", () => {
    expect(findDuplicateSource({ source: "http://youtu.be/43sDzyanzR0", notes })?.path).toBe(
      "notes/2026-07-08-parameter-object-pattern-js.md",
    );
  });

  it("의미가 있는 질의 문자열이 다르면 다른 Source다", () => {
    const withQuery = [{ path: "notes/a.md", source: "https://www.youtube.com/watch?v=aaa" }];

    expect(
      findDuplicateSource({ source: "https://www.youtube.com/watch?v=bbb", notes: withQuery }),
    ).toBeNull();
  });

  it("URL로 읽히지 않는 값은 글자 그대로 대조한다", () => {
    const broken = [{ path: "notes/a.md", source: "유튜브에서 본 영상" }];

    expect(findDuplicateSource({ source: " 유튜브에서 본 영상 ", notes: broken })?.path).toBe(
      "notes/a.md",
    );
  });

  it("Note가 한 편도 없으면 아무것도 돌려주지 않는다", () => {
    expect(findDuplicateSource({ source: "https://youtu.be/43sDzyanzR0", notes: [] })).toBeNull();
  });
});
