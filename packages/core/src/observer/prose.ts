/** 모델을 한 번 부른 결과. 부르지 못한 것과 통과하지 못한 것은 다른 일이다. */
export type ProseAttempt = { prose: string } | { failed: string };

/** 프롬프트 하나를 넣으면 산문 하나가 나오는 자리. 테스트가 스텁을 넣는다. */
export type ProseWriter = (prompt: string) => Promise<ProseAttempt>;

/** 통과한 산문, 또는 끝까지 통과하지 못한 이유들. */
export type ProseOutcome = { prose: string } | { rejected: string[] };

/**
 * 감사 한 번. 통과하면 빈 배열이고, 걸리면 이유들이다.
 *
 * 무엇을 보는지는 부르는 쪽이 정한다 — Portrait은 판정 한 편을(`portrait/audit.ts`),
 * Arc는 항목 한 개를(`arc/audit.ts`) 검사하고, 되돌려진 문장을 다시 쓰게 하는
 * 방식은 둘이 같다.
 */
export type ProseAudit = (prose: string) => string[];

/** 되돌려진 산문을 다시 쓰게 하는 횟수의 상한. */
const defaultAttempts = 2;

/**
 * 모델에게 문장을 받아 감사를 통과한 것만 돌려준다. 통과하지 못하면 이유를
 * 돌려주고, 그 뒤는 부르는 쪽이 조립으로 되돌린다 (ADR-0008).
 *
 * 되돌려진 이유를 다음 프롬프트에 붙인다. 같은 재료로 같은 지시를 반복하면
 * 같은 자리에서 다시 걸리므로, 무엇이 걸렸는지를 알려 주는 것이 재시도의 전부다.
 *
 * 모델을 부르지 못한 것은 재시도하지 않는다. CLI가 없거나 토큰이 없는 것은
 * 다시 불러도 그대로이고, 그 자리에서 조립으로 넘어가는 편이 빠르다.
 */
export async function writeObserverProse({
  instruction,
  writer,
  audit,
  attempts = defaultAttempts,
}: {
  instruction: string;
  writer: ProseWriter;
  audit: ProseAudit;
  attempts?: number;
}): Promise<ProseOutcome> {
  let rejected: string[] = ["모델을 한 번도 부르지 않았다"];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const written = await writer(attempt === 0 ? instruction : retryPrompt(instruction, rejected));

    if ("failed" in written) {
      return { rejected: [`모델을 부르지 못했다 — ${written.failed}`] };
    }

    const prose = written.prose.trim();
    const reasons = audit(prose);

    if (reasons.length === 0) {
      return { prose };
    }

    rejected = reasons;
  }

  return { rejected };
}

function retryPrompt(instruction: string, reasons: readonly string[]): string {
  return [
    instruction,
    "",
    "## 방금 쓴 것이 되돌려진 이유",
    "",
    ...reasons.map((reason) => `- ${reason}`),
    "",
    "같은 자리에서 다시 걸리지 않게 고쳐 쓴다. 재료에 없는 것을 채워 넣지 말고, 할 말이 줄면 짧게 쓴다.",
  ].join("\n");
}
