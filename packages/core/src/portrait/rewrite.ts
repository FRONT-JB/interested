import { judgeObserverVerbs, type ForbiddenVerb } from "../observer/verbs.ts";
import { readFrontmatter } from "../repository/read.ts";
import { writeMarkdown } from "../repository/write.ts";

/** Portrait은 단 하나의 파일이다. 저장소 루트 기준 상대 경로다. */
export const portraitPath = "portrait.md";

/**
 * 앞의 판정이 무엇으로 어떤 재료에서 나왔는지. 파일에 적혀 있지 않으면 null이다.
 *
 * 이 도장이 있어야 사실이 그대로인 날에 모델을 부르지 않을 수 있다. 같은 재료를
 * 매일 다르게 쓴 커밋이 쌓이면 갱신 기록이 문장 취향의 기록이 된다.
 */
export type PortraitStamp = { facts: string | null; prose: string | null };

export async function readPortraitStamp({ root }: { root: string }): Promise<PortraitStamp> {
  const frontmatter = await readFrontmatter({ root, path: portraitPath });

  return { facts: stringOr(frontmatter?.["facts"]), prose: stringOr(frontmatter?.["prose"]) };
}

function stringOr(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** 쓴 경로, 또는 게이트에 걸려 쓰지 못한 자리들. */
export type RewriteOutcome = { written: string } | { forbidden: ForbiddenVerb[] };

/**
 * Portrait을 파일로 남기는 유일한 이음매. 앞의 내용은 지워지고 새로 쓰인다 —
 * Portrait은 지나온 자취가 아니라 지금의 얼굴이므로 이력을 파일에 쌓지 않는다.
 * 지워진 판정은 git이 들고 있다.
 *
 * 동사 게이트가 쓰기 앞에 있다. 밖에서 검사한 뒤 쓰게 하면 검사를 잊은 경로가
 * 하나만 생겨도 관측되지 않는 문장이 저장소에 남는다 (ADR-0005). 걸리면 앞의
 * 내용도 건드리지 않는다 — 잘못된 판정으로 성립하던 판정을 지우지 않기 위해서다.
 */
export async function rewritePortrait({
  root,
  contents,
}: {
  root: string;
  contents: string;
}): Promise<RewriteOutcome> {
  const verdict = judgeObserverVerbs(contents);

  if (verdict.outcome === "forbidden") {
    return { forbidden: verdict.found };
  }

  await writeMarkdown({ root, path: portraitPath, contents, overwrite: true });

  return { written: portraitPath };
}
