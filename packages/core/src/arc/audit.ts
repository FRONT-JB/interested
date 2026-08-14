import { groundingReasons } from "../observer/grounding.ts";
import { styleReasons } from "../observer/style.ts";
import { judgeObserverVerbs } from "../observer/verbs.ts";
import type { ArcBrief } from "./brief.ts";

/**
 * Arc 항목은 짧다. 상한을 두는 것은 길어진 항목이 곧 해석이 붙은 항목이기
 * 때문이고, Portrait보다 짧은 것은 이것이 판정 한 편이 아니라 서사에 붙는 한
 * 줄이기 때문이다.
 */
const maximumLength = 400;

/**
 * 모델이 쓴 항목을 재료와 대조한다. 걸린 이유들을 돌려주고, 통과하면 빈 배열이다.
 *
 * Arc는 지워지지 않으므로 여기서 놓친 문장은 영구히 남는다. 그래서 Portrait과
 * 같은 것을 보되(관측되지 않는 동사, 재료에 없는 숫자와 이름, 문체) 형식은 더
 * 좁게 본다 — 제목도 목록도 인용 블록도 항목의 형식이 아니다.
 *
 * 인용 블록을 막는 것이 이 감사에만 있는 조건이다. 그 표시는 본인의 말을
 * 가리키므로(ADR-0010), 관찰자가 그것을 쓰면 자기 문장을 사람의 문장으로
 * 꾸미는 셈이 되고 게이트도 그 줄을 검사하지 않는다.
 */
export function auditArcEntry({ entry, brief }: { entry: string; brief: ArcBrief }): string[] {
  return [
    ...formatReasons(entry),
    ...dateReasons({ entry, date: brief.date, previousDates: brief.previousDates }),
    ...styleReasons(entry),
    ...verbReasons(entry),
    ...groundingReasons({ prose: entry, grounding: brief }),
  ];
}

/**
 * 날짜를 어떻게 적었는지. 항목 앞에는 코드가 붙인 날짜가 이미 있으므로
 * (`arc/render.ts`) 문장이 같은 날을 다시 적으면 한 항목에 같은 날이 두 번 놓인다.
 *
 * 한글 표기를 통째로 막는다. 재료의 날짜는 전부 ISO이므로 `년`·`월`·`일`이
 * 나왔다는 것은 모델이 형태를 바꿔 적었다는 뜻이고, 바꿔 적은 날짜는 접두와
 * 겹쳐도 문자열로 견주어 잡히지 않는다.
 */
function dateReasons({
  entry,
  date,
  previousDates,
}: {
  entry: string;
  date: string;
  previousDates: readonly string[];
}): string[] {
  const reasons: string[] = [];

  // 같은 날에 Note를 두 편 썼으면 직전 등장 날짜가 이 Note의 날짜와 같은 글자다.
  // 그 자리에서 되돌리면 지시를 따른 문장이 매번 걸려 조립 항목만 남는다.
  if (entry.includes(date) && !previousDates.includes(date)) {
    reasons.push(`이 항목의 날짜를 문장에서 다시 적었다 — ${date}는 항목 앞에 이미 붙는다`);
  }

  const notation = /\d+\s*[년월일]/u.exec(entry);

  if (notation !== null) {
    reasons.push(`날짜를 재료에 적힌 형태로 쓰지 않았다 — ${notation[0]}`);
  }

  return reasons;
}

function formatReasons(entry: string): string[] {
  const reasons: string[] = [];
  const trimmed = entry.trim();

  if (trimmed === "") {
    reasons.push("항목이 비어 있다");
  }

  // 줄이 늘어나면 두 번째 줄은 날짜 접두 없이 파일에 놓인다 (`arc/render.ts`).
  // 자취를 읽는 쪽에는 그 줄이 어느 날의 것인지가 사라지고, Arc는 지워지지 않는다.
  if (trimmed.includes("\n")) {
    reasons.push("줄이 둘 이상이다 — 항목은 한 줄이다");
  }

  if (/^\s*>/mu.test(trimmed)) {
    reasons.push("인용 블록이 들어 있다 — 그 표시는 본인이 직접 넣는 문장의 자리다");
  }

  if (/^\s*#/mu.test(trimmed)) {
    reasons.push("제목이 들어 있다 — Arc의 제목은 이미 파일에 있다");
  }

  if (/^\s*[-*]\s/mu.test(trimmed)) {
    reasons.push("목록이 들어 있다 — 항목은 문단 하나다");
  }

  if (trimmed.length > maximumLength) {
    reasons.push(`${maximumLength}자를 넘었다 — Arc 항목은 서사에 붙는 한 줄이다`);
  }

  // 문장이 늘어나는 자리가 곧 해석이 들어오는 자리다. 사실은 한 문장에 담기고,
  // 두 번째 문장은 그 사실을 다시 말하거나 앞일을 말하는 데 쓰인다. Arc는
  // 지워지지 않으므로 그 문장이 영구히 남는다 (ADR-0010).
  const sentences = [...trimmed.matchAll(/\.(?:\s|$)/gu)].length;

  if (sentences > 1) {
    reasons.push(`문장이 ${sentences}개다 — 항목은 한 문장이다`);
  }

  return reasons;
}

function verbReasons(entry: string): string[] {
  const verdict = judgeObserverVerbs(entry);

  return verdict.outcome === "pass"
    ? []
    : verdict.found.map(({ found, reason }) => `관측되지 않는 동사 — ${found} (${reason})`);
}
