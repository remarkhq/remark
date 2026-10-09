import { describe, expect, test } from "vitest";
import { parseAllowedRepositories, readEnv } from "../src/index";

describe("config", () => {
  test("parses allowed repositories", () => {
    const parsed = parseAllowedRepositories("a/b, c/d");
    expect(parsed.has("a/b")).toBe(true);
    expect(parsed.has("c/d")).toBe(true);
  });

  test("throws on missing env", () => {
    expect(() => readEnv({})).toThrow("Missing required environment variables");
  });
});
