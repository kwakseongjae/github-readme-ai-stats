#!/usr/bin/env node

/**
 * github-readme-ai-stats CLI
 *
 * Usage:
 *   npx github-readme-ai-stats init    # 최초 설정 (Gist 생성 + hook 등록)
 *   npx github-readme-ai-stats sync    # 수동 동기화
 *   npx github-readme-ai-stats sync --quiet  # Stop hook용 (출력 최소화)
 */

const command = process.argv[2];

switch (command) {
  case "init":
    await import("../scripts/init.js");
    break;
  case "sync":
    await import("../scripts/sync.js");
    break;
  case "preview":
    await import("../scripts/preview.js");
    break;
  default:
    console.log(`
  ⚡ github-readme-ai-stats

  Usage:
    npx github-readme-ai-stats init     Setup everything (Gist + hook)
    npx github-readme-ai-stats sync     Manual stats sync to Gist
    npx github-readme-ai-stats preview  Generate local preview

  Getting started:
    npx github-readme-ai-stats init
`);
}
