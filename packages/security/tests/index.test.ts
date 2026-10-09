import { describe, expect, test } from "vitest";
import {
  OAuthStateStore,
  SessionStore,
  assertCsrf,
  redactSecret,
  sanitizeMarkdownInput,
} from "../src/index";

describe("security", () => {
  test("oauth state single use", () => {
    const store = new OAuthStateStore();
    const state = store.create(1000);
    expect(store.validateAndUse(state)).toBe(true);
    expect(store.validateAndUse(state)).toBe(false);
  });

  test("csrf assertion", () => {
    expect(assertCsrf("a", "a")).toBe(true);
    expect(assertCsrf("a", "b")).toBe(false);
  });

  test("sanitize markdown input", () => {
    expect(sanitizeMarkdownInput("<script>alert(1)</script>safe")).toBe("safe");
  });

  test("redacts secrets", () => {
    expect(redactSecret("token=abc")).toContain("[REDACTED]");
  });

  test("session expires", () => {
    const store = new SessionStore();
    const session = store.create({
      userId: 1,
      login: "x",
      avatarUrl: "",
      accessToken: "a",
      ttlMs: 1,
    });
    expect(store.get(session.id)?.login).toBe("x");
  });
});
