/**
 * GitHub REST API (user repositories). Used for connector import into project links.
 */
export type GithubRepo = {
  name: string;
  html_url: string;
  description: string | null;
  default_branch: string;
};

export async function fetchUserRepos(token: string): Promise<GithubRepo[]> {
  const response = await fetch("https://api.github.com/user/repos?per_page=50&sort=updated&affiliation=owner", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "m.OS-personal-llm-os/0.1"
    }
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`GitHub API error ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await response.json()) as Array<{
    name: string;
    html_url: string;
    description: string | null;
    default_branch: string;
  }>;
  return data.map((r) => ({
    name: r.name,
    html_url: r.html_url,
    description: r.description,
    default_branch: r.default_branch
  }));
}
