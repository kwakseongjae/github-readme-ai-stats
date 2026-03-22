/**
 * Anthropic Admin API를 통해 Claude 사용량을 조회한다.
 *
 * 필요: Admin API key (sk-ant-admin...)
 * 엔드포인트: GET /v1/organizations/usage_report/messages
 * 문서: https://platform.claude.com/docs/en/build-with-claude/usage-cost-api
 */

const BASE_URL = "https://api.anthropic.com";

/**
 * 최근 N일 동안의 모델별 사용량 조회
 */
export async function fetchAnthropicUsage(adminKey, options = {}) {
  const { days = 30, bucketWidth = "1d" } = options;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const params = new URLSearchParams({
    starting_at: startDate.toISOString(),
    ending_at: endDate.toISOString(),
    bucket_width: bucketWidth,
    "group_by[]": "model",
  });

  const allData = await fetchAllPages(
    `${BASE_URL}/v1/organizations/usage_report/messages?${params}`,
    adminKey,
  );

  return transformAnthropicData(allData, days);
}

/**
 * 페이지네이션 처리
 */
async function fetchAllPages(baseUrl, adminKey) {
  const allBuckets = [];
  let url = baseUrl;

  while (url) {
    const res = await fetch(url, {
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": adminKey,
        "User-Agent": "github-ai-stat/0.1.0",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    allBuckets.push(...(data.data || []));

    if (data.has_more && data.next_page) {
      const separator = baseUrl.includes("?") ? "&" : "?";
      url = `${baseUrl}${separator}page=${data.next_page}`;
    } else {
      url = null;
    }
  }

  return allBuckets;
}

/**
 * Anthropic API 응답 → 카드 데이터 변환
 */
function transformAnthropicData(buckets, days) {
  const modelUsage = {};
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCacheCreation = 0;
  let totalRequests = 0;
  const dailyTokens = {};

  for (const bucket of buckets) {
    const date = new Date(bucket.start_time * 1000).toISOString().split("T")[0];

    for (const result of bucket.results || []) {
      const model = result.model || "unknown";
      const input = result.uncached_input_tokens || result.input_tokens || 0;
      const output = result.output_tokens || 0;
      const cacheRead = result.cache_read_input_tokens || 0;
      const cacheCreation = (result.cache_creation?.ephemeral_5m_input_tokens || 0)
        + (result.cache_creation?.ephemeral_1h_input_tokens || 0);
      const requests = result.num_model_requests || 1;

      if (!modelUsage[model]) {
        modelUsage[model] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
      }
      modelUsage[model].inputTokens += input;
      modelUsage[model].outputTokens += output;
      modelUsage[model].totalTokens += input + output;
      modelUsage[model].requests += requests;

      totalInput += input;
      totalOutput += output;
      totalCacheRead += cacheRead;
      totalCacheCreation += cacheCreation;
      totalRequests += requests;

      dailyTokens[date] = (dailyTokens[date] || 0) + input + output;
    }
  }

  const totalTokens = totalInput + totalOutput;
  const activeDays = Object.keys(dailyTokens).length;
  const monthlyTokens = days > 0 ? Math.round(totalTokens / (days / 30)) : totalTokens;

  // Top 3 모델
  const topModels = Object.entries(modelUsage)
    .sort(([, a], [, b]) => b.totalTokens - a.totalTokens)
    .slice(0, 3);

  // Streak 계산
  const sortedDates = Object.keys(dailyTokens).sort().reverse();
  const streak = calculateStreak(sortedDates);

  return {
    provider: "anthropic",
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalTokens,
    totalCacheRead,
    totalCacheCreation,
    totalRequests,
    monthlyTokens,
    activeDays,
    streak,
    days,
    topModels,
    modelUsage,
    dailyTokens,
  };
}

function calculateStreak(sortedDatesDesc) {
  if (sortedDatesDesc.length === 0) return 0;
  const today = new Date().toISOString().split("T")[0];
  const diff = Math.floor((new Date(today) - new Date(sortedDatesDesc[0])) / 86400000);
  if (diff > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const d = Math.floor((new Date(sortedDatesDesc[i - 1]) - new Date(sortedDatesDesc[i])) / 86400000);
    if (d === 1) streak++;
    else break;
  }
  return streak;
}
