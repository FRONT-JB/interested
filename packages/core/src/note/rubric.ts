/**
 * Note 초안의 재료. 스킬이 원문에서 뽑아낸 것과, 스킬이 던진 질문에 사람이
 * 답한 것이 한 자리에 모인다. 관점 세 자리(harvest·application·doubt)는
 * 사람의 답이지 기계가 채우는 칸이 아니다 (ADR-0004).
 */
export type NoteDraft = {
  source: string;
  title: string;
  date: string;
  /** 이 Source에서 내가 건진 것 한 문장. 원문의 주장이 아니다. */
  take: string;
  concepts: string[];
  /** 원문이 무슨 말을 하는지. 짧게 가리키는 데 그친다 (ADR-0003). */
  sourceClaim: string;
  /** "여기서 뭐가 새로웠나"에 대한 답. */
  harvest: string;
  /** "어디에 쓸 생각인가"에 대한 답. */
  application: string;
  /** "믿기지 않는 대목은"에 대한 답. */
  doubt: string;
};

/**
 * 되물을 수 있는 자리. 관점 세 자리와 Take, 그리고 Concept이 하나도 남지
 * 않았을 때의 `concepts`다. 형식을 고치는 것과 이름을 새로 정하는 것은 다른
 * 일이라, 후자는 기계가 하지 않는다 (ADR-0001).
 */
export type AskBackField = "take" | PerspectiveField | "concepts";

/** 스킬이 던진 세 질문에 사람이 답한 자리. 글이 들어가므로 길이로 잴 수 있다. */
type PerspectiveField = "harvest" | "application" | "doubt";

/** 말없이 고칠 수 있는 자리. 되물을 것과 겹치는 이름이지만 경로가 다르다. */
export type CorrectionField =
  | "title"
  | "take"
  | "concepts"
  | "sourceClaim"
  | "harvest"
  | "application"
  | "doubt";

/** 재료가 모자란 한 자리. `question`은 사람에게 그대로 던지는 말이다. */
export type AskBack = {
  field: AskBackField;
  reason: string;
  question: string;
};

/** 말없이 고친 한 자리. `after`가 null이면 고치지 못하고 지웠다는 뜻이다. */
export type Correction = {
  field: CorrectionField;
  before: string;
  after: string | null;
  reason: string;
};

/**
 * 게이트의 판정. 두 갈래가 같은 배열이 아니라 서로 다른 자리에 있다.
 *
 * 재료가 하나라도 모자라면 `corrected`가 아예 없다. 기계가 관점을 채운 초안을
 * 손에 쥘 방법이 타입에 없어야, 되묻는 대신 지어내는 길이 막힌다 (ADR-0004).
 */
export type RubricVerdict =
  | { outcome: "ask-back"; askBack: AskBack[] }
  | { outcome: "pass"; corrected: NoteDraft; corrections: Correction[] };

/**
 * 초안 재료를 받아 판정 하나를 돌려주는 순수 함수. 저장소를 읽지 않으므로
 * 기존 Concept 어휘는 호출자가 `readRepository`에서 떠다 넣는다 (ADR-0001).
 *
 * 재료 부족 검사가 먼저 돌고, 하나라도 걸리면 거기서 끝난다. 형식을 고쳐 놓고
 * "관점만 보강하면 된다"고 내미는 순간 사람이 고치는 대상이 백지가 아니라
 * 기계가 쓴 문장이 되고, 그때부터 관점은 기계 것이다.
 */
export function judgeDraft({
  draft,
  vocabulary,
}: {
  draft: NoteDraft;
  vocabulary: readonly string[];
}): RubricVerdict {
  const askBack = collectAskBacks(draft);

  if (askBack.length > 0) {
    return { outcome: "ask-back", askBack };
  }

  const corrections: Correction[] = [];
  const corrected: NoteDraft = {
    ...draft,
    title: correctStyle(draft.title, "title", corrections),
    take: correctStyle(draft.take, "take", corrections),
    sourceClaim: correctStyle(draft.sourceClaim, "sourceClaim", corrections),
    harvest: correctStyle(draft.harvest, "harvest", corrections),
    application: correctStyle(draft.application, "application", corrections),
    doubt: correctStyle(draft.doubt, "doubt", corrections),
    concepts: correctConcepts(draft.concepts, vocabulary, corrections),
  };

  // 이름을 하나도 확정하지 못했으면 통과가 아니다. Note는 Concept을 최소 하나
  // 참조해야 하므로(`note/schema.ts`) 이대로는 파일을 쓸 수 없고, `pass`로
  // 내보내면 쓸 수 없는 초안이 통과한 것으로 보인다.
  if (corrected.concepts.length === 0) {
    return {
      outcome: "ask-back",
      askBack: [
        {
          field: "concepts",
          reason: "Concept 이름을 하나도 확정하지 못했다 — 기계가 어휘를 지어내지 않는다",
          question:
            "이 Note가 다루는 Concept의 영어 이름을 정해 달라. 저장소에 이미 쓰는 이름이 있으면 그것을 쓴다.",
        },
      ],
    };
  }

  return { outcome: "pass", corrected, corrections };
}

// ─── 재료 부족 ────────────────────────────────────────────────────────────────

/**
 * 관점 한 자리가 이만큼(공백 제외 글자 수)도 안 되면 얇다고 본다.
 *
 * 글자 수로 관점을 재는 것은 조악한 근사다. 짧고 날카로운 답을 되묻게 만들 수
 * 있고, 길게 늘여 쓴 빈 말은 그냥 통과한다. 그래도 되묻는 쪽으로 기울여 둔다.
 * 얇은 관점을 통과시키면 초안을 채울 방법이 기계가 지어내는 것뿐이기
 * 때문이다 (ADR-0004). 최종 판단은 이 함수가 아니라 스킬 대화에서 사람과
 * 에이전트가 한다.
 */
const minimumPerspectiveLength = 40;

/** Take가 한 문장의 수확이 되기에 최소한 이 정도는 된다고 보는 길이. */
const minimumTakeLength = 12;

/**
 * Take가 원문 요약과 이만큼 겹치면 내 수확이 아니라 원문의 주장으로 본다.
 * 관점 자리는 원문을 조금 더 길게 되풀이할 여지가 있어 문턱을 높게 잡는다.
 */
const takeEchoRatio = 0.7;
const perspectiveEchoRatio = 0.8;

/** Take가 원문을 3인칭으로 가리키는 표현. 이러면 내 수확이 아니라 소개다. */
const sourceVoicePattern = /(원문|저자|필자|글쓴이|발표자|영상|이 글|이 영상|강연)(은|는|이|가|도)/;

function collectAskBacks(draft: NoteDraft): AskBack[] {
  const askBack: AskBack[] = [];

  if (compactLength(draft.take) < minimumTakeLength) {
    askBack.push({
      field: "take",
      reason: "Take가 한 문장의 수확이 되기에 너무 짧다",
      question: "이 Source에서 네가 건진 것을 원문의 주장 대신 네 말로 한 문장에 담아 달라.",
    });
  } else if (sourceVoicePattern.test(draft.take)) {
    askBack.push({
      field: "take",
      reason: "Take가 원문을 3인칭으로 가리키고 있다 — 원문의 주장이지 내 수확이 아니다",
      question: "원문이 무슨 말을 했는지 말고, 그걸 읽은 네가 무엇을 가져갔는지 한 문장으로 적어 달라.",
    });
  } else if (echoRatio(draft.take, draft.sourceClaim) >= takeEchoRatio) {
    askBack.push({
      field: "take",
      reason: "Take가 원문 요약과 대부분 겹친다 — 수확이 아니라 요약이다",
      question: "원문을 읽기 전과 후에 네 생각이 달라진 지점을 한 문장으로 짚어 달라.",
    });
  }

  addPerspectiveAskBack(askBack, draft, {
    field: "harvest",
    question: "여기서 뭐가 새로웠나 — 이미 알고 있던 것과 어디가 달랐는지 짚어 달라.",
  });
  addPerspectiveAskBack(askBack, draft, {
    field: "application",
    question: "어디에 쓸 생각인가 — 지금 붙잡고 있는 코드나 결정 중 어디에 닿는지 말해 달라.",
  });
  addPerspectiveAskBack(askBack, draft, {
    field: "doubt",
    question: "믿기지 않는 대목은 — 원문이 너무 쉽게 넘어갔다고 느낀 곳이 어디였나.",
  });

  return askBack;
}

function addPerspectiveAskBack(
  askBack: AskBack[],
  draft: NoteDraft,
  { field, question }: { field: PerspectiveField; question: string },
): void {
  const answer = draft[field];

  if (compactLength(answer) < minimumPerspectiveLength) {
    askBack.push({ field, reason: "관점이 얇다 — 답이 한 자리를 채우지 못했다", question });

    return;
  }

  if (echoRatio(answer, draft.sourceClaim) >= perspectiveEchoRatio) {
    askBack.push({
      field,
      reason: "관점 자리에 원문 요약이 되풀이됐다",
      question,
    });
  }
}

function compactLength(text: string): number {
  return text.replace(/\s+/gu, "").length;
}

/**
 * 어절의 앞 두 글자를 어간으로 친다. 한국어 어절은 대개 앞이 어간이고 뒤가
 * 조사·어미라서, 형태소 분석기 없이 겹침을 재는 가장 싼 근사다.
 *
 * 놓치는 쌍이 많다. `묶음`과 `묶으라고`는 어간이 같은데도 다른 것으로 세고,
 * 두 글자짜리 우연한 일치는 같은 것으로 센다. 이 값 하나로 판정을 끝내지 말고
 * 되묻는 문장을 사람에게 보이는 데까지만 쓴다.
 */
function stems(text: string): Set<string> {
  const tokens = text.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length >= 2);

  return new Set(
    tokens.map((token) => (/[가-힣]/.test(token) ? token.slice(0, 2) : token.toLowerCase())),
  );
}

/** 앞 글이 뒤 글의 말을 얼마나 되풀이하는지. 견줄 것이 없으면 0이다. */
function echoRatio(text: string, source: string): number {
  const own = stems(text);
  const theirs = stems(source);

  if (own.size === 0 || theirs.size === 0) {
    return 0;
  }

  let shared = 0;

  for (const stem of own) {
    if (theirs.has(stem)) {
      shared += 1;
    }
  }

  return shared / own.size;
}

// ─── 형식 위반 ────────────────────────────────────────────────────────────────

function correctStyle(text: string, field: CorrectionField, corrections: Correction[]): string {
  const corrected = toPlainStatement(text);

  if (corrected !== text) {
    corrections.push({
      field,
      before: text,
      after: corrected,
      reason: "경어체가 섞여 있어 평서체 1인칭으로 고쳤다",
    });
  }

  return corrected;
}

const hangulBase = 0xac00;
const finalConsonantCount = 28;
/** 종성 ㅂ과 ㄴ의 자리. `합니다`의 ㅂ을 ㄴ으로 바꾸면 `한다`가 된다. */
const finalBieup = 17;
const finalNieun = 4;
/** 종성 ㅆ의 자리. `봤어요`의 `봤`처럼 과거 `-았/었-`을 가려내는 데 쓴다. */
const finalSsangsiot = 20;

/**
 * `-하다`가 붙어 형용사가 되는 어근들. 동사면 `중요한다`가 아니라 `중요하다`로
 * 끝나야 해서 한 줄로 가를 수 없고, 이 목록은 자주 쓰는 것만 담은 근사다.
 */
const adjectiveRoots = new Set([
  "가능",
  "불가능",
  "중요",
  "필요",
  "불필요",
  "명확",
  "불명확",
  "충분",
  "불충분",
  "유사",
  "비슷",
  "단순",
  "복잡",
  "애매",
  "적절",
  "부적절",
  "유용",
  "이상",
  "정확",
  "부정확",
  "안전",
  "위험",
  "흔",
  "편",
  "불편",
  "타당",
  "무리",
  "분명",
]);

/**
 * 경어체 종결형을 평서체로 되돌리고 겸양 1인칭을 1인칭으로 바꾼다.
 *
 * 표는 자주 나오는 종결형만 담는다. 여기 없는 형태는 검출도 교정도 되지 않고,
 * 그건 이 함수가 못 고칠 문장을 조용히 반쯤 고쳐 놓는 것보다 낫다. 순서가
 * 규칙의 일부다 — `습니다`와 `입니다`를 먼저 걷어내지 않으면 마지막의 ㅂ니다
 * 규칙이 `습`과 `입`의 종성 ㅂ까지 건드려 `슨다`, `인다`를 만든다.
 *
 * 동사와 형용사를 사전 없이 가를 수 없어서 **틀리게 고치는 자리가 남는다.**
 * `습니다`는 받침 있는 형용사(`가깝습니다` → `가깝다`)와 모든 과거형
 * (`나왔습니다` → `나왔다`)에서 맞지만, 받침 있는 동사에서는 `-는다`가 돼야
 * 할 것이 `-다`로 잘린다 (`닿습니다` → `닿다`). 어색한 쪽으로 기울여 둔 것은
 * 반대로 기울이면 형용사에서 `명확하지 않는다` 같은 비문이 나오기 때문이다.
 *
 * `입니다`를 먼저 걷어내는 것도 같은 맞바꿈이다. 이 규칙을 빼고 ㅂ니다 규칙에
 * 맡기면 어간이 `이`로 끝나는 동사가 맞게 나오지만(`보입니다` → `보인다`)
 * 훨씬 흔한 명사 뒤 서술격 조사가 비문이 된다(`문제입니다` → `문제인다`).
 * 실제로 돌려 확인했고, 둘을 가를 값싼 방법은 없다 — 표기가 같기 때문이다.
 * 그래서 흔한 쪽을 살리고 `보입니다` → `보이다`를 감수한다. 열화가 비문이
 * 아니라 기본형이라 문장이 깨지지는 않는다.
 *
 * 이 한계의 위험은 "못 고친다"가 아니라 "틀리게 고친다"는 데 있다. 경어체가
 * 사라진 자리에 어색한 문장만 남아 눈에 덜 띈다. 그래서 스킬은 본문을
 * 조립하기 전에 `corrections`의 `after`를 읽고 동사 종결이 잘렸는지 본다
 * (SKILL.md 5단계).
 *
 * 1인칭 교정은 `저`를 `나`로 바꾸는 데까지다. 문장의 주어가 누구인지는 기계가
 * 가릴 수 없으므로 문체만 고치고, 나머지는 스킬 대화에서 사람이 본다.
 */
function toPlainStatement(text: string): string {
  let corrected = text;

  for (const [pattern, replacement] of humblePronouns) {
    corrected = corrected.replace(pattern, replacement);
  }

  for (const [ending, replacement] of Object.entries(irregularEndings)) {
    corrected = corrected.replaceAll(ending, replacement);
  }

  corrected = corrected
    .replace(/습니다/g, "다")
    .replace(/([가-힣]*)합니다/g, (_matched, root: string) => conjugateHada(root))
    .replace(/([가-힣])니다/g, replaceBieupNida)
    .replace(/([가-힣]*)해요/g, (_matched, root: string) => conjugateHada(root))
    .replace(/([가-힣])어요/g, replacePastEoyo);

  return corrected;
}

/**
 * 규칙으로 가를 수 없어 통째로 적어 두는 종결형들.
 *
 * 앞의 셋은 규칙이 먼저 닿으면 망가진다. `입니다`를 두면 뒤의 ㅂ니다 규칙이
 * `인다`를 만들고, `다릅니다`는 어간이 ㅡ로 끝나는 형용사라 `다른다`가 된다.
 * 뒤쪽은 해요체 중 자주 쓰면서 규칙화가 안 되는 것들이다.
 */
const irregularEndings: Record<string, string> = {
  아닙니다: "아니다",
  입니다: "이다",
  다릅니다: "다르다",
  큽니다: "크다",
  바쁩니다: "바쁘다",
  아픕니다: "아프다",
  이에요: "이다",
  예요: "이다",
  돼요: "된다",
  되요: "된다",
  없어요: "없다",
  같아요: "같다",
  좋아요: "좋다",
  많아요: "많다",
  맞아요: "맞다",
  싫어요: "싫다",
  알아요: "안다",
  몰라요: "모른다",
  그래요: "그렇다",
};

/** `제가 보기에` 같은 겸양 1인칭. 앞에 한글이 붙으면 `문제가`처럼 다른 말이다. */
const humblePronouns: [RegExp, string][] = [
  [/(^|[^가-힣])저는/gu, "$1나는"],
  [/(^|[^가-힣])제가/gu, "$1내가"],
  [/(^|[^가-힣])저도/gu, "$1나도"],
  [/(^|[^가-힣])저를/gu, "$1나를"],
  [/(^|[^가-힣])저의/gu, "$1나의"],
  [/(^|[^가-힣])저희/gu, "$1우리"],
];

function conjugateHada(root: string): string {
  return adjectiveRoots.has(root) ? `${root}하다` : `${root}한다`;
}

/**
 * `갑니다`, `봅니다`처럼 어간이 모음으로 끝나는 동사의 합쇼체. 종성 ㅂ을
 * ㄴ으로 바꾸면 평서체가 된다. `큽니다`(→ 크다) 같은 ㅡ 어간 형용사는
 * 잘못 고치지만, 기술 노트에서 만날 일이 드물어 감수한다.
 */
function replaceBieupNida(matched: string, syllable: string): string {
  const code = syllable.charCodeAt(0) - hangulBase;

  if (code % finalConsonantCount !== finalBieup) {
    return matched;
  }

  return `${String.fromCharCode(hangulBase + code - finalBieup + finalNieun)}다`;
}

/**
 * `봤어요`, `먹었어요`처럼 과거 `-았/었-` 뒤에 붙은 해요체. 앞 음절의 종성이
 * 쌍시옷일 때만 `-다`로 바꾸므로 `먹어요`(→ 먹는다) 같은 현재형은 건드리지
 * 않는다. 못 고치는 것을 남기는 편이 반쯤 고쳐 놓는 것보다 낫다.
 */
function replacePastEoyo(matched: string, syllable: string): string {
  const code = syllable.charCodeAt(0) - hangulBase;

  return code % finalConsonantCount === finalSsangsiot ? `${syllable}다` : matched;
}

/**
 * Concept 이름을 slug로 고치고, 기존 어휘에 같은 것이 있으면 그 이름으로
 * 맞춘다. 어제 `서버 컴포넌트`, 오늘 `rsc`로 갈라지면 그래프가 조각나므로
 * 이름의 일관성이 이 구조의 단일 실패 지점이다 (ADR-0001).
 */
function correctConcepts(
  concepts: readonly string[],
  vocabulary: readonly string[],
  corrections: Correction[],
): string[] {
  const known = new Map(vocabulary.map((concept) => [vocabularyKey(concept), concept]));
  const corrected: string[] = [];

  for (const concept of concepts) {
    const slug = toConceptSlug(concept);

    if (slug === "") {
      // 한글 이름은 slug로 고칠 수 없고, 영어 이름을 여기서 지어내면 기계가
      // 저장소의 어휘를 정하게 된다. 지운 자리를 남겨 두면 어휘 목록을 읽는
      // 스킬이 이름을 정해 다시 넣는다.
      corrections.push({
        field: "concepts",
        before: concept,
        after: null,
        reason: "slug로 고칠 수 없는 이름이라 지웠다 — 영어 이름은 스킬이 어휘를 보고 정한다",
      });
      continue;
    }

    const settled = known.get(vocabularyKey(slug)) ?? slug;

    if (settled !== concept) {
      corrections.push({
        field: "concepts",
        before: concept,
        after: settled,
        reason:
          settled === slug ? "Concept slug 형식으로 고쳤다" : "저장소에 이미 있는 이름으로 맞췄다",
      });
    }

    if (!corrected.includes(settled)) {
      corrected.push(settled);
    }
  }

  return corrected;
}

/**
 * slug로 옮길 수 있는 이름만 옮기고, 나머지는 빈 문자열이다.
 *
 * 옮길 수 없는 글자를 지우고 남은 것을 이름으로 삼지 않는다. 그렇게 하면
 * `React 서버 컴포넌트`가 `react`가 되고 `c++`이 `c`가 되어, 기계가 뜻이 다른
 * Concept을 말없이 확정한다. 이름의 일관성이 이 구조의 단일 실패 지점이므로
 * (ADR-0001) 확정할 수 없는 이름은 지운 자리로 남겨 스킬에 넘긴다.
 */
function toConceptSlug(name: string): string {
  const trimmed = name.trim().toLowerCase();

  if (untranslatablePattern.test(trimmed)) {
    return "";
  }

  return trimmed
    .replace(/[\s_./]+/gu, "-")
    .replace(/[^a-z0-9-]/gu, "")
    .replace(/-{2,}/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

/** 라틴 영숫자와 구분자 말고 다른 글자가 하나라도 있으면 옮길 수 없는 이름이다. */
const untranslatablePattern = /[^a-z0-9\s_./-]/u;

/**
 * 하이픈과 복수형만 다른 이름을 한 자리로 모은다. `server-components`와
 * `server-component`는 같은 Concept이다. `rsc`와 `server-component`처럼 뜻만
 * 같은 쌍은 여기서 못 잡고, 그건 어휘 목록을 읽는 스킬의 몫이다.
 */
function vocabularyKey(slug: string): string {
  return slug.replace(/-/gu, "").replace(/s$/u, "");
}
