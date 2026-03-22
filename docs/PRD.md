# PRD: GitHub AI Stats Card

## 1. Overview

**Project Name:** github-ai-stat
**Tagline:** "Show your AI coding DNA on your GitHub profile"
**Goal:** 개발자가 자신의 AI 도구 사용 통계를 GitHub 프로필 README에 동적 SVG 카드로 표시할 수 있는 오픈소스 서비스

### 1.1 Problem Statement

개발자들은 AI 코딩 도구(GitHub Copilot, Claude, ChatGPT, Cursor 등)를 일상적으로 사용하지만, 이를 자신의 프로필에서 시각적으로 보여줄 방법이 없다. `github-readme-stats`가 GitHub 활동 통계를 카드로 보여주듯, AI 사용 통계를 보여주는 도구가 필요하다.

### 1.2 Target Users

- AI 코딩 도구를 적극 활용하는 개발자
- 자신의 GitHub 프로필을 꾸미고 싶은 개발자
- AI 활용 역량을 어필하고 싶은 구직자/프리랜서

### 1.3 Competitive Landscape

| 프로젝트 | AI 통계 | 개인 프로필용 | SVG 카드 | 오픈소스 |
|----------|---------|-------------|----------|---------|
| github-readme-stats | X | O | O | O |
| GitHub Copilot Metrics | O (Copilot only) | X (조직 레벨) | X | X |
| GitClear | O | X | X | X |
| copilot-metrics-dashboard | O (Copilot only) | X (조직 레벨) | X | O |
| **github-ai-stat (본 프로젝트)** | **O** | **O** | **O** | **O** |

---

## 2. Features

### 2.1 Core Features (MVP)

#### 2.1.1 AI Usage Stats Card
사용자의 AI 도구 사용 통계를 보여주는 SVG 카드 생성

```
![AI Stats](https://github-ai-stat.vercel.app/api/card?username=yourname)
```

**표시 항목:**
- 사용 중인 AI 도구 목록 (아이콘 + 이름)
- 각 도구별 사용 빈도/비율 (프로그레스 바)
- AI 활용 등급 (S+, S, A+, A, B+ ... github-readme-stats 스타일)
- 총 AI 세션 수 / 토큰 사용량 (opt-in)

#### 2.1.2 데이터 수집 방식 (2-Track)

**Track A: Self-Report (수동 설정)**
- 사용자가 GitHub Gist에 JSON 설정 파일을 만들어 AI 도구와 사용 빈도를 직접 입력
- 진입 장벽이 낮아 즉시 사용 가능, DB 불필요
- Gist URL 또는 GitHub username으로 설정 조회

```json
{
  "tools": {
    "github-copilot": { "frequency": "daily", "since": "2023-01" },
    "claude": { "frequency": "daily", "since": "2024-03" },
    "chatgpt": { "frequency": "weekly", "since": "2023-02" },
    "cursor": { "frequency": "daily", "since": "2024-06" }
  },
  "primary": "claude",
  "style": "dark"
}
```

**Track B: Automated Tracking (자동 수집)**
- CLI 도구 또는 VS Code Extension으로 실시간 사용 데이터 수집
- 로컬에서 데이터를 집계하여 주기적으로 동기화
- 프라이버시: 사용 시간/횟수만 수집, 코드 내용은 수집하지 않음

**수집 가능한 메트릭:**
| 메트릭 | 수집 방법 | 난이도 |
|--------|----------|--------|
| AI 도구 목록 | Self-report / 설정 파일 감지 | Easy |
| 일일 평균 사용 시간 | CLI tracker (프로세스 모니터링) | Medium |
| 토큰 사용량 | API 사용 로그 파싱 (Claude/OpenAI) | Medium |
| AI 기여 커밋 비율 | Git commit 메시지 분석 (Co-authored-by 등) | Easy |
| 코드 수락률 | IDE extension 통합 | Hard |

#### 2.1.3 AI Contribution Ratio Card
GitHub 커밋 중 AI 도움을 받은 비율을 시각화

```
![AI Contributions](https://github-ai-stat.vercel.app/api/contributions?username=yourname)
```

**분석 기준:**
- `Co-authored-by` 헤더에 AI 봇 포함 여부
- 커밋 메시지에 AI 관련 키워드 (`copilot`, `claude`, `ai-generated` 등)
- `.github/copilot` 설정 파일 존재 여부
- 사용자 커스텀 태그

### 2.2 Extended Features (v2)

#### 2.2.1 AI Tools Badge Collection
개별 AI 도구별 배지 생성

```markdown
![Claude](https://github-ai-stat.vercel.app/api/badge?tool=claude&style=flat)
![Copilot](https://github-ai-stat.vercel.app/api/badge?tool=copilot&style=flat)
```

#### 2.2.2 Weekly AI Activity Graph
주간 AI 사용 활동 히트맵 (GitHub contribution graph 스타일)

#### 2.2.3 AI Streak
연속 AI 사용일 카운터

#### 2.2.4 Leaderboard
커뮤니티 내 AI 활용 랭킹 (opt-in)

---

## 3. Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────┐
│                   GitHub README                  │
│  <img src="api/card?username=xxx" />             │
└──────────────────────┬──────────────────────────┘
                       │ HTTP GET (SVG response)
                       ▼
┌─────────────────────────────────────────────────┐
│          Vercel Serverless Functions             │
│                                                  │
│  /api/card.js         → AI Stats SVG 카드        │
│  /api/contributions.js → AI 기여도 SVG 카드      │
│  /api/badge.js        → 개별 도구 SVG 배지       │
└──────────────────────┬──────────────────────────┘
                       │
               ┌───────┴───────┐
               ▼               ▼
        ┌──────────┐    ┌──────────┐
        │  GitHub   │    │  GitHub  │
        │  API      │    │  Gist   │
        │  (commits)│    │  (user  │
        │           │    │  config)│
        └──────────┘    └──────────┘
```

**핵심 원칙: DB 없이 동작한다.**
- 사용자 설정 → GitHub Gist에 JSON으로 저장 (DB 불필요)
- 커밋 분석 → GitHub API 실시간 조회
- 캐시 → Vercel Edge Cache (Cache-Control 헤더)

### 3.2 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| API / SVG Generation | Vercel Serverless Functions (Node.js) | github-readme-stats와 동일한 구조, 심플 |
| SVG Rendering | 순수 SVG 템플릿 (string interpolation) | 의존성 최소화, 빠른 렌더링 |
| 데이터 저장 | GitHub Gist (JSON) | DB 불필요, 사용자가 직접 수정 가능 |
| 데이터 소스 | GitHub API (commits) | Co-authored-by 분석 |
| Cache | Vercel Edge Cache (Cache-Control) | 별도 Redis 불필요 |
| Auth | GitHub PAT (Personal Access Token) | OAuth 없이도 동작, 심플 |
| Hosting | Vercel | 무료 티어, 글로벌 CDN |

> **왜 Next.js가 아닌가?**
> GitHub README에 임베드할 SVG 카드 API만 필요하다. 웹 대시보드는 MVP에 불필요하며,
> `github-readme-stats` (78.8K stars)도 Next.js 없이 Vercel Serverless Functions만으로 동작한다.
> 필요시 대시보드는 별도 프로젝트로 분리하면 된다.

### 3.3 Project Structure

```
github-ai-stat/
├── api/                      # Vercel Serverless Functions
│   ├── card.js               # GET /api/card?username=xxx → SVG
│   ├── badge.js              # GET /api/badge?tool=claude → SVG
│   └── contributions.js      # GET /api/contributions?username=xxx → SVG
├── src/
│   ├── cards/                # SVG 카드 렌더링 로직
│   │   ├── stats-card.js     # 메인 AI 통계 카드
│   │   ├── badge-card.js     # 개별 도구 배지
│   │   └── contribution-card.js
│   ├── fetchers/             # 데이터 수집
│   │   ├── github-fetcher.js # GitHub API (커밋 분석)
│   │   └── gist-fetcher.js   # Gist에서 사용자 설정 로드
│   ├── themes/               # 테마 정의
│   │   └── index.js
│   └── utils/
│       ├── icons.js          # AI 도구 아이콘 (SVG)
│       └── rank.js           # 등급 계산 로직
├── tests/
├── docs/
├── vercel.json
├── package.json
└── README.md
```

### 3.4 Data Flow

#### Self-Report Flow (GitHub Gist 기반)
```
1. 사용자 → GitHub Gist에 ai-stat.json 파일 생성
2. README 요청 시 → API가 Gist에서 설정 로드 → SVG 생성
3. Vercel Edge Cache로 캐싱 (Cache-Control: max-age=21600)
```

#### Git Commit Analysis Flow
```
1. README 요청 시 → API가 GitHub API로 사용자 커밋 조회
2. Co-authored-by, 커밋 메시지 패턴으로 AI 기여 판별
3. 결과 → SVG 카드 생성 → 캐싱
```

> **v2에서 추가 가능:** CLI tracker, DB 연동, OAuth 대시보드 등은
> MVP 검증 후 필요시 확장한다.

---

## 4. SVG Card Design

### 4.1 Main Stats Card

```
┌──────────────────────────────────────────┐
│  ⚡ AI Stats - @username          Rank: S │
│──────────────────────────────────────────│
│                                          │
│  🤖 Primary: Claude                     │
│                                          │
│  Claude      ████████████████░░  85%     │
│  Copilot     ██████████░░░░░░░  55%     │
│  ChatGPT     ████░░░░░░░░░░░░░  25%     │
│  Cursor      ██████████████░░░  75%     │
│                                          │
│  📊 Daily Avg: 4.2h  │  🔥 Streak: 45d  │
│  💬 Tokens: 1.2M/mo  │  🤝 AI PRs: 62%  │
└──────────────────────────────────────────┘
```

### 4.2 Theme Support

- `dark` / `light` / `radical` / `tokyonight` / `dracula` 등
- github-readme-stats와 호환되는 테마 시스템
- 커스텀 색상 지원 (`?title_color=fff&bg_color=000`)

### 4.3 Card Variants

| Variant | URL Parameter | Description |
|---------|--------------|-------------|
| Compact | `?layout=compact` | 한 줄 요약 |
| Detailed | `?layout=detailed` | 전체 통계 |
| Badge | `/api/badge?tool=claude` | 개별 도구 배지 |
| Contributions | `/api/contributions` | AI 기여도 차트 |
| Activity | `/api/activity` | 주간 활동 그래프 |

---

## 5. API Design

### 5.1 Public Endpoints (No Auth)

```
GET /api/card?username={github_username}
  &theme={theme_name}
  &layout={compact|detailed}
  &hide={tool1,tool2}
  &show_icons={true|false}
  &locale={ko|en|ja}

GET /api/contributions?username={github_username}
  &theme={theme_name}
  &period={7d|30d|90d|1y}

GET /api/badge?tool={tool_name}
  &style={flat|flat-square|plastic|for-the-badge}
  &label={custom_label}
```

### 5.2 Future Endpoints (v2+)

```
POST /api/sync                 # CLI tracker 데이터 동기화 (v0.3)
GET  /api/activity             # 주간 활동 그래프 (v2)
```

---

## 6. Supported AI Tools

### 6.1 Launch (MVP)

| Tool | Icon | Detection Method |
|------|------|-----------------|
| GitHub Copilot | ✅ | Git commit analysis, self-report |
| Claude (Anthropic) | ✅ | API usage log, self-report |
| ChatGPT (OpenAI) | ✅ | API usage log, self-report |
| Cursor | ✅ | Process detection, self-report |
| Claude Code | ✅ | CLI usage detection, self-report |

### 6.2 Future Support

| Tool | Icon | Notes |
|------|------|-------|
| Gemini | | Google AI |
| Windsurf (Codeium) | | IDE plugin |
| Amazon Q | | AWS AI |
| Tabnine | | AI completion |
| Cline | | VS Code extension |
| Aider | | CLI tool |
| v0 (Vercel) | | UI generation |
| Bolt | | Full-stack AI |

---

## 7. Privacy & Security

### 7.1 Principles
- **코드 내용은 절대 수집하지 않음** - 시간, 횟수, 토큰 수만 수집
- **모든 데이터는 사용자 소유** - 언제든 삭제 가능
- **Self-report 모드 기본** - 자동 수집은 opt-in
- **최소 권한 원칙** - GitHub OAuth는 public repo 읽기만 요청

### 7.2 Data Retention
- 자동 수집 데이터: 90일 보관 후 집계 데이터만 유지
- Self-report 데이터: 사용자 삭제 전까지 유지
- SVG 캐시: 6시간 TTL

---

## 8. Monetization (Optional)

프로젝트 자체는 오픈소스이며 무료. 지속 가능성을 위한 옵션:

- **GitHub Sponsors** 연동
- **Pro 테마** (프리미엄 디자인)
- **팀/조직 대시보드** (유료)
- 커뮤니티 기부 기반 운영

---

## 9. Roadmap

### Phase 1: MVP (v0.1)
- [ ] GitHub Gist 기반 사용자 설정 시스템 (ai-stat.json)
- [ ] SVG 카드 생성 API (순수 SVG 템플릿)
- [ ] /api/card, /api/badge 엔드포인트
- [ ] 5개 기본 테마 (dark, light, radical, tokyonight, dracula)
- [ ] AI 도구 아이콘 (Copilot, Claude, ChatGPT, Cursor, Claude Code)
- [ ] Vercel 배포

### Phase 2: Git Analysis (v0.2)
- [ ] GitHub 커밋 분석 (Co-authored-by, AI 키워드)
- [ ] /api/contributions 엔드포인트
- [ ] AI 기여도 카드
- [ ] 추가 테마

### Phase 3: Auto Tracking (v0.3)
- [ ] CLI tracker (`npx github-ai-stat track`)
- [ ] 토큰 사용량 추적 (Claude/OpenAI API 키 연동)
- [ ] /api/sync 엔드포인트 + Supabase 연동 (필요시)

### Phase 4: Community (v1.0)
- [ ] 다국어 지원 (한/영/일)
- [ ] 커뮤니티 테마
- [ ] 리더보드 (opt-in)
- [ ] 웹 대시보드 (별도 프로젝트로 분리 가능)
- [ ] API 문서 / 기여 가이드

---

## 10. Success Metrics

| Metric | Target (3개월) | Target (6개월) |
|--------|--------------|--------------|
| GitHub Stars | 500 | 3,000 |
| Monthly Active Users | 200 | 2,000 |
| SVG Card Requests/day | 1,000 | 10,000 |
| Contributors | 5 | 20 |

---

## 11. Getting Started (for Contributors)

```bash
# Clone
git clone https://github.com/your-username/github-ai-stat.git
cd github-ai-stat

# Install
npm install

# Environment
cp .env.example .env.local
# Set GITHUB_TOKEN (GitHub PAT)

# Dev (Vercel CLI)
npx vercel dev

# Test
npm test
```

---

## 12. References

- [github-readme-stats](https://github.com/anuraghazra/github-readme-stats) - 가장 유사한 기존 프로젝트 (GitHub 활동 통계)
- [GitHub Copilot Metrics API](https://docs.github.com/en/rest/copilot/copilot-metrics) - Copilot 메트릭 API
- [Satori](https://github.com/vercel/satori) - JSX → SVG 변환 라이브러리
- [GitClear AI Measurement](https://www.gitclear.com/help/ai_measurement_github_copilot_usage_metrics) - AI 도구 사용 측정 참고
- [copilot-metrics-dashboard](https://github.com/microsoft/copilot-metrics-dashboard) - MS Copilot 메트릭 대시보드
