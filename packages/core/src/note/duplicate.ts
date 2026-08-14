/**
 * 이 Source로 쓴 Note가 이미 있는지 본다. Source가 Note의 식별자이므로
 * 같은 URL로 두 편을 쓰면 Concept 그래프에서 한 원문이 두 번 센다 (ADR-0001).
 *
 * 저장소를 읽지 않는다. 호출자가 `readRepository`의 `notes`를 넘긴다.
 */
export function findDuplicateSource<T extends { source: string }>({
  source,
  notes,
}: {
  source: string;
  notes: readonly T[];
}): T | null {
  const key = sourceKey(source);

  return notes.find((note) => sourceKey(note.source) === key) ?? null;
}

/**
 * 공유 버튼이 붙여 주는 꼬리표들. 이걸 남겨 두면 같은 영상을 두 번 쓰고도
 * 중복이 아니라고 답하게 된다.
 */
const disposableParameters = new Set(["si", "feature", "t", "ref", "ref_src", "fbclid", "gclid"]);

/**
 * 같은 원문을 가리키는 URL들을 한 글자로 모은다. 프로토콜과 `www.`를 버리는
 * 것은 http/https나 www 유무가 다른 원문을 뜻한 적이 없기 때문이다.
 *
 * 한계는 분명하다. `youtu.be/X`와 `youtube.com/watch?v=X`는 같은 영상이지만
 * 여기서는 다른 Source다. 서비스별 규칙을 코드에 넣기 시작하면 끝이 없어서,
 * 그 판단은 스킬이 사람에게 되묻는 쪽에 남긴다.
 */
function sourceKey(source: string): string {
  const trimmed = source.trim();

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    // URL이 아닌 값은 스키마가 따로 거부한다. 여기서는 글자 그대로 견준다.
    return trimmed;
  }

  const host = url.host.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "");
  const query = [...url.searchParams]
    .filter(([name]) => !disposableParameters.has(name) && !name.startsWith("utm_"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");

  return `${host}${path}${query === "" ? "" : `?${query}`}`;
}
