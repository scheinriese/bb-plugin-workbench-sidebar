import { useEffect, useId, useMemo, useRef } from "react";
import { teamAvatarImages } from "../../assets/team/avatar-data.js";
import { type TeamVisualState } from "./team.js";
import type { TeamMemberDto } from "../../shared/boat-sidebar.js";

export function avatarIdentity(member: TeamMemberDto) {
  // The v1 avatar object is metadata, never an SVG key or a remote URL.
  // Pick only bundled role silhouettes, with a neutral Developer fallback.
  if (member.kind === "lead") return "nora";
  if (member.kind === "project-lead")
    return /docs/i.test(member.name) ? "lead-docs" : "lead-web";
  return /developer/i.test(member.name)
    ? "dev"
    : (/iris|writer|olive|scout/i.exec(member.name)?.[0].toLowerCase() ??
        "dev");
}
function AvatarImage({
  member,
  calm,
  state,
}: {
  member: TeamMemberDto;
  calm: boolean;
  state: string;
}) {
  const prefix = useId().replace(/:/g, "");
  const images = useMemo(
    () =>
      ["dark", "light"].map((theme) => {
        const identity = avatarIdentity(member);
        const key = `${calm ? "h2" : "h3"}/${identity.startsWith("lead-") ? "" : "face-"}${identity}-${state}-${theme}`;
        const svg =
          teamAvatarImages[key] ??
          teamAvatarImages[`h3/face-dev-idle-${theme}`]!;
        return svg
          .replace(/id="([^"]+)"/g, `id="${prefix}-${theme}-$1"`)
          .replace(/url\(#/g, `url(#${prefix}-${theme}-`)
          .replace(/(<path[^>]+fill="#141414")/g, '$1 data-eyes=""');
      }),
    [member, calm, state, prefix],
  );
  return (
    <>
      {images.map((svg, i) => (
        <span
          key={i}
          className={`wb-team-face wb-avatar-${i ? "light" : "dark"}`}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ))}
    </>
  );
}
export function TeamAvatar({
  member,
  calm = false,
  chief = false,
  working = false,
  task = false,
  badge = true,
  providerLabel,
  visualState = member.status === "active"
    ? "idle"
    : member.status === "archived"
      ? "quiet"
      : "paused",
  orbitMembers = [],
}: {
  member: TeamMemberDto;
  calm?: boolean;
  chief?: boolean;
  working?: boolean;
  task?: boolean;
  badge?: boolean;
  providerLabel?: string;
  visualState?: TeamVisualState;
  orbitMembers?: readonly TeamMemberDto[];
}) {
  const root = useRef<HTMLSpanElement>(null);
  const satellites = orbitMembers.slice(0, 6);
  const active = chief && !calm && satellites.length > 0;
  useEffect(() => {
    if (!active || !root.current) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    let angle = -35;
    let focused = document.hasFocus();
    const focus = () => {
      focused = true;
      previous = 0;
    };
    const blur = () => {
      focused = false;
    };
    const tick = (now: number) => {
      if (!document.hidden && focused && !reduced?.matches) {
        if (previous) angle += Math.min(now - previous, 100) * 0.01;
        root.current
          ?.querySelectorAll<HTMLElement>(".wb-satellite")
          .forEach((node, index) => {
            const a =
              ((angle + (index * 360) / satellites.length) * Math.PI) / 180;
            node.style.transform = `translate(${26 * Math.cos(a)}px, ${18 * Math.sin(a)}px) scale(${0.94 + 0.06 * Math.sin(a)})`;
            node.style.zIndex = Math.sin(a) < 0 ? "1" : "3";
          });
        previous = now;
      } else previous = 0;
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
    };
  }, [active, satellites.length]);
  // Declared waits have no badge; the asset set represents them with idle.
  let state: string = visualState === "waiting" ? "idle" : visualState;
  if (!badge || (task && working)) state = "idle";
  if (chief && !satellites.length) state = "quiet";
  return (
    <span
      ref={root}
      className="wb-team-avatar"
      data-system={calm ? "calm" : "orbit"}
      data-chief={chief || undefined}
      data-rest={(chief && !satellites.length) || undefined}
      data-task={task || undefined}
      data-working={(task && working) || undefined}
      role="img"
      title={providerLabel}
      aria-label={`${member.name}, ${visualState}`}
    >
      {active && (
        <>
          <svg className="wb-team-orbit" viewBox="0 0 64 50" aria-hidden="true">
            <ellipse
              cx="32"
              cy="25"
              rx="26"
              ry="18"
              fill="none"
              stroke="currentColor"
              strokeWidth=".8"
              strokeDasharray="1.5 2.5"
            />
          </svg>
          {satellites.map((m, i) => {
            const a = ((-35 + (i * 360) / satellites.length) * Math.PI) / 180;
            return (
              <span
                className="wb-satellite"
                key={m.memberId}
                style={{
                  transform: `translate(${26 * Math.cos(a)}px, ${18 * Math.sin(a)}px)`,
                  zIndex: Math.sin(a) < 0 ? 1 : 3,
                }}
              >
                <AvatarImage member={m} calm={false} state="idle" />
              </span>
            );
          })}
        </>
      )}
      <AvatarImage member={member} calm={calm} state={state} />
    </span>
  );
}
