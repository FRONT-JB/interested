#!/usr/bin/env node
/**
 * study-source 감사 단계의 eval 러너.
 *
 * 오독을 일부러 심은 브리핑을 study-source-auditor에 그대로 물려, 심은 것을
 * 잡는지(recall)와 멀쩡한 자리를 걸지 않는지(오탐)를 잰다. 감사는 이 스킬의
 * 유일한 비결정적 안전장치라서, 모델을 바꿀 때 여기가 회귀 지점이 된다.
 *
 *   node .claude/skills/study-source/evals/run.mjs
 *   node .claude/skills/study-source/evals/run.mjs --case inverted --case clean
 *   node .claude/skills/study-source/evals/run.mjs --judge-model haiku
 *
 * 토큰을 쓰므로 pnpm test에 붙이지 않는다. 손으로 돌린다.
 */

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const evalsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evalsDirectory, "../../../..");
const concurrency = 3;

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const cases = await loadCases(options.only);

  if (cases.length === 0) {
    console.error("돌릴 케이스가 없다.");
    process.exit(1);
  }

  console.log(`${String(cases.length)}개 케이스를 돌린다. 케이스마다 감사 한 번과 채점 한 번이다.\n`);

  const results = await mapWithLimit(cases, concurrency, async (testCase) => {
    const audit = await runAuditor(testCase);
    const scored = await score(testCase, audit);

    report(scored);

    return scored;
  });

  summarize(results);
  process.exit(results.every(({ passed }) => passed) ? 0 : 1);
}

function parseArguments(argv) {
  const only = [];
  let judgeModel = "haiku";

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--case") {
      only.push(argv[index + 1]);
      index += 1;
    } else if (argv[index] === "--judge-model") {
      judgeModel = argv[index + 1];
      index += 1;
    }
  }

  return { only, judgeModel };
}

async function loadCases(only) {
  const contents = await readFile(resolve(evalsDirectory, "cases.json"), "utf8");
  const cases = JSON.parse(contents);

  return only.length === 0 ? cases : cases.filter(({ name }) => only.includes(name));
}

/** 실제 감사자를 그대로 부른다. 프롬프트도 스킬이 쓰는 것과 같은 두 줄이다. */
async function runAuditor({ source, briefing }) {
  const sourcePath = relative(repositoryRoot, resolve(evalsDirectory, source));
  const briefingPath = relative(repositoryRoot, resolve(evalsDirectory, briefing));

  return claude([
    "--agent",
    "study-source-auditor",
    "--allowedTools",
    "Read",
    "-p",
    `원문: ${sourcePath}\n브리핑: ${briefingPath}`,
  ]);
}

/**
 * 감사 결과는 자유 서술이라 문자열 대조로는 못 센다. 심은 목록과 대조해
 * 무엇을 잡았고 그 밖에 몇 건을 더 걸었는지만 뽑는 얇은 채점기를 둔다.
 */
async function score(testCase, audit) {
  const planted = testCase.planted
    .map(({ id, anchor, why }) => `- ${id}: 브리핑의 "${anchor}" — ${why}`)
    .join("\n");

  const verdict = await claude([
    "--model",
    "haiku",
    "-p",
    [
      "아래는 브리핑 감사자가 낸 결과다. 심어 둔 오류 목록과 대조해 판정해라.",
      "",
      "심어 둔 오류:",
      planted || "(없다 — 이 브리핑에는 오류를 심지 않았다)",
      "",
      "감사 결과:",
      "---",
      audit,
      "---",
      "",
      "규칙 — 감사자가 어긋났다고 판정한 것만 센다. 대조했으나 문제가 없다고 확인한 자리는 세지 않는다.",
      "",
      'JSON만 출력해라: {"flagged": ["잡은 오류의 id"], "extra": 심은 것 말고 추가로 지적한 건수}',
    ].join("\n"),
  ]);

  const parsed = parseJson(verdict);
  const flagged = testCase.planted.filter(({ id }) => parsed.flagged.includes(id));
  const missed = testCase.planted.filter(({ id }) => !parsed.flagged.includes(id));

  return {
    name: testCase.name,
    plantedCount: testCase.planted.length,
    flagged,
    missed,
    extra: parsed.extra,
    passed: missed.length === 0 && parsed.extra === 0,
    audit,
  };
}

function report({ name, plantedCount, flagged, missed, extra, passed }) {
  const mark = passed ? "통과" : "실패";
  const recall = plantedCount === 0 ? "심은 것 없음" : `${String(flagged.length)}/${String(plantedCount)}`;

  console.log(`[${mark}] ${name} — 잡음 ${recall}, 오탐 ${String(extra)}`);

  for (const { id, why } of missed) {
    console.log(`         놓침: ${id} — ${why}`);
  }
}

function summarize(results) {
  const planted = results.reduce((total, { plantedCount }) => total + plantedCount, 0);
  const caught = results.reduce((total, { flagged }) => total + flagged.length, 0);
  const extra = results.reduce((total, result) => total + result.extra, 0);

  console.log(
    `\n심은 ${String(planted)}건 중 ${String(caught)}건을 잡았고, 오탐은 ${String(extra)}건이다.`,
  );
}

function claude(args) {
  return new Promise((fulfil, reject) => {
    const child = spawn("claude", [...args, "--output-format", "json"], {
      cwd: repositoryRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`claude가 ${String(code)}로 끝났다: ${stderr.slice(0, 500)}`));

        return;
      }

      try {
        fulfil(JSON.parse(stdout).result);
      } catch {
        reject(new Error(`claude 출력을 읽지 못했다: ${stdout.slice(0, 500)}`));
      }
    });
  });
}

/** 채점기가 코드 펜스를 두르는 경우가 있어 첫 중괄호 덩어리만 떼어 읽는다. */
function parseJson(text) {
  const match = /\{[\s\S]*\}/u.exec(text);

  if (match === null) {
    throw new Error(`채점 결과가 JSON이 아니다: ${text.slice(0, 300)}`);
  }

  return JSON.parse(match[0]);
}

async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  async function pull() {
    while (next < items.length) {
      const index = next;

      next += 1;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, pull));

  return results;
}

await main();
