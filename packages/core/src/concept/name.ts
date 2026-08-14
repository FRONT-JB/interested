/**
 * 나열은 쉼표로 잇는다. "와/과"로 이으면 셋 이상이 어색해지고, 앞말 받침에
 * 따라 둘이 갈리는데 Concept은 영어 slug라 발음으로 받침을 판정해야 한다.
 * 그 판정은 규칙으로 닫히지 않으므로 맞히려 들수록 틀리는 자리가 는다.
 * 쉼표로 두면 항목 뒤에 조사가 붙지 않아 문제 자체가 사라진다.
 *
 * 발행물 전부가 이 함수를 지난다. Trail과 Portrait이 각자 이어 붙이면 같은
 * Concept 목록이 문서마다 다른 모양으로 놓인다.
 */
/** Concept 이름들을 코드 표기로 감싸 쉼표로 잇는다. 조사가 붙지 않는 형태다. */
export function conceptList(concepts: readonly string[]): string {
  return concepts.map((concept) => `\`${concept}\``).join(", ");
}

/**
 * Concept 하나와 그 등장 횟수를 한 줄로. 단위가 "편"인 것은 세는 것이 언급 수가
 * 아니라 Note 수이기 때문이다 (ADR-0002).
 *
 * Trail의 몰린 곳과 Portrait의 관심이 같은 줄을 쓴다. 두 발행물이 각자 이어
 * 붙이면 같은 집계가 문서마다 다른 모양으로 놓인다.
 */
export function conceptCountLine({
  concept,
  noteCount,
}: {
  concept: string;
  noteCount: number;
}): string {
  return `- \`${concept}\` ${noteCount}편`;
}
