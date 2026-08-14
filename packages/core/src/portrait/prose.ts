import { writeObserverProse, type ProseOutcome, type ProseWriter } from "../observer/prose.ts";
import { auditProse } from "./audit.ts";
import { portraitPrompt, type PortraitBrief } from "./brief.ts";

export type { ProseAttempt, ProseOutcome, ProseWriter } from "../observer/prose.ts";

/**
 * 모델에게 Portrait 산문을 받아 감사를 통과한 것만 돌려준다. 재시도와 되돌림은
 * 관찰자 문서가 공유하므로 `observer/prose.ts`에 있고, 여기서는 Portrait의
 * 프롬프트와 감사를 그 자리에 끼운다.
 */
export async function writePortraitProse({
  brief,
  writer,
  attempts,
}: {
  brief: PortraitBrief;
  writer: ProseWriter;
  attempts?: number;
}): Promise<ProseOutcome> {
  return await writeObserverProse({
    instruction: portraitPrompt(brief),
    writer,
    audit: (prose) => {
      const verdict = auditProse({ prose, brief });

      return verdict.outcome === "pass" ? [] : verdict.reasons;
    },
    attempts,
  });
}
