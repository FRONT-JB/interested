import { readRepository, type RepositoryModel } from "../repository/read.ts";

/**
 * 저장소의 Concept 현황과 승격 후보를 사람이 읽는 형태로 찍는다. 판정은
 * 모델이 하고 여기서는 줄을 세울 뿐이며, 승격 자체는 사람이 한다 (ADR-0002).
 */
function renderConcepts(model: RepositoryModel): string {
  const { notes, concepts, promotionCandidates, unreadable } = model;
  const candidates = new Set(promotionCandidates);
  const lines: string[] = [];

  lines.push("", `Concept ${concepts.length}개 · Note ${notes.length}편`, "");

  if (concepts.length === 0) {
    lines.push("  아직 아무것도 없다.");
  }

  const width = Math.max(0, ...concepts.map(({ concept }) => concept.length));

  for (const { concept, noteCount } of concepts) {
    const promotable = candidates.has(concept);
    const marker = promotable ? "★" : " ";
    const trailing = promotable ? "  ← 승격 후보" : "";

    lines.push(`  ${marker} ${concept.padEnd(width)}  ${noteCount}편${trailing}`);
  }

  lines.push("");

  if (promotionCandidates.length === 0) {
    lines.push("승격 후보 없음 — 세 곳에 도달한 Concept이 아직 없다.");
  } else {
    lines.push(
      `승격 후보 ${promotionCandidates.length}개 — ${promotionCandidates
        .map((concept) => `concepts/${concept}.md`)
        .join(", ")} 를 쓰면 승격된다.`,
    );
  }

  for (const { path, reason } of unreadable) {
    lines.push(`읽지 못한 파일: ${path} (${reason})`);
  }

  return lines.join("\n");
}

const model = await readRepository(process.cwd());

console.log(renderConcepts(model));
