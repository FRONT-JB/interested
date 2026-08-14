/**
 * 산문이 딛고 있어야 하는 재료. 여기 없는 수와 이름은 지어낸 것이다.
 *
 * `facts`는 사람이 읽는 사실 한 줄씩이고 `names`는 산문에 쓸 수 있는 이름
 * 전부다 — Concept slug, 저장소 이름, 언어 이름.
 */
export type Grounding = { facts: readonly string[]; names: readonly string[] };

/**
 * 모델이 쓴 산문을 재료와 대조해 지어낸 수와 이름을 찾는다. 관찰자 문서가
 * 공유하는 검사이므로 여기 한 벌만 둔다 — Portrait과 Arc가 각자 세면, 한쪽에서
 * 막은 문장이 다른 쪽에서 통과하는 자리가 생긴다.
 *
 * 형식과 동사는 보지 않는다. 그 둘은 문서마다 다르므로 부르는 쪽이 본다
 * (`portrait/audit.ts`, `arc/audit.ts`).
 */
export function groundingReasons({
  prose,
  grounding,
}: {
  prose: string;
  grounding: Grounding;
}): string[] {
  return [
    ...numberReasons({ prose, grounding }),
    ...countReasons({ prose, grounding }),
    ...nameReasons({ prose, grounding }),
  ];
}

/**
 * 산문의 숫자는 전부 재료에 있어야 한다. 앞의 0을 떼고 견주는 것은 `08월`과
 * `8월`이 같은 날을 가리키기 때문이다.
 *
 * 이 검사가 잡는 것은 지어낸 수다. 재료에 이미 있는 수를 엉뚱한 자리에 쓴 것은
 * 못 잡는다 — 그건 문장의 뜻이고 문자열 검사가 닿는 곳이 아니다.
 */
function numberReasons({ prose, grounding }: { prose: string; grounding: Grounding }): string[] {
  const known = new Set(digitsIn(grounding.facts.join(" ")));

  return [...new Set(digitsIn(prose))]
    .filter((number) => !known.has(number))
    .map((number) => `재료에 없는 숫자 — ${number}`);
}

function digitsIn(text: string): string[] {
  return [...text.matchAll(/\d+/gu)].map(([digits]) => digits.replace(/^0+(?=\d)/u, ""));
}

/**
 * 수와 단위를 붙여 한 번 더 견준다. 숫자만 보면 `1편 70회`를 재료로 둔 채
 * `70편`이라고 쓴 산문이 통과한다 — 70도 편도 재료에 있기 때문이다. 세는
 * 대상이 바뀐 문장은 숫자를 지어낸 것과 다르지 않다.
 *
 * 재료가 쓴 단위를 그대로 쓰게 만드는 부작용이 있다. `1편`을 `1개`로 바꿔 쓰면
 * 되돌려지는데, 뜻이 같아도 관찰자의 문서가 같은 것을 매번 다른 단위로 세는
 * 편보다 낫다.
 */
const countPattern = /(\d+)\s*(편|회|주|개|번|위|자)/gu;

function countReasons({ prose, grounding }: { prose: string; grounding: Grounding }): string[] {
  const known = new Set(countsIn(grounding.facts.join(" ")));

  return [...new Set(countsIn(prose))]
    .filter((count) => !known.has(count))
    .map((count) => `재료에 없는 수 — ${count}`);
}

function countsIn(text: string): string[] {
  return [...text.matchAll(countPattern)].map(
    ([, digits, unit]) => `${(digits ?? "").replace(/^0+(?=\d)/u, "")}${unit}`,
  );
}

/**
 * 코드 표기 안의 이름도 전부 재료에 있어야 한다. 동사 게이트가 코드 표기 안을
 * 보지 않으므로(`observer/verbs.ts`) 이 검사가 그 자리를 대신 지킨다 — 금지
 * 동사를 백틱에 감춰도 재료에 없는 이름으로 걸린다.
 */
function nameReasons({ prose, grounding }: { prose: string; grounding: Grounding }): string[] {
  const factsText = grounding.facts.join(" ");

  return [...new Set([...prose.matchAll(/`([^`]+)`/gu)].map(([, name]) => name ?? ""))]
    .filter((name) => !grounding.names.includes(name) && !factsText.includes(name))
    .map((name) => `재료에 없는 이름 — ${name}`);
}
