import { renderBadge } from "../src/cards/badge-card.js";

/**
 * GET /api/badge?tool=claude&style=flat&usage=daily
 */
export default async function handler(req, res) {
  const { tool, style, label, usage, color } = req.query;

  if (!tool) {
    return res.status(400).send("Missing required parameter: tool");
  }

  const svg = renderBadge(tool, { style, label, usage, color });

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400"); // 24시간 캐시
  return res.send(svg);
}
