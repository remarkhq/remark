import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { GitHubClient } from "@remark/client";
import {
  parseAllowedRepositories,
  readEnv,
  type RemarkEnv,
} from "@remark/config";
import {
  OAuthStateStore,
  SessionStore,
  assertCsrf,
  sanitizeMarkdownInput,
} from "@remark/security";
import {
  AppError,
  REPOSITORY_PATTERN,
  buildPageIdentifier,
  sanitizeIssueTitle,
} from "@remark/shared";
import type { DiscussionRequest } from "./types.js";

const SESSION_COOKIE = "remark_session";
const OAUTH_STATE_TTL = 10 * 60 * 1000;
const SESSION_TTL = 24 * 60 * 60 * 1000;

export type AppDeps = {
  env: RemarkEnv;
  fetchImpl?: typeof fetch;
  stateStore?: OAuthStateStore;
  sessionStore?: SessionStore;
};

const parseRepository = (
  repository: string,
): { owner: string; repo: string } => {
  if (!REPOSITORY_PATTERN.test(repository)) {
    throw new AppError(
      "INVALID_REPOSITORY",
      "Repository must match owner/repository format",
      400,
    );
  }
  const [owner, repo] = repository.split("/");
  return { owner, repo };
};

export const createApp = (deps?: Partial<AppDeps>) => {
  const env = deps?.env ?? readEnv(process.env);
  const allowedRepositories = parseAllowedRepositories(
    env.GITHUB_ALLOWED_REPOSITORIES,
  );
  const stateStore = deps?.stateStore ?? new OAuthStateStore();
  const sessionStore = deps?.sessionStore ?? new SessionStore();
  const botClient = new GitHubClient(
    env.REMARK_BOT_TOKEN,
    deps?.fetchImpl ?? fetch,
  );

  const app = express();
  app.disable("x-powered-by");
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_SECONDS * 1000,
      limit: env.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  const readSession = (req: Request) => {
    const id = req.cookies[SESSION_COOKIE] as string | undefined;
    if (!id) return undefined;
    return sessionStore.get(id);
  };

  const setSessionCookie = (res: Response, id: string) => {
    res.cookie(SESSION_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      maxAge: SESSION_TTL,
    });
  };

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "remark-api" });
  });

  app.get("/auth/github/login", (req, res) => {
    const redirectTo = String(req.query.redirect ?? "/");
    const state = stateStore.create(OAUTH_STATE_TTL);
    const params = new URLSearchParams({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      redirect_uri: env.GITHUB_OAUTH_CALLBACK_URL,
      state,
      scope: "public_repo read:user user:email",
    });
    const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.json({ url, redirectTo });
  });

  app.get("/auth/github/callback", async (req, res, next) => {
    try {
      const code = String(req.query.code ?? "");
      const state = String(req.query.state ?? "");
      if (!code || !state || !stateStore.validateAndUse(state)) {
        throw new AppError(
          "UNAUTHORIZED",
          "Invalid or expired OAuth state",
          401,
        );
      }

      const tokenResponse = await (deps?.fetchImpl ?? fetch)(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: env.GITHUB_OAUTH_CLIENT_ID,
            client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
            code,
            redirect_uri: env.GITHUB_OAUTH_CALLBACK_URL,
            state,
          }),
        },
      );

      if (!tokenResponse.ok) {
        throw new AppError(
          "GITHUB_UNAVAILABLE",
          "OAuth token exchange failed",
          502,
        );
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token?: string;
        error?: string;
      };
      if (!tokenData.access_token) {
        throw new AppError(
          "UNAUTHORIZED",
          `OAuth denied: ${tokenData.error ?? "unknown"}`,
          401,
        );
      }

      const userResponse = await (deps?.fetchImpl ?? fetch)(
        "https://api.github.com/user",
        {
          headers: {
            Authorization: "token " + tokenData.access_token,
            Accept: "application/vnd.github+json",
            "User-Agent": "remark-auth",
          },
        },
      );
      if (!userResponse.ok)
        throw new AppError(
          "GITHUB_UNAVAILABLE",
          "Unable to read GitHub profile",
          502,
        );
      const user = (await userResponse.json()) as {
        id: number;
        login: string;
        avatar_url: string;
      };

      const session = sessionStore.create({
        userId: user.id,
        login: user.login,
        avatarUrl: user.avatar_url,
        accessToken: tokenData.access_token,
        ttlMs: SESSION_TTL,
      });
      setSessionCookie(res, session.id);
      res.json({
        authenticated: true,
        user: { login: user.login, avatarUrl: user.avatar_url },
        csrfToken: session.csrfToken,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/logout", (req, res) => {
    const id = req.cookies[SESSION_COOKIE] as string | undefined;
    if (id) sessionStore.destroy(id);
    res.clearCookie(SESSION_COOKIE);
    res.json({ ok: true });
  });

  app.get("/api/session", (req, res) => {
    const session = readSession(req);
    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      user: { login: session.login, avatarUrl: session.avatarUrl },
      csrfToken: session.csrfToken,
    });
  });

  app.get("/api/discussion", async (req, res, next) => {
    try {
      const query = req.query as unknown as DiscussionRequest;
      const repository = String(query.repository ?? "");
      const issueTerm = (query.issueTerm ??
        "pathname") as DiscussionRequest["issueTerm"];
      const issueLabel = String(
        query.issueLabel ?? env.GITHUB_DEFAULT_ISSUE_LABEL,
      );

      if (!allowedRepositories.has(repository)) {
        throw new AppError(
          "UNAUTHORIZED",
          "Repository is not in allow list",
          403,
        );
      }

      const { owner, repo } = parseRepository(repository);
      const identifier = buildPageIdentifier(issueTerm, {
        pathname: query.pathname,
        url: query.url,
        title: query.title,
        ogTitle: query.ogTitle,
        custom: query.custom,
      });

      const repoMeta = await botClient.getRepo(owner, repo);
      if (!repoMeta.has_issues) {
        throw new AppError(
          "ISSUES_DISABLED",
          "Repository has issues disabled",
          400,
        );
      }

      let issue = await botClient.searchIssue(
        owner,
        repo,
        identifier,
        issueLabel,
      );
      if (!issue) {
        const title = sanitizeIssueTitle(`Discussion: ${identifier}`);
        issue = await botClient.createIssue(
          owner,
          repo,
          title,
          `This issue was created by ${env.REMARK_BOT_USERNAME} for page identifier: ${identifier}`,
          issueLabel,
        );
      }
      const comments = await botClient.listComments(owner, repo, issue.number);
      res.json({ issue, comments, identifier });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/discussion/:issueNumber/comments", async (req, res, next) => {
    try {
      const session = readSession(req);
      if (!session)
        throw new AppError(
          "AUTHENTICATION_REQUIRED",
          "You must sign in with GitHub",
          401,
        );
      const headerToken = String(req.headers["x-csrf-token"] ?? "");
      if (!assertCsrf(session.csrfToken, headerToken))
        throw new AppError("UNAUTHORIZED", "CSRF validation failed", 403);

      const repository = String(req.body.repository ?? "");
      const issueNumber = Number(req.params.issueNumber);
      const content = sanitizeMarkdownInput(String(req.body.body ?? ""));
      if (!content)
        throw new AppError("INVALID_COMMENT", "Comment cannot be empty", 400);
      if (content.length > 4000)
        throw new AppError("INVALID_COMMENT", "Comment is too long", 400);
      if (!allowedRepositories.has(repository))
        throw new AppError("UNAUTHORIZED", "Repository is not allowed", 403);

      const { owner, repo } = parseRepository(repository);
      const userClient = new GitHubClient(
        session.accessToken,
        deps?.fetchImpl ?? fetch,
      );
      const comment = await userClient.createComment(
        owner,
        repo,
        issueNumber,
        content,
      );
      res.status(201).json({ comment, attribution: session.login });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/discussion/:issueNumber/reactions", async (req, res, next) => {
    try {
      const session = readSession(req);
      if (!session)
        throw new AppError(
          "AUTHENTICATION_REQUIRED",
          "You must sign in with GitHub",
          401,
        );
      const headerToken = String(req.headers["x-csrf-token"] ?? "");
      if (!assertCsrf(session.csrfToken, headerToken))
        throw new AppError("UNAUTHORIZED", "CSRF validation failed", 403);
      const repository = String(req.body.repository ?? "");
      const issueNumber = Number(req.params.issueNumber);
      if (!allowedRepositories.has(repository))
        throw new AppError("UNAUTHORIZED", "Repository is not allowed", 403);
      const { owner, repo } = parseRepository(repository);
      const userClient = new GitHubClient(
        session.accessToken,
        deps?.fetchImpl ?? fetch,
      );
      await userClient.addReaction(owner, repo, issueNumber, "+1");
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: unknown) => {
    if (error instanceof AppError) {
      res
        .status(error.status)
        .json({ code: error.code, message: error.message });
      return;
    }
    res
      .status(500)
      .json({ code: "GITHUB_UNAVAILABLE", message: "Unexpected server error" });
  });

  return app;
};
