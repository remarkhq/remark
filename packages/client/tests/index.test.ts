import { describe, expect, test } from "vitest";
import { AppError } from "@remark/shared";
import { GitHubClient } from "../src/index";

describe("github client", () => {
  test("maps github errors", async () => {
    const client = new GitHubClient(
      "token",
      async () =>
        new Response(JSON.stringify({}), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
    );

    await expect(client.getRepo("a", "b")).rejects.toBeInstanceOf(AppError);
  });
});
