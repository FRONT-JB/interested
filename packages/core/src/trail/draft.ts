import { conceptCountLine, conceptList } from "../concept/name.ts";
import { renderMarkdown } from "../repository/write.ts";
import type { WeekTally } from "./tally.ts";

/**
 * 집계 결과 하나를 Trail 초안 한 편으로 조립한다. 여기서 다시 세지 않는다 —
 * 들어온 값이 곧 사실이고, 이 모듈이 하는 일은 그 사실을 문장으로 놓는 것뿐이다.
 * 집계와 표현이 파일로 갈려 있어야 나중에 표현만 다른 것으로 갈아 끼울 수 있다.
 *
 * 문체는 Note와 같은 평서체 1인칭이다. 격일로 쌓은 건조한 Note 옆에 위트로
 * 채운 발행물이 서면 저장소가 두 인격처럼 읽힌다.
 *
 * 자동으로 나오는 문장은 집계된 사실과 사실끼리의 대비까지만 말한다
 * (ADR-0005). "몰렸다", "새로 등장했다", "사라졌다"는 세어 보면 증명되지만
 * "익혔다"는 기록으로 증명되지 않는다.
 */
export function renderTrailDraft(tally: WeekTally): string {
  return renderMarkdown({
    frontmatter: { week: tally.week, start: tally.start, end: tally.end },
    body: renderBody(tally),
  });
}

function renderBody(tally: WeekTally): string {
  const { week, start, end, notes } = tally;

  // Note가 없는 주는 여기서 끝난다. 없는 주에 대해 몰린 곳과 옮겨간 곳을
  // 늘어놓으면, 발행할 것이 없다는 사실이 형식에 덮인다.
  if (notes.length === 0) {
    return [`# ${week}`, "", `${start}부터 ${end}까지 쓴 Note가 없다.`].join("\n");
  }

  return [
    `# ${week}`,
    "",
    `${start}부터 ${end}까지 Note ${notes.length}편을 썼다.`,
    "",
    // 위트가 허용되는 자리는 여기 한 줄뿐이고, 그 한 줄은 관점이므로 기계가
    // 지어내지 않는다 (ADR-0004). 눈에 보이는 자리로 비워 둬야 사람이
    // 고치지 않은 초안을 실수로 발행할 수 없다.
    "> 하이라이트 한 줄 — 여기는 사람이 쓴다.",
    ...renderCrowding(tally),
    ...renderMovement(tally),
    ...renderNotes(tally),
  ].join("\n");
}

/** 편중 — 이번 주 Note가 어느 Concept에 몰렸는지. */
function renderCrowding({ concepts, dominant }: WeekTally): string[] {
  if (concepts.length === 0) {
    return [];
  }

  return [
    "",
    "## 몰린 곳",
    "",
    ...concepts.map(conceptCountLine),
    "",
    dominant.length === 1
      ? `이번 주는 ${conceptList(dominant)}에 가장 몰렸다.`
      : `이번 주는 ${conceptList(dominant)}에 똑같이 몰렸다.`,
  ];
}

/**
 * 이동 — 직전 주와 견줘 무엇이 들어오고 나갔는지. 세 종류를 각각 다른 줄에
 * 두는 것은 집계에서 갈라 놓은 이유와 같다.
 */
function renderMovement({ movement }: WeekTally): string[] {
  const { entered, left, moved } = movement;
  const lines: string[] = [];

  if (entered.length > 0) {
    lines.push(`- 새로 등장 — ${conceptList(entered)}`);
  }

  if (left.length > 0) {
    lines.push(`- 사라짐 — ${conceptList(left)}`);
  }

  if (moved.length > 0) {
    lines.push(
      `- 순위 변동 — ${moved
        .map(({ concept, from, to }) => `\`${concept}\` ${from}위에서 ${to}위로`)
        .join(", ")}`,
    );
  }

  return lines.length === 0 ? [] : ["", "## 옮겨간 곳", "", ...lines];
}

/** 그 주에 읽은 것. Note는 Source를 대신하지 않으므로 원문으로 가는 길을 남긴다 (ADR-0003). */
function renderNotes({ notes }: WeekTally): string[] {
  return [
    "",
    "## 읽은 것",
    "",
    ...notes.map(({ title, source, take }) => `- [${title}](${source}) — ${take}`),
  ];
}

