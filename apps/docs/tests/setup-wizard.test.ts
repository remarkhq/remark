import { describe, expect, test } from "vitest";
import { generateSnippet } from "../src/setup-wizard";

describe("docs setup snippet", () => {
  test("includes repository and api url", () => {
    const snippet = generateSnippet({
      repository: "owner/repo",
      issueTerm: "pathname",
      theme: "auto",
      reactions: "true",
      apiBaseUrl: "https://api.example",
    });
    expect(snippet).toContain("owner/repo");
    expect(snippet).toContain('data-api-base-url="https://api.example"');
  });
});
