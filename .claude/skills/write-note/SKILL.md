---
name: write-note
description: Source 링크 하나를 받아 Note 한 편을 쓴다. 원문을 읽고 "여기서 뭐가 새로웠나" 같은 질문을 던진 뒤, 사람의 답을 재료로 초안을 조립하고 루브릭 게이트를 통과시켜 notes/ 아래에 파일로 남긴다. "이 링크로 Note 써줘", "이거 읽고 정리해줘", 유튜브·X·블로그 URL을 던지며 기록을 요청할 때 쓴다.
---

# Note 한 편 쓰기

Source 하나를 읽고 Note 한 편을 쓴다. 용어는 [CONTEXT.md](../../../CONTEXT.md)의 정의를 그대로 쓴다 — Source, Note, Take, Concept.

## 이 스킬이 하지 않는 것

[ADR-0004](../../../docs/adr/0004-the-skill-does-not-invent-the-perspective.md)가 이 스킬의 헌법이다.

- **관점을 지어내지 않는다.** "여기서 뭐가 새로웠나", "어디에 쓸 생각인가", "믿기지 않는 대목은"에 대한 답은 사람 것이다. 원문에서 그럴듯한 문장을 뽑아 그 자리를 채우면 Concept 그래프가 "내 관심의 궤적"이 아니라 "그럴듯하다고 판단된 것의 궤적"이 된다.
- **질문 단계를 건너뛰지 않는다.** 초안 생성은 한 번의 호출이 아니라 대화다. 느려 보이는 것은 비효율이 아니라 이 저장소가 성립하는 조건이다. 사람이 "알아서 써줘"라고 해도 질문은 던진다.
- **되물을 자리를 고쳐서 넘기지 않는다.** 게이트가 되묻자고 하면 초안을 보여주지 않는다. 반쯤 쓴 문장을 먼저 보여주면 사람이 고치는 대상이 백지가 아니라 기계가 쓴 문장이 되고, 그때부터 관점은 기계 것이다.
- **원문을 대신 요약하지 않는다.** 본문 대부분은 관점이고 원문의 주장은 짧게 가리키는 데 그친다 ([ADR-0003](../../../docs/adr/0003-note-does-not-replace-the-source.md)).

## 절차

### 1. 중복 Source를 먼저 본다

링크를 받으면 원문을 열기 전에 이미 쓴 Note인지 본다. Source가 Note의 식별자라서, 같은 URL로 두 편을 쓰면 한 원문이 Concept 그래프에서 두 번 센다.

```bash
node --input-type=module -e '
import { readRepository } from "./packages/core/src/repository/read.ts";
import { findDuplicateSource } from "./packages/core/src/note/duplicate.ts";

const source = process.argv[1];
const { notes, concepts } = await readRepository(process.cwd());
const duplicate = findDuplicateSource({ source, notes });

console.log(JSON.stringify({
  duplicate,
  vocabulary: concepts.map(({ concept }) => concept),
}, null, 2));
' "<링크>"
```

`duplicate`가 나오면 거기서 멈추고 사람에게 알린다 — 이미 쓴 Note의 경로와 제목을 보이고, 새로 쓸지 그 Note를 고칠지 묻는다. 임의로 진행하지 않는다.

`vocabulary`는 5단계에서 게이트에 넘길 기존 Concept 어휘다. 여기서 받아 들고 있는다.

### 2. Source를 읽는다

`WebFetch`로 원문을 읽는다. 영상이면 설명·자막·댓글 등 접근할 수 있는 것을 읽고, 읽지 못했으면 읽지 못했다고 말한다 — 짐작으로 채우지 않는다.

읽은 것에서 **원문의 주장을 세 문장 이내로** 정리한다. 이건 기계가 써도 되는 유일한 산문이다. 길게 쓰지 않는다 (ADR-0003).

### 3. 질문을 던진다

세 질문을 한 번에 던지고 답을 기다린다.

1. **여기서 뭐가 새로웠나** — 이미 알고 있던 것과 어디가 달랐나
2. **어디에 쓸 생각인가** — 지금 붙잡고 있는 코드나 결정 중 어디에 닿나
3. **믿기지 않는 대목은** — 원문이 너무 쉽게 넘어갔다고 느낀 곳이 어디였나

원문을 읽고 얻은 맥락으로 질문을 이 Source에 맞게 구체화해도 된다. 질문의 수를 줄이거나 답을 예시로 채워 보이는 것은 안 된다 — 예시가 곧 답이 된다.

답을 받으면 **Take 한 문장**을 사람의 답에서 뽑아 확인받는다. Take는 원문의 주장이 아니라 내 수확이다.

### 4. 초안 재료를 모은다

`NoteDraft` 한 덩어리로 모은다.

| 자리 | 어디서 오나 |
|---|---|
| `source` | 1단계에서 받은 링크 |
| `title` | 원문이 던진 질문 형태로 짓는다. 사람에게 확인받는다 |
| `date` | 오늘 (`YYYY-MM-DD`) |
| `take` | 3단계에서 확인받은 한 문장 |
| `concepts` | 이 Note가 다루는 Concept. 1단계의 `vocabulary`를 먼저 보고 이미 있는 이름이면 그것을 쓴다 |
| `sourceClaim` | 2단계에서 정리한 원문의 주장 |
| `harvest` | 질문 1의 답 |
| `application` | 질문 2의 답 |
| `doubt` | 질문 3의 답 |

`harvest` · `application` · `doubt`는 사람의 답을 그대로 옮긴다. 문장을 다듬는 것은 6단계에서 하고, 여기서는 내용을 보태지 않는다.

### 5. 게이트에 넣는다

```bash
node --input-type=module -e '
import { judgeDraft } from "./packages/core/src/note/rubric.ts";

const { draft, vocabulary } = JSON.parse(process.argv[1]);

console.log(JSON.stringify(judgeDraft({ draft, vocabulary }), null, 2));
' "$(cat /tmp/draft.json)"
```

판정은 두 갈래고, 갈래마다 할 일이 다르다.

**`outcome: "ask-back"`** — 재료가 모자란다. `corrected`가 아예 없다.

- `askBack[].question`을 사람에게 그대로 던진다. 답을 다시 받아 4단계로 돌아간다.
- **초안을 보여주지 않는다.** 조립한 문장도, 고칠 수 있었던 형식도 꺼내지 않는다.
- 답을 대신 채우거나 문턱을 넘길 만큼만 늘려 쓰지 않는다.
- `field`가 `concepts`면 게이트가 이름을 하나도 확정하지 못한 것이다. `vocabulary`를 보고 **영어 이름을 정해** 4단계로 돌아간다. 기존 어휘에 뜻이 같은 것이 있으면 새 이름을 만들지 말고 그것을 쓴다 ([ADR-0001](../../../docs/adr/0001-note-connects-through-concept.md)). 이름이 관점을 담는 자리이므로 사람에게 확인받는다.
- 게이트의 판정이 틀렸다고 보이면 — 짧지만 날카로운 답이 걸렸다면 — 사람에게 그렇게 말하고 판단을 받는다. 게이트를 우회하는 것도 사람의 결정이다.

**`outcome: "pass"`** — `corrected`를 쓰고 `corrections`는 한 줄로 알린다.

- 경어체 교정과 Concept slug 교정은 되묻지 않고 이미 반영돼 있다. 무엇을 고쳤는지는 알리되 승인을 구하지 않는다.
- `after`가 `null`인 `corrections` 항목은 게이트가 이름을 확정하지 못하고 지운 Concept이다. 한글이 섞였거나(`React 서버 컴포넌트`) 영숫자로 옮길 수 없는 기호가 있는(`c++`) 이름이다. **게이트는 이런 이름을 깎아 내지 않는다** — `react`나 `c`로 줄이면 뜻이 다른 Concept이 조용히 굳기 때문이다. 지워진 자리마다 `vocabulary`를 보고 영어 이름을 정해 `concepts`에 다시 넣고 게이트를 다시 돌린다. 살아남은 이름이 하나도 없으면 애초에 `pass`가 나오지 않는다.
- **`corrections`의 `after`를 그대로 믿지 마라.** 아래 "경어체 교정이 틀리는 자리"를 보고, 걸리는 문장은 6단계에서 손으로 맞춘다.

#### 경어체 교정이 틀리는 자리

게이트는 동사와 형용사를 사전 없이 가르지 못한다. 그래서 **못 고치는 것보다 틀리게 고치는 것이 위험하다** — 경어체는 사라졌는데 어색한 문장만 남아 눈에 덜 띈다. 아래 세 유형은 `corrections`에 `after`가 들어와 있어도 다시 봐야 한다.

| 유형 | 들어온 것 | 게이트가 내놓는 것 | 맞는 것 |
|---|---|---|---|
| 받침 있는 동사 + `-습니다` | `바로 닿습니다` | `바로 닿다` | `바로 닿는다` |
| 어간이 `이`로 끝나는 동사 + `-입니다` | `분명히 보입니다` | `분명히 보이다` | `분명히 보인다` |
| `-지 않습니다`의 앞이 동사 | `말하지 않습니다` | `말하지 않다` | `말하지 않는다` |

같은 규칙이 아래에서는 맞게 돈다. 고쳐 놓고 또 고치지 마라.

| 들어온 것 | 나오는 것 |
|---|---|
| 과거형 — `나왔습니다`, `가까웠습니다` | `나왔다`, `가까웠다` |
| 받침 있는 형용사 — `가깝습니다`, `좋습니다` | `가깝다`, `좋다` |
| 명사 뒤 서술격 — `문제입니다`, `중간 계층입니다` | `문제이다`, `중간 계층이다` |
| `-하다` 형용사 — `중요합니다`, `필요합니다` | `중요하다`, `필요하다` |

`입니다`를 늦게 처리해 `보입니다`를 살리면 훨씬 흔한 `문제입니다`가 `문제인다`라는 비문이 된다. 표기가 같아 값싸게 가를 방법이 없어서 흔한 쪽을 살린 선택이고, 남은 자리를 여기서 사람이 본다.

손대지 못하는 경어체도 있다 — `-네요`, `-거든요`, `-지요`. 이건 `corrections`에 나타나지 않으니 원문 답변을 직접 훑는다.

### 6. 본문을 조립한다

`corrected`의 재료로 본문을 쓴다. 형식은 [notes/2026-07-08-parameter-object-pattern-js.md](../../../notes/2026-07-08-parameter-object-pattern-js.md)를 따른다.

```
{sourceClaim — 원문이 무슨 말을 하는지. 한 문단, 짧게}

{harvest — 내가 건진 것. 원문의 결론이 아니라 내 수확이 무엇인지}

## 어디에 쓸 생각인가

{application}

## 미심쩍은 대목

{doubt}
```

- 평서체 1인칭이다. "~라고 본다", "내가 건진 것은".
- 5단계의 표에 걸린 문장을 여기서 맞춘다. `닿다` → `닿는다`, `보이다` → `보인다`.
- 관점 문단에 사람이 말하지 않은 근거·사례·수치를 보태지 않는다. 문장을 잇고 다듬는 데까지다.
- 관련 Note로 가는 링크를 넣지 않는다. 관련성은 Concept을 거쳐 렌더링 시점에 계산한다 (ADR-0001).

### 7. 파일로 쓴다

경로는 `notes/{date}-{slug}.md`다. `slug`는 제목에서 사람이 알아볼 만한 영문 소문자 몇 단어로 줄인다 (`2026-07-08-parameter-object-pattern-js.md`).

```bash
node --input-type=module -e '
import { noteFrontmatterSchema } from "./packages/core/src/note/schema.ts";
import { renderMarkdown, writeMarkdown } from "./packages/core/src/repository/write.ts";

const { draft, body, path } = JSON.parse(process.argv[1]);
const { source, title, date, take, concepts } = draft;
const frontmatter = noteFrontmatterSchema.parse({ source, title, date, take, concepts });

const outcome = await writeMarkdown({
  root: process.cwd(),
  path,
  contents: renderMarkdown({ frontmatter, body }),
});

console.log(JSON.stringify(outcome));
' "$(cat /tmp/note.json)"
```

- `fs.writeFile`을 직접 부르지 않는다. 저장소에 파일을 쓰는 이음매는 `writeMarkdown` 하나다.
- `noteFrontmatterSchema.parse`가 던지면 그건 게이트를 통과했어도 형식이 어긋났다는 뜻이다. 메시지를 보고 고쳐 다시 돌린다.
- `{ kept: ... }`가 나오면 그 경로에 파일이 이미 있어 손대지 않은 것이다. 덮어쓰지 말고 사람에게 알린다.

### 8. 마무리

쓴 경로, 확정된 Concept, 게이트가 고친 것을 한 번에 보인다. `pnpm concepts`로 이 Note가 어떤 Concept을 3회에 가깝게 밀어 올렸는지 볼 수 있다 ([ADR-0002](../../../docs/adr/0002-concept-promotion-at-three.md)).

커밋은 하지 않는다. 발행 전에 사람이 문장을 고친다.

## 게이트가 판정하는 것과 못 하는 것

게이트(`packages/core/src/note/rubric.ts`)는 순수 함수다. 저장소를 읽지 않고, 넘겨받은 재료와 어휘만 본다.

확정적으로 판정하는 것 — Concept slug 형식, 기존 어휘와의 대조.

반쯤만 확정적인 것 — 경어체 교정. 검출은 확정적이지만 교정은 동사·형용사 구분에서 갈려 틀리게 고치는 자리가 남는다. 5단계의 표를 보고 사람이 마지막을 본다.

근사로 판정하는 것 — "관점이 얇다"는 글자 수로, "Take가 원문 요약이다"는 원문 요약과의 어휘 겹침으로 재는 기계적 근사다. 짧고 날카로운 답을 되묻게 만들 수 있고, 길게 늘여 쓴 빈 말은 통과시킨다. 애매하면 되묻는 쪽으로 기울여 있으며, 최종 판단은 이 대화에서 사람과 에이전트가 한다.

게이트를 자동 교정 쪽으로 옮기고 싶어질 때가 온다. 그건 개선이 아니라 ADR-0004의 철회다.
