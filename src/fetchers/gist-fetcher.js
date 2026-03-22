/**
 * GitHub Gist에서 사용자 AI 설정(ai-stat.json)을 가져온다.
 *
 * 방법 1: gist_id 직접 지정
 * 방법 2: username으로 public gist 검색 (파일명 ai-stat.json)
 */
export async function fetchGistConfig(options = {}) {
  const { gist_id, username, token } = options;

  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "github-ai-stat",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // 방법 1: gist_id 직접
  if (gist_id) {
    const res = await fetch(`https://api.github.com/gists/${gist_id}`, { headers });
    if (!res.ok) throw new Error(`Gist not found: ${gist_id}`);
    const gist = await res.json();
    return parseGistConfig(gist);
  }

  // 방법 2: username으로 검색
  if (username) {
    const res = await fetch(`https://api.github.com/users/${username}/gists?per_page=100`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch gists for user: ${username}`);
    const gists = await res.json();

    for (const gist of gists) {
      if (gist.files["ai-stat.json"]) {
        return parseGistConfig(gist);
      }
    }

    return null; // 설정 없음
  }

  throw new Error("Either gist_id or username is required");
}

function parseGistConfig(gist) {
  const file = gist.files["ai-stat.json"];
  if (!file) throw new Error("ai-stat.json not found in gist");

  try {
    return JSON.parse(file.content);
  } catch {
    throw new Error("Invalid JSON in ai-stat.json");
  }
}
