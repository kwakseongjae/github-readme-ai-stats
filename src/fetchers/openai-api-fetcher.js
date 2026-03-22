/**
 * OpenAI Admin API를 통해 Codex/ChatGPT 사용량을 조회한다.
 *
 * 필요: Admin API key
 * 엔드포인트: GET /v1/organization/usage/completions
 * 문서: https://platform.openai.com/docs/api-reference/usage
 */

const BASE_URL = "https://api.openai.com";

/**
 * 최근 N일 동안의 모델별 사용량 조회
 */
export async function fetchOpenAIUsage(adminKey, options = {}) {
  const { days = 30 } = options;

  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - days * 86400;

  const params = new URLSearchParams({
    start_time: String(startTime),
    end_time: String(endTime),
    bucket_width: "1d",
    "group_by[]": "model",
    limit: "31",
  });

  const allData = await fetchAllPages(
    `${BASE_URL}/v1/organization/usage/completions?${params}`,
    adminKey,
  );

  return transformOpenAIData(allData, days);
}

async function fetchAllPages(baseUrl, adminKey) {
  const allBuckets = [];
  let url = baseUrl;

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${adminKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    allBuckets.push(...(data.data || []));

    if (data.next_page) {
      const separator = baseUrl.includes("?") ? "&" : "?";
      url = `${baseUrl}${separator}page=${data.next_page}`;
    } else {
      url = null;
    }
  }

  return allBuckets;
}

function transformOpenAIData(buckets, days) {
  const modelUsage = {};
  let totalInput = 0;
  let totalOutput = 0;
  let totalRequests = 0;
  const dailyTokens = {};

  for (const bucket of buckets) {
    const date = new Date(bucket.start_time * 1000).toISOString().split("T")[0];

    for (const result of bucket.results || []) {
      const model = result.model || "unknown";
      const input = result.input_tokens || 0;
      const output = result.output_tokens || 0;
      const requests = result.num_model_requests || 0;

      if (!modelUsage[model]) {
        modelUsage[model] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
      }
      modelUsage[model].inputTokens += input;
      modelUsage[model].outputTokens += output;
      modelUsage[model].totalTokens += input + output;
      modelUsage[model].requests += requests;

      totalInput += input;
      totalOutput += output;
      totalRequests += requests;

      dailyTokens[date] = (dailyTokens[date] || 0) + input + output;
    }
  }

  const totalTokens = totalInput + totalOutput;
  const activeDays = Object.keys(dailyTokens).length;
  const monthlyTokens = days > 0 ? Math.round(totalTokens / (days / 30)) : totalTokens;

  const topModels = Object.entries(modelUsage)
    .sort(([, a], [, b]) => b.totalTokens - a.totalTokens)
    .slice(0, 3);

  const sortedDates = Object.keys(dailyTokens).sort().reverse();
  const streak = calculateStreak(sortedDates);

  return {
    provider: "openai",
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalTokens,
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
