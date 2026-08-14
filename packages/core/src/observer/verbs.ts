/** 걸린 동사 하나. `found`는 글에서 잡힌 글자 그대로다. */
export type ForbiddenVerb = { found: string; reason: string };

/** 게이트의 판정. 걸리면 발행이 아니라 실패다. */
export type VerbVerdict = { outcome: "pass" } | { outcome: "forbidden"; found: ForbiddenVerb[] };

/**
 * 관찰자가 쓴 글에서 관측되지 않는 동사를 찾는다 (ADR-0005).
 *
 * 허용 — 읽었다, 돌아왔다, 옮겨갔다, 조사하고 있다, 관심이 있다
 * 금지 — 습득했다, 익혔다, 이해했다, 능숙하다
 *
 * 읽었다는 사실에서 관심은 따라 나오지만 습득은 따라 나오지 않는다. 이 문턱이
 * 있어야 사람 손 없이 자라는 문서가 거짓말을 하지 않고, 그래서 이 게이트는
 * Portrait을 파일로 남기는 경로 안에 있다 (`portrait/rewrite.ts`).
 *
 * 걸리면 고치지 않고 실패한다. 관찰자의 문장은 기계가 쓴 템플릿이므로, 금지
 * 동사가 나왔다는 것은 사람이 템플릿을 잘못 고쳤다는 뜻이다. 말없이 고쳐 두면
 * 그 실수가 다음 실행에도 그대로 남는다.
 */
export function judgeObserverVerbs(text: string): VerbVerdict {
  const found = new Map<string, ForbiddenVerb>();
  const written = withoutQuotations(text);

  for (const { pattern, reason } of forbiddenVerbs) {
    for (const [matched] of written.matchAll(pattern)) {
      // 같은 동사가 여러 번 나와도 고칠 곳은 한 종류다. 줄마다 보고하면
      // 무엇을 고쳐야 하는지가 목록 길이에 묻힌다.
      if (!found.has(matched)) {
        found.set(matched, { found: matched, reason });
      }
    }
  }

  return found.size === 0 ? { outcome: "pass" } : { outcome: "forbidden", found: [...found.values()] };
}

/**
 * 코드 표기 안은 검사하지 않는다. 관찰자가 쓴 문장은 언제나 코드 표기 밖에
 * 있고, 안에 있는 것은 밖에서 들어온 이름뿐이다 — Concept slug, 저장소 이름,
 * 언어 이름, 조회에 실패한 주소.
 *
 * 이 구분이 없으면 이름 하나가 갱신을 영구히 세운다. `익힌-것` 같은 저장소에
 * 푸시한 주부터 게이트가 매번 걸려, 관찰자를 지키려던 문턱이 관찰자를 멈추게
 * 한다. 밖에서 온 이름은 관찰자의 주장이 아니므로 검사 대상이 아니다.
 */
function withoutQuotations(text: string): string {
  return text.replace(/`[^`]*`/gu, " ");
}

/**
 * 금지 동사의 어간들. 종결형까지 다 적지 않고 어간으로 잡는 것은, `익혔다`만
 * 막으면 `익혔고`, `익힌`이 그대로 통과하기 때문이다.
 *
 * 넓게 잡아 둔다. 통과시켜야 할 문장을 막으면 발행이 멈추고 사람이 그 자리에서
 * 알게 되지만, 막아야 할 문장을 통과시키면 검증할 수 없는 판정이 저장소에
 * 남는다.
 */
const forbiddenVerbs: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /습득/gu,
    reason: "읽었다는 사실에서 습득은 따라 나오지 않는다 — 실제로 익혔는지는 본인만 안다",
  },
  {
    pattern: /익[혔힌혀히]/gu,
    reason: "익혔는지는 기록으로 증명되지 않는다 — 관찰자가 대신 말할 수 없다",
  },
  {
    pattern: /이해(했|한다|하고|하게|된다|도)/gu,
    reason: "읽은 것과 이해한 것을 기계가 구분할 수 없다",
  },
  {
    pattern: /능숙|숙련|숙달|통달|정통하|체득|마스터/gu,
    reason: "숙련도는 관측되지 않는다 — 성취를 말하려면 사람이 직접 문장을 넣는다",
  },
];
