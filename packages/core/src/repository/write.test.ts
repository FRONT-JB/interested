import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { readRepository } from "./read.ts";
import { renderMarkdown, writeMarkdown } from "./write.ts";

async function createRoot(): Promise<string> {
  return await mkdtemp(join(tmpdir(), "interested-"));
}

async function seed(root: string, relativePath: string, contents: string): Promise<void> {
  const filePath = join(root, relativePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

const noteFrontmatter = {
  source: "https://youtu.be/43sDzyanzR0",
  title: "제목: 콜론이 섞인 제목",
  date: "2026-08-14",
  take: "내가 거기서 건진 것.",
  concepts: ["rsc", "data-fetching"],
};

describe("renderMarkdown", () => {
  it("frontmatter와 본문을 구분선으로 나눈 마크다운 한 편으로 조립한다", () => {
    const rendered = renderMarkdown({ frontmatter: { date: "2026-08-14" }, body: "본문." });

    expect(rendered).toBe("---\ndate: 2026-08-14\n---\n\n본문.\n");
  });

  it("본문 앞뒤의 빈 줄을 정리해 파일 모양을 한 가지로 만든다", () => {
    const rendered = renderMarkdown({
      frontmatter: { date: "2026-08-14" },
      body: "\n\n본문.\n\n\n",
    });

    expect(rendered).toBe("---\ndate: 2026-08-14\n---\n\n본문.\n");
  });

  it("frontmatter 없이 본문만으로도 쓸 수 있다", () => {
    const rendered = renderMarkdown({ body: "본문." });

    expect(rendered).toBe("본문.\n");
  });
});

describe("renderMarkdown이 쓴 것을 readRepository가 읽는다", () => {
  it("조립한 Note가 그대로 모델에 들어온다", async () => {
    const root = await createRoot();

    await writeMarkdown({
      root,
      path: "notes/2026-08-14-제목.md",
      contents: renderMarkdown({ frontmatter: noteFrontmatter, body: "본문." }),
    });

    const model = await readRepository(root);

    expect(model.unreadable).toEqual([]);
    expect(model.notes).toEqual([
      expect.objectContaining({ path: "notes/2026-08-14-제목.md", ...noteFrontmatter }),
    ]);
  });
});

describe("writeMarkdown", () => {
  it("아직 없는 디렉토리에도 파일을 쓴다", async () => {
    const root = await createRoot();

    const outcome = await writeMarkdown({ root, path: "trails/2026-W33.md", contents: "본문.\n" });

    expect(outcome).toEqual({ written: "trails/2026-W33.md" });
    expect(await readFile(join(root, "trails/2026-W33.md"), "utf8")).toBe("본문.\n");
  });

  it("이미 있는 파일은 덮지 않고 그대로 둔다", async () => {
    const root = await createRoot();
    await seed(root, "trails/2026-W33.md", "사람이 고쳐 둔 문장.\n");

    const outcome = await writeMarkdown({ root, path: "trails/2026-W33.md", contents: "기계 초안.\n" });

    expect(outcome).toEqual({ kept: "trails/2026-W33.md" });
    expect(await readFile(join(root, "trails/2026-W33.md"), "utf8")).toBe("사람이 고쳐 둔 문장.\n");
  });

  it("덮어쓰기를 명시하면 덮는다", async () => {
    const root = await createRoot();
    await seed(root, "trails/2026-W33.md", "지난 초안.\n");

    const outcome = await writeMarkdown({
      root,
      path: "trails/2026-W33.md",
      contents: "새 초안.\n",
      overwrite: true,
    });

    expect(outcome).toEqual({ written: "trails/2026-W33.md" });
    expect(await readFile(join(root, "trails/2026-W33.md"), "utf8")).toBe("새 초안.\n");
  });

  it("저장소 밖을 가리키는 경로는 쓰지 않는다", async () => {
    const root = await createRoot();

    await expect(
      writeMarkdown({ root, path: "../밖.md", contents: "본문.\n" }),
    ).rejects.toThrow();
  });
});
