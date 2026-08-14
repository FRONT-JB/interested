/**
 * 브리핑에 실린 주장 하나. 스킬이 사람에게 브리핑을 보이기 전에 이 목록을
 * 만들어 검사에 넘긴다.
 *
 * 세 종류를 나눈 이유는 대조할 원본이 저마다 다르기 때문이다. 인용은 자막에
 * 있어야 하고, 덩어리 요지는 영상 안의 시각을 가리켜야 하고, 조사한 것은
 * 자막에 있을 리가 없으니 링크로 갚아야 한다.
 */
export type BriefingClaim =
  | { kind: "quote"; text: string }
  | { kind: "outline"; at: number; text: string }
  | { kind: "agent"; text: string; link: string | null };

/** 걸린 주장 하나. `index`는 넘긴 배열에서의 자리다. */
export type BriefingFinding = {
  index: number;
  kind: BriefingClaim["kind"];
  reason: string;
};

/**
 * 브리핑을 원문과 대조해 걸리는 자리를 돌려주는 순수 함수. 파일을 읽지 않으므로
 * 자막 전문은 호출자가 떠다 넣는다.
 *
 * 여기서 잡는 것은 **결정적으로 대조되는 것뿐이다.** 인용이 자막에 실제로
 * 있는지, 시각이 영상 길이 안인지, 조사한 문장에 링크가 붙었는지. 풀이가
 * 원문을 오독했는지는 이 함수가 판정할 수 없고, 그 자리는 스킬이 깨끗한 문맥의
 * 감사에 넘긴다 (SKILL.md 4단계).
 *
 * 걸린 것을 고쳐 돌려주지 않는다. 고쳐서 내보내면 원문의 말도 브리핑의 말도
 * 아닌 문장이 남는다 (ADR-0008). 스킬은 걸린 자리를 브리핑에서 빼고 못 읽은
 * 것으로 내린다.
 */
export function auditBriefing({
  claims,
  transcript,
  durationSeconds,
}: {
  claims: readonly BriefingClaim[];
  transcript: string;
  durationSeconds: number;
}): BriefingFinding[] {
  const haystack = normalize(transcript);
  const findings: BriefingFinding[] = [];

  claims.forEach((claim, index) => {
    const reason = judgeClaim(claim, haystack, durationSeconds);

    if (reason !== null) {
      findings.push({ index, kind: claim.kind, reason });
    }
  });

  return findings;
}

function judgeClaim(
  claim: BriefingClaim,
  haystack: string,
  durationSeconds: number,
): string | null {
  switch (claim.kind) {
    case "quote": {
      const needle = normalize(claim.text);

      if (needle === "") {
        return "인용이 비어 있다";
      }

      return haystack.includes(needle) ? null : "원문에서 이 문장을 찾지 못했다";
    }

    case "outline": {
      if (!Number.isFinite(claim.at) || claim.at < 0) {
        return "시각이 없거나 음수다";
      }

      return claim.at <= durationSeconds
        ? null
        : `시각이 원문 길이(${String(durationSeconds)}초)를 넘는다`;
    }

    case "agent": {
      return isHttpUrl(claim.link) ? null : "조사한 내용인데 링크가 없다";
    }
  }
}

/**
 * 대조 전에 글자를 고른다. 자동 자막에는 문장 부호가 없고 대소문자도 들쭉날쭉해
 * 글자 그대로 견주면 멀쩡한 인용이 통째로 걸린다. 라틴 영숫자와 한글만 남기고
 * 나머지를 지우면 그 차이가 사라진다.
 *
 * 대신 문장 부호로만 갈리는 두 문장을 같은 것으로 세게 된다. 이 검사가 막으려는
 * 것은 지어낸 인용이지 옮겨 적기의 실수가 아니라서 그쪽으로 기울여 둔다.
 */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9가-힣]+/gu, "");
}

/** `[에이전트]` 문장이 갚아야 하는 것은 열리는 주소다. 상대 경로는 갚음이 아니다. */
function isHttpUrl(value: string | null): boolean {
  if (value === null) {
    return false;
  }

  try {
    const { protocol } = new URL(value);

    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
