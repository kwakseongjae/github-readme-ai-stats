import { renderStatsCard } from "../src/cards/stats-card.js";
import { fetchAnthropicUsage } from "../src/fetchers/anthropic-api-fetcher.js";
import { fetchOpenAIUsage } from "../src/fetchers/openai-api-fetcher.js";
import { fetchGistConfig } from "../src/fetchers/gist-fetcher.js";
import { formatTokens } from "../src/utils/format.js";

/**
 * GET /api/card
 *
 * 사용 방법:
 *
 * 1) Gist 기반 (수동 설정):
 *    /api/card?username=xxx&theme=dark
 *
 * 2) API 키 기반 (실시간 데이터) - Gist에 API 키 등록:
 *    사용자가 Gist의 ai-stat.json에 anthropic_admin_key / openai_admin_key를 등록
 *    → 서버가 공식 API로 사용량 조회 → SVG 생성
 *
 * 3) 직접 API 키 전달 (테스트용):
 *    /api/card?anthropic_key=sk-ant-admin-xxx&theme=dark
 */
export default async function handler(req, res) {
  const {
    username, gist_id,
    anthropic_key, openai_key,
    theme, hide,
    title_color, bg_color, text_color, border_color,
    days = "30",
  } = req.query;

  try {
    let cardData;

    // 우선순위 1: 직접 API 키 전달
    if (anthropic_key || openai_key) {
      cardData = await buildFromAPIs({
        anthropicKey: anthropic_key,
        openaiKey: openai_key,
        username: username || "user",
        days: parseInt(days),
      });
    }
    // 우선순위 2: Gist에서 설정 + API 키 로드
    else if (username || gist_id) {
      const config = await fetchGistConfig({
        username, gist_id,
        token: process.env.GITHUB_TOKEN,
      });

      if (config?.anthropic_admin_key || config?.openai_admin_key) {
        // Gist에 API 키가 등록된 경우 → 실시간 데이터
        cardData = await buildFromAPIs({
          anthropicKey: config.anthropic_admin_key,
          openaiKey: config.openai_admin_key,
          username: config.username || username,
          days: parseInt(days),
        });
      } else if (config) {
        // API 키 없음 → Self-report 데이터 사용
        cardData = configToCardData(config, username);
      } else {
        return res.status(404).send(
          `No ai-stat.json gist found for user: ${username}`
        );
      }
    } else {
      return res.status(400).send("Missing: username, gist_id, or API keys");
    }

    const svg = renderStatsCard(cardData, {
      theme,
      hide: hide ? hide.split(",") : [],
      title_color, bg_color, text_color, border_color,
    });

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=21600");
    return res.send(svg);
  } catch (err) {
    return res.status(500).send(`Error: ${err.message}`);
  }
}

/**
 * Anthropic + OpenAI API에서 실시간 데이터 조회 → 카드 데이터 구성
 */
async function buildFromAPIs({ anthropicKey, openaiKey, username, days }) {
  const tools = [];
  let totalTokens = 0;
  let totalSessions = 0;
  let streak = 0;
  let monthlyTokens = 0;

  // Anthropic (Claude Code)
  if (anthropicKey) {
    const anthro = await fetchAnthropicUsage(anthropicKey, { days });
    tools.push({ id: "claude-code", usage: 0 }); // usage는 나중에 비율로 계산

    for (const [model, usage] of anthro.topModels) {
      const pct = anthro.totalTokens > 0
        ? Math.round((usage.totalTokens / anthro.totalTokens) * 100) : 0;
      tools.push({
        id: "claude",
        usage: pct,
        label: `${prettifyModel(model)} (${formatTokens(usage.totalTokens)})`,
      });
    }

    totalTokens += anthro.totalTokens;
    totalSessions += anthro.totalRequests;
    streak = Math.max(streak, anthro.streak);
    monthlyTokens += anthro.monthlyTokens;
  }

  // OpenAI (Codex CLI)
  if (openaiKey) {
    const oai = await fetchOpenAIUsage(openaiKey, { days });
    tools.push({ id: "codex", usage: 0 });

    for (const [model, usage] of oai.topModels) {
      const pct = oai.totalTokens > 0
        ? Math.round((usage.totalTokens / oai.totalTokens) * 100) : 0;
      tools.push({
        id: "chatgpt",
        usage: pct,
        label: `${prettifyModel(model)} (${formatTokens(usage.totalTokens)})`,
      });
    }

    totalTokens += oai.totalTokens;
    totalSessions += oai.totalRequests;
    streak = Math.max(streak, oai.streak);
    monthlyTokens += oai.monthlyTokens;
  }

  // 도구별 사용 비율 계산
  if (anthropicKey && openaiKey) {
    const anthroTokens = tools.filter(t => t.id === "claude" || t.id === "claude-code")
      .reduce((s, t) => s + (t.usage || 0), 0);
    // claude-code와 codex의 비율을 전체 토큰 기준으로
    tools[0].usage = 70; // anthropic 비율 (임시, 실제로는 토큰 비율로)
    const codexIdx = tools.findIndex(t => t.id === "codex");
    if (codexIdx >= 0) tools[codexIdx].usage = 30;
  } else {
    // 단일 도구만 사용
    tools[0].usage = 95;
  }

  return {
    username,
    tools,
    totalDays: days,
    monthlyTokens,
    totalSessions,
    streak,
    aiCommitRatio: 0, // API에서는 커밋 정보 불가
    aiCommitsPerMonth: 0,
  };
}

function prettifyModel(model) {
  if (model.includes("opus-4-6")) return "Opus 4.6";
  if (model.includes("opus-4-5")) return "Opus 4.5";
  if (model.includes("sonnet-4-6")) return "Sonnet 4.6";
  if (model.includes("sonnet-4-5")) return "Sonnet 4.5";
  if (model.includes("haiku")) return "Haiku 4.5";
  if (model.includes("gpt-4.1")) return "GPT-4.1";
  if (model.includes("gpt-4o")) return "GPT-4o";
  if (model.includes("o3-mini")) return "o3-mini";
  if (model.includes("o4-mini")) return "o4-mini";
  return model.replace("claude-", "").replace(/-20\d+$/, "");
}

/**
 * Self-report Gist 설정 → 카드 데이터 변환 (기존 방식)
 */
function configToCardData(config, username) {
  const tools = Object.entries(config.tools || {}).map(([id, info]) => {
    const frequency = info.frequency || "weekly";
    const usage = info.usage || (frequency === "daily" ? 90 : frequency === "weekly" ? 50 : 20);
    return { id, usage, ...info };
  });

  return {
    username: config.username || username,
    tools,
    totalDays: config.total_days || 30,
    monthlyTokens: config.monthly_tokens || 0,
    aiCommitRatio: config.ai_commit_ratio || 0,
    aiCommitsPerMonth: config.ai_commits_per_month || 0,
    totalSessions: config.total_sessions || 0,
    streak: config.streak || 0,
  };
}
