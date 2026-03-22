import { getToolColor, getToolName, toolIcons } from "../utils/icons.js";
import { escapeXml } from "../utils/format.js";

/**
 * AI 도구 배지 SVG (shields.io 스타일 + 브랜드 아이콘)
 */
export function renderBadge(toolId, options = {}) {
  const { style = "flat", label, usage, color } = options;

  const tool = toolIcons[toolId];
  const toolName = label || getToolName(toolId);
  const toolColor = color ? `#${color}` : getToolColor(toolId);
  const displayName = escapeXml(toolName);
  const usageText = usage ? escapeXml(String(usage)) : "using";

  const hasIcon = !!tool;
  const iconSpace = hasIcon ? 16 : 0;
  const labelWidth = displayName.length * 7 + 20 + iconSpace;
  const valueWidth = usageText.length * 6.5 + 16;
  const totalWidth = labelWidth + valueWidth;
  const height = style === "for-the-badge" ? 28 : 20;
  const radius = style === "flat-square" ? 0 : 3;

  let iconSvg = "";
  if (hasIcon) {
    if (tool.type === "png") {
      iconSvg = `<image href="data:image/png;base64,${tool.b64}" x="5" y="${(height - 14) / 2}" width="14" height="14"/>`;
    } else {
      iconSvg = `<g transform="translate(5, ${(height - 12) / 2}) scale(0.5)" fill="#fff"><path d="${tool.path}"/></g>`;
    }
  }

  const textX = iconSpace + (labelWidth - iconSpace) / 2 + (hasIcon ? 4 : 0);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}">
  <rect width="${labelWidth}" height="${height}" rx="${radius}" fill="#555"/>
  <rect x="${labelWidth}" width="${valueWidth}" height="${height}" rx="${radius}" fill="${toolColor}"/>
  <rect x="${labelWidth}" width="${Math.min(4, radius)}" height="${height}" fill="${toolColor}"/>
  ${iconSvg}
  <text x="${textX}" y="${height / 2 + 4}" fill="#fff" font-size="11" text-anchor="middle" font-family="Verdana,Geneva,sans-serif">${displayName}</text>
  <text x="${labelWidth + valueWidth / 2}" y="${height / 2 + 4}" fill="#fff" font-size="11" text-anchor="middle" font-family="Verdana,Geneva,sans-serif">${usageText}</text>
</svg>`;
}
