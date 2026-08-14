// Portrait을 다시 쓴다. 판정의 재료는 `portrait/standing.ts`가, 문장은
// `portrait/render.ts`가, 파일 쓰기와 동사 게이트는 `portrait/rewrite.ts`가
// 하고 여기서는 저장소와 GitHub을 읽어 그 사이를 잇는다.
//
// Trail과 달리 이미 있는 파일을 덮는다. Portrait은 지금의 얼굴이므로 앞의
// 판정이 남아 있으면 그게 곧 거짓이 된다 (ADR-0005). 사람이 고칠 자리가 없는
// 문서라서 덮어써도 잃을 문장이 없다.

import { fetchGitHubActivity, type ActivityOutcome } from "../portrait/activity.ts";
import { contrastCandidates } from "../portrait/contrast.ts";
import { renderPortrait } from "../portrait/render.ts";
import { rewritePortrait } from "../portrait/rewrite.ts";
import { standingOf } from "../portrait/standing.ts";
import { readRepository } from "../repository/read.ts";

/**
 * 커밋을 세는 창의 길이. 오늘까지 이만큼 거슬러 올라간다.
 *
 * 관심을 잰 주와 창을 맞추지 않는다. 맞추면 Note를 쓴 지 오래된 날에는 창도
 * 함께 과거로 밀려나는데, 이벤트 API는 최근 것만 들고 있어 그 창의 커밋을
 * 다시 조회할 수 없다. 그러면 같은 과거 주에 대해 어제는 "커밋 12개",
 * 오늘은 "활동 없음"이라고 말하게 된다. 창을 늘 최근으로 두고 Portrait에 두
 * 기간을 각각 밝히는 쪽이 사실에 가깝다 (`portrait/render.ts`).
 */
const activityWindowDays = 7;

/**
 * 창의 기준은 UTC다. GitHub 이벤트의 시각이 UTC이므로 로컬 날짜로 창을 자르면
 * 시차만큼의 커밋이 창 밖으로 밀려난다.
 */
function utcDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * GitHub 사용자는 환경 변수로 받는다. Actions에서는 저장소 소유자가 그대로
 * 들어오고(`GITHUB_REPOSITORY_OWNER`), 손으로 돌릴 때는 직접 넣는다.
 *
 * 사용자를 모르는 것도 조회 실패와 같은 결과다. 둘 다 "커밋 없이 Note만으로
 * 판정을 쓴다"로 끝나므로 갈래를 늘리지 않는다.
 */
async function lookUpActivity(): Promise<ActivityOutcome> {
  const login = process.env.PORTRAIT_GITHUB_LOGIN ?? process.env.GITHUB_REPOSITORY_OWNER;

  if (login === undefined || login.trim() === "") {
    return { unavailable: "GitHub 사용자를 알 수 없다 (PORTRAIT_GITHUB_LOGIN이 비어 있다)" };
  }

  return await fetchGitHubActivity({
    login,
    token: process.env.GITHUB_TOKEN,
    since: utcDaysAgo(activityWindowDays - 1),
    until: utcDaysAgo(0),
  });
}

const root = process.cwd();
const model = await readRepository(root);
const standing = standingOf(model.notes);
const activity = await lookUpActivity();
const portrait = renderPortrait({
  standing,
  activity,
  contrasts: "activity" in activity ? contrastCandidates({ standing, activity: activity.activity }) : [],
});

console.log(`\n${portrait}`);

const outcome = await rewritePortrait({ root, contents: portrait });

if ("forbidden" in outcome) {
  // 관찰자가 관측되지 않는 말을 하면 발행이 아니라 실패다 (ADR-0005). 앞의
  // 판정은 그대로 남아 있다.
  console.error("금지 동사가 들어 있어 Portrait을 쓰지 않았다:");

  for (const { found, reason } of outcome.forbidden) {
    console.error(`  ${found} — ${reason}`);
  }

  process.exitCode = 1;
} else {
  console.log(`${outcome.written} 를 다시 썼다. 앞의 판정은 지워졌고 git이 들고 있다.`);
}

for (const { path, reason } of model.unreadable) {
  console.log(`읽지 못한 파일: ${path} (${reason})`);
}
