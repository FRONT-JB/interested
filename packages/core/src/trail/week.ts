import { z } from "zod";

/**
 * 주 식별자는 ISO 8601 주 번호다 — `2026-W33`. 저장소의 날짜 정본이 이미
 * ISO(`YYYY-MM-DD`)이므로 주도 같은 표준을 따르면 경계 규칙을 따로 설명할
 * 일이 없다.
 *
 * 앞의 네 자리는 달력 해가 아니라 주 번호의 해다. 12월 29일이 `2026-W01`이
 * 되는 것은 어긋난 값이 아니라 이 표준의 정의다.
 */
const weekPattern = /^(\d{4})-W(\d{2})$/;

/**
 * 사람이 손으로 넘기는 주 식별자. 형식과 달력을 여기서 함께 본다.
 *
 * 형식만 보면 `2026-W99`가 통과해 `weekRange`가 더 깊은 곳에서 터진다.
 * 경계에서 막기로 한 값은 경계에서 다 막아야 안쪽이 그 값을 믿을 수 있다.
 */
export const trailWeekSchema = z
  .string()
  .regex(weekPattern, "주 식별자는 2026-W33 형식이어야 한다")
  .refine(isCalendarWeek, "달력에 없는 주다");

function isCalendarWeek(week: string): boolean {
  try {
    weekRange(week);

    return true;
  } catch {
    return false;
  }
}

const dayInMilliseconds = 24 * 60 * 60 * 1000;

/**
 * 날짜 하나가 속한 주. 주는 월요일에 시작하고 일요일에 끝난다 — 발행 리듬이
 * "주말에 명령을 돌린다"이므로, 주말이 주의 끝에 와야 한 주를 닫는 동작이
 * 된다. 일요일에 시작하는 주였다면 토요일에 돌린 명령이 다음 날 쓸 Note를
 * 미리 잘라 버린다.
 *
 * 계산은 전부 UTC다. 로컬 시각으로 요일을 물으면 같은 Note가 시차에 따라
 * 다른 주로 묶여, 어디서 명령을 돌렸는지가 발행물의 내용을 바꾼다.
 */
export function weekOf(date: string): string {
  const thursday = thursdayOf(utc(date));
  const year = thursday.getUTCFullYear();
  const firstThursday = thursdayOf(new Date(Date.UTC(year, 0, 4)));
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * dayInMilliseconds));

  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** 주 식별자를 그 주의 첫날(월요일)과 마지막날(일요일)로 편다. */
export function weekRange(week: string): { start: string; end: string } {
  const matched = weekPattern.exec(week);

  if (matched === null) {
    throw new Error(`주 식별자가 아니다 — ${week}`);
  }

  // 1월 4일은 언제나 그 해의 첫 주에 있다 (ISO 8601). 그 주의 월요일에서
  // 주 수만큼 나아가면 찾는 주의 월요일이다.
  const firstMonday = mondayOf(new Date(Date.UTC(Number(matched[1]), 0, 4)));
  const start = shift(firstMonday, (Number(matched[2]) - 1) * 7);

  // 달력에 없는 주(`2026-W99`)는 조용히 다음 해로 굴러간다. 되돌려 확인하면
  // 그 자리에서 걸리므로, 잘못 조립된 식별자가 발행물 이름이 되지 않는다.
  if (weekOf(iso(start)) !== week) {
    throw new Error(`달력에 없는 주다 — ${week}`);
  }

  return { start: iso(start), end: iso(shift(start, 6)) };
}

/** 바로 앞의 주. 이동을 재는 기준은 언제나 직전 한 주다. */
export function previousWeek(week: string): string {
  return weekOf(iso(shift(utc(weekRange(week).start), -7)));
}

/**
 * `YYYY-MM-DD`는 UTC 자정으로 읽힌다. 뒤의 계산이 전부 `getUTC*`인 것이
 * 이 전제와 짝이다.
 */
function utc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shift(date: Date, days: number): Date {
  return new Date(date.getTime() + days * dayInMilliseconds);
}

/** 월요일을 0으로 세는 요일. 표준 `getUTCDay`는 일요일이 0이다. */
function weekdayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

function mondayOf(date: Date): Date {
  return shift(date, -weekdayIndex(date));
}

/** 그 주의 목요일. 주가 걸친 두 해 중 목요일이 있는 쪽이 주의 해다 (ISO 8601). */
function thursdayOf(date: Date): Date {
  return shift(mondayOf(date), 3);
}
