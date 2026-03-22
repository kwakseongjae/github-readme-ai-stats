# GitHub AI Stats

**Show your AI coding DNA on your GitHub profile.**

GitHub 프로필 README에 AI 도구 사용 통계를 자동으로 보여주는 카드입니다.
Claude Code, Codex CLI 등의 로컬 사용 데이터를 분석하여 SVG 카드를 생성하고, GitHub Gist를 통해 프로필에 표시합니다.

<p align="center">
  <img src="preview/card-dark.svg" alt="AI Stats Card - Dark Theme" width="495" />
</p>

---

## Features

- **3줄 설정** — clone → init → README에 붙여넣기
- **자동 업데이트** — Claude Code 종료 시 Stop hook이 Gist를 자동 업데이트
- **API 키 불필요** — `~/.claude/` 로컬 파일에서 직접 파싱
- **Top 3 Models** — 가장 많이 쓴 모델 3개를 자동 분석
- **10 Themes** — dark, radical, tokyonight, dracula, neon, matrix 등
- **Animated SVG** — 게이지바, 랭크 링, 글로우 이펙트
- **Badges** — 개별 도구 배지 커스터마이즈

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

---

## Quick Start

### 필요 조건

- [Node.js](https://nodejs.org/) v18+
- [gh CLI](https://cli.github.com/) 설치 + 로그인 (`gh auth login`)
- Claude Code 또는 Codex CLI 사용 이력 (로컬 데이터가 있어야 합니다)

### Step 1. 클론 & 초기 설정

```bash
git clone https://github.com/kwakseongjae/github-readme-ai-stats.git
cd github-readme-ai-stats
npm run init
```

`npm run init` 실행 시 자동으로:

```
  ⚡ github-readme-ai-stats init

  [1/5] Checking gh CLI...
    ✓ Logged in as @yourname

  [2/5] Scanning local AI tool data...
    ✓ Claude Code: 392 sessions, 10.0M tokens

  [3/5] Generating stats card...
    ✓ Cards generated (dark + default)

  [4/5] Creating GitHub Gist...
    ✓ Gist created: https://gist.github.com/xxxxx

  [5/5] Registering Claude Code auto-update hook...
    ✓ Stop hook registered
    → Stats will auto-update when you exit Claude Code

  ─────────────────────────────────────────
  ✅ Setup complete! Add this to your GitHub profile README:

  ![AI Stats](https://gist.githubusercontent.com/yourname/xxxxx/raw/ai-stats-dark.svg)
```

### Step 2. 프로필 README에 추가

출력된 마크다운 코드를 `github.com/USERNAME/USERNAME` 레포의 `README.md`에 붙여넣기:

```markdown
![AI Stats](https://gist.githubusercontent.com/YOUR_USERNAME/GIST_ID/raw/ai-stats-dark.svg)
```

### Step 3. 끝!

이후로는 **Claude Code를 사용하고 종료할 때마다** Stop hook이 자동으로 실행되어 Gist가 업데이트됩니다.
프로필 README에서 항상 최신 통계가 표시됩니다.

수동으로 업데이트하고 싶다면:

```bash
cd github-readme-ai-stats
npm run sync
```

### 테마 변경

기본 테마는 `dark`입니다. 다른 테마로 변경하려면 `scripts/init.js`에서 테마를 수정하고 다시 `npm run init`을 실행하세요.

프리뷰로 모든 테마를 미리 볼 수 있습니다:

```bash
npm run preview  # 브라우저에서 모든 테마 확인
```

---

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

## Badges

코드를 복사하고 `usage=` 뒤의 텍스트만 원하는 대로 수정하면 됩니다:

<p>
  <img src="preview/badge-claude-code.svg" alt="Claude Code" />
  <img src="preview/badge-codex.svg" alt="Codex" />
  <img src="preview/badge-claude.svg" alt="Claude" />
  <img src="preview/badge-chatgpt.svg" alt="ChatGPT" />
</p>

배지는 Gist에 SVG를 직접 업로드하거나, 프로필 README에 아래 코드를 붙여넣으세요:

```markdown
<!-- 예시: 텍스트를 원하는 대로 변경 -->
![Claude Code](https://img.shields.io/badge/Claude_Code-daily-D97757?logo=anthropic)
![Codex CLI](https://img.shields.io/badge/Codex_CLI-weekly-412991?logo=openai)
```

사용 가능한 도구: `claude-code`, `codex`, `claude`, `chatgpt`, `github-copilot`, `cursor`, `gemini`, `windsurf`

---

## How It Works

```
git clone & npm run init (최초 1회)
  │
  ├─ ~/.claude/stats-cache.json 파싱
  │    → 모델별 토큰 사용량, 세션 수, 일별 활동
  │
  ├─ ~/.claude/usage-data/session-meta/*.json 파싱
  │    → git 커밋 수, 코드 라인, 파일 수정
  │
  ├─ SVG 카드 생성 (dark + default)
  │    → GitHub Gist에 업로드 (gh CLI)
  │
  └─ Claude Code Stop hook 자동 등록
       │
       └─ 이후 Claude Code 세션 종료마다
            → 자동 데이터 재파싱 → Gist 업데이트
```

### 데이터 소스

| 소스 | 경로 | 수집 항목 |
|------|------|----------|
| stats-cache | `~/.claude/stats-cache.json` | 모델별 토큰, 세션 수, 일별 활동 |
| session-meta | `~/.claude/usage-data/session-meta/*.json` | git 커밋, 코드 라인, 파일 수정 |
| JSONL logs | `~/.claude/projects/**/*.jsonl` | 상세 세션 로그 (fallback) |
| Codex CLI | `~/.codex/sessions/**/*.jsonl` | 모델별 토큰, 요청 수 |

> [ccusage](https://github.com/ryoppippi/ccusage) (11.8K stars), [cc-proficiency](https://github.com/Z-M-Huang/cc-proficiency) 등 검증된 오픈소스가 동일한 로컬 파일을 데이터 소스로 사용합니다.

<details>
<summary><strong>조직 계정: Admin API 자동 연동</strong></summary>

조직(Organization) 계정이 있다면 Admin API Key로 실시간 연동도 가능합니다.

| Provider | Admin Keys | 필요 권한 |
|----------|-----------|----------|
| Anthropic | [platform.claude.com/settings/admin-keys](https://platform.claude.com/settings/admin-keys) | 조직 admin |
| OpenAI | [platform.openai.com/settings/organization/admin-keys](https://platform.openai.com/settings/organization/admin-keys) | 조직 Owner |

> 개인 계정에서는 Admin Keys가 제공되지 않습니다.

</details>

---

## Commands

| 명령어 | 설명 |
|--------|------|
| `npm run init` | 최초 설정 (데이터 파싱 → Gist 생성 → hook 등록) |
| `npm run sync` | 수동 Gist 동기화 |
| `npm run preview` | 브라우저에서 모든 테마 프리뷰 |
| `npm run dev` | 로컬 API 서버 (http://localhost:3000) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| CLI | Node.js (init, sync, preview) |
| SVG | Pure SVG templates + SMIL animations |
| Data | Local file parsing (`~/.claude/`, `~/.codex/`) |
| Sync | GitHub Gist via `gh` CLI |
| Auto-update | Claude Code Stop hook |
| Icons | Simple Icons + custom PNG (Claude Code, Codex) |

## Contributing

Contributions welcome!

- GitHub Action으로 주기적 Gist 동기화
- 더 많은 AI 도구 지원 (Gemini, Cursor, Windsurf)
- 새로운 테마
- 활동 히트맵, 언어 분석 등 카드 변형

## License

MIT
