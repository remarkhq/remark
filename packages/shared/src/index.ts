export type IssueTerm = "pathname" | "url" | "title" | "og:title" | "custom";
export type Theme = "light" | "dark" | "auto";

export type RemarkConfig = {
  repository: string;
  issueTerm?: IssueTerm;
  issueLabel?: string;
  issueTitle?: string;
  pageIdentifier?: string;
  theme?: Theme;
  language?: string;
  reactions?: boolean;
  loginRequired?: boolean;
  apiBaseUrl: string;
};

export const APP_ERROR_CODES = [
  "AUTHENTICATION_REQUIRED",
  "INVALID_REPOSITORY",
  "REPOSITORY_NOT_FOUND",
  "ISSUES_DISABLED",
  "DISCUSSION_NOT_FOUND",
  "DISCUSSION_LOCKED",
  "RATE_LIMITED",
  "GITHUB_UNAVAILABLE",
  "INVALID_COMMENT",
  "UNAUTHORIZED",
  "CONFIGURATION_ERROR",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly status: number;

  public constructor(code: AppErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const normalizePathname = (input: string): string => {
  try {
    const url = new URL(input, "https://remark.local");
    return url.pathname.replace(/\/+$/, "") || "/";
  } catch {
    const trimmed = input.trim();
    const hashIndex = trimmed.indexOf("#");
    const queryIndex = trimmed.indexOf("?");
    const boundaryCandidates = [hashIndex, queryIndex].filter(
      (value) => value >= 0,
    );
    const boundary = boundaryCandidates.length
      ? Math.min(...boundaryCandidates)
      : trimmed.length;
    const clean = trimmed.slice(0, boundary);
    return clean.startsWith("/") ? clean : `/${clean}`;
  }
};

export const normalizeUrl = (input: string): string => {
  const url = new URL(input);
  url.hash = "";
  url.searchParams.sort();
  return url.toString();
};

export const sanitizeIssueTitle = (input: string, max = 120): string =>
  input
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export const buildPageIdentifier = (
  term: IssueTerm,
  value: {
    pathname?: string;
    url?: string;
    title?: string;
    ogTitle?: string;
    custom?: string;
  },
): string => {
  switch (term) {
    case "pathname":
      return normalizePathname(value.pathname ?? "/");
    case "url":
      return normalizeUrl(value.url ?? "https://example.invalid/");
    case "title":
      return sanitizeIssueTitle(value.title ?? "Untitled page");
    case "og:title":
      return sanitizeIssueTitle(
        value.ogTitle ?? value.title ?? "Untitled page",
      );
    case "custom":
      return sanitizeIssueTitle(value.custom ?? "custom");
    default:
      return "/";
  }
};
