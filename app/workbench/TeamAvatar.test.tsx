// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { installTestPluginRuntime } from "@get-bb/plugin-sdk/testing/app";
installTestPluginRuntime();
import { TeamArtworkContext } from "./TeamArtwork.js";
import { TeamAvatarArt, avatarIdentity } from "./TeamAvatarArt.js";
import { teamFixture } from "./team-fixtures.js";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("uses kind, not fixture names, and generates a stable generic specialist", () => {
  const member = teamFixture().team.members[0]!;
  expect(avatarIdentity(member)).toBe("generic");
  const { container, rerender } = render(
    <TeamAvatarArt member={member} visualState="waiting" />,
  );
  const shape = container.querySelector(".wb-generated-face svg")?.innerHTML;
  rerender(
    <TeamAvatarArt
      member={{ ...member, name: "A different name" }}
      visualState="waiting"
    />,
  );
  expect(container.querySelector(".wb-generated-face svg")?.innerHTML).toBe(
    shape,
  );
  expect(container.querySelector('[data-identity="generic"]')).not.toBeNull();
});
it("uses the chief kind for Nora and never uses RPC metadata as SVG markup", () => {
  const member = {
    ...teamFixture().team.lead!,
    name: "Chief",
    avatar: { initials: "<script>", color: "url(invalid)" },
  };
  const images = {
    "h3/face-nora-idle-dark": "data:image/svg+xml;base64,PHN2Zy8+",
    "h3/face-nora-idle-light": "data:image/svg+xml;base64,PHN2Zy8+",
  };
  const { container } = render(
    <TeamArtworkContext.Provider value={images}>
      <TeamAvatarArt member={member} visualState="idle" />
    </TeamArtworkContext.Provider>,
  );
  expect(
    container.querySelector(".wb-avatar-dark img")?.getAttribute("src"),
  ).toBe("data:image/svg+xml;base64,PHN2Zy8+");
  expect(container.querySelector("script")).toBeNull();
  expect(container.innerHTML).not.toContain("url(invalid)");
});
it("gives renamed project leads their explicit project glyph", () => {
  const member = {
    ...teamFixture().team.members[5]!,
    name: "Unknown lead name",
  };
  const { container } = render(
    <TeamAvatarArt member={member} projectIcon="Book" />,
  );
  expect(avatarIdentity(member)).toBe("project-lead");
  expect(container.querySelector('[data-project-icon="Book"]')).not.toBeNull();
});
it("does not schedule rAF under reduced motion and cancels/resumes on every pause boundary", () => {
  let reduced = true,
    focused = true,
    hidden = false;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  }));
  vi.spyOn(document, "hasFocus").mockImplementation(() => focused);
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
  const cancel = vi
    .spyOn(window, "cancelAnimationFrame")
    .mockImplementation(() => {});
  const { team } = teamFixture();
  const { unmount } = render(
    <TeamAvatarArt
      member={team.lead!}
      chief
      orbitMembers={[team.members[0]!]}
    />,
  );
  expect(raf).not.toHaveBeenCalled();
  act(() => {
    reduced = false;
    listeners.forEach((fn) => fn());
  });
  expect(raf).toHaveBeenCalledTimes(1);
  act(() => {
    focused = false;
    window.dispatchEvent(new Event("blur"));
  });
  expect(cancel).toHaveBeenCalledWith(42);
  act(() => {
    focused = true;
    window.dispatchEvent(new Event("focus"));
  });
  expect(raf).toHaveBeenCalledTimes(2);
  act(() => {
    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(cancel).toHaveBeenCalledTimes(2);
  act(() => {
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(raf).toHaveBeenCalledTimes(3);
  act(() => {
    reduced = true;
    listeners.forEach((fn) => fn());
  });
  expect(cancel).toHaveBeenCalledTimes(3);
  unmount();
  expect(listeners.size).toBe(0);
  vi.unstubAllGlobals();
});
