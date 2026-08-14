import { tallyConcepts, type ConceptTally, type Note } from "../repository/read.ts";
import { previousWeek, weekOf, weekRange } from "./week.ts";

/**
 * 그 주 Concept 하나의 자리. `rank`는 1부터 세고, 등장 횟수가 같으면 같은
 * 값을 나눠 갖는다 — 동률을 이름순으로 갈라 놓으면 이름이 바뀐 것뿐인데도
 * 순위가 움직인 것으로 보인다.
 */
export type WeekConceptTally = ConceptTally & { rank: number };

/** 순위가 바뀐 Concept 하나. `from`이 직전 주, `to`가 이번 주다. */
export type RankChange = {
  concept: string;
  from: number;
  to: number;
};

/**
 * 직전 주와 이번 주 사이의 이동. 세 종류를 한 배열에 섞지 않는 것은,
 * "새로 등장"과 "사라짐"과 "순위 변동"이 서로 다른 사실이기 때문이다.
 */
export type ConceptMovement = {
  entered: string[];
  left: string[];
  moved: RankChange[];
};

/** 주 하나의 집계 결과. Note가 한 편도 없는 주도 이 형태로 나온다. */
export type WeekTally = {
  week: string;
  start: string;
  end: string;
  notes: Note[];
  concepts: WeekConceptTally[];
  dominant: string[];
  movement: ConceptMovement;
};

/**
 * Note 목록을 주 단위로 집계하는 순수 함수. 파일을 읽지도 쓰지도 않으므로
 * 호출자가 `readRepository`의 결과를 넣어 준다. 집계가 표현과 갈려 있는
 * 이유는 나중에 표현까지 기계에 넘기더라도 이쪽은 그대로 두기 위해서다.
 */
export function tallyWeek({ notes, week }: { notes: Note[]; week: string }): WeekTally {
  const { start, end } = weekRange(week);
  const thisWeek = notesOf(notes, week);
  const concepts = rankConcepts(thisWeek);

  return {
    week,
    start,
    end,
    notes: thisWeek,
    concepts,
    // 가장 몰린 자리를 나눠 가진 Concept 전부. 동률에서 하나를 골라 내놓으면
    // 정렬의 부작용이 사실인 척하게 되므로, 여럿이면 여럿을 그대로 둔다.
    // 어느 쪽을 앞세울지는 사람이 문장을 고치며 정한다 (ADR-0004).
    dominant: concepts.filter(({ rank }) => rank === 1).map(({ concept }) => concept),
    // 이동의 기준은 언제나 달력상의 직전 한 주다. 그 주가 비어 있으면 비교할
    // 것이 없는 게 아니라 아무것도 없던 주와 견주는 것이고, 그래서 이번 주
    // Concept이 전부 새로 등장이 된다. 빈 주를 건너뛰고 거슬러 올라가면
    // "지난 주"가 발행할 때마다 다른 기간을 가리키게 된다.
    movement: movementBetween(rankConcepts(notesOf(notes, previousWeek(week))), concepts),
  };
}

/** Note가 한 편이라도 있는 주를 오래된 순으로. 비어 있는 주는 목록에 오르지 않는다. */
export function tallyWeeks(notes: Note[]): WeekTally[] {
  // 주 식별자는 자리 수가 고정이라 문자열 순서가 곧 시간 순서다.
  const weeks = [...new Set(notes.map(({ date }) => weekOf(date)))].sort();

  return weeks.map((week) => tallyWeek({ notes, week }));
}

function notesOf(notes: Note[], week: string): Note[] {
  return notes.filter((note) => weekOf(note.date) === week);
}

/**
 * 세는 것과 정렬은 `read.ts`의 `tallyConcepts`가 하고, 여기서는 순위만 얹는다.
 * 저장소 전체를 세는 곳과 한 주만 세는 곳이 같은 함수를 지나야 같은 Concept이
 * 화면마다 같은 자리에 놓인다.
 */
function rankConcepts(notes: Note[]): WeekConceptTally[] {
  const sorted = tallyConcepts(notes);

  // 동률은 같은 순위를 나눠 갖고 그만큼 다음 순위를 건너뛴다. 1위가 둘이면
  // 다음은 3위다.
  return sorted.map((tally) => ({
    ...tally,
    rank: sorted.findIndex(({ noteCount }) => noteCount === tally.noteCount) + 1,
  }));
}

function movementBetween(before: WeekConceptTally[], after: WeekConceptTally[]): ConceptMovement {
  const ranksBefore = new Map(before.map(({ concept, rank }) => [concept, rank]));
  const ranksAfter = new Map(after.map(({ concept, rank }) => [concept, rank]));

  const moved: RankChange[] = [];

  for (const { concept, rank } of after) {
    const from = ranksBefore.get(concept);

    if (from !== undefined && from !== rank) {
      moved.push({ concept, from, to: rank });
    }
  }

  return {
    entered: after.filter(({ concept }) => !ranksBefore.has(concept)).map(({ concept }) => concept),
    left: before.filter(({ concept }) => !ranksAfter.has(concept)).map(({ concept }) => concept),
    moved,
  };
}
