#!/usr/bin/env node

/**
 * github-readme-ai-stats init
 *
 * 한 줄로 설정 완료:
 *   npx github-readme-ai-stats init
 *
 * 수행 작업:
 * 1. gh CLI 인증 확인
 * 2. 로컬 Claude Code / Codex 데이터 확인
 * 3. 데이터 파싱 → SVG 카드 생성
 * 4. GitHub Gist 생성 (SVG + JSON)
 * 5. Claude Code Stop hook 자동 등록
 * 6. README에 붙일 코드 출력
 */

import { execSync } from "child_process";
import { readFile, writeFile, access, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { fetchClaudeStatsCache } from "../src/fetchers/claude-stats-cache-fetcher.js";
import { fetchSessionMeta } from "../src/fetchers/session-meta-fetcher.js";
import { renderStatsCard } from "../src/cards/stats-card.js";
import { formatTokens } from "../src/utils/format.js";

const CLAUDE_DIR = join(homedir(), ".claude");
const SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");

async function main() {
  console.log("\n  ⚡ github-readme-ai-stats init\n");

  // ─── Step 1: gh CLI 확인 ───
  console.log("  [1/5] Checking gh CLI...");
  try {
    const ghUser = execSync("gh api user -q .login", { encoding: "utf-8" }).trim();
    console.log(`    ✓ Logged in as @${ghUser}\n`);
    var username = ghUser;
  } catch {
    console.log("    ✗ gh CLI not authenticated.");
    console.log("    Run: gh auth login\n");
    process.exit(1);
  }

  // ─── Step 2: 로컬 데이터 확인 ───
  console.log("  [2/5] Scanning local AI tool data...");

  const stats = await fetchClaudeStatsCache();
  const sessionMeta = await fetchSessionMeta();

  const hasClaude = stats && stats.totalTokens > 0;
  const hasCodex = await fileExists(join(homedir(), ".codex"));

  if (hasClaude) {
    console.log(`    ✓ Claude Code: ${stats.totalSessions} sessions, ${formatTokens(stats.totalTokens)} tokens`);
  } else {
    console.log("    - Claude Code: no data found");
  }
  if (hasCodex) {
    console.log("    ✓ Codex CLI: detected");
  } else {
    console.log("    - Codex CLI: not installed");
  }

  if (!hasClaude && !hasCodex) {
    console.log("\n    No AI tool data found. Use Claude Code or Codex CLI first.\n");
    process.exit(1);
  }
  console.log();

  // ─── Step 3: 카드 데이터 구성 ───
  console.log("  [3/5] Generating stats card...");

  const modelEntries = Object.entries(stats?.models || {})
    .sort(([, a], [, b]) => b.totalTokens - a.totalTokens)
    .slice(0, 3);

  const tools = [];
  const totalDirectTokens = stats?.totalTokens || 0;

  for (const [model, usage] of modelEntries) {
    const pct = Math.round((usage.totalTokens / totalDirectTokens) * 100);
    if (pct < 1) continue;
    let label = model;
    if (model.includes("opus-4-6")) label = "Opus 4.6";
    else if (model.includes("opus-4-5")) label = "Opus 4.5";
    else if (model.includes("sonnet-4-6")) label = "Sonnet 4.6";
    else if (model.includes("sonnet-4-5")) label = "Sonnet 4.5";
    else if (model.includes("haiku")) label = "Haiku 4.5";
    tools.push({ id: "claude", usage: pct, label: `${label} (${formatTokens(usage.totalTokens)})` });
  }

  const streak = stats?.streak > 0 ? stats.streak : stats?.activeDays || 0;
  const commitsPerMonth = stats?.totalDays > 0
    ? Math.round((sessionMeta?.totalGitCommits || 0) / (stats.totalDays / 30))
    : 0;

  const cardData = {
    username,
    tools,
    _providerIcon: "claude-code",
    totalDays: stats?.totalDays || 0,
    monthlyTokens: stats?.monthlyTokens || 0,
    aiCommitsPerMonth: commitsPerMonth,
    totalSessions: stats?.totalSessions || 0,
    streak,
  };

  const svgDark = renderStatsCard(cardData, { theme: "dark" });
  const svgDefault = renderStatsCard(cardData, { theme: "default" });

  console.log("    ✓ Cards generated (dark + default)\n");

  // ─── Step 4: Gist 생성 ───
  console.log("  [4/5] Creating GitHub Gist...");

  const jsonData = JSON.stringify({
    username,
    updated_at: new Date().toISOString(),
    total_tokens: totalDirectTokens,
    monthly_tokens: stats?.monthlyTokens || 0,
    total_sessions: stats?.totalSessions || 0,
    active_days: stats?.activeDays || 0,
    streak,
    commits_per_month: commitsPerMonth,
    top_models: modelEntries.map(([m, u]) => ({ model: m, tokens: u.totalTokens })),
  }, null, 2);

  // 임시 파일로 저장 후 gist 생성
  const tmpDir = join(homedir(), ".github-readme-ai-stats");
  await mkdir(tmpDir, { recursive: true });
  await writeFile(join(tmpDir, "ai-stats-dark.svg"), svgDark);
  await writeFile(join(tmpDir, "ai-stats-default.svg"), svgDefault);
  await writeFile(join(tmpDir, "ai-stat.json"), jsonData);

  let gistUrl;
  try {
    // 기존 Gist 확인
    const existingGist = execSync(
      `gh gist list --limit 100 2>/dev/null | grep "ai-stats-dark.svg" | head -1 | awk '{print $1}'`,
      { encoding: "utf-8" }
    ).trim();

    if (existingGist) {
      execSync(`gh gist edit ${existingGist} ${join(tmpDir, "ai-stats-dark.svg")} ${join(tmpDir, "ai-stats-default.svg")} ${join(tmpDir, "ai-stat.json")}`, { stdio: "pipe" });
      gistUrl = `https://gist.github.com/${existingGist}`;
      console.log(`    ✓ Gist updated: ${gistUrl}\n`);
    } else {
      const result = execSync(
        `gh gist create ${join(tmpDir, "ai-stats-dark.svg")} ${join(tmpDir, "ai-stats-default.svg")} ${join(tmpDir, "ai-stat.json")} --public -d "GitHub AI Stats Card - auto-updated"`,
        { encoding: "utf-8" }
      ).trim();
      gistUrl = result;
      console.log(`    ✓ Gist created: ${gistUrl}\n`);
    }
  } catch (e) {
    console.log(`    ✗ Gist creation failed: ${e.message}`);
    console.log("    You can manually upload the SVG from ~/.github-readme-ai-stats/\n");
    gistUrl = null;
  }

  // ─── Step 5: Claude Code Stop hook 등록 ───
  console.log("  [5/5] Registering Claude Code auto-update hook...");

  try {
    await registerStopHook();
    console.log("    ✓ Stop hook registered");
    console.log("    → Stats will auto-update when you exit Claude Code\n");
  } catch (e) {
    console.log(`    ✗ Hook registration failed: ${e.message}`);
    console.log("    You can manually run: npx github-readme-ai-stats sync\n");
  }

  // ─── 완료 ───
  const gistId = gistUrl?.split("/").pop();
  const rawUrlDark = gistId
    ? `https://gist.githubusercontent.com/${username}/${gistId}/raw/ai-stats-dark.svg`
    : "YOUR_GIST_RAW_URL";

  console.log("  ─────────────────────────────────────────");
  console.log("  ✅ Setup complete! Add this to your GitHub profile README:\n");
  console.log(`  ![AI Stats](${rawUrlDark})\n`);
  console.log("  Your stats will auto-update every time you exit Claude Code.");
  console.log("  Manual update: npx github-readme-ai-stats sync\n");
}

async function registerStopHook() {
  let settings = {};
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    settings = JSON.parse(raw);
  } catch {
    // settings.json 없으면 새로 생성
  }

  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.Stop) settings.hooks.Stop = [];

  // 이미 등록된 hook인지 확인
  const hookCmd = "npx github-readme-ai-stats sync --quiet";
  const exists = settings.hooks.Stop.some(
    (h) => h.command === hookCmd || (typeof h === "string" && h === hookCmd)
  );

  if (!exists) {
    settings.hooks.Stop.push({
      command: hookCmd,
      timeout: 30000,
    });
    await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  }
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

main().catch((err) => {
  console.error(`\n  Error: ${err.message}\n`);
  process.exit(1);
});
