#!/usr/bin/env node

/**
 * 로컬 AI 도구 사용 데이터를 수집, SVG 카드 재생성, GitHub Gist에 동기화한다.
 *
 * Usage:
 *   node scripts/sync.js                    # gh CLI 토큰 자동 사용
 *   node scripts/sync.js --token=ghp_xxx    # 토큰 직접 지정
 *   node scripts/sync.js --quiet            # 출력 없이 실행
 *   GITHUB_TOKEN=ghp_xxx node scripts/sync.js
 */

import { fetchClaudeStatsCache } from "../src/fetchers/claude-stats-cache-fetcher.js";
import { fetchSessionMeta } from "../src/fetchers/session-meta-fetcher.js";
import { renderStatsCard } from "../src/cards/stats-card.js";
import { formatTokens } from "../src/utils/format.js";

const QUIET = process.argv.includes("--quiet");

function log(...args) {
  if (!QUIET) console.log(...args);
}

async function main() {
  const token = getToken();

  if (!token) {
    if (!QUIET) printSetupGuide();
    return;
  }

  log("Collecting AI tool usage data...\n");

  // 1. Claude Code 데이터 수집
  const stats = await fetchClaudeStatsCache();
  const sessionMeta = await fetchSessionMeta();

  if (!stats || stats.totalTokens === 0) {
    log("  No Claude Code data found.");
    return;
  }

  const username = await getGitHubUsername(token);
  log(`  Claude Code: ${stats.totalSessions} sessions, ${formatTokens(stats.totalTokens)} tokens`);

  // 2. 카드 데이터 구성 (init.js와 동일 로직)
  const modelEntries = Object.entries(stats.models || {})
    .sort(([, a], [, b]) => b.totalTokens - a.totalTokens)
    .slice(0, 3);

  const tools = [];
  const totalDirectTokens = stats.totalTokens || 0;

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

  const streak = stats.streak > 0 ? stats.streak : stats.activeDays || 0;
  const commitsPerMonth = stats.totalDays > 0
    ? Math.round((sessionMeta?.totalGitCommits || 0) / (stats.totalDays / 30))
    : 0;

  const cardData = {
    username,
    tools,
    _providerIcon: "claude-code",
    totalDays: stats.totalDays || 0,
    monthlyTokens: stats.monthlyTokens || 0,
    aiCommitsPerMonth: commitsPerMonth,
    totalSessions: stats.totalSessions || 0,
    streak,
  };

  // 3. SVG 카드 생성
  const svgThemes = ["dark", "tokyonight", "default"];
  const svgFiles = {};
  for (const theme of svgThemes) {
    const svg = renderStatsCard(cardData, { theme });
    svgFiles[`card-${theme}.svg`] = svg;
  }
  log(`  SVG cards generated: ${svgThemes.join(", ")}`);

  // 4. JSON 데이터 구성
  const jsonData = {
    username,
    updated_at: new Date().toISOString(),
    total_tokens: totalDirectTokens,
    monthly_tokens: stats.monthlyTokens || 0,
    total_sessions: stats.totalSessions || 0,
    active_days: stats.activeDays || 0,
    streak,
    commits_per_month: commitsPerMonth,
    top_models: modelEntries.map(([m, u]) => ({ model: m, tokens: u.totalTokens })),
  };

  // 5. 기존 SVG Gist 찾기 (card-*.svg 파일이 있는 Gist)
  const svgGistId = await findSvgGist(token);

  // Gist 업데이트할 파일 구성
  const gistFiles = {};
  for (const [filename, svg] of Object.entries(svgFiles)) {
    gistFiles[filename] = { content: svg };
  }
  gistFiles["ai-stat.json"] = { content: JSON.stringify(jsonData, null, 2) };

  if (svgGistId) {
    await updateGist(token, svgGistId, gistFiles);
    log(`\n  Gist updated: https://gist.github.com/${svgGistId}`);
  } else {
    const newId = await createGist(token, gistFiles);
    log(`\n  Gist created: https://gist.github.com/${newId}`);
  }

  log("  Done!");
}

function getToken() {
  const tokenArg = process.argv.find((a) => a.startsWith("--token="));
  if (tokenArg) return tokenArg.split("=")[1];
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
}

async function getGitHubUsername(token) {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "github-ai-stat" },
  });
  if (!res.ok) throw new Error("Invalid GitHub token");
  const user = await res.json();
  return user.login;
}

/** card-*.svg 파일이 있는 Gist를 찾는다 */
async function findSvgGist(token) {
  const res = await fetch("https://api.github.com/gists?per_page=100", {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "github-ai-stat" },
  });
  if (!res.ok) return null;
  const gists = await res.json();

  // card-*.svg 파일이 있는 Gist 우선 검색
  const svgGist = gists.find((g) =>
    Object.keys(g.files).some((f) => f.startsWith("card-") && f.endsWith(".svg"))
  );
  if (svgGist) return svgGist.id;

  // ai-stats-dark.svg 파일이 있는 Gist (init.js가 만든 형태)
  const altGist = gists.find((g) => g.files["ai-stats-dark.svg"]);
  if (altGist) return altGist.id;

  return null;
}

async function createGist(token, files) {
  const res = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-ai-stat",
    },
    body: JSON.stringify({
      description: "GitHub AI Stats Card - auto-updated",
      public: true,
      files,
    }),
  });
  if (!res.ok) throw new Error(`Failed to create gist: ${await res.text()}`);
  const gist = await res.json();
  return gist.id;
}

async function updateGist(token, gistId, files) {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-ai-stat",
    },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) throw new Error(`Failed to update gist: ${await res.text()}`);
}

function printSetupGuide() {
  console.log(`
  github-ai-stat sync
  ==================

  GitHub 토큰이 필요합니다. 다음 중 하나를 사용하세요:

  1. gh CLI 로그인 (권장):
     gh auth login
     GITHUB_TOKEN=$(gh auth token) node scripts/sync.js

  2. Personal Access Token:
     GITHUB_TOKEN=ghp_xxx node scripts/sync.js
`);
}

main().catch((err) => {
  if (!QUIET) console.error(`Error: ${err.message}`);
  process.exit(1);
});
