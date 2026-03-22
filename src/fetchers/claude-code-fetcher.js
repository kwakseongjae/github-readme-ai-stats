import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

/**
 * Claude Code 로컬 JSONL 로그 파일에서 사용 통계를 파싱한다.
 *
 * 디렉토리 구조:
 *   ~/.claude/projects/{project-path}/
 *     ├── {session-uuid}.jsonl          ← 메인 세션 로그
 *     └── {session-uuid}/subagents/     ← 서브에이전트 로그
 *           └── agent-*.jsonl
 *
 * 각 JSONL 라인은 JSON 객체. type==="assistant" 인 라인의 message.usage에 토큰 정보가 있다.
 */
export async function parseClaudeCodeUsage(options = {}) {
  const {
    claudeDir = join(homedir(), ".claude"),
    since,
    until,
  } = options;

  const projectsDir = join(claudeDir, "projects");
  const stats = {
    totalSessions: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheCreationTokens: 0,
    totalCacheReadTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    sessions: [],
    dailyUsage: {},
    modelUsage: {},
    firstUsed: null,
    lastUsed: null,
  };

  const sinceDate = since ? new Date(since) : null;
  const untilDate = until ? new Date(until) : null;

  let projectDirs;
  try {
    projectDirs = await readdir(projectsDir, { withFileTypes: true });
  } catch {
    return stats;
  }

  for (const projectDir of projectDirs) {
    if (!projectDir.isDirectory()) continue;
    const projectPath = join(projectsDir, projectDir.name);

    // 프로젝트 디렉토리 내의 모든 JSONL 파일 찾기 (재귀)
    const jsonlFiles = await findJsonlFilesRecursive(projectPath);

    for (const jsonlFile of jsonlFiles) {
      try {
        const sessionData = await parseSessionFile(jsonlFile, sinceDate, untilDate);
        if (sessionData.messageCount > 0) {
          stats.totalSessions++;
          stats.totalInputTokens += sessionData.inputTokens;
          stats.totalOutputTokens += sessionData.outputTokens;
          stats.totalCacheCreationTokens += sessionData.cacheCreationTokens;
          stats.totalCacheReadTokens += sessionData.cacheReadTokens;

          const sessionTokens = sessionData.inputTokens + sessionData.outputTokens;
          stats.totalTokens += sessionTokens;
          stats.totalCost += sessionData.cost;

          for (const [model, tokens] of Object.entries(sessionData.models)) {
            stats.modelUsage[model] = (stats.modelUsage[model] || 0) + tokens;
          }

          for (const [date, tokens] of Object.entries(sessionData.daily)) {
            stats.dailyUsage[date] = (stats.dailyUsage[date] || 0) + tokens;
          }

          if (sessionData.firstTimestamp) {
            if (!stats.firstUsed || sessionData.firstTimestamp < stats.firstUsed)
              stats.firstUsed = sessionData.firstTimestamp;
          }
          if (sessionData.lastTimestamp) {
            if (!stats.lastUsed || sessionData.lastTimestamp > stats.lastUsed)
              stats.lastUsed = sessionData.lastTimestamp;
          }

          stats.sessions.push({
            project: projectDir.name,
            file: jsonlFile,
            tokens: sessionTokens,
            cost: sessionData.cost,
            messages: sessionData.messageCount,
            date: sessionData.firstTimestamp,
          });
        }
      } catch {
        // 파싱 실패 스킵
      }
    }
  }

  if (stats.totalCost === 0 && stats.totalTokens > 0) {
    stats.totalCost = estimateCost(stats.totalInputTokens, stats.totalOutputTokens);
  }

  return stats;
}

async function findJsonlFilesRecursive(dir, depth = 0) {
  if (depth > 3) return []; // 너무 깊이 들어가지 않음
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        files.push(fullPath);
      } else if (entry.isDirectory() && depth < 3) {
        // subagents 디렉토리 등 재귀 탐색
        const subFiles = await findJsonlFilesRecursive(fullPath, depth + 1);
        files.push(...subFiles);
      }
    }
  } catch {
    // 접근 불가
  }
  return files;
}

async function parseSessionFile(filePath, sinceDate, untilDate) {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  const result = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    cost: 0,
    messageCount: 0,
    models: {},
    daily: {},
    firstTimestamp: null,
    lastTimestamp: null,
  };

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      const timestamp = entry.timestamp ? new Date(entry.timestamp) : null;
      if (timestamp) {
        if (sinceDate && timestamp < sinceDate) continue;
        if (untilDate && timestamp > untilDate) continue;
      }

      if (entry.type === "assistant" && entry.message?.usage) {
        const usage = entry.message.usage;
        const inputTokens = usage.input_tokens || 0;
        const outputTokens = usage.output_tokens || 0;
        const cacheCreation = usage.cache_creation_input_tokens || 0;
        const cacheRead = usage.cache_read_input_tokens || 0;

        result.inputTokens += inputTokens;
        result.outputTokens += outputTokens;
        result.cacheCreationTokens += cacheCreation;
        result.cacheReadTokens += cacheRead;
        result.messageCount++;

        const model = entry.message.model || "unknown";
        result.models[model] = (result.models[model] || 0) + inputTokens + outputTokens;

        if (timestamp) {
          const dateKey = timestamp.toISOString().split("T")[0];
          result.daily[dateKey] = (result.daily[dateKey] || 0) + inputTokens + outputTokens;

          if (!result.firstTimestamp || timestamp < result.firstTimestamp)
            result.firstTimestamp = timestamp;
          if (!result.lastTimestamp || timestamp > result.lastTimestamp)
            result.lastTimestamp = timestamp;
        }
      }
    } catch {
      // bad JSON line
    }
  }

  return result;
}

function estimateCost(inputTokens, outputTokens) {
  return (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
}

export function calculateStreak(dailyUsage) {
  const dates = Object.keys(dailyUsage).sort().reverse();
  if (dates.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];
  const lastDate = dates[0];
  const daysDiff = Math.floor(
    (new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24)
  );
  if (daysDiff > 1) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.floor(
      (new Date(dates[i - 1]) - new Date(dates[i])) / (1000 * 60 * 60 * 24)
    );
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}
