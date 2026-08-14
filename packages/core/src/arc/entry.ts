import type { Note } from "../repository/read.ts";
import { previousWeek, weekOf } from "../trail/week.ts";
import type { ArcStamp } from "./append.ts";

/**
 * Concept 하나가 이 Note에서 놓이는 자리. 처음 나온 것인지, 몇 번째인지, 직전은
 * 언제였는지까지가 관찰자가 말할 수 있는 전부다 (ADR-0005).
 */
export type ArcConceptFact = {
  concept: string;
  /** 이 Note를 포함해 몇 번째 등장인가. 처음이면 1이다. */
  appearance: number;
  /** 직전에 이 Concept이 나온 Note의 날짜. 처음이면 null이다. */
  previousDate: string | null;
  /** 직전 등장 주와 이 Note의 주 사이 간격. 같은 주면 0이고 처음이면 null이다. */
  weeksSince: number | null;
};

/** Arc에 항목 하나로 붙는 Note와 그 재료. */
export type ArcEntryFacts = {
  path: string;
  date: string;
  /** 이 Note가 저장소의 몇 번째 Note인가. */
  noteNumber: number;
  concepts: ArcConceptFact[];
};

/**
 * 이번에 담을 항목들과, 워터마크 뒤에 남은 편 수.
 *
 * `behind`가 0이 아니면 담기지 않은 Note가 워터마크보다 앞선 이름으로 들어와
 * 있다는 뜻이다. 조용히 지나가지 않게 부르는 쪽이 알린다.
 */
export type ArcSelection = { entries: ArcEntryFacts[]; behind: number };

/**
 * 아직 Arc에 담기지 않은 Note를 골라 각각의 재료를 산출하는 순수 함수. 파일을
 * 읽지도 쓰지도 않으므로 호출자가 `readRepository`의 결과와 도장을 넣어 준다.
 *
 * 담을 것을 고르는 기준은 파일 이름이다. Note의 이름은 날짜로 시작하므로
 * 이름 순서가 곧 시간 순서이고, 마지막으로 담은 이름보다 뒤에 오는 것이 새로
 * 들어온 것이다.
 *
 * 재료는 그 Note까지의 기록만으로 센다. Arc의 항목은 그 시점에 무엇이 처음이고
 * 무엇이 돌아왔는지를 말하므로, 나중에 들어온 Note를 셈에 넣으면 이미 붙어 있는
 * 문장과 어긋난다.
 */
export function selectArcEntries({
  notes,
  stamp,
}: {
  notes: readonly Note[];
  stamp: ArcStamp;
}): ArcSelection {
  const ordered = [...notes].sort((a, b) => comparePaths(a.path, b.path));
  const covered = stamp.covered;
  const behindIndex = covered === null ? 0 : ordered.filter(({ path }) => path <= covered).length;

  return {
    entries: ordered
      .map((note, index) => ({ note, index }))
      .filter(({ note }) => covered === null || note.path > covered)
      .map(({ note, index }) => factsOf({ note, earlier: ordered.slice(0, index), index })),
    // 앞선 실행이 센 편 수보다 워터마크 뒤가 많으면 그 차이가 담기지 않은 Note다.
    behind: Math.max(0, behindIndex - (stamp.notes ?? behindIndex)),
  };
}

/**
 * 이름을 견주는 유일한 방법. 정렬과 워터마크 판정이 같은 함수를 쓰는 것은, 둘이
 * 갈리면 이미 담은 Note가 다시 담기기 때문이다 — `localeCompare`로 줄을 세우고
 * `>`로 담을 것을 고르면 `Beta.md`와 `alpha.md`의 순서가 두 곳에서 뒤집힌다.
 * Arc는 지워지지 않으므로 그렇게 붙은 항목은 손으로 지워야 한다.
 */
function comparePaths(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function factsOf({
  note,
  earlier,
  index,
}: {
  note: Note;
  earlier: readonly Note[];
  index: number;
}): ArcEntryFacts {
  return {
    path: note.path,
    date: note.date,
    noteNumber: index + 1,
    concepts: note.concepts.map((concept) => conceptFactOf({ concept, note, earlier })),
  };
}

function conceptFactOf({
  concept,
  note,
  earlier,
}: {
  concept: string;
  note: Note;
  earlier: readonly Note[];
}): ArcConceptFact {
  const appeared = earlier.filter((before) => before.concepts.includes(concept));
  const previous = appeared.at(-1) ?? null;

  return {
    concept,
    appearance: appeared.length + 1,
    previousDate: previous?.date ?? null,
    weeksSince: previous === null ? null : weeksBetween(weekOf(previous.date), weekOf(note.date)),
  };
}

/**
 * 두 주 사이의 간격을 주 수로. 세는 방향은 뒤에서 앞이고 기준은 달력상의 직전
 * 주다 — 연속을 세는 자리와 같은 기준을 쓴다 (`portrait/standing.ts`).
 *
 * 날짜의 차를 7로 나누지 않는 것은, 이 저장소가 관심을 주 단위로 묶기 때문이다.
 * 6일 차이가 주를 넘으면 1주이고 같은 주에 있으면 0주다.
 */
function weeksBetween(earlier: string, later: string): number {
  let weeks = 0;
  let week = later;

  while (week > earlier) {
    week = previousWeek(week);
    weeks += 1;
  }

  return weeks;
}
