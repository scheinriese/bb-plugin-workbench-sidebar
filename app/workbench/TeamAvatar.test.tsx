// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { TeamAvatar } from "./TeamAvatar.js";
import { teamFixture } from "./team-fixtures.js";
afterEach(cleanup);
it("keeps Iris's identity during a declared wait instead of using a nonexistent waiting asset", () => {
  const member = teamFixture().team.members[0]!;
  const { container } = render(
    <TeamAvatar member={member} visualState="waiting" />,
  );
  expect(
    container
      .querySelector('.wb-avatar-dark path[fill^="url("]')
      ?.getAttribute("fill"),
  ).toMatch(/-gI\)$/);
  expect(
    container.querySelector('[aria-label="Iris, waiting"]'),
  ).not.toBeNull();
});
it("renders object-shaped chief metadata using the bundled Nora asset, never raw metadata as SVG", () => {
  const member = {
    ...teamFixture().team.lead!,
    name: "Chief",
    avatar: { initials: "<script>", color: "url(invalid)" },
  };
  const { container } = render(
    <TeamAvatar member={member} visualState="idle" />,
  );
  expect(
    container
      .querySelector('.wb-avatar-dark path[fill^="url("]')
      ?.getAttribute("fill"),
  ).toMatch(/-gN\)$/);
  expect(container.querySelector("script")).toBeNull();
  expect(container.innerHTML).not.toContain("url(invalid)");
});
