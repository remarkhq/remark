import { describe, expect, test } from "vitest";
import { escapeHtml } from "../src/widget";

describe("widget helpers", () => {
  test("escapes html", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });
});
