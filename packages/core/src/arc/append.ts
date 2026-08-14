import { judgeObserverVerbs, type ForbiddenVerb } from "../observer/verbs.ts";
import { readDocument } from "../repository/read.ts";
import { renderMarkdown, writeMarkdown } from "../repository/write.ts";

/** Arc는 단 하나의 파일이다. 저장소 루트 기준 상대 경로다. */
export const arcPath = "arc.md";

/**
 * 앞선 실행이 어디까지 담았는지. 파일에 적혀 있지 않으면 null이다.
 *
 * `covered`는 마지막으로 담은 Note의 경로이고 `notes`는 그때까지 담은 편 수다.
 * 둘을 함께 두는 것은, 경로만으로는 워터마크보다 앞선 이름으로 뒤늦게 들어온
 * Note를 알아볼 수 없기 때문이다 (`arc/entry.ts`).
 */
export type ArcStamp = { covered: string | null; notes: number | null };

export async function readArcStamp({ root }: { root: string }): Promise<ArcStamp> {
  const document = await readDocument({ root, path: arcPath });

  return {
    covered: stringOr(document?.frontmatter?.["covered"]),
    notes: numberOr(document?.frontmatter?.["notes"]),
  };
}

function stringOr(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberOr(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

/**
 * 붙인 경로, 씨앗이 없어 붙이지 못한 것, 도장을 읽지 못해 붙이지 못한 것, 또는
 * 게이트에 걸린 자리들.
 */
export type AppendOutcome =
  | { appended: string }
  | { missing: string }
  | { malformed: string }
  | { forbidden: ForbiddenVerb[] };

/**
 * Arc에 항목 하나를 붙이는 유일한 이음매. 앞의 내용은 지워지지 않는다 — 지나온
 * 관심이 지워지지 않는 것이 이 문서의 존재 이유이므로, Portrait처럼 다시 쓰는
 * 경로를 두지 않는다 (ADR-0010).
 *
 * 씨앗이 없으면 붙이지 않는다. 씨앗은 Note에서 도출되지 않아 사람이 쓰는
 * 것이므로, 파일이 없는 자리에 관찰자가 먼저 문장을 놓으면 그 문서는 씨앗
 * 없이 자란 것이 된다.
 *
 * 동사 게이트는 붙인 뒤의 본문 전체를 보고, 인용 블록은 빼고 본다. 인용 블록은
 * 본인의 말이라 금지 동사 규칙 밖이고(ADR-0005), 나머지는 전부 관찰자의 말이다.
 * 사람이 관찰자의 문단을 손으로 고쳐 성취를 적으면 그 자리에서 걸리는데, 그때
 * 할 일은 그 문장을 인용 블록으로 옮기는 것이다.
 */
export async function appendArcEntry({
  root,
  entry,
  stamp,
}: {
  root: string;
  entry: string;
  /** 이 항목을 붙인 뒤의 도장. 다음 실행이 여기서부터 이어 담는다. */
  stamp: { covered: string; notes: number };
}): Promise<AppendOutcome> {
  const document = await readDocument({ root, path: arcPath });

  if (document === null) {
    return { missing: arcPath };
  }

  // 도장이 깨져 있으면 붙이지 않는다. 읽히지 않는 frontmatter는 "아무것도 담지
  // 않았다"와 같은 값으로 나오는데, 그 값을 믿고 담으면 이미 붙어 있는 항목 전부가
  // 한 번 더 붙고 그 위에 새 도장이 덮인다 — 지워지지 않는 문서에서 그것이 가장
  // 되돌리기 어려운 상태다. 사람이 인용 블록을 손으로 넣다가 YAML을 깨는 것은
  // 이 문서에서 일어나기로 되어 있는 일이다 (ADR-0010).
  if (document.malformed) {
    return { malformed: arcPath };
  }

  const body = `${document.body.trim()}\n\n${entry.trim()}`;
  const verdict = judgeObserverVerbs(withoutQuotedLines(body));

  if (verdict.outcome === "forbidden") {
    return { forbidden: verdict.found };
  }

  // 덮어쓰기로 쓰지만 담는 것은 앞의 본문에 항목 하나를 더한 것뿐이다. 앞의
  // 내용을 지우는 경로가 이 파일에 없다.
  await writeMarkdown({
    root,
    path: arcPath,
    contents: renderMarkdown({ frontmatter: { covered: stamp.covered, notes: stamp.notes }, body }),
    overwrite: true,
  });

  return { appended: arcPath };
}

/**
 * 인용 블록을 걷어 낸 글. 관찰자의 말만 남으므로 동사 게이트가 이 결과를 본다.
 *
 * 줄 단위로 자른다. 인용 블록 안에서 줄이 이어져도 각 줄이 `>`로 시작하므로
 * 마크다운의 다른 규칙을 끌어올 이유가 없다.
 */
export function withoutQuotedLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*>/u.test(line))
    .join("\n");
}
