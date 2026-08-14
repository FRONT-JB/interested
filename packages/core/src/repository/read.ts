import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { parse as parseYaml } from "yaml";
import type { ZodError } from "zod";

import { conceptSlugSchema, noteFrontmatterSchema, type NoteFrontmatter } from "../note/schema.ts";

const notesDirectory = "notes";
const conceptsDirectory = "concepts";

/** 읽어낸 Note 한 편. `path`는 저장소 루트 기준 상대 경로다. */
export type Note = NoteFrontmatter & { path: string };

/** Concept 하나가 몇 편의 Note에 등장했는지. 임계는 Note 수다 (ADR-0002). */
export type ConceptTally = {
  concept: string;
  noteCount: number;
};

/** 형식을 만족하지 않아 모델에 들어가지 못한 파일. 한 편이 깨져도 나머지는 읽힌다. */
export type UnreadableFile = {
  path: string;
  reason: string;
};

export type RepositoryModel = {
  notes: Note[];
  concepts: ConceptTally[];
  promotionCandidates: string[];
  unreadable: UnreadableFile[];
};

/**
 * 서로 다른 Note 세 곳. 승격은 제안이고 실행은 사람이 하므로 이 값에
 * 못 미쳐도 손으로 올릴 수 있다 (ADR-0002).
 */
const promotionThreshold = 3;

/**
 * 저장소를 읽어 모델을 만드는 유일한 이음매. 디렉토리 하나가 들어가고
 * 모델 하나가 나오며, 이 안에서 파일을 쓰지 않는다.
 */
export async function readRepository(root: string): Promise<RepositoryModel> {
  const { read: notes, unreadable: unreadableNotes } = await readNotes(root);
  const { concepts: promoted, unreadable: unreadableConcepts } = await readPromotedConcepts(root);
  const concepts = tallyConcepts(notes);

  return {
    notes,
    concepts,
    unreadable: [...unreadableNotes, ...unreadableConcepts],
    promotionCandidates: concepts
      .filter(({ concept, noteCount }) => noteCount >= promotionThreshold && !promoted.has(concept))
      .map(({ concept }) => concept),
  };
}

/**
 * 승격된 Concept은 `concepts/<slug>.md`로 존재한다. 승격되지 않은 것은
 * 파일이 없고 Note의 frontmatter에 적힌 문자열로만 있다 (ADR-0002).
 *
 * 파일 이름이 곧 Concept 이름이므로 여기서도 slug를 검사한다. `RSC.md`를
 * 승격으로 세면 Note의 `rsc`와 영영 만나지 못한 채 후보로만 계속 뜬다.
 */
async function readPromotedConcepts(
  root: string,
): Promise<{ concepts: Set<string>; unreadable: UnreadableFile[] }> {
  const fileNames = (await listMarkdown(join(root, conceptsDirectory))).sort();

  const concepts = new Set<string>();
  const unreadable: UnreadableFile[] = [];

  for (const fileName of fileNames) {
    const concept = fileName.replace(/\.md$/, "");

    if (conceptSlugSchema.safeParse(concept).success) {
      concepts.add(concept);
    } else {
      unreadable.push({
        path: `${conceptsDirectory}/${fileName}`,
        reason: "파일 이름이 Concept slug가 아니다",
      });
    }
  }

  return { concepts, unreadable };
}

async function readNotes(root: string): Promise<{ read: Note[]; unreadable: UnreadableFile[] }> {
  const fileNames = (await listMarkdown(join(root, notesDirectory))).sort();

  const read: Note[] = [];
  const unreadable: UnreadableFile[] = [];

  for (const fileName of fileNames) {
    const path = `${notesDirectory}/${fileName}`;
    let contents: string;

    try {
      contents = await readFile(join(root, path), "utf8");
    } catch (error) {
      unreadable.push({ path, reason: `열어보지 못했다 — ${describeError(error)}` });
      continue;
    }

    const outcome = readNote(path, contents);

    if ("note" in outcome) {
      read.push(outcome.note);
    } else {
      unreadable.push(outcome.unreadable);
    }
  }

  return { read, unreadable };
}

/**
 * 형식 위반은 예외가 아니라 결과다. 한 편이 깨졌다고 저장소 전체를 읽지
 * 못하면 쌓인 기록이 파일 하나에 인질로 잡힌다.
 */
function readNote(path: string, contents: string): { note: Note } | { unreadable: UnreadableFile } {
  const frontmatter = splitFrontmatter(contents);

  if (frontmatter === null) {
    return { unreadable: { path, reason: "frontmatter가 없다" } };
  }

  let parsed: unknown;

  try {
    parsed = parseYaml(frontmatter);
  } catch (error) {
    return { unreadable: { path, reason: `frontmatter가 YAML이 아니다 — ${describeError(error)}` } };
  }

  const result = noteFrontmatterSchema.safeParse(parsed);

  if (!result.success) {
    return { unreadable: { path, reason: describeIssues(result.error) } };
  }

  return { note: { path, ...result.data } };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function describeIssues(error: ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")} — ${issue.message}` : issue.message))
    .join(" · ");
}

/**
 * 아직 없는 디렉토리는 비어 있는 것과 같다. 승격된 Concept이 하나도 없는
 * 상태는 버그가 아니라 정상이다 (ADR-0002).
 */
async function listMarkdown(directory: string): Promise<string[]> {
  try {
    const fileNames = await readdir(directory);

    return fileNames.filter((fileName) => fileName.endsWith(".md"));
  } catch (error) {
    if (isMissingDirectory(error)) {
      return [];
    }

    throw error;
  }
}

function isMissingDirectory(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function splitFrontmatter(contents: string): string | null {
  const matched = frontmatterPattern.exec(contents);

  return matched?.[1] ?? null;
}

/**
 * 등장이 잦은 Concept이 위로 오고, 같은 횟수면 이름 순이다. 사람이 읽는
 * 출력과 웹이 같은 순서를 쓰도록 정렬을 여기서 한 번만 정한다.
 */
function tallyConcepts(notes: Note[]): ConceptTally[] {
  const noteCounts = new Map<string, number>();

  for (const note of notes) {
    // 임계는 Note 수이지 언급 수가 아니다 (ADR-0002). 한 Note가 같은 Concept을
    // 여러 번 적어도 한 편으로 센다.
    for (const concept of new Set(note.concepts)) {
      noteCounts.set(concept, (noteCounts.get(concept) ?? 0) + 1);
    }
  }

  return [...noteCounts]
    .map(([concept, noteCount]) => ({ concept, noteCount }))
    .sort((a, b) => b.noteCount - a.noteCount || a.concept.localeCompare(b.concept));
}
