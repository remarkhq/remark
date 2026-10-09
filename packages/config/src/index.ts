import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  PUBLIC_APP_URL: z.string().url(),
  PUBLIC_WIDGET_URL: z.string().url(),
  PUBLIC_DOCS_URL: z.string().url(),
  GITHUB_OAUTH_CLIENT_ID: z.string().min(1),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().min(1),
  GITHUB_OAUTH_CALLBACK_URL: z.string().url(),
  REMARK_BOT_USERNAME: z.string().min(1),
  REMARK_BOT_TOKEN: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  GITHUB_ALLOWED_REPOSITORIES: z.string().min(1),
  GITHUB_DEFAULT_ISSUE_LABEL: z.string().default("remark"),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(60),
});

export type RemarkEnv = z.infer<typeof envSchema>;

export const readEnv = (env: NodeJS.ProcessEnv): RemarkEnv => {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map(
      (issue) => `- ${issue.path.join(".")}`,
    );
    throw new Error(
      `Missing required environment variables:\n${missing.join("\n")}`,
    );
  }
  return parsed.data;
};

export const parseAllowedRepositories = (raw: string): Set<string> =>
  new Set(
    raw
      .split(",")
      .map((repo) => repo.trim())
      .filter(Boolean),
  );
