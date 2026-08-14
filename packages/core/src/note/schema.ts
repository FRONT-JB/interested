import { z } from "zod";

/**
 * Note 한 편의 frontmatter. Source가 Note의 식별자이고, Take는 원문의
 * 주장이 아니라 내가 거기서 건진 것이다 (ADR-0003).
 */
export type NoteFrontmatter = z.infer<typeof noteFrontmatterSchema>;

/**
 * Concept 이름은 하이픈으로 이어진 소문자 영숫자다. 어제 `서버 컴포넌트`,
 * 오늘 `rsc`로 갈라지면 Note를 잇는 그래프가 조각난다 (ADR-0001).
 */
const conceptSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const conceptSlugSchema = z
  .string()
  .regex(conceptSlugPattern, "Concept은 하이픈으로 이어진 소문자 영숫자여야 한다");

/**
 * YAML은 따옴표 없는 `2026-08-14`를 Date로 넘긴다. 정본은 문자열이므로
 * 여기서 다시 YYYY-MM-DD로 되돌린다.
 */
const noteDateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z.iso.date(),
);

/**
 * 형식은 고정이다. 모르는 키를 흘려보내면 `concept:` 같은 오타가
 * 침묵으로 통과해 Concept 하나가 그래프에서 통째로 빠진다.
 */
export const noteFrontmatterSchema = z.strictObject({
  source: z.url(),
  title: z.string().trim().min(1, "제목이 비어 있다"),
  date: noteDateSchema,
  take: z.string().trim().min(1, "Take가 비어 있다"),
  concepts: z
    .array(conceptSlugSchema)
    .min(1, "Note는 Concept을 최소 하나 참조해야 한다")
    .refine((concepts) => new Set(concepts).size === concepts.length, {
      message: "같은 Concept을 한 Note 안에서 두 번 적을 수 없다",
    }),
});
