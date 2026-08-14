import type { GitHubActivity } from "./activity.ts";
import type { PortraitStanding } from "./standing.ts";

/**
 * 관심 하나와 푸시가 간 곳 하나를 나란히 둔 것. 판정하지 않고 두 사실을
 * 붙여 놓기만 한다 — 허용된 범위가 집계된 사실과 사실끼리의 대비까지다
 * (ADR-0005).
 *
 * `aligned`는 두 사실이 같은 곳을 가리키는지다. 같은 것도 사실이므로 후보에서
 * 빼지 않는다. 대비만 남기면 관심과 행동이 맞아떨어진 주에 Portrait이 침묵한다.
 */
export type Contrast = {
  concept: string;
  repository: string;
  language: string | null;
  pushes: number;
  aligned: boolean;
};

/**
 * 지배 Concept마다 푸시가 가장 몰린 저장소를 하나 붙여 후보를 만드는 순수 함수.
 *
 * 저장소를 여럿 붙이지 않는다. 관심 하나에 저장소 셋을 늘어놓으면 대비가 아니라
 * 활동 목록이 되고, 그 목록은 Portrait의 다른 자리에 이미 있다.
 */
export function contrastCandidates({
  standing,
  activity,
}: {
  standing: PortraitStanding;
  activity: GitHubActivity;
}): Contrast[] {
  // 이미 푸시가 많은 순으로 정렬돼 있다 (`activity.ts`).
  const busiest = activity.repositories[0];

  if (busiest === undefined) {
    return [];
  }

  return standing.dominant.map(({ concept }) => ({
    concept,
    repository: busiest.repository,
    language: busiest.language,
    pushes: busiest.pushes,
    aligned: isSameName(concept, busiest.language),
  }));
}

/**
 * Concept 이름과 언어 이름이 같은 것을 가리키는지. `css`와 `CSS`,
 * `type-script`와 `TypeScript`는 같다.
 *
 * 이름이 다르면서 같은 것을 가리키는 쌍(`rsc`와 `TypeScript`)은 여기서 잡히지
 * 않는다. 그 판단은 규칙으로 닫히지 않고, 틀린 쪽이 "일치"라고 말하는 것이므로
 * 모르는 쪽을 대비로 남긴다. 언어를 모르면(`null`) 일치라고 말하지 않는다.
 */
function isSameName(concept: string, language: string | null): boolean {
  return language !== null && normalizeName(concept) === normalizeName(language);
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/gu, "");
}
