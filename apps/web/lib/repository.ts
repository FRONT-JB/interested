import { resolve } from "node:path";

import { readDocument, readRepository, type Note } from "@interested/core";

/**
 * 화면이 저장소를 읽는 자리. 마크다운이 정본이고 웹은 그것을 읽어 그릴 뿐이므로
 * (ADR-0011), 이 파일에 쓰는 동작이 없다.
 */

/** 피드에 놓이는 Note 한 편. `slug`가 상세 페이지의 주소다. */
export type FeedNote = Note & { slug: string };

/**
 * 저장소 루트. Next는 앱 디렉토리에서 돌므로 두 단계 위가 루트다.
 *
 * 파일을 찾아 올라가지 않는다. 경로를 실행 중에 정하면 번들러가 프로젝트 전체를
 * 산출물에 딸려 넣는다.
 */
const repositoryRoot = resolve(process.cwd(), "..", "..");

function slugOf(path: string): string {
  return path.replace(/^notes\//, "").replace(/\.md$/, "");
}

/**
 * 최근에 쓴 Note가 위로 온다. 같은 날 쓴 것은 이름 순의 역순이다 — 이름이 날짜로
 * 시작하므로 그 안에서의 순서는 파일 이름이 정한 순서의 반대다.
 */
export async function feedNotes(): Promise<FeedNote[]> {
  const { notes } = await readRepository(repositoryRoot);

  return notes
    .map((note) => ({ ...note, slug: slugOf(note.path) }))
    .sort((a, b) => (a.date === b.date ? b.path.localeCompare(a.path) : b.date.localeCompare(a.date)));
}

/** 주소의 slug로 Note 한 편과 그 본문을 찾는다. 없으면 null이다. */
export async function noteBySlug(
  slug: string,
): Promise<{ note: FeedNote; body: string } | null> {
  const note = (await feedNotes()).find((candidate) => candidate.slug === slug);

  if (note === undefined) {
    return null;
  }

  const document = await readDocument({ root: repositoryRoot, path: note.path });

  return document === null ? null : { note, body: document.body };
}

/**
 * 관찰자의 문서 하나. 파일이 없으면 null이고, 그것도 정상 상태다 — 씨앗이 놓이기
 * 전의 Arc와, 아직 한 번도 돌지 않은 Portrait이 그렇다.
 */
export async function observerDocument(path: string): Promise<string | null> {
  const document = await readDocument({ root: repositoryRoot, path });

  if (document === null) {
    return null;
  }

  // 첫 줄의 제목은 걷어 낸다. 화면이 이미 그 이름을 달고 있어 그대로 그리면 같은
  // 이름이 두 번 놓인다. 파일에서 지우지는 않는다 — 마크다운이 정본이고 그 파일은
  // 뷰어로도 읽힌다 (ADR-0011).
  return document.body.trim().replace(/^#\s+\S+\n+/u, "");
}
