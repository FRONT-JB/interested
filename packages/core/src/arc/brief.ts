import { conceptList } from "../concept/name.ts";
import type { ArcConceptFact, ArcEntryFacts } from "./entry.ts";

/**
 * 모델에게 넘기는 재료. 이 목록 밖의 말은 Arc에 들어올 수 없고, 들어오면
 * 감사에서 걸린다 (`arc/audit.ts`).
 *
 * Take와 제목은 넣지 않는다. 둘 다 사람이 쓴 문장이므로 관찰자가 자기 문장으로
 * 옮기면 Arc 안에서 누구의 말인지가 흐려진다 (ADR-0010). 관찰자가 말할 것은
 * 그 Note가 앞의 기록과 어떻게 놓이는지다.
 */
export type ArcBrief = {
  /** 사람이 읽는 사실 한 줄씩. 항목에 나오는 숫자는 이 안에 있어야 한다. */
  facts: string[];
  /** 항목에 쓸 수 있는 이름 전부 — 이 Note가 참조하는 Concept slug. */
  names: string[];
  /** 이 Note를 쓴 날. 항목 앞에 붙는 날짜이므로 문장에서는 다시 적지 않는다. */
  date: string;
  /**
   * 문장에 적어도 되는 날짜 — 다시 나온 Concept의 직전 등장 날짜들.
   *
   * 같은 날에 Note를 두 편 쓰면 직전 등장 날짜가 이 Note의 날짜와 같아진다.
   * 그때는 같은 글자를 적는 것이 옳으므로, 감사가 이 목록을 보고 되돌리지 않는다.
   */
  previousDates: string[];
};

/** 항목 하나의 재료를 편다. 파일도 네트워크도 건드리지 않는다. */
export function arcBrief(entry: ArcEntryFacts): ArcBrief {
  const first = entry.concepts.filter(({ appearance }) => appearance === 1);
  const again = entry.concepts.filter(({ appearance }) => appearance > 1);

  return {
    facts: [
      `${entry.date}에 Note 한 편이 들어왔다. 저장소의 ${entry.noteNumber}번째 Note다.`,
      ...(first.length === 0
        ? []
        : [`처음 나온 이름 — ${conceptList(first.map(({ concept }) => concept))}`]),
      ...again.map(returningFact),
    ],
    names: entry.concepts.map(({ concept }) => concept),
    date: entry.date,
    previousDates: [
      ...new Set(again.map(({ previousDate }) => previousDate).filter((date) => date !== null)),
    ],
  };
}

/**
 * 다시 나온 Concept 하나. 몇 번째인지와 직전이 언제였는지를 함께 적는 것은,
 * 이어진 관심과 끊긴 관심이 이 두 값의 차이로만 갈리기 때문이다.
 */
function returningFact({ concept, appearance, previousDate, weeksSince }: ArcConceptFact): string {
  const gap =
    weeksSince === null || weeksSince === 0 ? "같은 주에 다시 나왔다" : `${weeksSince}주 만이다`;

  return `\`${concept}\`는 ${appearance}번째 등장이고 직전은 ${previousDate ?? "없다"}다 — ${gap}.`;
}

/**
 * 재료를 프롬프트 하나로 조립한다. 규칙을 재료와 같은 자리에 두는 것은, 모델이
 * 읽는 것과 감사가 검사하는 것이 갈리면 매번 걸리는 지시가 프롬프트에 남기
 * 때문이다 — 여기 적힌 금지가 곧 `arc/audit.ts`의 검사다.
 */
export function arcPrompt(brief: ArcBrief): string {
  return [
    "너는 이 저장소의 관찰자다. 아래 사실만으로 Arc에 붙일 항목 하나를 쓴다.",
    "Arc는 사람이 쓴 씨앗 위에 Note가 쌓일 때마다 길어지는 하나의 서사이고, 앞의 내용은 지워지지 않는다.",
    "네가 쓰는 것은 그 서사에 덧붙는 한 항목이다.",
    "",
    "## 사실",
    "",
    ...brief.facts.map((fact) => `- ${fact}`),
    "",
    "## 쓸 수 있는 이름",
    "",
    `- ${brief.names.map((name) => `\`${name}\``).join(", ")}`,
    "",
    "## 쓰는 법",
    "",
    "- 한 줄, 한 문장으로 쓴다. 줄을 바꾸지 않고 두 문장을 쓰지 않는다. 제목도 목록도 인용 블록도 쓰지 않는다.",
    "- 인용 블록(`>`)은 본인이 직접 넣는 문장의 자리다. 관찰자는 그 목소리를 쓰지 않는다.",
    `- 이 Note를 쓴 날(${brief.date})은 항목 앞에 이미 적히므로 문장에서 다시 적지 않는다. 어떤 표기로도 적지 않는다.`,
    "- 직전 등장 날짜는 적어도 된다. 날짜는 `2026-07-08` 형태로만 쓴다 — `2026년 7월 8일`처럼 쓰지 않는다.",
    "- 무엇이 처음 나왔고 무엇이 돌아왔는지를 말한다. 돌아온 것이 있으면 얼마 만인지를 함께 적는다.",
    "- 앞일을 말하지 않는다. 무엇이 다시 나올지, 무엇이 이어질지는 아직 기록에 없다.",
    "- 평서체이고 관찰자의 목소리다. 경어체를 쓰지 않는다.",
    "- 위 사실 밖의 것은 쓰지 않는다. 새 숫자를 만들지 않는다. 사실에 없는 수는 한 개도 쓸 수 없다.",
    "- 이름은 위 목록에 있는 것만 쓰고, 쓸 때는 백틱으로 감싼다.",
    "- 날짜는 사실에 적힌 형태 그대로 쓴다. 줄여 쓰지 않는다.",
    "- 수를 쓸 때는 사실에 적힌 단위를 그대로 쓴다 — `2번째`를 `두 번째`로 바꾸지 않는다.",
    "- 관측되는 동사만 쓴다 — 읽었다, 돌아왔다, 옮겨갔다, 나왔다, 관심이 있다.",
    "- 금지 — 습득했다, 익혔다, 이해했다, 능숙하다. 숙련이나 성취를 말하는 동사 전부.",
    "- 해석하지 않는다. 집계된 사실과 사실끼리의 대비까지가 전부이고, 왜 그랬는지는 쓰지 않는다.",
    "- 출력은 항목 본문뿐이다. 설명도 인사도 코드 블록도 붙이지 않는다.",
  ].join("\n");
}
