import { useEffect, useRef } from "react";
import { useTeamIndex } from "./BoatState.js";
import { useTeamArtwork } from "./TeamArtwork.js";
import type { TeamAvatarProps } from "./team-avatar-types.js";
import { Icon } from "@/components/ui/icon";
import type { TeamMemberDto } from "../../shared/boat-sidebar.js";

export function avatarIdentity(member: TeamMemberDto) {
  // v1 carries kind, not specialist roles. Never guess identity from a name.
  return member.kind === "lead"
    ? "nora"
    : member.kind === "project-lead"
      ? "project-lead"
      : "generic";
}
function GeneratedFace({
  member,
  state,
  projectIcon,
  calm = false,
}: {
  member: TeamMemberDto;
  state: string;
  projectIcon?: string;
  calm?: boolean;
}) {
  let seed = 0;
  for (const c of member.memberId) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const palette = ["#ae86d5", "#7da5cd", "#87b7a5", "#c7a375"];
  const lead = member.kind === "project-lead";
  const chief = member.kind === "lead";
  return (
    <span
      className="wb-team-face wb-generated-face"
      data-identity={lead ? "project-lead" : "generic"}
      data-project-icon={lead ? (projectIcon ?? "Folder") : undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24">
        <g opacity={state === "quiet" || state === "stalled" ? 0.55 : 1}>
          {lead ? (
            <>
              <rect
                x="2"
                y="5"
                width="20"
                height="17"
                rx="4"
                fill={calm ? "none" : "#777"}
                stroke={calm ? "var(--wb-title, #c1c1c1)" : "#555"}
                strokeWidth=".8"
              />
              <path
                d="M5 1v7m0-6 7 2-7 2"
                fill="#d97757"
                stroke="#d97757"
                strokeWidth=".8"
              />
            </>
          ) : chief ? (
            <path
              d="M4 10 5 2l5 5h4l5-5 1 8q5 13-8 13T4 10Z"
              fill="#eacb5e"
              stroke="#8b7131"
              strokeWidth=".8"
            />
          ) : (
            <path
              d="M3 8Q3 2 10 3Q20 0 21 10Q25 21 14 22Q0 25 3 8Z"
              fill={calm ? "none" : palette[seed % palette.length]}
              stroke={calm ? "var(--wb-title, #c1c1c1)" : "#555"}
              strokeWidth=".8"
            />
          )}
          {!lead && (
            <>
              <g data-eyes="">
                <circle
                  cx="8"
                  cy="12"
                  r="1.1"
                  fill={calm ? "var(--wb-title, #c1c1c1)" : "#252525"}
                />
                <circle
                  cx="16"
                  cy="12"
                  r="1.1"
                  fill={calm ? "var(--wb-title, #c1c1c1)" : "#252525"}
                />
              </g>
              <path
                d="M9 17q3 2 6 0"
                fill="none"
                stroke={calm ? "var(--wb-title, #c1c1c1)" : "#252525"}
                strokeWidth="1"
              />
            </>
          )}
        </g>
        {state !== "idle" && state !== "quiet" && (
          <g>
            <circle
              cx="19.6"
              cy="19.6"
              r="4.8"
              fill="var(--sidebar, #202020)"
            />
            <circle
              cx="19.6"
              cy="19.6"
              r="4"
              fill={state === "failed" ? "#b91c1c" : "#64748b"}
            />
            {state === "working" ? (
              <circle
                cx="19.6"
                cy="19.6"
                r="2.5"
                fill="none"
                stroke="#ddd"
                strokeDasharray="12 4"
              />
            ) : (
              <text
                x="19.6"
                y="22"
                textAnchor="middle"
                fill="white"
                fontSize="7"
              >
                {state === "failed" ? "×" : "Ⅱ"}
              </text>
            )}
          </g>
        )}
      </svg>
      {lead && (
        <Icon
          name={projectIcon ?? "Folder"}
          className="wb-generated-glyph"
          aria-hidden="true"
        />
      )}
    </span>
  );
}
function AvatarImage({
  member,
  calm,
  state,
  projectIcon,
}: {
  member: TeamMemberDto;
  calm: boolean;
  state: string;
  projectIcon?: string;
}) {
  const images = useTeamArtwork();
  const index = useTeamIndex();
  projectIcon ??= index.projectIcons.get(member.threadId);
  if (member.kind !== "lead")
    return (
      <GeneratedFace
        member={member}
        state={state}
        projectIcon={projectIcon}
        calm={calm}
      />
    );
  const system = calm ? "h2" : "h3";
  const dark = images[`${system}/face-nora-${state}-dark`];
  const light = images[`${system}/face-nora-${state}-light`];
  if (!dark || !light)
    return <GeneratedFace member={member} state={state} calm={calm} />;
  // SVG images cannot execute scripts or inject elements into the host DOM.
  return (
    <>
      {[
        [dark, "dark"],
        [light, "light"],
      ].map(([src, theme]) => (
        <span
          key={theme}
          className={`wb-team-face wb-avatar-${theme}`}
          aria-hidden="true"
        >
          <img src={src} alt="" draggable={false} />
        </span>
      ))}
    </>
  );
}
export function TeamAvatarArt({
  member,
  calm = false,
  chief = false,
  working = false,
  task = false,
  badge = true,
  providerLabel,
  projectIcon,
  visualState = member.status === "active"
    ? "idle"
    : member.status === "archived"
      ? "quiet"
      : "paused",
  orbitMembers = [],
}: TeamAvatarProps) {
  const root = useRef<HTMLSpanElement>(null);
  const satellites = orbitMembers.slice(0, 6);
  const active = chief && !calm && satellites.length > 0;
  const angleRef = useRef(-35);
  useEffect(() => {
    if (!active || !root.current) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let frame: number | null = null,
      previous = 0,
      focused = document.hasFocus(),
      disposed = false;
    const canRun = () =>
      !disposed && !document.hidden && focused && !reduced?.matches;
    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previous = 0;
    };
    const schedule = () => {
      if (canRun() && frame === null) frame = requestAnimationFrame(tick);
      else if (!canRun()) stop();
    };
    const tick = (now: number) => {
      frame = null;
      if (!canRun()) {
        stop();
        return;
      }
      if (previous) angleRef.current += Math.min(now - previous, 100) * 0.01;
      root.current
        ?.querySelectorAll<HTMLElement>(".wb-satellite")
        .forEach((node, index) => {
          const a =
            ((angleRef.current + (index * 360) / satellites.length) * Math.PI) /
            180;
          node.style.transform = `translate(${26 * Math.cos(a)}px, ${18 * Math.sin(a)}px) scale(${0.94 + 0.06 * Math.sin(a)})`;
          node.style.zIndex = Math.sin(a) < 0 ? "1" : "3";
        });
      previous = now;
      schedule();
    };
    const focus = () => {
      focused = true;
      schedule();
    };
    const blur = () => {
      focused = false;
      stop();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", schedule);
    reduced?.addEventListener?.("change", schedule);
    schedule();
    return () => {
      disposed = true;
      stop();
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", schedule);
      reduced?.removeEventListener?.("change", schedule);
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
      role={chief ? undefined : "img"}
      aria-hidden={chief || undefined}
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
      <AvatarImage
        member={member}
        calm={calm}
        state={state}
        projectIcon={projectIcon}
      />
    </span>
  );
}
