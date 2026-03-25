import { getTheme } from "../themes/index.js";
import { getToolColor, getToolName, getToolIconInline } from "../utils/icons.js";
import { calculateRank } from "../utils/rank.js";
import { formatTokens, escapeXml } from "../utils/format.js";

export function renderStatsCard(data, options = {}) {
  const {
    theme: themeName = "default",
    hide = [],
    title_color, bg_color, text_color, border_color,
  } = options;

  const theme = getTheme(themeName);
  const c = {
    bg: bg_color ? `#${bg_color}` : theme.bg,
    border: border_color ? `#${border_color}` : theme.border,
    title: title_color ? `#${title_color}` : theme.title,
    text: text_color ? `#${text_color}` : theme.text,
    icon: theme.icon,
    bar_bg: theme.bar_bg,
  };

  const username = escapeXml(data.username || "unknown");
  const rank = calculateRank(data);

  // 단일 도구일 때 도구 행 제거, 모델만 표시
  let tools = (data.tools || []).filter((t) => !hide.includes(t.id));
  const providerIds = ["claude-code", "codex", "github-copilot"];
  const providers = tools.filter(t => providerIds.includes(t.id));
  const hasMultipleProviders = new Set(providers.map(t => t.id)).size > 1;

  if (!hasMultipleProviders && providers.length > 0) {
    data._providerIcon = providers[0].id;
    tools = tools.filter(t => !providerIds.includes(t.id));
  }

  const W = 495;
  const P = 25;

  // 레이아웃
  const headerH = 30;
  const toolRowH = 30;
  const toolsTopPad = 12;
  const toolsH = tools.length * toolRowH;
  const divPad = 10;
  const statsH = 48;
  const H = P + headerH + toolsTopPad + toolsH + divPad + statsH + P;

  const parts = [];

  // ─── BG ───
  parts.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="4.5" fill="${c.bg}" stroke="${c.border}" stroke-width="1"/>`);

  // ─── RANK RING (우측 상단, 보더 위에 걸침) ───
  const ringR = 22;
  const ringPad = ringR + 6; // viewBox 위로 확장할 만큼
  const ringCX = W - P - ringR - 8;
  const ringCY = 0; // 보더 위 (y=0)
  const circ = 2 * Math.PI * ringR;
  const prog = ((100 - rank.percentile) / 100) * circ;
  const isTop = rank.level.startsWith("S");

  // 링 배경을 카드 bg색으로 채워서 보더를 가림
  const glow = isTop
    ? `<circle cx="${ringCX}" cy="${ringCY}" r="${ringR + 8}" fill="${rank.color}" opacity="0.1">
        <animate attributeName="opacity" values="0.06;0.15;0.06" dur="3s" repeatCount="indefinite"/>
      </circle>`
    : "";

  parts.push(`
  ${glow}
  <circle cx="${ringCX}" cy="${ringCY}" r="${ringR + 4}" fill="${c.bg}"/>
  <circle cx="${ringCX}" cy="${ringCY}" r="${ringR}" fill="none" stroke="${c.bar_bg}" stroke-width="3.5"/>
  <circle cx="${ringCX}" cy="${ringCY}" r="${ringR}" fill="none" stroke="${rank.color}" stroke-width="3.5"
    stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
    transform="rotate(-90 ${ringCX} ${ringCY})" stroke-linecap="round">
    <animate attributeName="stroke-dashoffset" from="${circ}" to="${circ - prog}" dur="1s" fill="freeze" begin="0.4s"/>
  </circle>
  <text x="${ringCX}" y="${ringCY + 5}" text-anchor="middle" fill="${rank.color}" font-size="16" font-weight="bold" font-family="'Segoe UI',Ubuntu,sans-serif" opacity="0">
    ${rank.level}
    <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin="1s"/>
  </text>`);

  // ─── HEADER ───
  const headerIcon = data._providerIcon
    ? getToolIconInline(data._providerIcon, P, P, 17, false)
    : `<g transform="translate(${P + 8}, ${P + 8})">
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="12s" repeatCount="indefinite" additive="sum"/>
        <path d="M0 -7l2 5h5l-2 2 2 5-5-2L0 7l-2-5-5 2 2-5-5-2H-2z" fill="${c.title}" opacity="0.8" transform="scale(0.6)"/>
      </g>`;

  parts.push(`
  ${headerIcon}
  <text x="${P + 23}" y="${P + 13}" fill="${c.title}" font-size="16" font-weight="bold" font-family="'Segoe UI',Ubuntu,sans-serif">AI Stats</text>
  <text x="${P + 91}" y="${P + 13}" fill="${c.text}" font-size="13" font-family="'Segoe UI',Ubuntu,sans-serif" opacity="0.6">@${username}</text>
  <line x1="${P}" y1="${P + headerH}" x2="${W - P}" y2="${P + headerH}" stroke="${c.border}" stroke-width="0.5" opacity="0.3"/>`);

  // ─── TOOL ROWS ───
  const toolsY = P + headerH + toolsTopPad;
  const barStartX = 175;
  const barEndX = W - P - 36;
  const barW = barEndX - barStartX;

  tools.forEach((tool, i) => {
    const y = toolsY + i * toolRowH;
    const name = escapeXml(tool.label || getToolName(tool.id));
    const color = getToolColor(tool.id);
    const pct = Math.min(tool.usage || 0, 100);
    const filled = (pct / 100) * barW;
    const delay = `${0.2 + i * 0.1}s`;

    const icon = getToolIconInline(tool.id, P, y + 1, 14, false);

    const glowDot = filled > 12
      ? `<circle cx="${barStartX + filled}" cy="${y + 9}" r="2" fill="${color}" opacity="0">
          <animate attributeName="opacity" values="0;0.6;0" dur="2s" repeatCount="indefinite" begin="${delay}"/>
        </circle>`
      : "";

    parts.push(`
    <g opacity="0">
      <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin="${delay}"/>
      ${icon}
      <text x="${P + 20}" y="${y + 12}" fill="${c.text}" font-size="11.5" font-family="'Segoe UI',Ubuntu,sans-serif">${name}</text>
      <rect x="${barStartX}" y="${y + 2}" width="${barW}" height="11" rx="5.5" fill="${c.bar_bg}"/>
      <rect x="${barStartX}" y="${y + 2}" width="0" height="11" rx="5.5" fill="${color}">
        <animate attributeName="width" from="0" to="${filled}" dur="0.6s" fill="freeze" begin="${delay}"/>
      </rect>
      ${glowDot}
      <text x="${barEndX + 8}" y="${y + 12}" fill="${c.text}" font-size="10.5" font-family="'Segoe UI',Ubuntu,sans-serif" opacity="0.8">${pct}%</text>
    </g>`);
  });

  // ─── DIVIDER ───
  const divY = toolsY + toolsH + 2;
  parts.push(`<line x1="${P}" y1="${divY}" x2="${W - P}" y2="${divY}" stroke="${c.border}" stroke-width="0.5" opacity="0.3"/>`);

  // ─── STATS FOOTER ───
  const sY = divY + divPad;
  const cols = [];

  if (data.monthlyTokens) {
    cols.push({ value: formatTokens(data.monthlyTokens), label: "tokens/mo", iconPath: "M13 3L4 14h5l-1 7 9-11h-5l1-7z" });
  }
  if (data.totalSessions) {
    cols.push({ value: String(data.totalSessions), label: "sessions", iconPath: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 8l4 3-4 3V8z" });
  }
  if (data.aiCommitsPerMonth > 0) {
    cols.push({ value: `${data.aiCommitsPerMonth}/mo`, label: "AI commits", iconPath: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" });
  } else if (data.aiCommitRatio > 0) {
    cols.push({ value: `${Math.round(data.aiCommitRatio * 100)}%`, label: "AI commits", iconPath: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" });
  }
  if (data.streak) {
    cols.push({ value: `${data.streak}d`, label: "streak", iconPath: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z", isStreak: true });
  }

  const colW = (W - P * 2) / Math.max(cols.length, 1);
  cols.forEach((col, i) => {
    const cx = P + i * colW + colW / 2;
    const delay = `${0.5 + i * 0.1}s`;
    const iconColor = col.isStreak ? "#ff6b35" : c.icon;

    if (i > 0) {
      parts.push(`<line x1="${P + i * colW}" y1="${sY}" x2="${P + i * colW}" y2="${sY + 30}" stroke="${c.border}" stroke-width="0.5" opacity="0.25"/>`);
    }

    const valWidth = col.value.length * 9.5;
    const totalW = 14 + 6 + valWidth;
    const startX = cx - totalW / 2;

    parts.push(`
    <g opacity="0">
      <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin="${delay}"/>
      <svg viewBox="0 0 24 24" width="13" height="13" x="${startX}" y="${sY + 1}" fill="${iconColor}" opacity="0.6"><path d="${col.iconPath}"/></svg>
      <text x="${startX + 19}" y="${sY + 14}" fill="${c.text}" font-size="15" font-weight="bold" font-family="'Segoe UI',Ubuntu,sans-serif">${col.value}</text>
      <text x="${cx}" y="${sY + 29}" text-anchor="middle" fill="${c.text}" font-size="10.5" font-family="'Segoe UI',Ubuntu,sans-serif" opacity="0.45">${col.label}</text>
    </g>`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + ringPad}" viewBox="0 ${-ringPad} ${W} ${H + ringPad}">
${parts.join("\n")}
</svg>`;
}
