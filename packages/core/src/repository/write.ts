import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { stringify as stringifyYaml } from "yaml";

/** 쓴 경로, 또는 이미 있어 손대지 않은 경로. 둘 다 정상 결과다. */
export type WriteOutcome = { written: string } | { kept: string };

/**
 * frontmatter와 본문을 마크다운 한 편으로 조립한다. 파일을 쓰지 않으므로
 * 초안을 파일로 남기기 전에 사람에게 먼저 보여줄 수 있다.
 *
 * frontmatter를 넘기지 않으면 본문만 나온다. Note에는 형식이 있지만
 * (ADR-0001) 모든 발행물이 frontmatter를 갖는 것은 아니다.
 */
export function renderMarkdown({
  frontmatter,
  body,
}: {
  frontmatter?: Record<string, unknown>;
  body: string;
}): string {
  // 앞뒤 빈 줄을 여기서 한 번 정리한다. 조립하는 쪽마다 다르게 다루면
  // 같은 형식의 파일이 미묘하게 다른 모양으로 쌓인다.
  const trimmed = body.trim();
  const rendered = trimmed === "" ? "" : `${trimmed}\n`;

  if (frontmatter === undefined) {
    return rendered;
  }

  return `---\n${stringifyYaml(frontmatter)}---\n${rendered === "" ? "" : `\n${rendered}`}`;
}

/**
 * 저장소에 파일을 쓰는 유일한 이음매. 루트 기준 상대 경로 하나가 들어가고
 * 결과 하나가 나오며, 이 안에서 내용을 만들지 않는다.
 *
 * 이미 있는 파일은 기본적으로 건드리지 않는다. 발행물은 기계가 초안을 내고
 * 사람이 문장을 고치는 순서로 만들어지므로(ADR-0004), 말없는 덮어쓰기는
 * 사람이 고쳐 둔 문장을 지우는 일이 된다.
 */
export async function writeMarkdown({
  root,
  path,
  contents,
  overwrite = false,
}: {
  root: string;
  path: string;
  contents: string;
  overwrite?: boolean;
}): Promise<WriteOutcome> {
  const filePath = resolveInside(root, path);

  await mkdir(dirname(filePath), { recursive: true });

  try {
    // 존재 확인과 쓰기를 나누면 그 사이에 파일이 생겨도 덮어쓴다. `wx`는
    // 두 동작을 한 번에 하므로 그 틈이 없다.
    await writeFile(filePath, contents, { encoding: "utf8", flag: overwrite ? "w" : "wx" });
  } catch (error) {
    if (isExistingFile(error)) {
      return { kept: path };
    }

    throw error;
  }

  return { written: path };
}

/**
 * 경로가 저장소 밖을 가리키면 예외다. 형식 위반은 결과로 다루지만
 * (`read.ts`) 이건 사람이 쓴 값의 문제가 아니라 경로를 조립한 쪽의 버그이고,
 * 결과로 돌려주면 저장소 밖에 파일을 남긴 채로 넘어갈 수 있다.
 */
function resolveInside(root: string, path: string): string {
  const filePath = resolve(root, path);
  const inside = relative(resolve(root), filePath);

  if (inside === "" || inside.startsWith("..") || resolve(root, inside) !== filePath) {
    throw new Error(`저장소 밖을 가리키는 경로다 — ${path}`);
  }

  return join(root, inside);
}

function isExistingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "EEXIST"
  );
}
