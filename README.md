# GitHub AI Stats

**Show your AI coding DNA on your GitHub profile.**

Dynamically generated AI usage stats card for your GitHub profile README. Track your Claude Code, Codex CLI, and other AI tool usage with real data from official APIs.

<p align="center">
  <img src="preview/card-dark.svg" alt="AI Stats Card - Dark Theme" width="495" />
</p>

---

## Features

- **Real Usage Data** - Connects to Anthropic & OpenAI Admin APIs for actual token consumption
- **Top 3 Models** - Shows your most-used AI models with usage breakdown
- **Multiple Providers** - Support Claude Code, Codex CLI, or both simultaneously
- **10 Themes** - dark, radical, tokyonight, dracula, neon, matrix, synthwave, and more
- **Animated SVG** - Smooth gauge bar animations, rank ring, and glow effects
- **GitHub README Compatible** - SMIL animations that work in GitHub's SVG renderer
- **Badges** - Individual tool badges you can customize

## Card Examples

### Claude Code User

<p align="center">
  <img src="preview/card-tokyonight.svg" alt="tokyonight" width="400" />
  <img src="preview/card-radical.svg" alt="radical" width="400" />
</p>

### Codex CLI User

<p align="center">
  <img src="preview/card-codex-dark.svg" alt="Codex Dark" width="400" />
  <img src="preview/card-codex-neon.svg" alt="Codex Neon" width="400" />
</p>

### Both Claude + Codex

<p align="center">
  <img src="preview/card-both-dark.svg" alt="Both Dark" width="400" />
  <img src="preview/card-both-tokyonight.svg" alt="Both Tokyonight" width="400" />
</p>

## Quick Start

### 1. Get your Admin API Key

이 프로젝트는 **Anthropic / OpenAI의 공식 Admin API**를 통해 실제 사용량을 조회합니다.
Claude Code 또는 Codex CLI 중 하나만 사용해도 되고, 둘 다 연동할 수도 있습니다.

| Provider | Where to get it | Key format | What it tracks |
|----------|----------------|------------|----------------|
| **Anthropic** (Claude Code) | [Console Admin Keys](https://console.anthropic.com/settings/admin-keys) | `sk-ant-admin-...` | Claude 모델별 토큰 사용량, 세션 수, 일별 추이 |
| **OpenAI** (Codex CLI) | [Platform Admin Keys](https://platform.openai.com/settings/organization/admin-keys) | `sk-admin-...` | GPT 모델별 토큰 사용량, 요청 수, 일별 추이 |

> **Note:** Admin API Key는 일반 API Key와 다릅니다. 조직(Organization) 계정의 Admin 권한이 필요합니다.

<details>
<summary><strong>Claude Code 연동 상세</strong></summary>

1. [Anthropic Console](https://console.anthropic.com) 접속
2. **Settings > Admin Keys** 이동
3. **Create Admin Key** 클릭 → 키 복사 (`sk-ant-admin-...` 형식)
4. 이 키가 조회하는 API: `GET https://api.anthropic.com/v1/organizations/usage_report/messages`
5. 반환 데이터: 모델별 토큰 사용량 (`uncached_input_tokens`, `output_tokens`, `cache_read_input_tokens`), 일별 분석, 요청 수

**조회 예시 (curl):**
```bash
curl "https://api.anthropic.com/v1/organizations/usage_report/messages?\
starting_at=2026-03-01T00:00:00Z&ending_at=2026-03-22T00:00:00Z&\
group_by[]=model&bucket_width=1d" \
  --header "anthropic-version: 2023-06-01" \
  --header "x-api-key: sk-ant-admin-xxxxx"
```

</details>

<details>
<summary><strong>Codex CLI 연동 상세</strong></summary>

1. [OpenAI Platform](https://platform.openai.com) 접속
2. **Settings > Organization > Admin Keys** 이동
3. Admin API Key 생성 → 키 복사
4. 이 키가 조회하는 API: `GET https://api.openai.com/v1/organization/usage/completions`
5. 반환 데이터: 모델별 토큰 사용량 (`input_tokens`, `output_tokens`, `input_cached_tokens`), 일별 분석, 요청 수

**조회 예시 (curl):**
```bash
curl "https://api.openai.com/v1/organization/usage/completions?\
start_time=1709251200&bucket_width=1d&group_by=model&limit=30" \
  -H "Authorization: Bearer sk-admin-xxxxx"
```

</details>

### 2. Create a GitHub Gist

[gist.github.com](https://gist.github.com)에서 **파일명 `ai-stat.json`**으로 Gist를 생성합니다.

**Option A: API Key 연동 (실제 데이터, 추천)**

```json
{
  "username": "your-github-username",
  "anthropic_admin_key": "sk-ant-admin-xxxxx",
  "openai_admin_key": "sk-admin-xxxxx"
}
```

- 둘 중 하나만 있어도 됩니다.
- 서버가 공식 API를 호출하여 최근 30일 사용량을 조회합니다.
- Top 3 모델이 자동으로 표시됩니다.

**Option B: Self-Report (API Key 없이)**

```json
{
  "username": "your-github-username",
  "tools": {
    "claude-code": { "frequency": "daily", "since": "2026-01", "usage": 95 },
    "codex": { "frequency": "weekly", "since": "2025-06", "usage": 40 }
  },
  "monthly_tokens": 4000000,
  "total_sessions": 392,
  "streak": 43,
  "ai_commits_per_month": 51
}
```

### 3. Add to your README

```markdown
![AI Stats](https://github-ai-stat.vercel.app/api/card?username=YOUR_USERNAME&theme=dark)
```

`YOUR_USERNAME`을 본인의 GitHub 사용자명으로 변경하세요.

## Themes

| Theme | Preview |
|-------|---------|
| `default` | <img src="preview/card-default.svg" width="300" /> |
| `dark` | <img src="preview/card-dark.svg" width="300" /> |
| `radical` | <img src="preview/card-radical.svg" width="300" /> |
| `tokyonight` | <img src="preview/card-tokyonight.svg" width="300" /> |
| `dracula` | <img src="preview/card-dracula.svg" width="300" /> |
| `neon` | <img src="preview/card-neon.svg" width="300" /> |
| `synthwave` | <img src="preview/card-synthwave.svg" width="300" /> |
| `gruvbox` | <img src="preview/card-gruvbox.svg" width="300" /> |
| `nord` | <img src="preview/card-nord.svg" width="300" /> |
| `matrix` | <img src="preview/card-matrix.svg" width="300" /> |

Change theme with `&theme=dark`:

```markdown
![AI Stats](https://github-ai-stat.vercel.app/api/card?username=YOUR_USERNAME&theme=tokyonight)
```

## Badges

Copy the code below and change the text after `usage=` to whatever you want:

<p>
  <img src="preview/badge-claude-code.svg" alt="Claude Code" />
  <img src="preview/badge-codex.svg" alt="Codex" />
  <img src="preview/badge-claude.svg" alt="Claude" />
  <img src="preview/badge-chatgpt.svg" alt="ChatGPT" />
</p>

```markdown
![Claude Code](https://github-ai-stat.vercel.app/api/badge?tool=claude-code&usage=daily)
![Codex CLI](https://github-ai-stat.vercel.app/api/badge?tool=codex&usage=285%20sessions)
![Claude](https://github-ai-stat.vercel.app/api/badge?tool=claude&usage=392%20sessions)
![ChatGPT](https://github-ai-stat.vercel.app/api/badge?tool=chatgpt&usage=monthly)
```

Just change the `usage=` parameter to your own text. URL-encode spaces as `%20`.

Available tools: `claude-code`, `codex`, `claude`, `chatgpt`, `github-copilot`, `cursor`, `gemini`, `windsurf`

## API Reference

### Card

```
GET /api/card
```

| Parameter | Description | Example |
|-----------|-------------|---------|
| `username` | GitHub username (looks up ai-stat.json Gist) | `kwakseongjae` |
| `gist_id` | Direct Gist ID (alternative to username) | `abc123...` |
| `theme` | Card theme | `dark`, `tokyonight`, etc. |
| `days` | Usage period in days | `30` (default) |
| `hide` | Hide specific tools (comma-separated) | `chatgpt,cursor` |
| `title_color` | Custom title color (hex, no #) | `58a6ff` |
| `bg_color` | Custom background color | `0d1117` |
| `text_color` | Custom text color | `c9d1d9` |
| `border_color` | Custom border color | `30363d` |

### Badge

```
GET /api/badge
```

| Parameter | Description | Example |
|-----------|-------------|---------|
| `tool` | Tool ID (required) | `claude-code`, `codex` |
| `usage` | Display text | `daily`, `10M%20tokens` |
| `style` | Badge style | `flat`, `flat-square` |
| `color` | Custom color (hex, no #) | `D97757` |
| `label` | Custom label text | `My%20AI` |

## How It Works

```
GitHub README requests SVG image
        |
        v
Vercel Serverless Function (/api/card)
        |
        v
Fetches ai-stat.json from user's GitHub Gist
        |
        +-- Has API keys? --> Anthropic/OpenAI Admin API
        |                     (real usage data, top 3 models)
        |
        +-- No API keys? --> Self-report config
        |                     (manual stats from Gist JSON)
        v
Generates SVG card with animations
        |
        v
Cached for 6 hours (Cache-Control)
```

### Data Sources

| Source | API Endpoint | What it tracks |
|--------|-------------|----------------|
| Anthropic | `GET /v1/organizations/usage_report/messages` | Token usage by model, daily breakdown |
| OpenAI | `GET /v1/organization/usage/completions` | Token usage by model, request counts |

## Local Development

```bash
git clone https://github.com/your-username/github-ai-stat.git
cd github-ai-stat

# Preview with your local Claude Code data
npm run preview

# Local API server
npm run dev
# http://localhost:3000/api/card?username=test&theme=dark

# Deploy
npx vercel
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Vercel Serverless Functions (Node.js) |
| SVG | Pure SVG templates with SMIL animations |
| Data | GitHub Gist (config) + Anthropic/OpenAI Admin APIs |
| Cache | Vercel Edge Cache (Cache-Control) |
| Icons | Simple Icons (SVG) + custom PNG (Claude Code mascot, Codex) |

## Contributing

Contributions welcome! Some ideas:

- Add more AI tool integrations (Gemini, Cursor, Windsurf)
- New themes
- GitHub Action for auto-syncing Gist
- More card variants (activity heatmap, language breakdown)

## License

MIT
