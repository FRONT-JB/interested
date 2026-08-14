import { conceptList } from "../concept/name.ts";
import type { ArcConceptFact, ArcEntryFacts } from "./entry.ts";

/**
 * 항목 한 줄. 날짜를 코드가 앞에 붙이는 것은, 자취를 읽는 쪽이 언제의 일인지를
 * 문장의 운에 맡기지 않게 하기 위해서다. 모델이 쓴 문장이든 조립한 문장이든
 * 같은 자리에 같은 형태로 놓인다.
 */
export function arcEntryLine({ date, prose }: { date: string; prose: string }): string {
  return `${date} · ${prose.trim()}`;
}

/**
 * 모델의 문장이 감사를 통과하지 못했을 때 대신 붙는 항목. 사실을 그대로 놓기만
 * 하므로 지어낼 자리가 없다 (ADR-0008).
 *
 * 되돌아간 항목도 Arc에 남는다. Portrait은 다음 실행이 같은 자리를 다시 쓰지만
 * Arc는 지워지지 않으므로, 이 문장은 그 자리에 그대로 있게 된다. 그래서 여기서
 * 하는 일은 짧게 사실을 적는 것뿐이고, 모델에게 허용된 것과 같은 한 문장이다.
 */
export function renderArcEntry(entry: ArcEntryFacts): string {
  const first = entry.concepts.filter(({ appearance }) => appearance === 1);
  const again = entry.concepts.filter(({ appearance }) => appearance > 1);

  const clauses = [
    ...(first.length === 0
      ? []
      : [`처음 나온 이름은 ${conceptList(first.map(({ concept }) => concept))}`]),
    ...(again.length === 0 ? [] : [`다시 나온 이름은 ${again.map(returningClause).join(", ")}`]),
  ];

  return `저장소의 ${entry.noteNumber}번째 Note에서 ${clauses.join("이고, ")}이다.`;
}

/**
 * 다시 나온 Concept 하나를 괄호 안에 접는다. 문장을 늘리지 않고 몇 번째인지와
 * 직전이 언제였는지를 함께 싣기 위해서다 — 항목은 한 문장이다.
 */
function returningClause({ concept, appearance, previousDate, weeksSince }: ArcConceptFact): string {
  const gap = weeksSince === null || weeksSince === 0 ? "같은 주" : `${weeksSince}주 만`;

  return `\`${concept}\`(${appearance}번째, 직전 ${previousDate ?? "없음"}, ${gap})`;
}
