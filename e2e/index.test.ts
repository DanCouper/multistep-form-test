import { expect, test } from "vitest";
import { page } from "vitest/browser";

test("loads the application shell", async () => {
  await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Aalreet");
});
