import { useEffect, useRef, useState } from "react";
import {
  experimental_ProviderIcon as ProviderIcon,
  experimental_ThreadStatusGlyph as ThreadStatusGlyph,
  type PluginProvidersState,
  type PluginSidebarThreadRowStatus,
} from "@get-bb/plugin-sdk/app";
import type { SidebarThreadDto } from "../../shared/boat-sidebar.js";
import type { ThreadListIndicatorState } from "../model/thread-activity.js";
import { resolveThreadStatus } from "../model/thread-activity.js";

export function ProviderActivity({
  provider,
  providerId,
  working,
  review,
  done,
}: {
  provider?: PluginProvidersState["providers"][number];
  providerId: string;
  working: boolean;
  review: boolean;
  done: boolean;
}) {
  const claude = providerId.includes("claude");
  return (
    <span
      className="wb-provider"
      data-working={working || undefined}
      data-done={done || undefined}
      role="img"
      aria-label={`${provider?.displayName ?? providerId}${working ? (review ? " reviewing" : " working") : ""}`}
    >
      {working && (
        <svg
          className="wb-ring"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          aria-hidden="true"
        >
          <circle
            cx="9"
            cy="9"
            r="8"
            fill="none"
            stroke="#2C2C2C"
            strokeWidth="1.5"
          />
          <path
            className="wb-arc"
            d={review ? "M1 9a8 8 0 0 1 8-8" : "M9 1a8 8 0 0 1 8 8"}
            fill="none"
            stroke={claude ? "#D97757" : "#BDBDBD"}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
      {provider && (
        <ProviderIcon
          providerKind="agent"
          provider={provider}
          className="wb-provider-mark"
        />
      )}
    </span>
  );
}
export function DotSlot({
  boat,
  state,
  rowStatus,
  collapsed,
  isNew = false,
  showNativeActivity = false,
}: {
  boat?: SidebarThreadDto;
  state: ThreadListIndicatorState;
  rowStatus: PluginSidebarThreadRowStatus | null;
  collapsed: boolean;
  isNew?: boolean;
  showNativeActivity?: boolean;
}) {
  let tone: "attention" | "danger" | "news" | null = null;
  const rollup = collapsed ? boat?.rollup : null;
  const status =
    (boat?.role === "orchestrator" || (boat?.role === "chat" && boat.rollup)) &&
    !collapsed
      ? null
      : boat?.status;
  if (
    status === "needs-you" ||
    (rollup?.needsYou ?? 0) > 0 ||
    (!boat && state.hasPendingInteraction)
  )
    tone = "attention";
  else if (
    status === "broken" ||
    (rollup?.stopped ?? 0) > 0 ||
    (!boat && state.hasUnreadError)
  )
    tone = "danger";
  else if (state.hasUnreadSuccess) tone = "news";
  const resolution = resolveThreadStatus(state, rowStatus);
  const pluginVisible =
    !boat &&
    rowStatus &&
    resolution.rowStatusIsVisible &&
    !state.hasUnsubmittedDraft;
  const nativeActivity =
    showNativeActivity &&
    !boat &&
    ["runtime", "working-draft"].includes(resolution.indicatorKind);
  return (
    <span
      className={`wb-dot-slot${isNew && !state.hasUnsubmittedDraft && tone !== "attention" && tone !== "danger" ? " wb-new-slot" : ""}`}
      data-sidebar-thread-trailing-indicator=""
      data-workbench-indicator={
        resolution.indicatorKind === "none" && !pluginVisible
          ? undefined
          : resolution.indicatorKind
      }
      data-row-status={pluginVisible ? rowStatus.label : undefined}
      data-row-status-tone={pluginVisible ? rowStatus.tone : undefined}
      aria-label={resolution.accessibleLabel ?? undefined}
      title={resolution.accessibleLabel ?? undefined}
    >
      {nativeActivity ? (
        <ThreadStatusGlyph indicator={resolution.indicatorKind} />
      ) : state.hasUnsubmittedDraft ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-label="Unsubmitted draft"
          role="img"
        >
          <path
            d="M8.2 1.8l2 2L4 10H2V8l6.2-6.2z"
            stroke="#A8A8A8"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ) : pluginVisible ? (
        <ThreadStatusGlyph
          indicator={resolution.indicatorKind}
          rowStatus={rowStatus}
        />
      ) : isNew && tone !== "attention" && tone !== "danger" ? (
        <span className="wb-new-word">new</span>
      ) : tone ? (
        <span
          className="wb-dot"
          data-tone={tone}
          role="img"
          aria-label={
            tone === "attention"
              ? "Needs you"
              : tone === "danger"
                ? "Stopped with an error"
                : "Unread news"
          }
        />
      ) : !boat &&
        !["none", "runtime", "working-draft"].includes(
          resolution.indicatorKind,
        ) ? (
        <ThreadStatusGlyph indicator={resolution.indicatorKind} />
      ) : null}
    </span>
  );
}
const shimmered = new Map<string, number>();
export function useNewsShimmer(
  id: string,
  unread: boolean,
  attention: number | null,
) {
  const [news, setNews] = useState(false);
  const token = attention ?? 0;
  const previous = useRef(false);
  useEffect(() => {
    if (
      unread &&
      (!previous.current || shimmered.get(id) !== token) &&
      shimmered.get(id) !== token
    ) {
      shimmered.set(id, token);
      if (shimmered.size > 2000)
        shimmered.delete(shimmered.keys().next().value!);
      setNews(true);
      const timeout = setTimeout(() => setNews(false), 900);
      previous.current = unread;
      return () => clearTimeout(timeout);
    }
    previous.current = unread;
    if (!unread) setNews(false);
  }, [id, unread, token]);
  return news;
}
