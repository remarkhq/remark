import { AppError } from "@remark/shared";

export type GitHubFetch = typeof fetch;

export type GitHubIssue = {
  number: number;
  title: string;
  body: string;
  locked: boolean;
  state: "open" | "closed";
  comments: number;
  html_url: string;
};

export type GitHubComment = {
  id: number;
  body: string;
  created_at: string;
  user: { login: string; avatar_url: string; html_url: string };
  reactions?: Record<string, number>;
};

const toHeaders = (token: string) => ({
  Authorization: "token " + token,
  Accept: "application/vnd.github+json",
  "User-Agent": "remark-bot",
});

const mapError = (status: number): AppError => {
  if (status === 401)
    return new AppError("UNAUTHORIZED", "Unauthorized GitHub request", 401);
  if (status === 403)
    return new AppError("RATE_LIMITED", "GitHub rate limit reached", 429);
  if (status === 404)
    return new AppError("REPOSITORY_NOT_FOUND", "Repository not found", 404);
  if (status === 410)
    return new AppError(
      "ISSUES_DISABLED",
      "Issues are disabled for this repository",
      400,
    );
  return new AppError("GITHUB_UNAVAILABLE", "GitHub API unavailable", 502);
};

export class GitHubClient {
  public constructor(
    private readonly token: string,
    private readonly githubFetch: GitHubFetch = fetch,
    private readonly apiBase = "https://api.github.com",
  ) {}

  public async getRepo(
    owner: string,
    repo: string,
  ): Promise<{ private: boolean; has_issues: boolean }> {
    const response = await this.githubFetch(
      `${this.apiBase}/repos/${owner}/${repo}`,
      {
        headers: toHeaders(this.token),
      },
    );
    if (!response.ok) throw mapError(response.status);
    return response.json();
  }

  public async searchIssue(
    owner: string,
    repo: string,
    identifier: string,
    label: string,
  ): Promise<GitHubIssue | null> {
    const q = encodeURIComponent(
      `repo:${owner}/${repo} in:title \"${identifier}\" label:${label}`,
    );
    const response = await this.githubFetch(
      `${this.apiBase}/search/issues?q=${q}&per_page=1`,
      {
        headers: toHeaders(this.token),
      },
    );
    if (!response.ok) throw mapError(response.status);
    const data = (await response.json()) as { items: GitHubIssue[] };
    return data.items[0] ?? null;
  }

  public async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    label: string,
  ): Promise<GitHubIssue> {
    const response = await this.githubFetch(
      `${this.apiBase}/repos/${owner}/${repo}/issues`,
      {
        method: "POST",
        headers: {
          ...toHeaders(this.token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, body, labels: [label] }),
      },
    );
    if (!response.ok) throw mapError(response.status);
    return response.json();
  }

  public async listComments(
    owner: string,
    repo: string,
    issueNumber: number,
    page = 1,
  ): Promise<GitHubComment[]> {
    const response = await this.githubFetch(
      `${this.apiBase}/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=30&page=${page}`,
      { headers: toHeaders(this.token) },
    );
    if (!response.ok) throw mapError(response.status);
    return response.json();
  }

  public async createComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
  ): Promise<GitHubComment> {
    const response = await this.githubFetch(
      `${this.apiBase}/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: "POST",
        headers: {
          ...toHeaders(this.token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
      },
    );
    if (!response.ok) throw mapError(response.status);
    return response.json();
  }

  public async addReaction(
    owner: string,
    repo: string,
    issueNumber: number,
    content: "+1",
  ): Promise<void> {
    const response = await this.githubFetch(
      `${this.apiBase}/repos/${owner}/${repo}/issues/${issueNumber}/reactions`,
      {
        method: "POST",
        headers: {
          ...toHeaders(this.token),
          Accept: "application/vnd.github.squirrel-girl-preview+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      },
    );
    if (!response.ok) throw mapError(response.status);
  }
}
