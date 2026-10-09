import { describe, expect, test } from "vitest";
import { githubIssueFixture } from "../src/index";

describe("fixtures", () => {
  test("returns issue fixture", () => {
    expect(githubIssueFixture().number).toBe(1);
  });
});
