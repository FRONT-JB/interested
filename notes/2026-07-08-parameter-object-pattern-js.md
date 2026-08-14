---
source: https://youtu.be/43sDzyanzR0
title: Parameter Object Pattern은 JavaScript/TypeScript에도 적용할 수 있는가
date: 2026-07-08
take: 인자가 많다는 것이 아니라 같은 인자 묶음이 여러 함수로 퍼진다는 것이 객체로 묶을 신호였다.
concepts:
  - parameter-object-pattern
  - stamp-coupling
  - query-object
---

원문은 함수 인자가 많아질 때 관련 값을 하나의 객체로 묶으라고 말한다. `searchVideos("react", "education", "week", "KR", 20)`을 `searchVideos(searchQuery)`로 바꾸는 리팩터링이고, 전체 객체를 아무 데나 넘기면 함수가 쓰지도 않는 필드에 묶인다는 경고(stamp coupling)가 뒤에 붙는다.

내가 건진 것은 그 결론이 아니라 언제 묶을지 판별하는 기준이다. 인자 개수는 신호가 아니었다. `searchVideos` 하나만 그 인자들을 받는다면 일곱 개여도 그냥 둔다. `validateSearch`, `buildSearchQuery`, `getCacheKey`, `trackSearch`가 거의 같은 묶음을 반복해서 받기 시작할 때, 그때가 묶을 때다. 이 구분이 없으면 "인자 세 개 넘으면 객체로"라는 규칙만 남는데, 그건 기준이 아니라 미신이다.

## 어디에 쓸 생각인가

검색 조건, API request DTO, pagination과 filter option, service method의 options 자리. NestJS에서 query DTO가 이미 그 형태이므로 새로 배운 것이라기보다 왜 그렇게 생겼는지를 뒤늦게 납득한 쪽에 가깝다. 프론트에서는 필터 상태를 훅 인자로 넘길 때가 후보다.

## 미심쩍은 대목

원문은 고수준 함수에는 객체를, 저수준 함수에는 필요한 값만 넘기라는 기준을 준다. `normalizeRegion(region)`처럼 명백한 경우에는 잘 듣는다. 문제는 중간 계층이다. 고수준과 저수준의 경계가 코드에서 자명하지 않고, 애매할 때마다 판단이 필요하다면 그건 규칙보다 감각에 가깝다.

또 하나. 인자가 많다는 것은 그 함수가 여러 일을 하고 있다는 신호일 수도 있는데, 객체로 묶으면 시그니처는 깨끗해지고 하는 일은 그대로 남는다. 원문도 함수 책임 분리나 DTO와 domain model 분리가 먼저일 수 있다고 짚지만 지나가듯 말한다. 묶기 전에 나눌 것이 없는지 먼저 보는 편이 안전하다고 본다.
