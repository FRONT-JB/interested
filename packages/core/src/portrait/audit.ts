import type { PortraitBrief } from "./brief.ts";
import { judgeObserverVerbs } from "./verbs.ts";

/** 감사의 판정. 되돌려진 산문은 발행되지 않는다. */
export type AuditVerdict = { outcome: "pass" } | { outcome: "rejected"; reasons: string[] };

/**
 * 모델이 쓴 산문을 재료와 대조한다. 모델이 문장을 쓰기로 한 뒤로는 이 함수가
 * 유일한 안전장치다 (ADR-0008) — 템플릿이 쓸 때는 형식이 사실을 보장했지만,
 * 산문은 그렇지 않으므로 사실을 여기서 되짚는다.
 *
 * 네 가지를 본다. 관측되지 않는 동사(ADR-0005), 재료에 없는 숫자, 재료에 없는
 * 이름, 그리고 형식. 통과하지 못한 산문은 고치지 않는다 — 고쳐서 내보내면
 * 관찰자의 말도 모델의 말도 아닌 문장이 남는다.
 */
export function auditProse({
  prose,
  brief,
}: {
  prose: string;
  brief: PortraitBrief;
}): AuditVerdict {
  const reasons = [
    ...formatReasons(prose),
    ...verbReasons(prose),
    ...numberReasons({ prose, brief }),
    ...countReasons({ prose, brief }),
    ...nameReasons({ prose, brief }),
  ];

  return reasons.length === 0 ? { outcome: "pass" } : { outcome: "rejected", reasons };
}

/**
 * Portrait은 짧은 판정이다. 상한을 두는 것은 길어진 산문이 곧 해석이 붙은
 * 산문이기 때문이다 — 사실 목록은 이만큼 길지 않다.
 */
const maximumLength = 1200;

/** 경어체 종결형. 관찰자의 문체는 평서체다. */
const honorificPattern = /습니다|입니다|해요|예요|십시오/u;

function formatReasons(prose: string): string[] {
  const reasons: string[] = [];
  const trimmed = prose.trim();

  if (!trimmed.startsWith("# Portrait")) {
    reasons.push("첫 줄이 `# Portrait`이 아니다");
  }

  if (trimmed.includes("```")) {
    reasons.push("코드 블록이 들어 있다 — 출력은 Portrait 본문뿐이어야 한다");
  }

  if (trimmed.length > maximumLength) {
    reasons.push(`${maximumLength}자를 넘었다 — Portrait은 짧은 판정이다`);
  }

  const honorific = honorificPattern.exec(trimmed);

  if (honorific !== null) {
    reasons.push(`경어체가 섞였다 — ${honorific[0]}`);
  }

  return reasons;
}

function verbReasons(prose: string): string[] {
  const verdict = judgeObserverVerbs(prose);

  return verdict.outcome === "pass"
    ? []
    : verdict.found.map(({ found, reason }) => `관측되지 않는 동사 — ${found} (${reason})`);
}

/**
 * 산문의 숫자는 전부 재료에 있어야 한다. 앞의 0을 떼고 견주는 것은 `08월`과
 * `8월`이 같은 날을 가리키기 때문이다.
 *
 * 이 검사가 잡는 것은 지어낸 수다. 재료에 이미 있는 수를 엉뚱한 자리에 쓴 것은
 * 못 잡는다 — 그건 문장의 뜻이고 문자열 검사가 닿는 곳이 아니다.
 */
function numberReasons({ prose, brief }: { prose: string; brief: PortraitBrief }): string[] {
  const known = new Set(digitsIn(brief.facts.join(" ")));

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

function countReasons({ prose, brief }: { prose: string; brief: PortraitBrief }): string[] {
  const known = new Set(countsIn(brief.facts.join(" ")));

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
 * 보지 않으므로(`portrait/verbs.ts`) 이 검사가 그 자리를 대신 지킨다 — 금지
 * 동사를 백틱에 감춰도 재료에 없는 이름으로 걸린다.
 */
function nameReasons({ prose, brief }: { prose: string; brief: PortraitBrief }): string[] {
  const factsText = brief.facts.join(" ");

  return [...new Set([...prose.matchAll(/`([^`]+)`/gu)].map(([, name]) => name ?? ""))]
    .filter((name) => !brief.names.includes(name) && !factsText.includes(name))
    .map((name) => `재료에 없는 이름 — ${name}`);
}
