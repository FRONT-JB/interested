import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { readRepository } from "../repository/read.ts";
import { appendArcEntry, arcPath, readArcStamp, withoutQuotedLines } from "./append.ts";
import { selectArcEntries } from "./entry.ts";
import { arcEntryLine, renderArcEntry } from "./render.ts";

async function createRoot(): Promise<string> {
  return await mkdtemp(join(tmpdir(), "interested-"));
}

const seed = "# Arc\n\n> 시작하기 전, 나는 코드를 읽는 방식에 끌려 있었다.\n";

async function withSeed(contents = seed): Promise<string> {
  const root = await createRoot();
  await writeFile(join(root, arcPath), contents, "utf8");

  return root;
}

async function read(root: string): Promise<string> {
  return await readFile(join(root, arcPath), "utf8");
}

const stamp = { covered: "notes/2026-08-15-deferred-processing.md", notes: 2 };

describe("appendArcEntry", () => {
  it("앞의 내용을 지우지 않고 뒤에 붙인다", async () => {
    const root = await withSeed();

    const outcome = await appendArcEntry({
      root,
      entry: "2026-08-15 · `deferred-processing`가 처음 나왔다.",
      stamp,
    });

    expect(outcome).toEqual({ appended: arcPath });

    const written = await read(root);
    expect(written).toContain("> 시작하기 전, 나는 코드를 읽는 방식에 끌려 있었다.");
    expect(written).toContain("2026-08-15 · `deferred-processing`가 처음 나왔다.");
    expect(written.indexOf("시작하기 전")).toBeLessThan(written.indexOf("처음 나왔다"));
  });

  it("어디까지 담았는지를 도장으로 남긴다", async () => {
    const root = await withSeed();

    await appendArcEntry({ root, entry: "2026-08-15 · 처음 나왔다.", stamp });

    expect(await readArcStamp({ root })).toEqual(stamp);
  });

  it("여러 번 붙이면 앞의 항목 뒤로 쌓인다", async () => {
    const root = await withSeed();

    await appendArcEntry({ root, entry: "2026-07-08 · 첫 항목이다.", stamp });
    await appendArcEntry({ root, entry: "2026-08-15 · 둘째 항목이다.", stamp });

    const written = await read(root);
    expect(written).toContain("첫 항목이다");
    expect(written.indexOf("첫 항목이다")).toBeLessThan(written.indexOf("둘째 항목이다"));
  });

  it("씨앗이 없으면 붙이지 않는다", async () => {
    const root = await createRoot();

    expect(await appendArcEntry({ root, entry: "2026-08-15 · 처음 나왔다.", stamp })).toEqual({
      missing: arcPath,
    });
  });

  it("도장이 YAML로 읽히지 않으면 붙이지 않는다", async () => {
    // 읽히지 않는 frontmatter는 "아무것도 담지 않았다"와 같은 값으로 나온다. 그
    // 값을 믿고 담으면 이미 붙어 있는 항목 전부가 한 번 더 붙는다.
    const broken = `---\ncovered: [\n---\n\n${seed}`;
    const root = await withSeed(broken);

    expect(await appendArcEntry({ root, entry: "2026-08-15 · 처음 나왔다.", stamp })).toEqual({
      malformed: arcPath,
    });
    expect(await read(root)).toBe(broken);
  });

  it("금지 동사가 들어 있으면 붙이지 않고 걸린 자리를 돌려준다", async () => {
    const root = await withSeed();

    const outcome = await appendArcEntry({
      root,
      entry: "2026-08-15 · `deferred-processing`를 습득했다.",
      stamp,
    });

    expect(outcome).toEqual({ forbidden: [{ found: "습득", reason: expect.any(String) }] });
    // 걸린 항목이 앞의 내용을 건드리지도 못한다. 게이트는 쓰기 앞에 있다.
    expect(await read(root)).toBe(seed);
  });

  it("도장도 움직이지 않는다 — 다음 실행이 같은 자리를 다시 시도한다", async () => {
    const root = await withSeed();

    await appendArcEntry({ root, entry: "2026-08-15 · `rsc`를 익혔다.", stamp });

    expect(await readArcStamp({ root })).toEqual({ covered: null, notes: null });
  });
});

describe("두 목소리", () => {
  it("사람이 인용 블록으로 넣은 문장은 금지 동사 검사에서 빠진다", async () => {
    // 성취를 말하는 문장이 이미 파일에 있다. 본인의 말이므로 그것이 앞으로의
    // 갱신을 막지 않아야 한다 (ADR-0005).
    const root = await withSeed(`${seed}\n> 이 패턴은 이제 손에 익혔다.\n`);

    const outcome = await appendArcEntry({ root, entry: "2026-08-15 · 처음 나왔다.", stamp });

    expect(outcome).toEqual({ appended: arcPath });
    expect(await read(root)).toContain("> 이 패턴은 이제 손에 익혔다.");
  });

  it("관찰자의 문단에 든 금지 동사는 막는다", async () => {
    // 인용 블록 밖은 전부 관찰자의 말이다. 사람이 관찰자의 문단을 고쳐 성취를
    // 적었으면 그 자리에서 걸리고, 할 일은 그 문장을 인용 블록으로 옮기는 것이다.
    const root = await withSeed(`${seed}\n2026-07-08 · 이 패턴을 익혔다.\n`);

    const outcome = await appendArcEntry({ root, entry: "2026-08-15 · 처음 나왔다.", stamp });

    expect("forbidden" in outcome).toBe(true);
  });
});

describe("저장소를 읽어 붙이기까지", () => {
  const note = [
    "---",
    "source: https://youtu.be/43sDzyanzR0",
    "title: 인자를 객체로 묶는 신호",
    "date: 2026-07-08",
    "take: 인자 개수가 아니라 같은 묶음이 퍼지는 것이 신호였다.",
    "concepts:",
    "  - parameter-object-pattern",
    "---",
    "",
    "본문.",
    "",
  ].join("\n");

  it("조립 항목으로 붙이는 것이 예외 없이 끝난다", async () => {
    const root = await withSeed();
    await mkdir(join(root, "notes"), { recursive: true });
    await writeFile(join(root, "notes/2026-07-08-parameter-object.md"), note, "utf8");

    const model = await readRepository(root);
    const { entries } = selectArcEntries({ notes: model.notes, stamp: await readArcStamp({ root }) });
    const entry = entries[0] as (typeof entries)[number];

    const outcome = await appendArcEntry({
      root,
      entry: arcEntryLine({ date: entry.date, prose: renderArcEntry(entry) }),
      stamp: { covered: entry.path, notes: entry.noteNumber },
    });

    expect(outcome).toEqual({ appended: arcPath });
    expect(await read(root)).toContain("처음 나온 이름은 `parameter-object-pattern`이다.");
  });

  it("Note가 한 편도 없으면 붙일 항목이 없다", async () => {
    const root = await withSeed();

    const model = await readRepository(root);
    const selection = selectArcEntries({ notes: model.notes, stamp: await readArcStamp({ root }) });

    expect(selection).toEqual({ entries: [], behind: 0 });
    expect(await read(root)).toBe(seed);
  });
});

describe("withoutQuotedLines", () => {
  it("인용 블록 줄을 걷어 낸다", () => {
    expect(withoutQuotedLines("관찰자.\n> 본인.\n관찰자.")).toBe("관찰자.\n관찰자.");
  });

  it("들여 쓴 인용 블록도 걷어 낸다", () => {
    expect(withoutQuotedLines("  > 본인.\n관찰자.")).toBe("관찰자.");
  });

  it("인용 블록이 여러 줄이면 전부 걷어 낸다", () => {
    expect(withoutQuotedLines("> 한 줄.\n> 두 줄.\n관찰자.")).toBe("관찰자.");
  });
});
