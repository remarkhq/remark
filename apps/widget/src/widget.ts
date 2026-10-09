import { type IssueTerm, type Theme } from "@remark/shared";
import { pickTheme } from "@remark/ui";

type WidgetConfig = {
  repository: string;
  issueTerm: IssueTerm;
  apiBaseUrl: string;
  theme: Theme;
  reactions: boolean;
};

type SessionResponse = {
  authenticated: boolean;
  user?: { login: string; avatarUrl: string };
  csrfToken?: string;
};

type DiscussionResponse = {
  issue: {
    number: number;
    title: string;
    html_url: string;
    locked: boolean;
    comments: number;
  };
  comments: Array<{
    id: number;
    body: string;
    created_at: string;
    user: { login: string; avatar_url: string; html_url: string };
    reactions?: Record<string, number>;
  }>;
};

const readDataset = (): WidgetConfig => {
  if (typeof document === "undefined") {
    return {
      repository: "",
      issueTerm: "pathname",
      apiBaseUrl: "http://localhost:3000",
      theme: "auto",
      reactions: true,
    };
  }
  const script = document.currentScript as HTMLScriptElement | null;
  const dataset = script?.dataset;
  return {
    repository: dataset?.repository ?? "",
    issueTerm: (dataset?.issueTerm as IssueTerm) ?? "pathname",
    apiBaseUrl: dataset?.apiBaseUrl ?? "http://localhost:3000",
    theme: (dataset?.theme as Theme) ?? "auto",
    reactions: dataset?.reactions !== "false",
  };
};

const escapeHtml = (input: string): string =>
  input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderError = (root: HTMLElement, message: string): void => {
  root.innerHTML = `<section role="status" aria-live="polite"><p>Unable to load discussion.</p><pre>${escapeHtml(message)}</pre></section>`;
};

const installStyles = (root: HTMLElement, theme: "light" | "dark") => {
  const style = document.createElement("style");
  style.textContent = `
    :host, .remark-root { font-family: ui-sans-serif, system-ui, sans-serif; }
    .remark-root { border: 1px solid ${theme === "dark" ? "#30363d" : "#d0d7de"}; border-radius: 10px; padding: 16px; background: ${theme === "dark" ? "#0d1117" : "#fff"}; color: ${theme === "dark" ? "#f0f6fc" : "#1f2328"}; }
    .remark-actions { display: flex; justify-content: space-between; gap: 8px; align-items: center; flex-wrap: wrap; }
    .remark-list { list-style: none; margin: 16px 0; padding: 0; display: grid; gap: 12px; }
    .remark-comment { border: 1px solid ${theme === "dark" ? "#30363d" : "#d8dee4"}; border-radius: 8px; padding: 10px; }
    .remark-meta { display: flex; gap: 8px; align-items: center; font-size: 12px; opacity: 0.85; }
    .remark-avatar { width: 24px; height: 24px; border-radius: 50%; }
    .remark-form textarea { width: 100%; min-height: 96px; margin-top: 8px; margin-bottom: 8px; }
    button { border: 1px solid ${theme === "dark" ? "#30363d" : "#d0d7de"}; background: transparent; color: inherit; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
    button:focus-visible, textarea:focus-visible { outline: 2px solid #2f81f7; outline-offset: 2px; }
    @media (max-width: 640px) { .remark-root { padding: 12px; } }
  `;
  root.append(style);
};

const getRoot = (): HTMLElement => {
  const host = document.getElementById("remark-comments") ?? document.body;
  const root = document.createElement("div");
  root.className = "remark-root";
  host.append(root);
  return root;
};

const start = async (): Promise<void> => {
  const config = readDataset();
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedTheme = pickTheme(config.theme, prefersDark);

  const root = getRoot();
  installStyles(root, resolvedTheme);
  root.innerHTML =
    '<p role="status" aria-live="polite">Loading discussion…</p>';

  const query = new URLSearchParams({
    repository: config.repository,
    issueTerm: config.issueTerm,
    pathname: window.location.pathname,
    url: window.location.href,
    title: document.title,
  });

  try {
    const [discussionResponse, sessionResponse] = await Promise.all([
      fetch(`${config.apiBaseUrl}/api/discussion?${query.toString()}`, {
        credentials: "include",
      }),
      fetch(`${config.apiBaseUrl}/api/session`, { credentials: "include" }),
    ]);

    if (!discussionResponse.ok) {
      const error = await discussionResponse.json();
      renderError(root, error.message ?? "Unknown error");
      return;
    }

    const discussion = (await discussionResponse.json()) as DiscussionResponse;
    const session = (await sessionResponse.json()) as SessionResponse;

    root.innerHTML = `
      <h2>Remark Discussion (${discussion.issue.comments})</h2>
      <div class="remark-actions">
        <span>Issue #${discussion.issue.number}</span>
        <div>
          ${session.authenticated ? `<span>Signed in as <strong>${escapeHtml(session.user?.login ?? "")}</strong></span><button id="remark-signout" type="button">Sign out</button>` : `<button id="remark-signin" type="button">Sign in with GitHub</button>`}
        </div>
      </div>
      <ul class="remark-list" aria-label="Comments list"></ul>
      <form class="remark-form" aria-label="Write a comment">
        <label for="remark-body">Comment</label>
        <textarea id="remark-body" name="body" maxlength="4000" placeholder="Share your thoughts"></textarea>
        <button type="submit">Post comment</button>
      </form>
    `;

    const commentList = root.querySelector(".remark-list") as HTMLUListElement;
    if (!discussion.comments.length) {
      const empty = document.createElement("li");
      empty.textContent = "No comments yet. Start the conversation.";
      commentList.append(empty);
    }

    for (const comment of discussion.comments) {
      const item = document.createElement("li");
      item.className = "remark-comment";
      item.innerHTML = `
        <div class="remark-meta">
          <img class="remark-avatar" src="${escapeHtml(comment.user.avatar_url)}" alt="${escapeHtml(comment.user.login)} avatar" loading="lazy" />
          <a href="${escapeHtml(comment.user.html_url)}" rel="noopener noreferrer" target="_blank">${escapeHtml(comment.user.login)}</a>
          <time datetime="${comment.created_at}">${new Date(comment.created_at).toLocaleString()}</time>
        </div>
        <p>${escapeHtml(comment.body)}</p>
      `;
      commentList.append(item);
    }

    const signIn = root.querySelector(
      "#remark-signin",
    ) as HTMLButtonElement | null;
    if (signIn) {
      signIn.addEventListener("click", async () => {
        const loginResponse = await fetch(
          `${config.apiBaseUrl}/auth/github/login?redirect=${encodeURIComponent(window.location.href)}`,
          { credentials: "include" },
        );
        const data = (await loginResponse.json()) as { url: string };
        window.location.assign(data.url);
      });
    }

    const signOut = root.querySelector(
      "#remark-signout",
    ) as HTMLButtonElement | null;
    if (signOut) {
      signOut.addEventListener("click", async () => {
        await fetch(`${config.apiBaseUrl}/auth/logout`, {
          method: "POST",
          credentials: "include",
          headers: session.csrfToken
            ? {
                "X-CSRF-Token": session.csrfToken,
              }
            : undefined,
        });
        window.location.reload();
      });
    }

    const form = root.querySelector(".remark-form") as HTMLFormElement;
    const textarea = root.querySelector("#remark-body") as HTMLTextAreaElement;
    if (!session.authenticated) {
      textarea.disabled = true;
      form.querySelector("button")?.setAttribute("disabled", "true");
      textarea.placeholder = "Sign in with GitHub to comment.";
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (
        !session.authenticated ||
        !session.csrfToken ||
        !textarea.value.trim()
      )
        return;
      const response = await fetch(
        `${config.apiBaseUrl}/api/discussion/${discussion.issue.number}/comments`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": session.csrfToken,
          },
          body: JSON.stringify({
            repository: config.repository,
            body: textarea.value,
          }),
        },
      );
      if (!response.ok) {
        const err = await response.json();
        renderError(root, err.message ?? "Failed to post comment");
        return;
      }
      window.location.reload();
    });
  } catch (error) {
    renderError(root, error instanceof Error ? error.message : "Unknown error");
  }
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void start();
}

export { escapeHtml, readDataset };
