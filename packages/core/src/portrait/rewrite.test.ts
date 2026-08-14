import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { readRepository } from "../repository/read.ts";
import { renderPortrait } from "./render.ts";
import { portraitPath, rewritePortrait } from "./rewrite.ts";
import { standingOf } from "./standing.ts";

async function createRoot(): Promise<string> {
  return await mkdtemp(join(tmpdir(), "interested-"));
}

describe("rewritePortrait", () => {
  it("앞의 내용을 지우고 새로 쓴다", async () => {
    const root = await createRoot();
    await writeFile(join(root, portraitPath), "# Portrait\n\n지난 판정.\n", "utf8");

    const outcome = await rewritePortrait({ root, contents: "# Portrait\n\n새 판정.\n" });

    expect(outcome).toEqual({ written: portraitPath });
    expect(await readFile(join(root, portraitPath), "utf8")).toBe("# Portrait\n\n새 판정.\n");
  });

  it("아직 파일이 없어도 쓴다", async () => {
    const root = await createRoot();

    const outcome = await rewritePortrait({ root, contents: "# Portrait\n\n첫 판정.\n" });

    expect(outcome).toEqual({ written: portraitPath });
  });

  it("금지 동사가 들어 있으면 쓰지 않고 걸린 자리를 돌려준다", async () => {
    const root = await createRoot();
    await writeFile(join(root, portraitPath), "# Portrait\n\n지난 판정.\n", "utf8");

    const outcome = await rewritePortrait({
      root,
      contents: "# Portrait\n\n`rsc`를 습득했다.\n",
    });

    expect(outcome).toEqual({ forbidden: [{ found: "습득", reason: expect.any(String) }] });
    // 걸린 판정이 앞의 것을 지우지도 못한다. 게이트는 쓰기 앞에 있다.
    expect(await readFile(join(root, portraitPath), "utf8")).toBe("# Portrait\n\n지난 판정.\n");
  });
});

describe("Note가 한 편도 없는 저장소", () => {
  it("읽기부터 쓰기까지 예외 없이 끝난다", async () => {
    const root = await createRoot();

    const model = await readRepository(root);
    const portrait = renderPortrait({
      standing: standingOf(model.notes),
      activity: { unavailable: "조회하지 않았다" },
      contrasts: [],
    });
    const outcome = await rewritePortrait({ root, contents: portrait });

    expect(outcome).toEqual({ written: portraitPath });
    expect(await readFile(join(root, portraitPath), "utf8")).toContain("아직 Note가 없다");
  });
});
