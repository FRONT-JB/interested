import { describe, expect, it } from "vitest";

import { fetchGitHubActivity, type FetchLike } from "./activity.ts";

type Reply = { status?: number; body?: unknown; broken?: boolean; throws?: boolean };

/** 조회한 URL을 기록하는 스텁. 어느 주소를 몇 번 불렀는지가 검증 대상이다. */
function stub(replies: Record<string, Reply>): { fetch: FetchLike; calls: string[] } {
  const calls: string[] = [];

  const fetch: FetchLike = async (url) => {
    calls.push(url);

    const reply = replies[url] ?? { status: 404, body: { message: "Not Found" } };

    if (reply.throws === true) {
      throw new Error("네트워크가 끊겼다");
    }

    return {
      ok: (reply.status ?? 200) < 400,
      status: reply.status ?? 200,
      json: async () => {
        if (reply.broken === true) {
          throw new Error("JSON이 아니다");
        }

        return reply.body;
      },
    };
  };

  return { fetch, calls };
}

const eventsUrl = "https://api.github.com/users/octocat/events/public?per_page=100";
const languagesUrl = (repository: string) => `https://api.github.com/repos/${repository}/languages`;

/** 실제 응답에 있는 자리만 담은 푸시 하나. `payload`에 커밋 수는 오지 않는다. */
function push({ repository, createdAt }: { repository: string; createdAt: string }) {
  return {
    type: "PushEvent",
    created_at: `${createdAt}T09:00:00Z`,
    repo: { id: 1, name: repository },
    payload: { repository_id: 1, push_id: 2, ref: "refs/heads/main" },
  };
}

const window = { since: "2026-08-10", until: "2026-08-16" };

describe("fetchGitHubActivity", () => {
  it("창 안의 PushEvent를 저장소별로 센다", async () => {
    const { fetch } = stub({
      [eventsUrl]: {
        body: [
          push({ repository: "octocat/interested", createdAt: "2026-08-12" }),
          push({ repository: "octocat/interested", createdAt: "2026-08-14" }),
          push({ repository: "octocat/dev-pulse", createdAt: "2026-08-13" }),
        ],
      },
      [languagesUrl("octocat/interested")]: { body: { TypeScript: 900, CSS: 100 } },
      [languagesUrl("octocat/dev-pulse")]: { body: { CSS: 500 } },
    });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect(outcome).toEqual({
      activity: {
        login: "octocat",
        ...window,
        pushes: 3,
        repositories: [
          { repository: "octocat/interested", pushes: 2, language: "TypeScript" },
          { repository: "octocat/dev-pulse", pushes: 1, language: "CSS" },
        ],
      },
    });
  });

  it("커밋 수를 세지 않는다 — 푸시 하나는 한 번이다", async () => {
    const { fetch } = stub({
      [eventsUrl]: {
        body: [
          {
            ...push({ repository: "octocat/interested", createdAt: "2026-08-12" }),
            // 문서에는 있지만 실제 응답에는 오지 않는 자리. 와도 세지 않는다.
            payload: { size: 9, commits: [{}, {}, {}] },
          },
        ],
      },
      [languagesUrl("octocat/interested")]: { body: { TypeScript: 1 } },
    });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect("activity" in outcome && outcome.activity.pushes).toBe(1);
  });

  it("창 밖의 이벤트는 세지 않는다", async () => {
    const { fetch } = stub({
      [eventsUrl]: {
        body: [
          push({ repository: "octocat/interested", createdAt: "2026-08-09" }),
          push({ repository: "octocat/interested", createdAt: "2026-08-17" }),
          push({ repository: "octocat/interested", createdAt: "2026-08-10" }),
          push({ repository: "octocat/interested", createdAt: "2026-08-16" }),
        ],
      },
      [languagesUrl("octocat/interested")]: { body: { TypeScript: 1 } },
    });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect("activity" in outcome && outcome.activity.pushes).toBe(2);
  });

  it("PushEvent가 아닌 활동은 세지 않는다", async () => {
    const { fetch } = stub({
      [eventsUrl]: {
        body: [
          { ...push({ repository: "octocat/interested", createdAt: "2026-08-12" }), type: "WatchEvent" },
        ],
      },
    });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect("activity" in outcome && outcome.activity).toMatchObject({ pushes: 0, repositories: [] });
  });

  it("푸시가 많은 저장소가 먼저 오고 같으면 이름 순이다", async () => {
    const { fetch } = stub({
      [eventsUrl]: {
        body: [
          push({ repository: "octocat/b", createdAt: "2026-08-12" }),
          push({ repository: "octocat/b", createdAt: "2026-08-13" }),
          push({ repository: "octocat/a", createdAt: "2026-08-12" }),
          push({ repository: "octocat/a", createdAt: "2026-08-13" }),
          push({ repository: "octocat/c", createdAt: "2026-08-12" }),
          push({ repository: "octocat/c", createdAt: "2026-08-13" }),
          push({ repository: "octocat/c", createdAt: "2026-08-14" }),
        ],
      },
      [languagesUrl("octocat/a")]: { body: {} },
      [languagesUrl("octocat/b")]: { body: {} },
      [languagesUrl("octocat/c")]: { body: {} },
    });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect("activity" in outcome && outcome.activity.repositories).toEqual([
      { repository: "octocat/c", pushes: 3, language: null },
      { repository: "octocat/a", pushes: 2, language: null },
      { repository: "octocat/b", pushes: 2, language: null },
    ]);
  });

  it("언어 조회가 실패해도 저장소와 푸시 횟수는 남는다", async () => {
    const { fetch } = stub({
      [eventsUrl]: { body: [push({ repository: "octocat/interested", createdAt: "2026-08-12" })] },
      [languagesUrl("octocat/interested")]: { status: 403, body: { message: "rate limited" } },
    });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect("activity" in outcome && outcome.activity.repositories).toEqual([
      { repository: "octocat/interested", pushes: 1, language: null },
    ]);
  });

  it("언어는 푸시가 몰린 앞의 세 곳까지만 조회한다", async () => {
    const repositories = ["a", "b", "c", "d"].map((name) => `octocat/${name}`);
    const { fetch, calls } = stub({
      [eventsUrl]: {
        body: repositories.flatMap((repository, index) =>
          // a는 네 번, b는 세 번… d는 한 번 푸시한다.
          Array.from({ length: repositories.length - index }, (_unused, day) =>
            push({ repository, createdAt: `2026-08-1${day}` }),
          ),
        ),
      },
      ...Object.fromEntries(repositories.map((repository) => [languagesUrl(repository), { body: { CSS: 1 } }])),
    });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect(calls.filter((url) => url.endsWith("/languages"))).toHaveLength(3);
    expect("activity" in outcome && outcome.activity.repositories.at(-1)).toEqual({
      repository: "octocat/d",
      pushes: 1,
      language: null,
    });
  });

  it("응답이 200이 아니면 조회하지 못한 것으로 끝난다", async () => {
    const { fetch } = stub({ [eventsUrl]: { status: 403, body: { message: "rate limited" } } });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect("unavailable" in outcome && outcome.unavailable).toBe(`\`${eventsUrl}\` 가 403으로 답했다`);
  });

  it("실패 이유에 문장을 붙이지 않는다 — 그 문장은 읽는 쪽이 쓴다", async () => {
    const { fetch } = stub({ [eventsUrl]: { status: 403, body: {} } });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect("unavailable" in outcome && outcome.unavailable).not.toContain("조회하지 못했다");
  });

  it("네트워크가 끊기면 조회하지 못한 것으로 끝난다", async () => {
    const { fetch } = stub({ [eventsUrl]: { throws: true } });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect("unavailable" in outcome).toBe(true);
  });

  it("응답이 예상한 형태가 아니면 조회하지 못한 것으로 끝난다", async () => {
    const { fetch } = stub({ [eventsUrl]: { body: { message: "이건 배열이 아니다" } } });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect("unavailable" in outcome).toBe(true);
  });

  it("응답이 JSON이 아니면 조회하지 못한 것으로 끝난다", async () => {
    const { fetch } = stub({ [eventsUrl]: { broken: true } });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect("unavailable" in outcome).toBe(true);
  });

  it("활동이 하나도 없는 것은 실패가 아니다", async () => {
    const { fetch } = stub({ [eventsUrl]: { body: [] } });

    const outcome = await fetchGitHubActivity({ login: "octocat", ...window, fetch });

    expect(outcome).toEqual({
      activity: { login: "octocat", ...window, pushes: 0, repositories: [] },
    });
  });

  it("토큰을 주면 인증 헤더를 붙인다", async () => {
    const headers: (Record<string, string> | undefined)[] = [];

    const outcome = await fetchGitHubActivity({
      login: "octocat",
      ...window,
      token: "비밀",
      fetch: async (_url, init) => {
        headers.push(init?.headers);

        return { ok: true, status: 200, json: async () => [] };
      },
    });

    expect("activity" in outcome).toBe(true);
    expect(headers[0]?.Authorization).toBe("Bearer 비밀");
  });
});
