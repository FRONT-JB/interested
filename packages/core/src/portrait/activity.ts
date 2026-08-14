import { z } from "zod";

/** 그 창 안에서 푸시가 간 저장소 하나. `language`는 알아내지 못하면 null이다. */
export type PushedRepository = {
  repository: string;
  pushes: number;
  language: string | null;
};

/** 조회해 온 GitHub 활동. 창의 양끝을 함께 들고 다니는 것은 Portrait이 기간을 밝히고 말해야 하기 때문이다. */
export type GitHubActivity = {
  login: string;
  since: string;
  until: string;
  pushes: number;
  /** 푸시가 많은 순, 같으면 이름 순. */
  repositories: PushedRepository[];
};

/**
 * 조회 결과. 실패가 예외가 아닌 것은 GitHub이 Portrait의 필수 재료가 아니기
 * 때문이다 — 조회가 막히면 Note만으로 판정을 쓴다 (ADR-0005).
 */
export type ActivityOutcome = { activity: GitHubActivity } | { unavailable: string };

/**
 * 조회에 쓰는 부분만 따 온 `fetch`. 테스트가 스텁을 넣을 자리이고, 이 좁은
 * 모양이 이 모듈이 네트워크에 하는 일의 전부다.
 */
export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * GitHub 공개 활동을 조회한다. 저장소에 아무것도 남기지 않으므로 API가 막혀도
 * 마크다운 정본은 멀쩡하다 (ADR-0005).
 *
 * `since`와 `until`은 `YYYY-MM-DD`이고 양끝을 포함한다. 창을 호출자가 정하는
 * 것은 "이번 주"가 언제인지가 실행 시각의 문제이지 이 모듈의 문제가 아니기
 * 때문이다.
 *
 * 공개 이벤트만 본다. 비공개 저장소의 활동을 세면 Portrait이 독자가 확인할 수
 * 없는 숫자를 말하게 되고, 토큰 권한에 따라 같은 저장소가 다른 얼굴을 갖는다.
 * 토큰은 세는 범위를 넓히려고 있는 게 아니라 조회 한도 때문에 있다.
 */
export async function fetchGitHubActivity({
  login,
  token,
  since,
  until,
  fetch = globalThis.fetch,
}: {
  login: string;
  token?: string;
  since: string;
  until: string;
  fetch?: FetchLike;
}): Promise<ActivityOutcome> {
  const events = await getJson({
    url: `https://api.github.com/users/${encodeURIComponent(login)}/events/public?per_page=${eventPageSize}`,
    token,
    fetch,
    schema: z.array(eventSchema),
  });

  if ("failed" in events) {
    // 이유만 돌려준다. "조회하지 못했다"는 문장은 이것을 읽는 쪽이 쓰므로
    // (`portrait/render.ts`) 여기서 함께 붙이면 같은 말이 두 번 실린다.
    return { unavailable: events.failed };
  }

  const pushed = tallyPushes({ events: events.value, since, until });
  const repositories = await withLanguages({ pushed, token, fetch });

  return {
    activity: {
      login,
      since,
      until,
      pushes: repositories.reduce((total, { pushes }) => total + pushes, 0),
      repositories,
    },
  };
}

/**
 * 이벤트 API는 최근 것부터 한 페이지만 준다. 페이지를 넘겨 가며 긁지 않는 것은
 * 창이 최근 며칠이고, 그 며칠이 한 페이지를 넘길 만큼 활동이 많다면 세는 것보다
 * 조회 한도가 먼저 문제가 되기 때문이다.
 */
const eventPageSize = 100;

/** 주 언어를 물어볼 저장소 수. 푸시가 몰린 곳만 묻는다 — 조회 한 번이 저장소 하나다. */
const languageLookupLimit = 3;

/**
 * 형식을 느슨하게 받는다. 모르는 키를 막으면 이벤트 종류 하나가 늘어난 날
 * 조회 전체가 실패하고, Portrait이 GitHub 응답 형식에 인질로 잡힌다.
 *
 * 필요한 것은 세 자리뿐이다 — 종류, 시각, 저장소 이름.
 */
const eventSchema = z.looseObject({
  type: z.string().optional(),
  created_at: z.string().optional(),
  repo: z.looseObject({ name: z.string() }).optional(),
});

type GitHubEvent = z.infer<typeof eventSchema>;

/** 언어별 바이트 수. 가장 많은 쪽을 그 저장소의 주 언어로 본다. */
const languagesSchema = z.record(z.string(), z.number());

/**
 * 세는 단위는 푸시 한 번이다. 커밋 수를 세지 않는 것은 공개 이벤트가 그것을
 * 주지 않기 때문이다 — 2026-08-14에 확인한 응답의 `PushEvent.payload`에는
 * `repository_id`, `push_id`, `ref`, `head`, `before`만 있고 문서에 적힌
 * `size`와 `commits`가 없다.
 *
 * 없는 값을 1로 세어 "커밋 9개"라고 쓰면 조회되지 않은 숫자를 관찰자가
 * 말하게 된다 (ADR-0005). 푸시 횟수는 응답에 있는 그대로이므로 그것만 센다.
 */
function tallyPushes({
  events,
  since,
  until,
}: {
  events: GitHubEvent[];
  since: string;
  until: string;
}): { repository: string; pushes: number }[] {
  const pushCounts = new Map<string, number>();

  for (const event of events) {
    const repository = event.repo?.name;

    if (event.type !== "PushEvent" || repository === undefined || event.created_at === undefined) {
      continue;
    }

    // 시각이 아니라 날짜로 견준다. 창을 사람이 읽는 날짜로 주고받으므로,
    // 시각까지 비교하면 마지막 날의 오후 활동이 조용히 창 밖으로 밀려난다.
    const day = event.created_at.slice(0, 10);

    if (day < since || day > until) {
      continue;
    }

    pushCounts.set(repository, (pushCounts.get(repository) ?? 0) + 1);
  }

  return [...pushCounts]
    .map(([repository, pushes]) => ({ repository, pushes }))
    .sort((a, b) => b.pushes - a.pushes || a.repository.localeCompare(b.repository));
}

/**
 * 푸시가 몰린 앞의 몇 곳에만 주 언어를 붙인다. 나머지는 `null`로 남는다 —
 * 모르는 것을 모른다고 두는 편이 조회를 저장소 수만큼 늘리는 것보다 낫다.
 *
 * 한 저장소의 언어 조회가 실패해도 그 저장소만 `null`이 된다. 언어는 대비를
 * 거들 뿐이고, 푸시 횟수는 그것 없이도 사실이다.
 */
async function withLanguages({
  pushed,
  token,
  fetch,
}: {
  pushed: { repository: string; pushes: number }[];
  token: string | undefined;
  fetch: FetchLike;
}): Promise<PushedRepository[]> {
  return await Promise.all(
    pushed.map(async ({ repository, pushes }, index) => ({
      repository,
      pushes,
      language: index < languageLookupLimit ? await primaryLanguage({ repository, token, fetch }) : null,
    })),
  );
}

async function primaryLanguage({
  repository,
  token,
  fetch,
}: {
  repository: string;
  token: string | undefined;
  fetch: FetchLike;
}): Promise<string | null> {
  const languages = await getJson({
    // 저장소 전체의 언어 비율이다. 그 창의 푸시가 무슨 언어였는지가 아니므로
    // 문장에서도 저장소의 것으로 밝혀 적는다 (`portrait/render.ts`).
    url: `https://api.github.com/repos/${repository}/languages`,
    token,
    fetch,
    schema: languagesSchema,
  });

  if ("failed" in languages) {
    return null;
  }

  const ranked = Object.entries(languages.value).sort(
    ([nameA, bytesA], [nameB, bytesB]) => bytesB - bytesA || nameA.localeCompare(nameB),
  );

  return ranked[0]?.[0] ?? null;
}

/**
 * 조회 한 번. 실패를 세 갈래로 나누지 않고 한 문장으로 모으는 것은, 호출자가
 * 하는 일이 어느 쪽이든 같기 때문이다 — GitHub 없이 판정을 쓴다.
 *
 * 응답 형식은 내 코드가 만든 값이 아니므로 스키마를 지난다.
 */
async function getJson<T>({
  url,
  token,
  fetch,
  schema,
}: {
  url: string;
  token: string | undefined;
  fetch: FetchLike;
  schema: z.ZodType<T>;
}): Promise<{ value: T } | { failed: string }> {
  let body: unknown;

  try {
    const response = await fetch(url, { headers: headersFor(token) });

    if (!response.ok) {
      // 주소를 코드 표기로 감싼다. 이 문장이 Portrait 본문에 실리고, 동사
      // 게이트는 코드 표기 안을 검사하지 않는다 (`observer/verbs.ts`).
      return { failed: `\`${url}\` 가 ${response.status}으로 답했다` };
    }

    body = await response.json();
  } catch (error) {
    return { failed: error instanceof Error ? error.message : String(error) };
  }

  const parsed = schema.safeParse(body);

  return parsed.success ? { value: parsed.data } : { failed: `${url} 의 응답이 예상한 형태가 아니다` };
}

function headersFor(token: string | undefined): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    // GitHub은 User-Agent 없는 요청을 거부한다.
    "User-Agent": "interested-portrait",
    ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
  };
}
