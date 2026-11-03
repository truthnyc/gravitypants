import { expect, it } from "vitest";
import { badgeSnippet, bioLine } from "@/lib/directory/badge";

it("badge snippet is a plain link with the brand slug and no nofollow or tracking", () => {
  expect(badgeSnippet("purl-soho", "light")).toBe('<a href="https://aimante.co/b/purl-soho"><img src="https://aimante.co/badge/light.svg" alt="As seen on Aimanté" width="160" height="40"></a>');
});
it("bio line uses the brand page", () => {
  expect(bioLine("purl-soho")).toBe("Featured on Aimanté, the directory for discovering brands by mood: https://aimante.co/b/purl-soho");
});
