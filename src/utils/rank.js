/**
 * AI 활용 등급 계산
 *
 * 점수 기준:
 * - 사용 도구 수 (최대 20점)
 * - 총 사용 일수 (최대 30점)
 * - 토큰 사용량 (최대 25점)
 * - AI 기여 커밋 비율 (최대 25점)
 */
export function calculateRank(stats) {
  let score = 0;

  // 도구 수: 1개=5, 2개=10, 3개=15, 4+개=20
  const toolCount = stats.tools?.length || 0;
  score += Math.min(toolCount * 5, 20);

  // 총 사용 일수 (since 기준): 30일=5, 90일=10, 180일=15, 365일=20, 730일+=30
  const totalDays = stats.totalDays || 0;
  if (totalDays >= 730) score += 30;
  else if (totalDays >= 365) score += 25;
  else if (totalDays >= 180) score += 20;
  else if (totalDays >= 90) score += 15;
  else if (totalDays >= 30) score += 10;
  else score += 5;

  // 토큰 사용량 (월간): 100K=5, 500K=10, 1M=15, 5M=20, 10M+=25
  const monthlyTokens = stats.monthlyTokens || 0;
  if (monthlyTokens >= 10_000_000) score += 25;
  else if (monthlyTokens >= 5_000_000) score += 20;
  else if (monthlyTokens >= 1_000_000) score += 15;
  else if (monthlyTokens >= 500_000) score += 10;
  else if (monthlyTokens >= 100_000) score += 5;

  // AI 기여 비율: 10%=5, 25%=10, 50%=15, 75%=20, 90%+=25
  const aiRatio = stats.aiCommitRatio || 0;
  if (aiRatio >= 0.9) score += 25;
  else if (aiRatio >= 0.75) score += 20;
  else if (aiRatio >= 0.5) score += 15;
  else if (aiRatio >= 0.25) score += 10;
  else if (aiRatio >= 0.1) score += 5;

  return scoreToRank(score);
}

function scoreToRank(score) {
  if (score >= 90) return { level: "S+", color: "#FF4500", percentile: 1 };
  if (score >= 80) return { level: "S", color: "#FF6347", percentile: 5 };
  if (score >= 70) return { level: "A+", color: "#FFD700", percentile: 10 };
  if (score >= 60) return { level: "A", color: "#FFA500", percentile: 25 };
  if (score >= 45) return { level: "B+", color: "#90EE90", percentile: 45 };
  if (score >= 30) return { level: "B", color: "#87CEEB", percentile: 60 };
  return { level: "C", color: "#DDD", percentile: 100 };
}
