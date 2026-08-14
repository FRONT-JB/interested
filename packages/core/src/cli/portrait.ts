// Portrait을 다시 쓴다. 판정의 재료는 `portrait/standing.ts`가, 문장은 모델이
// (`portrait/prose.ts`), 사실 대조는 `portrait/audit.ts`가, 파일 쓰기와 동사
// 게이트는 `portrait/rewrite.ts`가 하고 여기서는 그 사이를 잇는다.
//
// 모델이 감사를 통과하지 못하면 조립 판정으로 되돌린다 (ADR-0008). 갱신이
// 멈추지 않으면서 검증되지 않은 문장도 나가지 않는 자리는 그 하나뿐이다.
//
// Trail과 달리 이미 있는 파일을 덮는다. Portrait은 지금의 얼굴이므로 앞의
// 판정이 남아 있으면 그게 곧 거짓이 된다 (ADR-0005).

import { fetchGitHubActivity, type ActivityOutcome } from "../portrait/activity.ts";
import { factsFingerprint, portraitBrief } from "../portrait/brief.ts";
import { claudeCodeWriter } from "../portrait/claude.ts";
import { contrastCandidates } from "../portrait/contrast.ts";
import { writePortraitProse } from "../portrait/prose.ts";
import { renderPortrait } from "../portrait/render.ts";
import { readPortraitStamp, rewritePortrait } from "../portrait/rewrite.ts";
import { standingOf } from "../portrait/standing.ts";
import { readRepository } from "../repository/read.ts";
import { renderMarkdown } from "../repository/write.ts";

/**
 * 활동을 세는 창의 길이. 오늘까지 이만큼 거슬러 올라간다.
 *
 * 관심을 잰 주와 창을 맞추지 않는다. 맞추면 Note를 쓴 지 오래된 날에는 창도
 * 함께 과거로 밀려나는데, 이벤트 API는 최근 것만 들고 있어 그 창의 활동을
 * 다시 조회할 수 없다. 그러면 같은 과거 주에 대해 어제는 "푸시 70회",
 * 오늘은 "활동 없음"이라고 말하게 된다. 창을 늘 최근으로 두고 Portrait에 두
 * 기간을 각각 밝히는 쪽이 사실에 가깝다.
 */
const activityWindowDays = 7;

/**
 * 창의 기준은 UTC다. GitHub 이벤트의 시각이 UTC이므로 로컬 날짜로 창을 자르면
 * 시차만큼의 활동이 창 밖으로 밀려난다.
 */
function utcDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * GitHub 사용자는 환경 변수로 받는다. Actions에서는 저장소 소유자가 그대로
 * 들어오고(`GITHUB_REPOSITORY_OWNER`), 손으로 돌릴 때는 직접 넣는다.
 *
 * 사용자를 모르는 것도 조회 실패와 같은 결과다. 둘 다 "활동 없이 Note만으로
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

/**
 * 문장을 누가 쓰는지. `PORTRAIT_PROSE=template`은 모델을 아예 부르지 않는
 * 탈출구다 — 토큰이 없는 자리에서도, 모델이 계속 걸리는 날에도 갱신은 돌아야 한다.
 */
const prose = process.env.PORTRAIT_PROSE === "template" ? "template" : "model";

/**
 * 재료가 그대로여도 다시 쓰게 하는 스위치. 프롬프트를 손본 뒤에 쓴다 — 지문은
 * 재료의 것이고 문장을 만드는 방식이 바뀐 것은 재료에 나타나지 않는다.
 */
const forced = process.env.PORTRAIT_FORCE === "1";

const root = process.cwd();
const model = await readRepository(root);
const standing = standingOf(model.notes);
const activity = await lookUpActivity();
const contrasts = "activity" in activity ? contrastCandidates({ standing, activity: activity.activity }) : [];
const brief = portraitBrief({ standing, activity, contrasts });
const facts = factsFingerprint(brief);
const stamp = await readPortraitStamp({ root });

// 재료도 그대로고 문장을 쓴 주체도 그대로면 다시 쓸 것이 없다. 모델을 부르지
// 않고 끝내므로 같은 사실을 다르게 쓴 커밋이 쌓이지 않는다.
if (!forced && stamp.facts === facts && stamp.prose === prose) {
  console.log(`\n사실이 그대로다 (${facts}) — 앞의 판정을 그대로 뒀다.`);
} else {
  const assembled = renderPortrait({ standing, activity, contrasts });
  const written =
    prose === "template"
      ? { rejected: ["조립으로 쓰라고 지시받았다"] }
      : await writePortraitProse({ brief, writer: claudeCodeWriter() });

  if ("rejected" in written && prose === "model") {
    console.error("모델의 문장이 감사를 통과하지 못해 조립 판정으로 되돌렸다:");

    for (const reason of written.rejected) {
      console.error(`  ${reason}`);
    }
  }

  const contents = renderMarkdown({
    // 도장을 남긴다. 다음 실행이 이 두 값을 보고 다시 쓸지를 정한다.
    frontmatter: { facts, prose: "prose" in written ? "model" : "template" },
    body: "prose" in written ? written.prose : assembled,
  });

  console.log(`\n${contents}`);

  const outcome = await rewritePortrait({ root, contents });

  if ("forbidden" in outcome) {
    // 관찰자가 관측되지 않는 말을 하면 발행이 아니라 실패다 (ADR-0005). 감사를
    // 지난 문장이 여기서 걸리는 것은 두 검사가 어긋났다는 뜻이므로 조용히 넘기지
    // 않는다. 앞의 판정은 그대로 남아 있다.
    console.error("금지 동사가 들어 있어 Portrait을 쓰지 않았다:");

    for (const { found, reason } of outcome.forbidden) {
      console.error(`  ${found} — ${reason}`);
    }

    process.exitCode = 1;
  } else {
    console.log(`${outcome.written} 를 다시 썼다. 앞의 판정은 지워졌고 git이 들고 있다.`);
  }
}

for (const { path, reason } of model.unreadable) {
  console.log(`읽지 못한 파일: ${path} (${reason})`);
}
