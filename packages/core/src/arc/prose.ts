import { writeObserverProse, type ProseOutcome, type ProseWriter } from "../observer/prose.ts";
import { auditArcEntry } from "./audit.ts";
import { arcPrompt, type ArcBrief } from "./brief.ts";

/**
 * 모델에게 Arc 항목을 받아 감사를 통과한 것만 돌려준다. 재시도와 되돌림은
 * 관찰자 문서가 공유하므로 `observer/prose.ts`에 있고, 여기서는 Arc의 프롬프트와
 * 감사를 그 자리에 끼운다.
 */
export async function writeArcEntryProse({
  brief,
  writer,
  attempts,
}: {
  brief: ArcBrief;
  writer: ProseWriter;
  attempts?: number;
}): Promise<ProseOutcome> {
  return await writeObserverProse({
    instruction: arcPrompt(brief),
    writer,
    audit: (prose) => auditArcEntry({ entry: prose, brief }),
    attempts,
  });
}
