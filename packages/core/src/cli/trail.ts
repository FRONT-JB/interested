import { readRepository } from "../repository/read.ts";
import { writeMarkdown } from "../repository/write.ts";
import { renderTrailDraft } from "../trail/draft.ts";
import { tallyWeek } from "../trail/tally.ts";
import { trailWeekSchema, weekOf } from "../trail/week.ts";

/**
 * 그 주 Note를 묶어 Trail 초안을 내놓는다. 집계는 `trail/tally.ts`가, 문장은
 * `trail/draft.ts`가 하고 여기서는 저장소를 읽고 결과를 내보낼 뿐이다.
 *
 * 초안은 화면에도 찍고 `trails/`에도 남긴다. 화면에만 있으면 고칠 자리가
 * 없고, 파일로만 남기면 무엇이 나왔는지 열어 봐야 안다. 이미 있는 파일은
 * `writeMarkdown`이 덮지 않으므로(ADR-0004) 사람이 고쳐 둔 문장은 두 번째
 * 실행에도 살아남는다.
 */

/**
 * 오늘은 명령을 돌린 사람의 달력을 따른다. 집계는 UTC로 하지만(`week.ts`)
 * "이번 주"가 언제인지는 화면 앞에 앉은 사람의 날짜다.
 */
function today(): string {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

const requested = process.argv[2] ?? weekOf(today());
const week = trailWeekSchema.safeParse(requested);

if (!week.success) {
  console.error(`${requested} 는 주 식별자가 아니다. 2026-W33 형식으로 넘긴다.`);
  process.exitCode = 1;
} else {
  const root = process.cwd();
  const model = await readRepository(root);
  const tally = tallyWeek({ notes: model.notes, week: week.data });
  const draft = renderTrailDraft(tally);

  console.log(`\n${draft}`);

  if (tally.notes.length === 0) {
    // 발행할 것이 없는 주에 빈 파일을 남기면 `trails/`가 발행 목록이 아니라
    // 달력이 된다.
    console.log(`${tally.week} 에는 Note가 없어 파일을 남기지 않았다.`);
  } else {
    const outcome = await writeMarkdown({
      root,
      path: `trails/${tally.week}.md`,
      contents: draft,
    });

    console.log(
      "written" in outcome
        ? `${outcome.written} 에 초안을 남겼다. 문장을 고쳐 발행한다.`
        : `${outcome.kept} 는 이미 있어 그대로 뒀다. 위 초안은 화면에만 있다.`,
    );
  }

  for (const { path, reason } of model.unreadable) {
    console.log(`읽지 못한 파일: ${path} (${reason})`);
  }
}
