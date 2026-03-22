import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

/**
 * Claude Code의 stats-cache.json에서 통계를 가져온다.
 * JSONL 파싱보다 훨씬 빠르고 캐시 토큰까지 포함한 정확한 데이터.
 *
 * 위치: ~/.claude/stats-cache.json
 */
export async function fetchClaudeStatsCache(options = {}) {
  const { claudeDir = join(homedir(), ".claude") } = options;
  const statsPath = join(claudeDir, "stats-cache.json");

  try {
    const raw = await readFile(statsPath, "utf-8");
    const cache = JSON.parse(raw);
    return transformStatsCache(cache);
  } catch {
    return null;
  }
}

function transformStatsCache(cache) {
  // 모델별 사용량
  const models = {};
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCacheCreation = 0;

  for (const [model, usage] of Object.entries(cache.modelUsage || {})) {
    const input = usage.inputTokens || 0;
    const output = usage.outputTokens || 0;
    const cacheRead = usage.cacheReadInputTokens || 0;
    const cacheCreation = usage.cacheCreationInputTokens || 0;

    models[model] = {
      inputTokens: input,
      outputTokens: output,
      cacheReadTokens: cacheRead,
      cacheCreationTokens: cacheCreation,
      totalTokens: input + output,
      allTokens: input + output + cacheRead + cacheCreation,
    };

    totalInput += input;
    totalOutput += output;
    totalCacheRead += cacheRead;
    totalCacheCreation += cacheCreation;
  }

  // 일별 활동
  const dailyActivity = {};
  for (const day of cache.dailyActivity || []) {
    dailyActivity[day.date] = {
      messages: day.messageCount,
      sessions: day.sessionCount,
      toolCalls: day.toolCallCount,
    };
  }

  // 일별 모델 토큰
  const dailyModelTokens = {};
  for (const day of cache.dailyModelTokens || []) {
    dailyModelTokens[day.date] = day.models || {};
  }

  // Streak 계산
  const dates = Object.keys(dailyActivity).sort().reverse();
  const streak = calculateStreakFromDates(dates);

  // 활동 일수
  const activeDays = dates.length;

  // 첫/마지막 사용
  const firstUsed = cache.firstSessionDate
    ? new Date(cache.firstSessionDate)
    : null;
  const lastUsed = dates.length > 0 ? new Date(dates[0]) : null;
  const totalDays = firstUsed
    ? Math.floor((Date.now() - firstUsed) / (1000 * 60 * 60 * 24))
    : 0;

  // 월간 토큰 추정
  const monthlyTokens = totalDays > 0
    ? Math.round((totalInput + totalOutput) / (totalDays / 30))
    : totalInput + totalOutput;

  return {
    totalSessions: cache.totalSessions || 0,
    totalMessages: cache.totalMessages || 0,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalCacheReadTokens: totalCacheRead,
    totalCacheCreationTokens: totalCacheCreation,
    totalTokens: totalInput + totalOutput,
    allTokensIncludingCache: totalInput + totalOutput + totalCacheRead + totalCacheCreation,
    monthlyTokens,
    models,
    dailyActivity,
    dailyModelTokens,
    streak,
    activeDays,
    totalDays,
    firstUsed,
    lastUsed,
    longestSession: cache.longestSession || null,
    hourCounts: cache.hourCounts || {},
  };
}

function calculateStreakFromDates(sortedDatesDesc) {
  if (sortedDatesDesc.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];
  const lastDate = sortedDatesDesc[0];
  const daysDiff = Math.floor(
    (new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24)
  );
  if (daysDiff > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const diff = Math.floor(
      (new Date(sortedDatesDesc[i - 1]) - new Date(sortedDatesDesc[i])) / (1000 * 60 * 60 * 24)
    );
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}
