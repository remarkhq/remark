import { describe, expect, test } from "vitest";
import {
  buildPageIdentifier,
  normalizePathname,
  sanitizeIssueTitle,
} from "../src/index";

describe("shared helpers", () => {
  test("normalizes pathname", () => {
    expect(normalizePathname("https://x.dev/docs/page/?foo=1")).toBe(
      "/docs/page",
    );
  });

  test("sanitizes issue title", () => {
    expect(sanitizeIssueTitle("Hello\nWorld")).toBe("Hello World");
  });

  test("builds custom page identifier", () => {
    expect(buildPageIdentifier("custom", { custom: "abc" })).toBe("abc");
  });
});
