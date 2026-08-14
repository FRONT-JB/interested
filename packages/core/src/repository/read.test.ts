import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { readRepository } from "./read.ts";

let sourceCount = 0;

/** frontmatter가 스키마를 만족하는 Note 한 편. 넘긴 값만 덮어쓴다. */
function note(overrides: { concepts?: string[]; date?: string; title?: string } = {}): string {
  const { concepts = ["rsc"], date = "2026-08-14", title = "제목" } = overrides;
  sourceCount += 1;

  return [
    "---",
    `source: https://example.com/${sourceCount}`,
    `title: ${title}`,
    `date: ${date}`,
    "take: 내가 거기서 건진 것.",
    "concepts:",
    ...concepts.map((concept) => `  - ${concept}`),
    "---",
    "",
    "본문.",
    "",
  ].join("\n");
}

/** 경로 → 파일 내용 맵을 임시 디렉토리에 풀고 그 루트를 돌려준다. */
async function createRepository(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "interested-"));

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = join(root, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, "utf8");
  }

  return root;
}

describe("readRepository", () => {
  it("디렉토리를 받아 Note 목록과 Concept별 등장 횟수를 돌려준다", async () => {
    const root = await createRepository({
      "notes/a.md": note({ concepts: ["rsc", "data-fetching"] }),
      "notes/b.md": note({ concepts: ["rsc"] }),
    });

    const model = await readRepository(root);

    expect(model.notes).toEqual([
      expect.objectContaining({ path: "notes/a.md", concepts: ["rsc", "data-fetching"] }),
      expect.objectContaining({ path: "notes/b.md", concepts: ["rsc"] }),
    ]);
    expect(model.concepts).toEqual([
      { concept: "rsc", noteCount: 2 },
      { concept: "data-fetching", noteCount: 1 },
    ]);
  });

  it("서로 다른 Note 두 곳에 등장한 Concept은 아직 승격 후보가 아니다", async () => {
    const root = await createRepository({
      "notes/a.md": note({ concepts: ["rsc"] }),
      "notes/b.md": note({ concepts: ["rsc"] }),
    });

    const model = await readRepository(root);

    expect(model.promotionCandidates).toEqual([]);
  });

  it("서로 다른 Note 세 곳에 등장한 Concept은 승격 후보다", async () => {
    const root = await createRepository({
      "notes/a.md": note({ concepts: ["rsc"] }),
      "notes/b.md": note({ concepts: ["rsc"] }),
      "notes/c.md": note({ concepts: ["rsc"] }),
    });

    const model = await readRepository(root);

    expect(model.promotionCandidates).toEqual(["rsc"]);
  });

  it("같은 Concept을 세 번 적은 Note는 승격 후보를 만들지 않는다 — 형식 위반이라 읽히지 않는다", async () => {
    const root = await createRepository({
      "notes/a.md": note({ concepts: ["rsc", "rsc", "rsc"] }),
    });

    const model = await readRepository(root);

    expect(model.promotionCandidates).toEqual([]);
    expect(model.unreadable).toEqual([expect.objectContaining({ path: "notes/a.md" })]);
  });

  it("이미 승격된 Concept은 세 곳에 등장해도 다시 후보로 뜨지 않는다", async () => {
    const root = await createRepository({
      "notes/a.md": note({ concepts: ["rsc"] }),
      "notes/b.md": note({ concepts: ["rsc"] }),
      "notes/c.md": note({ concepts: ["rsc"] }),
      "concepts/rsc.md": "서버 컴포넌트에 대한 배경 설명.\n",
    });

    const model = await readRepository(root);

    expect(model.promotionCandidates).toEqual([]);
    expect(model.concepts).toEqual([{ concept: "rsc", noteCount: 3 }]);
  });

  it("이름이 Concept slug가 아닌 concepts 파일은 승격으로 세지 않는다", async () => {
    const root = await createRepository({
      "notes/a.md": note({ concepts: ["rsc"] }),
      "notes/b.md": note({ concepts: ["rsc"] }),
      "notes/c.md": note({ concepts: ["rsc"] }),
      "concepts/README.md": "이 디렉토리에 대한 설명.\n",
    });

    const model = await readRepository(root);

    expect(model.promotionCandidates).toEqual(["rsc"]);
    expect(model.unreadable).toEqual([expect.objectContaining({ path: "concepts/README.md" })]);
  });

  it("Note가 한 편도 없으면 빈 모델이 나오고 예외가 나지 않는다", async () => {
    const root = await createRepository({ "concepts/.gitkeep": "" });

    const model = await readRepository(root);

    expect(model).toEqual({
      notes: [],
      concepts: [],
      promotionCandidates: [],
      unreadable: [],
    });
  });

  it("frontmatter가 깨진 파일이 있어도 나머지를 처리한다", async () => {
    const root = await createRepository({
      "notes/a.md": note({ concepts: ["rsc"] }),
      "notes/b-source-not-url.md": [
        "---",
        "source: 유튜브에서 본 영상",
        "title: 제목",
        "date: 2026-08-14",
        "take: 내가 거기서 건진 것.",
        "concepts:",
        "  - rsc",
        "---",
        "",
        "본문.",
      ].join("\n"),
      "notes/c-no-frontmatter.md": "frontmatter 없이 본문만 있는 파일.\n",
      "notes/d.md": note({ concepts: ["rsc"] }),
    });

    const model = await readRepository(root);

    expect(model.notes.map(({ path }) => path)).toEqual(["notes/a.md", "notes/d.md"]);
    expect(model.concepts).toEqual([{ concept: "rsc", noteCount: 2 }]);
    expect(model.unreadable).toEqual([
      expect.objectContaining({ path: "notes/b-source-not-url.md" }),
      expect.objectContaining({ path: "notes/c-no-frontmatter.md" }),
    ]);
  });

  it("열어볼 수 없는 파일이 섞여 있어도 나머지를 처리한다", async () => {
    const root = await createRepository({
      "notes/a.md": note({ concepts: ["rsc"] }),
      "notes/b.md/안에-디렉토리가-있다": "",
    });

    const model = await readRepository(root);

    expect(model.notes.map(({ path }) => path)).toEqual(["notes/a.md"]);
    expect(model.unreadable).toEqual([expect.objectContaining({ path: "notes/b.md" })]);
  });
});
