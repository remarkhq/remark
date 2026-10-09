import crypto from "node:crypto";
import sanitizeHtml from "sanitize-html";

export type OAuthStateRecord = {
  state: string;
  expiresAt: number;
  used: boolean;
};

export class OAuthStateStore {
  private readonly store = new Map<string, OAuthStateRecord>();

  public create(ttlMs: number): string {
    const state = crypto.randomBytes(24).toString("hex");
    this.store.set(state, {
      state,
      expiresAt: Date.now() + ttlMs,
      used: false,
    });
    return state;
  }

  public validateAndUse(state: string): boolean {
    const record = this.store.get(state);
    if (!record || record.used || record.expiresAt < Date.now()) {
      return false;
    }
    record.used = true;
    return true;
  }
}

export type SessionData = {
  id: string;
  userId: number;
  login: string;
  avatarUrl: string;
  accessToken: string;
  csrfToken: string;
  expiresAt: number;
};

export class SessionStore {
  private readonly sessions = new Map<string, SessionData>();

  public create(
    input: Omit<SessionData, "id" | "csrfToken" | "expiresAt"> & {
      ttlMs: number;
    },
  ): SessionData {
    const id = crypto.randomBytes(24).toString("hex");
    const csrfToken = crypto.randomBytes(24).toString("hex");
    const session: SessionData = {
      id,
      csrfToken,
      userId: input.userId,
      login: input.login,
      avatarUrl: input.avatarUrl,
      accessToken: input.accessToken,
      expiresAt: Date.now() + input.ttlMs,
    };
    this.sessions.set(id, session);
    return session;
  }

  public get(id: string): SessionData | undefined {
    const session = this.sessions.get(id);
    if (!session || session.expiresAt < Date.now()) {
      if (session) this.sessions.delete(id);
      return undefined;
    }
    return session;
  }

  public destroy(id: string): void {
    this.sessions.delete(id);
  }
}

export const assertCsrf = (
  sessionToken: string,
  headerToken: string,
): boolean =>
  Boolean(sessionToken && headerToken && sessionToken === headerToken);

export const sanitizeMarkdownInput = (input: string): string =>
  sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

export const redactSecret = (input: string): string =>
  input.replace(/(token|secret|password)=([^\s]+)/gi, "$1=[REDACTED]");
