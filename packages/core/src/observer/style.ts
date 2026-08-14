/** 경어체 종결형. 관찰자의 문체는 평서체다. */
const honorificPattern = /습니다|입니다|해요|예요|십시오/u;

/**
 * 관찰자의 문체를 본다. 문서마다 다른 것(제목, 길이)은 부르는 쪽이 보고, 여기
 * 있는 것은 Portrait과 Arc가 같은 목소리를 쓰기 위한 조건이다.
 *
 * 두 벌로 두면 한쪽에서 막은 문체가 다른 쪽에서 통과해, 같은 관찰자가 문서마다
 * 다르게 말하기 시작한다.
 */
export function styleReasons(prose: string): string[] {
  const reasons: string[] = [];
  const trimmed = prose.trim();

  if (trimmed.includes("```")) {
    reasons.push("코드 블록이 들어 있다 — 출력은 본문뿐이어야 한다");
  }

  const honorific = honorificPattern.exec(trimmed);

  if (honorific !== null) {
    reasons.push(`경어체가 섞였다 — ${honorific[0]}`);
  }

  return reasons;
}
