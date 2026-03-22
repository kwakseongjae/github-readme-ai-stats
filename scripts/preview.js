#!/usr/bin/env node

/**
 * 로컬 Claude Code 사용 데이터를 파싱하여 SVG 카드를 생성하고
 * HTML 프리뷰 파일을 열어준다.
 *
 * Usage: npm run preview
 */

import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { renderStatsCard } from "../src/cards/stats-card.js";
import { renderBadge } from "../src/cards/badge-card.js";
import { fetchClaudeStatsCache } from "../src/fetchers/claude-stats-cache-fetcher.js";
import { fetchSessionMeta } from "../src/fetchers/session-meta-fetcher.js";
import { formatTokens } from "../src/utils/format.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "preview");
await mkdir(outDir, { recursive: true });

async function main() {
  console.log("Reading Claude Code stats-cache.json...\n");

  const stats = await fetchClaudeStatsCache();
  if (!stats) {
    console.log("No stats-cache.json found. Using sample data.");
    runWithSampleData();
    return;
  }

  console.log(`  Total Sessions:  ${stats.totalSessions}`);
  console.log(`  Total Messages:  ${stats.totalMessages}`);
  console.log(`  Input Tokens:    ${formatTokens(stats.totalInputTokens)}`);
  console.log(`  Output Tokens:   ${formatTokens(stats.totalOutputTokens)}`);
  console.log(`  Cache Read:      ${formatTokens(stats.totalCacheReadTokens)}`);
  console.log(`  Cache Creation:  ${formatTokens(stats.totalCacheCreationTokens)}`);
  console.log(`  All Tokens:      ${formatTokens(stats.allTokensIncludingCache)}`);
  console.log(`  Monthly Tokens:  ${formatTokens(stats.monthlyTokens)}/mo`);
  console.log(`  Active Days:     ${stats.activeDays}`);
  console.log(`  Streak:          ${stats.streak} days`);
  console.log(`  First Used:      ${stats.firstUsed?.toISOString().split("T")[0]}`);
  console.log(`  Last Used:       ${stats.lastUsed?.toISOString().split("T")[0]}`);
  console.log(`\n  Models:`);
  for (const [model, usage] of Object.entries(stats.models)) {
    console.log(`    ${model}: ${formatTokens(usage.totalTokens)} (in: ${formatTokens(usage.inputTokens)}, out: ${formatTokens(usage.outputTokens)})`);
  }

  // 모델별 Top 3만 표시
  const modelEntries = Object.entries(stats.models)
    .sort(([, a], [, b]) => b.totalTokens - a.totalTokens)
    .slice(0, 3); // Top 3만

  const totalDirectTokens = stats.totalTokens;

  const tools = [{ id: "claude-code", usage: 95 }];
  for (const [model, usage] of modelEntries) {
    const pct = Math.round((usage.totalTokens / totalDirectTokens) * 100);
    if (pct < 1) continue;
    let label = model;
    if (model.includes("opus-4-6")) label = `Opus 4.6`;
    else if (model.includes("opus-4-5")) label = `Opus 4.5`;
    else if (model.includes("sonnet-4-6")) label = `Sonnet 4.6`;
    else if (model.includes("sonnet-4-5")) label = `Sonnet 4.5`;
    else if (model.includes("haiku")) label = `Haiku 4.5`;
    tools.push({ id: "claude", usage: pct, label: `${label} (${formatTokens(usage.totalTokens)})` });
  }

  // session-meta에서 실제 git commit 데이터 가져오기
  console.log("\nReading session-meta...");
  const sessionMeta = await fetchSessionMeta();
  console.log(`  Git Commits:     ${sessionMeta.totalGitCommits}`);
  console.log(`  Lines Added:     ${sessionMeta.totalLinesAdded}`);
  console.log(`  Lines Removed:   ${sessionMeta.totalLinesRemoved}`);
  console.log(`  Files Modified:  ${sessionMeta.totalFilesModified}`);
  console.log(`  Duration:        ${Math.round(sessionMeta.totalDurationMinutes / 60)}h`);

  const streak = stats.streak > 0 ? stats.streak : (stats.activeDays > 0 ? stats.activeDays : 1);

  // AI 커밋 비율 계산 (session-meta에서 실제 데이터)
  const totalGitCommits = sessionMeta.totalGitCommits || 0;
  const commitsPerMonth = stats.totalDays > 0
    ? Math.round(totalGitCommits / (stats.totalDays / 30))
    : totalGitCommits;

  const cardData = {
    username: "kwakseongjae",
    tools,
    totalDays: stats.totalDays,
    monthlyTokens: stats.monthlyTokens,
    aiCommitRatio: 0.85, // Claude Code로 한 커밋이 대부분
    aiCommitsPerMonth: commitsPerMonth,
    totalCommits: totalGitCommits,
    totalSessions: stats.totalSessions,
    streak,
    linesAdded: sessionMeta.totalLinesAdded,
    linesRemoved: sessionMeta.totalLinesRemoved,
  };

  // Codex 더미 데이터 (Codex 유저가 보는 화면)
  const codexDummyData = {
    username: "codex-user",
    tools: [
      { id: "codex", usage: 90 },
      { id: "chatgpt", usage: 60, label: "GPT-4.1 (2.8M)" },
      { id: "chatgpt", usage: 35, label: "o3-mini (1.2M)" },
      { id: "chatgpt", usage: 15, label: "GPT-4o (450K)" },
    ],
    totalDays: 120,
    monthlyTokens: 3200000,
    aiCommitRatio: 0.72,
    aiCommitsPerMonth: 63,
    totalCommits: 250,
    totalSessions: 285,
    streak: 15,
  };

  // Claude + Codex 동시 사용자
  const bothData = {
    username: "kwakseongjae",
    tools: [
      { id: "claude-code", usage: 70 },
      { id: "codex", usage: 30 },
      { id: "claude", usage: 50, label: "Opus 4.6 (5.1M)" },
      { id: "chatgpt", usage: 25, label: "GPT-4.1 (1.5M)" },
    ],
    totalDays: stats.totalDays,
    monthlyTokens: stats.monthlyTokens + 1500000,
    aiCommitRatio: 0.88,
    aiCommitsPerMonth: commitsPerMonth + 20,
    totalCommits: totalGitCommits + 80,
    totalSessions: stats.totalSessions + 200,
    streak,
  };

  // 테마별 카드 생성
  const themes = ["default", "dark", "radical", "tokyonight", "dracula", "neon", "synthwave", "gruvbox", "nord", "matrix"];
  const cards = themes.map((theme) => ({
    theme,
    svg: renderStatsCard(cardData, { theme }),
  }));

  // Codex 전용 카드
  const codexCards = [
    { theme: "codex-dark", svg: renderStatsCard(codexDummyData, { theme: "dark" }) },
    { theme: "codex-neon", svg: renderStatsCard(codexDummyData, { theme: "neon" }) },
  ];

  // Claude + Codex 동시 사용 카드
  const bothCards = [
    { theme: "both-dark", svg: renderStatsCard(bothData, { theme: "dark" }) },
    { theme: "both-tokyonight", svg: renderStatsCard(bothData, { theme: "tokyonight" }) },
  ];

  // 배지 생성
  const badges = [
    renderBadge("claude-code", { usage: `${formatTokens(totalDirectTokens)} tokens` }),
    renderBadge("codex", { usage: "285 sessions" }),
    renderBadge("claude", { usage: `${stats.totalSessions} sessions` }),
    renderBadge("chatgpt", { usage: "monthly" }),
  ];

  // 일별 활동 (최근 30일)
  const dailyEntries = Object.entries(stats.dailyActivity)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 30)
    .reverse();

  // 시간대별 활동
  const hourCounts = stats.hourCounts;

  const html = generatePreviewHtml(cards, badges, stats, cardData, dailyEntries, hourCounts, sessionMeta, codexCards, bothCards);

  await writeFile(join(outDir, "index.html"), html);
  for (const card of cards) {
    await writeFile(join(outDir, `card-${card.theme}.svg`), card.svg);
  }
  for (const card of codexCards) {
    await writeFile(join(outDir, `card-${card.theme}.svg`), card.svg);
  }
  for (const card of bothCards) {
    await writeFile(join(outDir, `card-${card.theme}.svg`), card.svg);
  }
  for (let i = 0; i < badges.length; i++) {
    const names = ["badge-claude-code", "badge-codex", "badge-claude", "badge-chatgpt"];
    await writeFile(join(outDir, `${names[i]}.svg`), badges[i]);
  }

  console.log(`\nPreview generated: ${outDir}/index.html`);
  console.log("Opening in browser...");

  try {
    if (process.platform === "darwin") execSync(`open "${join(outDir, "index.html")}"`);
    else if (process.platform === "linux") execSync(`xdg-open "${join(outDir, "index.html")}"`);
  } catch {
    console.log(`Open manually: file://${join(outDir, "index.html")}`);
  }
}

function generatePreviewHtml(cards, badges, stats, cardData, dailyEntries, hourCounts, sessionMeta, codexCards, bothCards) {
  const badgesSvg = badges.map((b) => `<div style="display:inline-block;margin:4px">${b}</div>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub AI Stats - Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; padding: 40px; max-width: 1200px; margin: 0 auto; }
    h1 { color: #58a6ff; margin-bottom: 8px; font-size: 28px; }
    h2 { color: #8b949e; margin: 40px 0 16px; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #21262d; padding-bottom: 8px; }
    .subtitle { color: #8b949e; margin-bottom: 32px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 16px 0; }
    .stat-box { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #58a6ff; }
    .stat-value.purple { color: #a371f7; }
    .stat-value.green { color: #3fb950; }
    .stat-value.orange { color: #d29922; }
    .stat-label { font-size: 11px; color: #8b949e; margin-top: 4px; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fit, 520px); gap: 20px; margin: 16px 0; }
    .card-item { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
    .card-item h3 { color: #8b949e; font-size: 11px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .chart-container { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; display: flex; align-items: flex-end; min-height: 160px; overflow-x: auto; gap: 0; }
    .hour-chart { display: flex; align-items: center; gap: 0; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
    .model-chart { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; }
    .badges { margin: 16px 0; }
    .usage-code { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; font-family: 'SF Mono', Monaco, monospace; font-size: 12px; white-space: pre-wrap; overflow-x: auto; line-height: 1.6; color: #8b949e; }
    .usage-code em { color: #58a6ff; font-style: normal; }
  </style>
</head>
<body>
  <h1>GitHub AI Stats Card</h1>
  <p class="subtitle">Your AI coding DNA on your GitHub profile &mdash; powered by real usage data from <code>~/.claude/</code></p>

  <h2>Claude Code User (Your Data - Top 3 Models)</h2>
  <div class="card-grid">
    ${cards.map((c) => `<div class="card-item"><h3>${c.theme}</h3>${c.svg}</div>`).join("")}
  </div>

  <h2>Codex CLI User (Dummy Data)</h2>
  <div class="card-grid">
    ${(codexCards||[]).map((c) => `<div class="card-item"><h3>${c.theme}</h3>${c.svg}</div>`).join("")}
  </div>

  <h2>Both Claude + Codex User</h2>
  <div class="card-grid">
    ${(bothCards||[]).map((c) => `<div class="card-item"><h3>${c.theme}</h3>${c.svg}</div>`).join("")}
  </div>

  <h2>Badges</h2>
  <div class="badges">${badgesSvg}</div>

  <h2>How to Use (API Authentication)</h2>
  <div class="usage-code"><em># Option 1: API Key Authentication (Recommended - Real Data)</em>
<em># Create a GitHub Gist named "ai-stat.json" with your admin API keys:</em>
${JSON.stringify({
    username: "your-github-username",
    anthropic_admin_key: "sk-ant-admin-xxxxx",
    openai_admin_key: "sk-admin-xxxxx",
  }, null, 2)}

<em># Anthropic Admin Key: https://console.anthropic.com/settings/admin-keys</em>
<em># OpenAI Admin Key: https://platform.openai.com/settings/organization/admin-keys</em>
<em># Both are optional - use one or both</em>

<em># Then add to your README:</em>
![AI Stats](https://github-ai-stat.vercel.app/api/card?username=YOUR_USERNAME&amp;theme=dark)

<em># Option 2: Self-Report (No API Key Needed)</em>
${JSON.stringify({
    username: "your-github-username",
    tools: {
      "claude-code": { frequency: "daily", since: "2026-01", usage: 95 },
      "codex": { frequency: "weekly", since: "2025-06", usage: 40 },
    },
    monthly_tokens: 4000000,
    total_sessions: 392,
    streak: 43,
    ai_commit_ratio: 0.85,
    ai_commits_per_month: 51,
  }, null, 2)}

<em># Badges:</em>
![Claude Code](https://github-ai-stat.vercel.app/api/badge?tool=claude-code&amp;usage=daily)
![Codex CLI](https://github-ai-stat.vercel.app/api/badge?tool=codex&amp;usage=weekly)
  </div>
</body>
</html>`;
}

main().catch(console.error);
