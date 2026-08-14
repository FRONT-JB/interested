import { tallyConcepts, type ConceptTally, type Note } from "../repository/read.ts";
import { tallyWeek } from "../trail/tally.ts";
import { previousWeek, weekOf } from "../trail/week.ts";

/**
 * 지배 Concept 하나와 그것이 연속으로 나타난 주 수. 둘을 한 자리에 두는 것은
 * "지금 무엇에 붙들려 있나"가 이번 주 한 주만으로는 답이 되지 않기 때문이다.
 * 3주 연속 나타난 `rsc`와 이번 주에 처음 나온 `rsc`는 다른 사실이다.
 */
export type ConceptStreak = { concept: string; weeks: number };

/**
 * Portrait이 말할 수 있는 것의 전부. 집계된 사실만 있고 해석은 없다 (ADR-0005).
 *
 * 시계를 보지 않는다. "지금"의 기준은 실행 시각이 아니라 가장 최근에 Note를 쓴
 * 주이므로, 같은 저장소를 언제 읽어도 같은 판정이 나온다.
 */
export type PortraitStanding = {
  noteCount: number;
  /** Note가 한 편이라도 있는 주의 수. 빈 주는 세지 않는다. */
  weekCount: number;
  latestWeek: string | null;
  latestDate: string | null;
  /** 가장 최근 주에 가장 몰린 Concept 전부. 동률이면 여럿이다. */
  dominant: ConceptStreak[];
  /** 저장소 전체 누적 빈도. 이번 주의 편중과 지금까지의 관심을 견주는 데 쓴다. */
  concepts: ConceptTally[];
};

/**
 * Note 목록에서 Portrait의 재료를 산출하는 순수 함수. 파일을 읽지도 쓰지도
 * 않으므로 호출자가 `readRepository`의 결과를 넣어 준다.
 *
 * 판정의 범위는 여기서 정해진다. 이 함수가 내놓지 않는 사실은 Portrait에
 * 쓸 수 없고, 그래서 관찰자가 지어낼 자리가 없다.
 */
export function standingOf(notes: readonly Note[]): PortraitStanding {
  const conceptsByWeek = conceptsPerWeek(notes);
  // 주 식별자는 자리 수가 고정이라 문자열 순서가 곧 시간 순서다.
  const latestWeek = [...conceptsByWeek.keys()].sort().at(-1) ?? null;

  return {
    noteCount: notes.length,
    weekCount: conceptsByWeek.size,
    latestWeek,
    latestDate: [...notes].map(({ date }) => date).sort().at(-1) ?? null,
    dominant:
      latestWeek === null
        ? []
        : // 동률에서 하나를 고르지 않는 것은 Trail과 같은 이유다 — 정렬의
          // 부작용이 사실인 척하게 된다.
          tallyWeek({ notes, week: latestWeek }).dominant.map((concept) => ({
            concept,
            weeks: streakOf({ conceptsByWeek, concept, until: latestWeek }),
          })),
    concepts: tallyConcepts(notes),
  };
}

/**
 * 그 Concept이 몇 주 연속 나타났는지. 세는 방향은 가장 최근 주에서 거꾸로이고,
 * 기준은 달력상의 직전 주다.
 *
 * Note가 없는 주를 만나면 거기서 끊긴다. 빈 주를 건너뛰고 이어 세면 두 달 전에
 * 한 번 나온 Concept이 "2주 연속"이 되어, 연속이라는 말이 뜻을 잃는다.
 */
function streakOf({
  conceptsByWeek,
  concept,
  until,
}: {
  conceptsByWeek: Map<string, Set<string>>;
  concept: string;
  until: string;
}): number {
  let weeks = 0;
  let week = until;

  while (conceptsByWeek.get(week)?.has(concept) === true) {
    weeks += 1;
    week = previousWeek(week);
  }

  return weeks;
}

/** 주별로 그 주에 등장한 Concept 이름들. Note가 없는 주는 열이 없다. */
function conceptsPerWeek(notes: readonly Note[]): Map<string, Set<string>> {
  const byWeek = new Map<string, Set<string>>();

  for (const note of notes) {
    const week = weekOf(note.date);
    const concepts = byWeek.get(week) ?? new Set<string>();

    for (const concept of note.concepts) {
      concepts.add(concept);
    }

    byWeek.set(week, concepts);
  }

  return byWeek;
}
