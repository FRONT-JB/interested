/**
 * 브리핑 파일 하나를 원문과 대조한다. 인용·시각·링크를 브리핑에서 직접 뽑으므로
 * 에이전트가 `claims` 배열을 손으로 옮겨 적을 필요가 없다.
 *
 * 손으로 옮겨 적으면 브리핑 전체가 문맥에 한 번 더 복제되고, `claims`의 모양을
 * 알아내려고 `briefing.ts` 소스를 읽으러 가게 된다. 실측에서 두 번 다 그랬다.
 *
 * 사용:
 *   node .claude/skills/study-source/scripts/audit_briefing.mjs \
 *     <브리핑.md> <원문.txt> [원문 길이(초)]
 *
 * 길이를 안 주면 시각 상한 검사를 건너뛴다. 글처럼 시각이 없는 Source가 그렇다.
 */
import { readFile } from "node:fs/promises";

import { auditBriefing } from "../../../../packages/core/src/source/briefing.ts";

const [briefingPath, transcriptPath, durationArg] = process.argv.slice(2);

if (briefingPath === undefined || transcriptPath === undefined) {
  console.error("사용: audit_briefing.mjs <브리핑.md> <원문.txt> [길이(초)]");
  process.exit(2);
}

const [briefing, transcript] = await Promise.all([
  readFile(briefingPath, "utf8"),
  readFile(transcriptPath, "utf8"),
]);

const durationSeconds = durationArg === undefined ? Number.POSITIVE_INFINITY : Number(durationArg);

/** 이어지는 `>` 줄은 한 인용이다. 다른 줄이 나오면 끊긴다. */
function collectQuotes(text) {
  const quotes = [];
  let current = [];

  for (const line of text.split("\n")) {
    if (line.startsWith(">")) {
      current.push(line.replace(/^>\s?/u, ""));
      continue;
    }

    if (current.length > 0) {
      quotes.push(current.join(" ").trim());
      current = [];
    }
  }

  if (current.length > 0) {
    quotes.push(current.join(" ").trim());
  }

  return quotes.filter((quote) => quote !== "");
}

/**
 * 절을 제목의 **말**로 찾는다. `### 원문이 한 말`도 `## [원문] 원문이 한 말`도 같은 절이다.
 *
 * 처음에는 `### `과 줄머리 `[원문]`에 딱 맞춰 찾았는데, 모델이 라벨을 제목 안에 넣어
 * 쓰자 절을 통째로 못 읽고 "검사할 것이 없다"며 통과시켰다. 형식을 조금 달리 적은
 * 브리핑을 빈 브리핑으로 세는 검사는 없느니만 못하다.
 */
function sectionBody(text, phrase) {
  const lines = text.split("\n");
  const start = lines.findIndex(
    (line) => /^#{1,4}\s/u.test(line) && line.includes(phrase),
  );

  if (start === -1) {
    return null;
  }

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,4}\s/u.test(line));

  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/**
 * 덩어리 머리글에서 시작 시각을 뽑는다. `0:00–2:04`도 `12:49`도 받는다.
 * 시각이 없으면(글이라 소제목으로 위치를 단 경우) 0으로 두어 상한 검사를 통과시킨다.
 */
function collectOutline(text) {
  const body = sectionBody(text, "원문이 한 말");

  if (body === null) {
    return [];
  }

  const outline = [];

  for (const line of body.split("\n")) {
    const heading = /\*\*(?<title>[^*]+)\*\*/u.exec(line)?.groups?.title;

    if (heading === undefined) {
      continue;
    }

    const clock = /(?<minutes>\d+):(?<seconds>\d{2})/u.exec(heading)?.groups;
    const at =
      clock === undefined ? 0 : Number(clock.minutes) * 60 + Number(clock.seconds);

    outline.push({ kind: "outline", at, text: heading.trim() });
  }

  return outline;
}

/**
 * 있어야 할 절이 있는지 본다. 앞의 셋은 브리핑의 뼈대라 없으면 브리핑이 아니다.
 *
 * 검사가 "있는 것이 맞는지"만 보고 "있어야 할 것이 있는지"를 안 보면, 절을 통째로
 * 빠뜨린 브리핑이 가장 깨끗하게 통과한다. 검사할 것이 하나도 없기 때문이다.
 */
const requiredSections = ["원문이 한 말", "원문에서", "쉽게 풀면"];

function collectMissingSections(text) {
  return requiredSections.filter((phrase) => sectionBody(text, phrase) === null);
}

/**
 * 조사 절의 `[에이전트]` 문장이 갚은 링크. 마크다운 링크와 맨 주소를 둘 다 본다.
 *
 * `쉽게 풀면`의 풀이도 같은 라벨을 달지만 거기는 링크를 갚을 것이 없다 — 원문을
 * 내 말로 옮긴 것이지 밖에서 가져온 것이 아니다. 그래서 라벨만 보지 않고 절을
 * 함께 본다. 검사가 걸려야 하는 것은 밖에서 가져왔다고 말한 문장뿐이다.
 */
const researchHeading = "### 원문 밖에서 확인한 것";

function collectAgentClaims(text) {
  const claims = [];
  let inResearch = false;

  for (const line of text.split("\n")) {
    if (line.startsWith("### ")) {
      inResearch = line.trim() === researchHeading;
      continue;
    }

    if (!inResearch || !line.startsWith("`[에이전트]`")) {
      continue;
    }

    const link =
      /\]\((?<markdown>https?:\/\/[^)\s]+)\)/u.exec(line)?.groups?.markdown ??
      /(?<bare>https?:\/\/[^\s)\]]+)/u.exec(line)?.groups?.bare ??
      null;

    claims.push({ kind: "agent", text: line.slice(0, 80), link });
  }

  return claims;
}

const claims = [
  ...collectOutline(briefing),
  ...collectQuotes(briefing).map((text) => ({ kind: "quote", text })),
  ...collectAgentClaims(briefing),
];

const findings = auditBriefing({ claims, transcript, durationSeconds });
const counted = { outline: 0, quote: 0, agent: 0 };

for (const { kind } of claims) {
  counted[kind] += 1;
}

const missingSections = collectMissingSections(briefing);
const structure = [
  ...missingSections.map((phrase) => `\`${phrase}\` 절이 없다`),
  ...(counted.outline === 0 ? ["원문을 묶은 덩어리가 하나도 없다"] : []),
  ...(counted.quote === 0 ? ["원문 인용이 하나도 없다"] : []),
];

console.log(
  JSON.stringify(
    {
      counted,
      passed: findings.length === 0 && structure.length === 0,
      structure,
      findings: findings.map(({ index, kind, reason }) => ({
        kind,
        reason,
        claim: claims[index],
      })),
    },
    null,
    2,
  ),
);
