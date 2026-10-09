import { describe, expect, test } from "vitest";
import { pickTheme } from "../src/index";

describe("ui", () => {
  test("auto resolves from preference", () => {
    expect(pickTheme("auto", true)).toBe("dark");
  });
});
