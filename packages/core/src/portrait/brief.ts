import { createHash } from "node:crypto";

import { conceptList } from "../concept/name.ts";
import type { ActivityOutcome } from "./activity.ts";
import type { Contrast } from "./contrast.ts";
import type { PortraitStanding } from "./standing.ts";

/**
 * 모델에게 넘기는 재료. 이 목록 밖의 말은 Portrait에 들어올 수 없고, 들어오면
 * 감사에서 걸린다 (`portrait/audit.ts`). 관찰자가 지어낼 자리를 재료 쪽에서
 * 먼저 닫아 두는 것이다 (ADR-0008).
 */
export type PortraitBrief = {
  /** 사람이 읽는 사실 한 줄씩. 산문에 나오는 숫자는 이 안에 있어야 한다. */
  facts: string[];
  /** 산문에 쓸 수 있는 이름 전부 — Concept slug, 저장소 이름, 언어 이름. */
  names: string[];
};

/**
 * 집계 결과를 모델의 재료로 편다. 파일도 네트워크도 건드리지 않으므로 같은
 * 모델에 같은 재료를 넣으면 같은 사실이 들어간다.
 */
export function portraitBrief({
  standing,
  activity,
  contrasts,
}: {
  standing: PortraitStanding;
  activity: ActivityOutcome;
  contrasts: readonly Contrast[];
}): PortraitBrief {
  const facts = [...standingFacts(standing), ...activityFacts(activity), ...contrastFacts(contrasts)];

  return { facts, names: namesIn({ standing, activity }) };
}

function standingFacts(standing: PortraitStanding): string[] {
  const { noteCount, weekCount, latestWeek, latestDate, dominant, concepts } = standing;

  if (noteCount === 0 || latestWeek === null || latestDate === null) {
    return ["아직 Note가 한 편도 없다."];
  }

  return [
    `Note는 지금까지 ${noteCount}편이고 ${weekCount}주에 걸쳐 썼다.`,
    `가장 최근에 Note를 쓴 주는 ${latestWeek}이고, 마지막 Note는 ${latestDate}에 썼다.`,
    `그 주에 가장 몰린 Concept은 ${conceptList(dominant.map(({ concept }) => concept))}이다.`,
    `연속으로 나타난 주 — ${dominant
      .map(({ concept, weeks }) => `\`${concept}\` ${weeks}주`)
      .join(", ")}`,
    `지금까지의 누적 — ${concepts
      .map(({ concept, noteCount: count }) => `\`${concept}\` ${count}편`)
      .join(", ")}`,
  ];
}

/**
 * 활동 사실. 창의 양끝을 그대로 넣는 것은, 관심을 잰 주와 활동을 센 창이 다른
 * 기간이어서 산문이 둘을 각각 밝혀야 하기 때문이다.
 *
 * 언어는 저장소의 것으로 적는다. 창 안의 푸시가 무슨 언어였는지는 조회되지
 * 않는다 (ADR-0007).
 */
function activityFacts(outcome: ActivityOutcome): string[] {
  if ("unavailable" in outcome) {
    return [`GitHub 활동은 조회하지 못했다 — ${outcome.unavailable}.`];
  }

  const { since, until, pushes, repositories } = outcome.activity;

  return [
    `${since}부터 ${until}까지 공개 푸시는 ${pushes}회다. 이 기간은 Note를 잰 주와 다르다.`,
    ...(repositories.length === 0
      ? ["그 기간에 푸시가 간 저장소는 없다."]
      : [
          `푸시가 간 저장소 — ${repositories
            .map(
              ({ repository, pushes: count, language }) =>
                `\`${repository}\` ${count}회${language === null ? "" : `(그 저장소의 주 언어는 \`${language}\`)`}`,
            )
            .join(", ")}`,
        ]),
  ];
}

/** 대비 후보. 판정은 하지 않고 두 사실이 같은 이름을 가리키는지만 적는다. */
function contrastFacts(contrasts: readonly Contrast[]): string[] {
  return contrasts.map(
    ({ concept, repository, language, aligned }) =>
      `대비 후보 — 관심은 \`${concept}\`, 푸시가 몰린 곳은 \`${repository}\`${
        language === null ? "" : `(주 언어 \`${language}\`)`
      }. 두 이름은 ${aligned ? "같은 곳을 가리킨다" : "서로 다르다"}.`,
  );
}

/**
 * 산문에 허용되는 이름들. 모델이 없는 저장소나 없는 Concept을 만들어 내면
 * 감사가 이 목록으로 잡는다.
 */
function namesIn({
  standing,
  activity,
}: {
  standing: PortraitStanding;
  activity: ActivityOutcome;
}): string[] {
  const names = [
    ...standing.dominant.map(({ concept }) => concept),
    ...standing.concepts.map(({ concept }) => concept),
  ];

  if ("activity" in activity) {
    for (const { repository, language } of activity.activity.repositories) {
      names.push(repository);

      if (language !== null) {
        names.push(language);
      }
    }
  }

  return [...new Set(names)];
}

/**
 * 재료를 프롬프트 하나로 조립한다. 규칙을 재료와 같은 자리에 두는 것은, 모델이
 * 읽는 것과 감사가 검사하는 것이 갈리면 매번 걸리는 지시가 프롬프트에 남기
 * 때문이다 — 여기 적힌 금지가 곧 `portrait/audit.ts`의 검사다.
 */
export function portraitPrompt(brief: PortraitBrief): string {
  return [
    "너는 이 저장소의 관찰자다. 아래 사실만으로 Portrait 한 편을 쓴다.",
    "Portrait은 지금 이 사람이 무엇에 붙들려 있는지에 대한 짧은 판정이다.",
    "",
    "## 사실",
    "",
    ...brief.facts.map((fact) => `- ${fact}`),
    "",
    "## 쓸 수 있는 이름",
    "",
    `- ${brief.names.length === 0 ? "없다" : brief.names.map((name) => `\`${name}\``).join(", ")}`,
    "",
    "## 쓰는 법",
    "",
    "- 첫 줄은 `# Portrait`이다. 그 밖의 소제목은 두지 않는다.",
    "- 4~6문장. 두세 문장씩 문단으로 묶고 문단 사이를 빈 줄로 나눈다.",
    "- 첫 문장은 지금 무엇에 관심이 있는지다. 숫자 나열로 시작하지 않는다.",
    "- 사실을 옮겨 적지 않는다. 같은 사실을 두 번 말하지 않고, 저장소를 전부 늘어놓지 않는다.",
    "- 평서체이고 관찰자의 목소리다. 경어체를 쓰지 않는다.",
    "- 위 사실 밖의 것은 쓰지 않는다. 새 숫자를 만들지 않는다. 사실에 없는 수는 한 개도 쓸 수 없다.",
    "- 이름은 위 목록에 있는 것만 쓰고, 쓸 때는 백틱으로 감싼다.",
    "- 관측되는 동사만 쓴다 — 읽었다, 돌아왔다, 옮겨갔다, 조사하고 있다, 관심이 있다.",
    "- 금지 — 습득했다, 익혔다, 이해했다, 능숙하다. 숙련이나 성취를 말하는 동사 전부.",
    "- 해석하지 않는다. 집계된 사실과 사실끼리의 대비까지가 전부이고, 왜 그랬는지는 쓰지 않는다.",
    "- 두 기간이 다르면 각각 밝힌다. 저장소의 주 언어를 그 기간에 쓴 언어로 말하지 않는다.",
    "- 출력은 Portrait 본문뿐이다. 설명도 인사도 코드 블록도 붙이지 않는다.",
  ].join("\n");
}

/**
 * 재료의 지문. 사실이 그대로면 모델을 부르지 않고 앞의 문장을 그대로 둔다 —
 * 같은 사실을 매일 다르게 쓴 커밋이 쌓이면 갱신 기록이 문장 취향의 기록이 된다.
 */
export function factsFingerprint(brief: PortraitBrief): string {
  return createHash("sha256").update(JSON.stringify(brief)).digest("hex").slice(0, 12);
}
