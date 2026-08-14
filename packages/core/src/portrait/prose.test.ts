import { describe, expect, it } from "vitest";

import type { PortraitBrief } from "./brief.ts";
import { writePortraitProse, type ProseAttempt, type ProseWriter } from "./prose.ts";

const brief: PortraitBrief = {
  facts: ["Note는 지금까지 5편이고 2주에 걸쳐 썼다.", "그 주에 가장 몰린 Concept은 `rsc`이다."],
  names: ["rsc"],
};

const good = "# Portrait\n\n`rsc`에 관심이 있다. Note는 지금까지 5편이고 2주에 걸쳐 썼다.";
const forbidden = "# Portrait\n\n`rsc`를 익혔다.";

/** 부를 때마다 정해진 답을 내놓는 스텁. 받은 프롬프트를 기록한다. */
function stub(...replies: ProseAttempt[]): { writer: ProseWriter; prompts: string[] } {
  const prompts: string[] = [];

  const writer: ProseWriter = async (prompt) => {
    prompts.push(prompt);

    return replies[prompts.length - 1] ?? { failed: "더 답할 것이 없다" };
  };

  return { writer, prompts };
}

describe("writePortraitProse", () => {
  it("감사를 통과하면 그 산문을 돌려준다", async () => {
    const { writer, prompts } = stub({ prose: good });

    expect(await writePortraitProse({ brief, writer })).toEqual({ prose: good });
    expect(prompts).toHaveLength(1);
  });

  it("앞뒤 빈 줄을 정리해서 돌려준다", async () => {
    const { writer } = stub({ prose: `\n\n${good}\n\n` });

    expect(await writePortraitProse({ brief, writer })).toEqual({ prose: good });
  });

  it("되돌려지면 걸린 이유를 붙여 다시 부른다", async () => {
    const { writer, prompts } = stub({ prose: forbidden }, { prose: good });

    expect(await writePortraitProse({ brief, writer })).toEqual({ prose: good });
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain("되돌려진 이유");
    expect(prompts[1]).toContain("익혔");
  });

  it("끝까지 통과하지 못하면 이유를 돌려준다", async () => {
    const { writer, prompts } = stub({ prose: forbidden }, { prose: forbidden });

    const outcome = await writePortraitProse({ brief, writer });

    expect("rejected" in outcome && outcome.rejected.join(" ")).toContain("익혔");
    expect(prompts).toHaveLength(2);
  });

  it("횟수를 정하면 그만큼만 부른다", async () => {
    const { writer, prompts } = stub({ prose: forbidden }, { prose: forbidden }, { prose: good });

    const outcome = await writePortraitProse({ brief, writer, attempts: 3 });

    expect(outcome).toEqual({ prose: good });
    expect(prompts).toHaveLength(3);
  });

  it("모델을 부르지 못하면 다시 부르지 않고 끝낸다", async () => {
    const { writer, prompts } = stub({ failed: "claude를 찾지 못했다" }, { prose: good });

    const outcome = await writePortraitProse({ brief, writer });

    expect("rejected" in outcome && outcome.rejected.join(" ")).toContain("claude를 찾지 못했다");
    expect(prompts).toHaveLength(1);
  });
});
