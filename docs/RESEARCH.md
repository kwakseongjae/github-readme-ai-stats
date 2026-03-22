# Research: AI Stats for GitHub Profile README

> Researched on 2026-03-22

## 1. Existing Projects Analysis

### 1.1 Direct Competitors (AI Usage Stats for GitHub Profile)

**결론: 정확히 같은 목적의 프로젝트는 존재하지 않음.** 가장 가까운 프로젝트는 cc-proficiency (2 stars, Claude Code만 지원).

| Project | Stars | Created | Description | 한계 |
|---------|-------|---------|-------------|------|
| [cc-proficiency](https://github.com/Z-M-Huang/cc-proficiency) | 2 | 2026-03 (1주) | Claude Code proficiency SVG 배지, GitHub Gist 기반 | Claude Code만 지원, 단일 도구 |
| [ai-usage-measurement-framework](https://github.com/satinath-nit/ai-usage-measurement-framework) | 1 | 2025-12 | Git repo 분석으로 AI 기여 커밋 탐지 | README 카드 없음, 초기 단계 |

### 1.2 AI Usage Trackers (수요 입증 - README 통합 없음)

이 프로젝트들의 높은 스타 수가 AI 사용 추적에 대한 강한 수요를 증명함:

| Project | Stars | Description | README 통합 |
|---------|-------|-------------|------------|
| [ccusage](https://github.com/ryoppippi/ccusage) | **11.8K** | Claude Code JSONL 로그 분석 CLI. 토큰/비용 리포트 | X (CLI only) |
| [Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor) | **7.1K** | 실시간 Claude 토큰 모니터 + ML 예측 | X (터미널) |
| [ClaudeBar](https://github.com/tddworks/ClaudeBar) | 824 | macOS 메뉴바 앱. Claude, Codex, Gemini, Copilot 쿼터 모니터링 | X (데스크톱) |

**핵심 인사이트:** ccusage 11.8K stars는 AI 사용 추적에 대한 강한 수요를 증명. 하지만 이 데이터를 GitHub 프로필 카드로 연결하는 프로젝트는 없음.

### 1.3 GitHub Profile Stats (Non-AI, 아키텍처 참고)

| Project | Stars | Description | 참고 포인트 |
|---------|-------|-------------|------------|
| [github-readme-stats](https://github.com/anuraghazra/github-readme-stats) | **78.8K** | GitHub 활동 통계 SVG 카드 | UX/아키텍처 모델 |
| [waka-readme-stats](https://github.com/anmol098/waka-readme-stats) | 3.9K | WakaTime 코딩 통계 → README | 시간 추적 패턴 참고 |
| [github-readme-streak-stats](https://github.com/DenverCoder1/github-readme-streak-stats) | 5K+ | 연속 기여일 카드 | Streak 카드 참고 |
| [metrics](https://github.com/lowlighter/metrics) | 13K+ | 30+ 플러그인 메트릭 생성기 | 플러그인 구조 참고 |

### 1.4 AI Usage Metrics (조직 레벨, Non-Profile)

| Project/Service | Type | Scope | 개인 프로필용 |
|----------------|------|-------|-------------|
| [GitHub Copilot Metrics API](https://docs.github.com/en/rest/copilot/copilot-metrics) | API | 조직/엔터프라이즈 Copilot 사용 메트릭 | X |
| [copilot-metrics-dashboard](https://github.com/microsoft/copilot-metrics-dashboard) | Dashboard | MS 공식 Copilot 메트릭 시각화 | X |
| [copilot-metrics-viewer](https://github.com/github-copilot-resources/copilot-metrics-viewer) | Dashboard | Copilot Business API 시각화 (592 stars) | X |
| [GitClear](https://www.gitclear.com) | SaaS | Copilot, Cursor, Claude Code 사용 분석 | X (상용) |
| [Swarmia](https://www.swarmia.com/product/ai-impact/) | SaaS | AI 코딩 도구 임팩트 측정 | X (팀/조직) |
| GitHub Copilot Usage Metrics (GA 2026-02) | Dashboard | GitHub 내장 대시보드 | X (조직 레벨) |

### 1.5 Gap Analysis

```
                      개인용    AI 통계    SVG 카드    다중 도구    오픈소스
github-readme-stats    ✅        ❌         ✅          -          ✅
ccusage                ✅        ✅         ❌          ❌         ✅
cc-proficiency         ✅        ✅         ✅          ❌(Claude만) ✅
Copilot Metrics        ❌        ✅(제한)    ❌          ❌         ❌
GitClear               ❌        ✅         ❌          ✅         ❌
github-ai-stat         ✅        ✅         ✅          ✅         ✅  ← 본 프로젝트
```

**존재하지 않는 것 (우리가 만들 것):**
1. 통합 "AI Stats Card" - 여러 AI 도구 사용 통계를 하나의 SVG 카드로
2. 크로스 도구 AI 사용 집계 - Copilot + Claude + Cursor + ChatGPT 통합
3. AI 기여 커밋 비율 배지 - 커밋 중 AI 기여 비율 시각화
4. 토큰 사용량 카드 - 월간 토큰 소비량 임베드 가능
5. WakaTime 스타일 AI 시간 추적 카드

## 2. Data Sources

### 2.1 GitHub Copilot
- **Copilot Metrics API** (조직 레벨만): 코드 수락률, 제안 수, 활성 사용자
- **개인 레벨**: 공식 API 없음. Git commit의 `Co-authored-by: GitHub Copilot` 분석 가능
- **GA 발표 (2026-02-27)**: 대시보드 + NDJSON export 추가

### 2.2 Claude / Claude Code (Anthropic Admin API)
- **엔드포인트**: `GET https://api.anthropic.com/v1/organizations/usage_report/messages`
- **인증**: Admin API key (`sk-ant-admin-...`) via `x-api-key` 헤더
- **필수 헤더**: `anthropic-version: 2023-06-01`
- **응답 필드**: `uncached_input_tokens`, `cache_read_input_tokens`, `output_tokens`, `model`, `num_model_requests`
- **그룹핑**: `group_by[]=model` 로 모델별 분석 가능
- **비용**: `/v1/organizations/cost_report` (일간만, USD)
- **제한**: 조직 계정만 지원, 개인 계정 불가
- **참고 구현**: [anthropic-usage-receiver](https://github.com/honeycombio/anthropic-usage-receiver) (Honeycomb)

### 2.3 ChatGPT / Codex CLI (OpenAI Admin API)
- **엔드포인트**: `GET https://api.openai.com/v1/organization/usage/completions`
- **인증**: Admin API key via `Authorization: Bearer` 헤더
- **응답 필드**: `input_tokens`, `output_tokens`, `input_cached_tokens`, `model`, `num_model_requests`
- **그룹핑**: `group_by=model` 로 모델별 분석 가능
- **비용**: `/v1/organization/costs` (일간만, USD)
- **시간 형식**: Unix 타임스탬프 (초 단위, Anthropic은 RFC 3339)
- **참고 구현**: [OpenAI Cookbook - Usage API](https://developers.openai.com/cookbook/examples/completions_usage_api)

### 2.4 Cursor
- 로컬 프로세스 모니터링으로 사용 시간 추적 가능
- VS Code Extension API 활용 가능

### 2.5 Git Commit Analysis
- `Co-authored-by` 헤더 분석이 가장 신뢰할 수 있는 방법
- 커밋 메시지 키워드: `copilot`, `claude`, `ai-generated`, `ai-assisted`
- GitHub API: `GET /repos/{owner}/{repo}/commits` → 커밋 메시지/author 파싱

## 3. Technical References

### 3.1 SVG Card Generation
- **[Satori](https://github.com/vercel/satori)**: Vercel이 만든 JSX → SVG 변환 라이브러리. `github-readme-stats`와 유사한 카드 생성에 최적
- **github-readme-stats 아키텍처**: Vercel Serverless Function + SVG template + Cache (6h TTL)

### 3.2 AI Tool Market Stats (2026)
- GitHub Copilot: ~20M 사용자, 4.7M 유료 구독자
- ChatGPT: ~400M MAU
- Claude: ~30M MAU, 25B API calls/month
- AI 코딩 어시스턴트 시장: $7.37B (2025) → $30.1B (2032 예상)

## 4. Skills Installed

프로젝트 진행을 위해 설치한 Claude Code 스킬:

| Skill | Source | Purpose |
|-------|--------|---------|
| deep-research | 199-biotechnologies | 딥 리서치 자동화 |
| tavily-research | tavily-ai | 웹 리서치 |
| documentation-writer | github/awesome-copilot | 문서 작성 |
| autoresearch | uditgoenka (manual) | 자율 반복 연구 |
