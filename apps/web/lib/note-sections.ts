/**
 * Note 본문을 목소리로 가른다.
 *
 * Note에는 두 사람의 말이 있다. 앞은 원문이 한 말이고 — 도입부와 `## 원문이 한
 * 말` 절이 그것이다 (ADR-0009) — 뒤는 그것을 읽고 내가 남긴 말이다. `내가 건진
 * 것`, `어디에 쓸 생각인가`, `미심쩍은 대목`이 여기 든다.
 *
 * 제목 목록을 박아 두지 않는다. 원문의 자리는 ADR-0009가 이름까지 정해 둔 하나뿐이고
 * 나머지는 전부 사람이 쓴 것이므로, 그 하나만 알면 나눌 수 있다. Note 형식이
 * 자라도 새 절은 자동으로 사람 쪽에 놓인다.
 */
const sourceHeading = "원문이 한 말";

export type NoteVoices = {
  /** 원문의 말 — 도입부와 `## 원문이 한 말`. 없으면 빈 문자열이다. */
  source: string;
  /** 내가 남긴 말. 없으면 빈 문자열이다. */
  mine: string;
};

export function splitNoteVoices(body: string): NoteVoices {
  const blocks = splitByHeading(body.trim());
  const source: string[] = [];
  const mine: string[] = [];

  for (const block of blocks) {
    // 도입부(제목 없는 첫 덩어리)와 원문 절만 원문의 말이다.
    const isSource = block.heading === null || block.heading === sourceHeading;

    (isSource ? source : mine).push(block.text);
  }

  return { source: source.join("\n\n").trim(), mine: mine.join("\n\n").trim() };
}

type Block = { heading: string | null; text: string };

function splitByHeading(body: string): Block[] {
  const blocks: Block[] = [];
  let current: Block = { heading: null, text: "" };

  for (const line of body.split("\n")) {
    const matched = /^##\s+(.+?)\s*$/u.exec(line);

    if (matched === null) {
      current.text += `${line}\n`;
      continue;
    }

    if (current.text.trim() !== "") {
      blocks.push({ ...current, text: current.text.trim() });
    }

    current = { heading: matched[1] ?? "", text: `${line}\n` };
  }

  if (current.text.trim() !== "") {
    blocks.push({ ...current, text: current.text.trim() });
  }

  return blocks;
}
