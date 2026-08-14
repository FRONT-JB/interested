# interested

내가 무엇에 관심을 두고 있는지를 기록하고, 관찰자가 그걸 읽어 나를 서술하는 저장소.

유튜브·X·블로그처럼 URL 하나로 가리킬 수 있는 **Source**를 읽을 때마다 **Note**를 한 편 쓴다. Note는 요약이 아니라 관점이다 — 원문에서 무엇을 얻었고, 어디에 쓸 수 있고, 어디가 미심쩍은지. 각 Note는 자기가 다루는 **Concept**을 참조하고, Note끼리는 직접 잇지 않고 Concept을 거쳐 이어진다.

그 위에 세 개의 서술이 자란다. 주말마다 그 주의 자취를 남기는 **Trail**, 지금 이 사람이 무엇에 붙들려 있는지를 말하며 늘 덮어써지는 **Portrait**, 그리고 시작하기 전 무엇에 끌렸는지에서 출발해 길어지기만 하는 **Arc**.

앞의 둘은 손이 가고, 뒤의 둘은 저절로 자란다.

## 흐름

마크다운 파일이 들어가서 파생 서술이 나온다. 그 사이에 모듈 하나가 있다.

```
                    ┌─────────────────────────────┐
  notes/*.md   ──►  │                             │  ──►  Concept 목록 + 빈도
  concepts/*.md ──► │      저장소를 읽어           │  ──►  승격 후보 (3회 도달)
  trails/*.md  ──►  │      모델을 만드는 것        │  ──►  주별 묶음 · 편중 · 이동
                    │                             │  ──►  식은 Concept
                    └─────────────────────────────┘  ──►  Portrait 재료
                                  │
                                  ▼
              ┌───────────────────┴────────────────────┐
              │                                        │
        루브릭 게이트                              사이트 렌더링
     (초안 + 모델 → 판정)                        (모델 → 화면)
```

frontmatter 파싱, Concept 등장 집계, 3회 임계 판정, 주 단위 묶기, 편중과 이동 계산, 식은 Concept 판정이 전부 이 모듈 뒤에 숨는다. 밖으로 드러나는 것은 "디렉토리 하나가 들어가고 모델 하나가 나온다"뿐이다.

Note 본문과 Portrait 문장 자체는 모델 호출이라 산문을 검증할 수 없다. 검증되는 것은 모델 계산과 게이트 판정이다.

## 용어

여섯 단어의 정의는 [CONTEXT.md](./CONTEXT.md)에 있다.

## 규칙

| | |
|---|---|
| [ADR-0001](./docs/adr/0001-note-connects-through-concept.md) | Note는 Concept을 거쳐서만 이어진다 |
| [ADR-0002](./docs/adr/0002-concept-promotion-at-three.md) | Concept은 3회 등장 시 실체로 승격한다 |
| [ADR-0003](./docs/adr/0003-note-does-not-replace-the-source.md) | Note는 원문을 대체하지 않는다 |
| [ADR-0004](./docs/adr/0004-the-skill-does-not-invent-the-perspective.md) | 스킬은 관점을 지어내지 않는다 |
| [ADR-0005](./docs/adr/0005-the-observer-uses-only-observable-verbs.md) | 관찰자는 관측 가능한 동사만 쓴다 |
| [ADR-0006](./docs/adr/0006-the-main-axis-is-concept-not-time.md) | 우측 메인은 시간축이 아니라 Concept 축이다 |

관찰자가 `습득했다`고 말하지 않고 `관심이 있다`고만 말하는 이유는 ADR-0005에 있다. 읽었다는 사실에서 관심은 따라 나오지만 습득은 따라 나오지 않는다.

## 상태

설계만 끝났고 아직 Note가 없다. 웹은 Trail이 네 번 발행된 뒤에 만든다 — 실물 없이 설계하면 추측이 되므로.
