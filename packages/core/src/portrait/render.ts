import { conceptCountLine, conceptList } from "../concept/name.ts";
import { renderMarkdown } from "../repository/write.ts";
import type { ActivityOutcome } from "./activity.ts";
import type { Contrast } from "./contrast.ts";
import type { ConceptStreak, PortraitStanding } from "./standing.ts";

/**
 * 재료 하나를 Portrait 한 편으로 조립한다. 여기서 다시 세지 않는다 — 들어온
 * 값이 곧 사실이고, 이 모듈이 하는 일은 그 사실을 문장으로 놓는 것뿐이다.
 *
 * Trail 초안과 달리 사람이 채울 자리를 비워 두지 않는다. Portrait은 손이 가지
 * 않고 저절로 자라는 쪽이고(ADR-0005), 빈 자리를 남기면 자동 갱신이 그 자리를
 * 매번 지운다.
 *
 * 사람이 쓴 문장을 그대로 옮기지 않는다 — Note 제목이나 Take를 실으면 그 안의
 * 동사가 동사 게이트에 걸려 자동 갱신이 멈춘다. 여기 들어오는 것은 Concept
 * slug, 저장소 이름, 날짜, 숫자뿐이다.
 */
export function renderPortrait({
  standing,
  activity,
  contrasts,
}: {
  standing: PortraitStanding;
  activity: ActivityOutcome;
  contrasts: readonly Contrast[];
}): string {
  return renderMarkdown({
    body: [
      "# Portrait",
      "",
      ...renderJudgement(standing),
      ...renderInterest(standing),
      ...renderAction(activity),
      ...renderContrast(contrasts),
    ].join("\n"),
  });
}

/** 판정 — 지금 무엇에 붙들려 있는지. 관측되는 동사만 쓴다 (ADR-0005). */
function renderJudgement(standing: PortraitStanding): string[] {
  const { noteCount, weekCount, latestWeek, latestDate, dominant } = standing;

  // Note가 없는데 관심을 말하면 그 문장의 근거가 어디에도 없다.
  if (noteCount === 0 || latestWeek === null || latestDate === null) {
    return ["아직 Note가 없다. 기록이 쌓이면 관찰자가 이 자리를 다시 쓴다."];
  }

  return [
    ...renderDominant(dominant),
    "",
    `가장 최근에 Note를 쓴 주는 ${latestWeek}이다. Note는 지금까지 ${noteCount}편이고 ${weekCount}주에 걸쳐 썼다. 마지막 Note는 ${latestDate}에 썼다.`,
  ];
}

/**
 * 지배 Concept과 연속 등장 주 수. 하나일 때와 여럿일 때 문장이 갈리는 것은
 * 조사 때문이다 — 이름 뒤에 `는`을 붙이면 slug의 받침을 발음으로 판정해야 한다.
 * 여럿이면 이름 뒤에 조사가 붙지 않는 대시 나열로 둔다.
 */
function renderDominant(dominant: readonly ConceptStreak[]): string[] {
  const [first, ...rest] = dominant;

  if (first === undefined) {
    return [];
  }

  const names = conceptList(dominant.map(({ concept }) => concept));

  if (rest.length === 0) {
    return [`${names}에 관심이 있다. ${first.weeks}주 연속 나타났다.`];
  }

  return [
    `${names}에 관심이 있다.`,
    "",
    `연속으로 나타난 주 — ${dominant.map(({ concept, weeks }) => `\`${concept}\` ${weeks}주`).join(", ")}`,
  ];
}

/**
 * 관심 — 지금까지의 누적 빈도. Portrait은 짧은 판정이므로 목록이 길어지면
 * 앞의 몇 개만 두고 남은 수를 밝힌다. 조용히 자르면 이 목록이 전부인 것처럼
 * 읽힌다.
 */
const interestLimit = 8;

function renderInterest({ concepts }: PortraitStanding): string[] {
  if (concepts.length === 0) {
    return [];
  }

  const shown = concepts.slice(0, interestLimit);
  const hidden = concepts.length - shown.length;

  return [
    "",
    "## 관심",
    "",
    ...shown.map(conceptCountLine),
    ...(hidden === 0 ? [] : [`- 그 밖에 ${hidden}개`]),
  ];
}

/**
 * 행동 — 그 창 안의 공개 푸시. 기간을 문장에 밝혀 적는 것은, 관심을 잰 주와
 * 활동을 센 창이 같은 기간이 아니기 때문이다. 둘을 견주려면 각자의 기간이
 * 보여야 한다.
 *
 * 세는 단위가 커밋이 아니라 푸시인 이유는 `portrait/activity.ts`에 있다 —
 * 공개 이벤트가 커밋 수를 주지 않는다.
 *
 * 조회에 실패하면 그 사실을 적는다. GitHub은 Portrait 안에서만 쓰는 외부
 * 재료이므로 없으면 없다고 쓰고 넘어간다 (ADR-0005).
 */
function renderAction(outcome: ActivityOutcome): string[] {
  if ("unavailable" in outcome) {
    return [
      "",
      "## 행동",
      "",
      `GitHub 활동을 조회하지 못했다 — ${outcome.unavailable}. 이 판정에는 활동이 들어가지 않았다.`,
    ];
  }

  const { since, until, pushes, repositories } = outcome.activity;

  return [
    "",
    "## 행동",
    "",
    `${since}부터 ${until}까지 공개 푸시 ${pushes}회.`,
    ...(repositories.length === 0
      ? []
      : [
          "",
          ...repositories.map(
            ({ repository, pushes: count, language }) =>
              // 언어는 그 저장소 전체의 것이고 이 창의 푸시가 무슨 언어였는지가
              // 아니다. "주 언어"라고 밝혀 적지 않으면 창 밖의 사실이 창 안의
              // 사실로 읽힌다 (ADR-0005).
              `- \`${repository}\` ${count}회${language === null ? "" : ` — 주 언어 \`${language}\``}`,
          ),
        ]),
  ];
}

/**
 * 대비 — 관심과 행동을 나란히 둔다. 여기까지가 관찰자에게 허용된 범위이고,
 * "왜 그랬는지"는 쓰지 않는다 (ADR-0005).
 *
 * 같은 저장소를 가리키는 후보는 한 줄로 모은다. 관심 셋이 한 자리를 나눠 가진
 * 주에 같은 문장이 세 번 서면, 읽는 사람이 세 개의 사실로 잘못 읽는다.
 */
function renderContrast(contrasts: readonly Contrast[]): string[] {
  if (contrasts.length === 0) {
    return [];
  }

  const grouped = new Map<string, { concepts: string[]; contrast: Contrast }>();

  for (const contrast of contrasts) {
    const { aligned, repository, language, pushes } = contrast;
    // 같은 곳을 같은 방식으로 가리키는 후보만 한 줄이 된다. 저장소가 다르면
    // 다른 사실이므로 줄도 갈린다.
    const key = JSON.stringify([aligned, repository, language, pushes]);
    const group = grouped.get(key) ?? { concepts: [], contrast };

    group.concepts.push(contrast.concept);
    grouped.set(key, group);
  }

  // 대비를 먼저, 일치를 뒤에. 관심과 행동이 갈린 쪽이 Portrait이 말할 것이다.
  const lines = [...grouped.values()].sort(
    (a, b) => Number(a.contrast.aligned) - Number(b.contrast.aligned),
  );

  return ["", "## 대비", "", ...lines.map(renderContrastLine)];
}

/**
 * 두 사실을 한 줄에 나란히 둔다. 언어를 저장소의 것으로 따로 떼어 적는 것은,
 * 푸시 횟수는 창 안의 집계이고 주 언어는 저장소 전체의 비율이어서 한 덩어리로
 * 붙이면 "이번 주에 그 언어를 썼다"는 조회되지 않은 말이 되기 때문이다.
 */
function renderContrastLine({
  concepts,
  contrast: { repository, language, pushes, aligned },
}: {
  concepts: string[];
  contrast: Contrast;
}): string {
  const facts = `- 관심이 몰린 곳은 ${conceptList(concepts)}, 푸시가 몰린 곳은 \`${repository}\` ${pushes}회.`;

  if (language === null) {
    return facts;
  }

  return aligned
    ? `${facts} 그 저장소의 주 언어도 같은 이름을 가리킨다 — \`${language}\`.`
    : `${facts} 그 저장소의 주 언어는 \`${language}\`.`;
}
