// Arc를 길게 한다. 담을 Note와 그 재료는 `arc/entry.ts`가, 문장은 모델이
// (`arc/prose.ts`), 파일에 붙이는 것과 동사 게이트는 `arc/append.ts`가 하고
// 여기서는 그 사이를 잇는다.
//
// Portrait과 정반대로 앞의 내용을 지우지 않는다. Arc는 지금의 얼굴이 아니라
// 지나온 자취이고, 지워지지 않는 것이 이 문서의 존재 이유다 (ADR-0010).
//
// 씨앗이 없으면 아무것도 붙이지 않는다. 씨앗은 Note에서 도출되지 않으므로
// 사람이 먼저 써야 하고, 그 앞에서 관찰자가 말할 것은 없다.

import { appendArcEntry, arcPath, readArcStamp } from "../arc/append.ts";
import { arcBrief } from "../arc/brief.ts";
import { selectArcEntries } from "../arc/entry.ts";
import { writeArcEntryProse } from "../arc/prose.ts";
import { arcEntryLine, renderArcEntry } from "../arc/render.ts";
import { claudeCodeWriter } from "../observer/claude.ts";
import { readRepository } from "../repository/read.ts";

/**
 * 문장을 누가 쓰는지. `ARC_PROSE=template`은 모델을 아예 부르지 않는 탈출구다 —
 * 토큰이 없는 자리에서도, 모델이 계속 걸리는 날에도 갱신은 돌아야 한다.
 */
const prose = process.env.ARC_PROSE === "template" ? "template" : "model";

const root = process.cwd();
const model = await readRepository(root);
const stamp = await readArcStamp({ root });
const { entries, behind } = selectArcEntries({ notes: model.notes, stamp });

if (behind > 0) {
  // 조용히 지나가서는 안 된다. 워터마크보다 앞선 이름으로 뒤늦게 들어온 Note는
  // 이 실행이 담지 못하고, 담기지 않았다는 사실만이 사람이 손댈 근거가 된다.
  console.error(
    `${arcPath}의 워터마크(${stamp.covered ?? "없음"}) 앞에 담기지 않은 Note가 ${behind}편 있다.`,
  );
  console.error("이 실행은 그 편들을 담지 않는다 — 문장을 넣으려면 인용 블록으로 직접 넣는다.");
}

if (entries.length === 0) {
  console.log(`새로 담을 Note가 없다 — ${arcPath}는 그대로다.`);
}

// 한 편이 한 항목이다. 여러 편이 한꺼번에 들어와도 각각 감사와 게이트를 지나므로,
// 앞의 항목이 걸리면 뒤의 항목도 붙지 않고 도장이 그 자리에 남는다.
for (const entry of entries) {
  const brief = arcBrief(entry);
  const written =
    prose === "template"
      ? { rejected: ["조립으로 쓰라고 지시받았다"] }
      : await writeArcEntryProse({ brief, writer: claudeCodeWriter() });

  if ("rejected" in written && prose === "model") {
    console.error(`모델의 문장이 감사를 통과하지 못해 조립 항목으로 되돌렸다 (${entry.path}):`);

    for (const reason of written.rejected) {
      console.error(`  ${reason}`);
    }
  }

  const line = arcEntryLine({
    date: entry.date,
    prose: "prose" in written ? written.prose : renderArcEntry(entry),
  });

  console.log(`\n${line}`);

  const outcome = await appendArcEntry({
    root,
    entry: line,
    stamp: { covered: entry.path, notes: entry.noteNumber },
  });

  if ("missing" in outcome) {
    // 씨앗이 없다. 만들어 주지 않는 것은 그것이 사람의 문장이기 때문이다.
    console.error(`${outcome.missing}가 없다 — 씨앗을 사람이 먼저 써야 Arc가 자란다.`);
    process.exitCode = 1;
    break;
  }

  if ("malformed" in outcome) {
    console.error(`${outcome.malformed}의 frontmatter가 YAML로 읽히지 않는다 — 붙이지 않았다.`);
    console.error("어디까지 담았는지를 모르는 채로 붙이면 앞의 항목이 한 번 더 붙는다.");
    process.exitCode = 1;
    break;
  }

  if ("forbidden" in outcome) {
    // 관찰자가 관측되지 않는 말을 하면 발행이 아니라 실패다 (ADR-0005). 앞의
    // 내용은 그대로 남아 있고 도장도 움직이지 않으므로 다음 실행이 같은 자리를
    // 다시 시도한다.
    console.error(`금지 동사가 들어 있어 ${arcPath}에 붙이지 않았다:`);

    for (const { found, reason } of outcome.forbidden) {
      console.error(`  ${found} — ${reason}`);
    }

    process.exitCode = 1;
    break;
  }

  console.log(`${outcome.appended} 에 붙였다. 앞의 내용은 그대로다.`);
}

for (const { path, reason } of model.unreadable) {
  console.log(`읽지 못한 파일: ${path} (${reason})`);
}
