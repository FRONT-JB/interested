import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

import type { ProseAttempt, ProseWriter } from "./prose.ts";

const run = promisify(execFile);

/**
 * Claude Code CLI를 헤드리스로 한 번 부르는 자리. 이 파일이 모델과 닿는 유일한
 * 곳이고, 나머지는 `ProseWriter` 하나를 받아 돌아간다 (`portrait/prose.ts`).
 *
 * 인증은 환경 변수에 맡긴다 — 구독 토큰(`CLAUDE_CODE_OAUTH_TOKEN`, `claude
 * setup-token`으로 받는다)이나 API 키(`ANTHROPIC_API_KEY`). 토큰을 코드가 읽어
 * 옮기지 않으므로 로그에 실릴 자리가 없다.
 *
 * 도구를 하나도 주지 않는다. 이 호출이 하는 일은 재료를 문장으로 놓는 것뿐이고,
 * 파일을 읽거나 쓰는 것은 이 저장소의 코드가 한다.
 *
 * 저장소 밖(임시 디렉토리)에서 부른다. 재료는 전부 프롬프트에 담겨 있으므로
 * 저장소를 볼 이유가 없고, 밖에서 부르면 이 저장소의 CLAUDE.md나 훅이 판정에
 * 섞이지 않는다.
 */
export function claudeCodeWriter({
  command = "claude",
  model = process.env.PORTRAIT_MODEL ?? "claude-sonnet-5",
  cwd = tmpdir(),
  timeoutMs = 120_000,
}: {
  command?: string;
  model?: string;
  cwd?: string;
  timeoutMs?: number;
} = {}): ProseWriter {
  return async (prompt) => await callClaude({ command, model, cwd, timeoutMs, prompt });
}

async function callClaude({
  command,
  model,
  cwd,
  timeoutMs,
  prompt,
}: {
  command: string;
  model: string;
  cwd: string | undefined;
  timeoutMs: number;
  prompt: string;
}): Promise<ProseAttempt> {
  try {
    // 프롬프트를 인자로 넘긴다. 셸을 거치지 않으므로 줄바꿈이 그대로 간다.
    const { stdout } = await run(command, ["-p", prompt, "--model", model, "--allowed-tools", ""], {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
    });

    const prose = stdout.trim();

    // 경고는 stderr로 나오므로 여기 섞이지 않는다. 그래도 빈 답은 실패로 둔다 —
    // 빈 산문을 통과시키면 감사가 형식으로 걸러 낸 뒤 이유가 "제목이 없다"가 되고,
    // 무엇이 잘못됐는지가 한 겹 멀어진다.
    return prose === "" ? { failed: `${command}가 빈 답을 냈다` } : { prose };
  } catch (error) {
    return { failed: error instanceof Error ? error.message : String(error) };
  }
}
