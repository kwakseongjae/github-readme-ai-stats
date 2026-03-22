#!/usr/bin/env node

/**
 * 로컬 AI 도구 사용 데이터를 수집하여 GitHub Gist에 동기화한다.
 *
 * Usage:
 *   node scripts/sync.js                    # 초기 설정 안내
 *   node scripts/sync.js --token=ghp_xxx    # 토큰으로 동기화
 *   GITHUB_TOKEN=ghp_xxx node scripts/sync.js
 *
 * 지원하는 데이터 소스:
 *   - Claude Code: ~/.claude/stats-cache.json
 *   - Codex CLI: ~/.codex/sessions/ (향후)
 */

import { fetchClaudeStatsCache } from "../src/fetchers/claude-stats-cache-fetcher.js";
import { formatTokens } from "../src/utils/format.js";

const GIST_FILENAME = "ai-stat.json";

async function main() {
  const token = getToken();

  if (!token) {
    printSetupGuide();
    return;
  }

  console.log("Collecting AI tool usage data...\n");

  // 1. Claude Code 데이터 수집
  const claudeStats = await fetchClaudeStatsCache();
  const tools = {};

  if (claudeStats) {
    console.log(`  Claude Code: ${claudeStats.totalSessions} sessions, ${formatTokens(claudeStats.totalTokens)} tokens`);

    tools["claude-code"] = {
      frequency: "daily",
      since: claudeStats.firstUsed?.toISOString().split("T")[0] || "unknown",
      usage: 95,
      sessions: claudeStats.totalSessions,
      messages: claudeStats.totalMessages,
      tokens: {
        input: claudeStats.totalInputTokens,
        output: claudeStats.totalOutputTokens,
        cache_read: claudeStats.totalCacheReadTokens,
        cache_creation: claudeStats.totalCacheCreationTokens,
        total: claudeStats.totalTokens,
      },
      models: Object.fromEntries(
        Object.entries(claudeStats.models).map(([model, usage]) => [
          model,
          { input: usage.inputTokens, output: usage.outputTokens, total: usage.totalTokens },
        ])
      ),
      active_days: claudeStats.activeDays,
      daily_activity: claudeStats.dailyActivity,
    };
  }

  // 2. Codex CLI 데이터 수집 (향후)
  // const codexStats = await fetchCodexStats();
  // if (codexStats) { tools["codex"] = ... }

  // 3. Gist 데이터 구성
  const gistData = {
    username: await getGitHubUsername(token),
    updated_at: new Date().toISOString(),
    tools,
    monthly_tokens: claudeStats?.monthlyTokens || 0,
    total_sessions: claudeStats?.totalSessions || 0,
    streak: claudeStats?.streak || 0,
    ai_commit_ratio: 0, // GitHub 커밋 분석 필요
  };

  // 4. Gist 생성 또는 업데이트
  const gistId = await findExistingGist(token);
  if (gistId) {
    await updateGist(token, gistId, gistData);
    console.log(`\n  Gist updated: https://gist.github.com/${gistId}`);
  } else {
    const newId = await createGist(token, gistData);
    console.log(`\n  Gist created: https://gist.github.com/${newId}`);
  }

  console.log(`\n  Add to your README:`);
  console.log(`  ![AI Stats](https://github-ai-stat.vercel.app/api/card?username=${gistData.username}&theme=dark)`);
}

function getToken() {
  // CLI arg: --token=ghp_xxx
  const tokenArg = process.argv.find((a) => a.startsWith("--token="));
  if (tokenArg) return tokenArg.split("=")[1];

  // Environment variable
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

async function findExistingGist(token) {
  const res = await fetch("https://api.github.com/gists?per_page=100", {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "github-ai-stat" },
  });
  if (!res.ok) return null;
  const gists = await res.json();
  const existing = gists.find((g) => g.files[GIST_FILENAME]);
  return existing?.id || null;
}

async function createGist(token, data) {
  const res = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-ai-stat",
    },
    body: JSON.stringify({
      description: "GitHub AI Stats - auto-synced usage data",
      public: true,
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) },
      },
    }),
  });
  if (!res.ok) throw new Error(`Failed to create gist: ${await res.text()}`);
  const gist = await res.json();
  return gist.id;
}

async function updateGist(token, gistId, data) {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-ai-stat",
    },
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) },
      },
    }),
  });
  if (!res.ok) throw new Error(`Failed to update gist: ${await res.text()}`);
}

function printSetupGuide() {
  console.log(`
  github-ai-stat sync
  ==================

  GitHub Personal Access Token이 필요합니다.

  1. https://github.com/settings/tokens/new 에서 토큰 생성
     - Scopes: "gist" (Gist 생성/수정 권한)

  2. 사용 방법:
     GITHUB_TOKEN=ghp_xxx node scripts/sync.js
     또는
     node scripts/sync.js --token=ghp_xxx

  이 명령은 다음을 수행합니다:
  - ~/.claude/ 에서 Claude Code 사용 데이터 수집
  - GitHub Gist에 ai-stat.json 파일로 동기화
  - README에서 사용할 수 있는 링크 제공
`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
