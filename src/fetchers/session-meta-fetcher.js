import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

/**
 * ~/.claude/usage-data/session-meta/*.json 에서 상세 세션 메타데이터를 가져온다.
 *
 * 포함 데이터: git_commits, lines_added, lines_removed, files_modified,
 *             tool_counts, languages, duration_minutes 등
 */
export async function fetchSessionMeta(options = {}) {
  const { claudeDir = join(homedir(), ".claude") } = options;
  const metaDir = join(claudeDir, "usage-data", "session-meta");

  const result = {
    totalGitCommits: 0,
    totalGitPushes: 0,
    totalLinesAdded: 0,
    totalLinesRemoved: 0,
    totalFilesModified: 0,
    totalDurationMinutes: 0,
    toolCounts: {},
    languages: {},
    sessionCount: 0,
  };

  let files;
  try {
    files = await readdir(metaDir);
  } catch {
    return result;
  }

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(metaDir, file), "utf-8");
      const meta = JSON.parse(raw);

      result.sessionCount++;
      result.totalGitCommits += meta.git_commits || 0;
      result.totalGitPushes += meta.git_pushes || 0;
      result.totalLinesAdded += meta.lines_added || 0;
      result.totalLinesRemoved += meta.lines_removed || 0;
      result.totalFilesModified += meta.files_modified || 0;
      result.totalDurationMinutes += meta.duration_minutes || 0;

      // 도구 사용 횟수 집계
      if (meta.tool_counts) {
        for (const [tool, count] of Object.entries(meta.tool_counts)) {
          result.toolCounts[tool] = (result.toolCounts[tool] || 0) + count;
        }
      }

      // 언어 사용 집계
      if (meta.languages) {
        for (const [lang, count] of Object.entries(meta.languages)) {
          result.languages[lang] = (result.languages[lang] || 0) + count;
        }
      }
    } catch {
      // 파싱 실패 스킵
    }
  }

  return result;
}
