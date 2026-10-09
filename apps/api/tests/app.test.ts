import request from "supertest";
import { describe, expect, test } from "vitest";
import { createApp } from "../src/app";

const env = {
  NODE_ENV: "test",
  PORT: 3000,
  PUBLIC_APP_URL: "http://localhost:3000",
  PUBLIC_WIDGET_URL: "http://localhost:3000/widget.js",
  PUBLIC_DOCS_URL: "http://localhost:5173",
  GITHUB_OAUTH_CLIENT_ID: "id",
  GITHUB_OAUTH_CLIENT_SECRET: "secret",
  GITHUB_OAUTH_CALLBACK_URL: "http://localhost:3000/auth/github/callback",
  REMARK_BOT_USERNAME: "remark-bot",
  REMARK_BOT_TOKEN: "token",
  SESSION_SECRET: "a-very-long-secret-value",
  GITHUB_ALLOWED_REPOSITORIES: "owner/repo",
  GITHUB_DEFAULT_ISSUE_LABEL: "remark",
  RATE_LIMIT_WINDOW_SECONDS: 60,
  RATE_LIMIT_MAX_REQUESTS: 100,
};

const fetchMock: typeof fetch = async (input, init) => {
  const url = String(input);

  if (url.includes("/repos/owner/repo") && !url.includes("/issues")) {
    return new Response(JSON.stringify({ private: false, has_issues: true }), {
      status: 200,
    });
  }
  if (url.includes("/search/issues")) {
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  }
  if (url.includes("/repos/owner/repo/issues") && init?.method === "POST") {
    if (url.includes("/comments")) {
      return new Response(
        JSON.stringify({
          id: 1,
          body: "test",
          created_at: new Date().toISOString(),
          user: {
            login: "octocat",
            avatar_url: "https://example.com/x.png",
            html_url: "https://github.com/octocat",
          },
        }),
        { status: 201 },
      );
    }

    if (url.includes("/reactions")) {
      return new Response(JSON.stringify({}), { status: 201 });
    }

    return new Response(
      JSON.stringify({
        number: 12,
        title: "Discussion: /",
        body: "",
        locked: false,
        state: "open",
        comments: 0,
        html_url: "https://github.com/owner/repo/issues/12",
      }),
      { status: 201 },
    );
  }
  if (url.includes("/comments?")) {
    return new Response(JSON.stringify([]), { status: 200 });
  }
  if (url.includes("github.com/login/oauth/access_token")) {
    return new Response(JSON.stringify({ access_token: "user-token" }), {
      status: 200,
    });
  }
  if (url.endsWith("/user")) {
    return new Response(
      JSON.stringify({
        id: 1,
        login: "octocat",
        avatar_url: "https://example.com/avatar.png",
      }),
      { status: 200 },
    );
  }
  return new Response(JSON.stringify({ message: "not found" }), {
    status: 404,
  });
};

describe("remark api", () => {
  test("health endpoint", async () => {
    const app = createApp({ env, fetchImpl: fetchMock });
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  test("creates discussion if missing", async () => {
    const app = createApp({ env, fetchImpl: fetchMock });
    const response = await request(app).get("/api/discussion").query({
      repository: "owner/repo",
      issueTerm: "pathname",
      pathname: "/docs/hello",
    });
    expect(response.status).toBe(200);
    expect(response.body.issue.number).toBe(12);
  });

  test("oauth callback creates session", async () => {
    const app = createApp({ env, fetchImpl: fetchMock });
    const login = await request(app).get("/auth/github/login");
    const state = new URL(login.body.url).searchParams.get("state");
    const callback = await request(app)
      .get("/auth/github/callback")
      .query({ state, code: "abc" });
    expect(callback.status).toBe(200);
    expect(callback.body.authenticated).toBe(true);
    expect(callback.headers["set-cookie"]).toBeTruthy();
  });
});
