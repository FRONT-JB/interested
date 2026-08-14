import { writeMarkdown } from "../repository/write.ts";
import { judgeObserverVerbs, type ForbiddenVerb } from "./verbs.ts";

/** Portrait은 단 하나의 파일이다. 저장소 루트 기준 상대 경로다. */
export const portraitPath = "portrait.md";

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
