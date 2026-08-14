import { groundingReasons } from "../observer/grounding.ts";
import { styleReasons } from "../observer/style.ts";
import { judgeObserverVerbs } from "../observer/verbs.ts";
import type { PortraitBrief } from "./brief.ts";

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
    ...styleReasons(prose),
    ...verbReasons(prose),
    ...groundingReasons({ prose, grounding: brief }),
  ];

  return reasons.length === 0 ? { outcome: "pass" } : { outcome: "rejected", reasons };
}

/**
 * Portrait은 짧은 판정이다. 상한을 두는 것은 길어진 산문이 곧 해석이 붙은
 * 산문이기 때문이다 — 사실 목록은 이만큼 길지 않다.
 */
const maximumLength = 1200;

/** Portrait의 형식. 문체는 관찰자 문서가 공유하므로 `observer/style.ts`가 본다. */
function formatReasons(prose: string): string[] {
  const reasons: string[] = [];
  const trimmed = prose.trim();

  if (!trimmed.startsWith("# Portrait")) {
    reasons.push("첫 줄이 `# Portrait`이 아니다");
  }

  if (trimmed.length > maximumLength) {
    reasons.push(`${maximumLength}자를 넘었다 — Portrait은 짧은 판정이다`);
  }

  return reasons;
}

function verbReasons(prose: string): string[] {
  const verdict = judgeObserverVerbs(prose);

  return verdict.outcome === "pass"
    ? []
    : verdict.found.map(({ found, reason }) => `관측되지 않는 동사 — ${found} (${reason})`);
}
