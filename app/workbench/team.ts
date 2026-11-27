import type {
  TeamMemberDto,
  TeamSidebarDto,
  SidebarThreadDto,
} from "../../shared/boat-sidebar.js";
import type { SidebarThread } from "../model/sidebar-thread.js";

export function teamMemberFor(
  team: TeamSidebarDto | undefined,
  threadId: string,
) {
  return team?.enabled
    ? team.lead?.threadId === threadId
      ? team.lead
      : team.members.find((member) => member.threadId === threadId)
    : undefined;
}

export function memberPreview(member: TeamMemberDto, projectName?: string) {
  // The engine tags the chief preview needs-you while asks exist, but its text
  // is still her latest line. Only the pill draws attention on the tile.
  if (member.kind === "lead")
    return { text: member.preview.text, tone: "neutral" as const };
  // Project work, including its asks, is drawn once under the project, not the person.
  if (projectName)
    return { text: `in ${projectName}`, tone: "neutral" as const };
  if (member.preview && ["needs-you", "activity"].includes(member.preview.kind))
    return member.preview;
  const unread = member.unread.messages + member.unread.cards;
  if (unread) return { text: `${unread} unread`, tone: "neutral" as const };
  return member.preview;
}

/** Lifecycle (active/paused/archived) is not measured work activity. */
export type TeamVisualState =
  "idle" | "working" | "waiting" | "paused" | "quiet" | "failed";
export function teamMemberVisualState(
  member: TeamMemberDto,
  states: ReadonlyMap<string, SidebarThreadDto>,
  threadId?: string,
): TeamVisualState {
  if (member.status === "paused") return "paused";
  if (member.status === "archived") return "quiet";
  const rows = (
    threadId ? [threadId] : [member.threadId, ...member.backgroundThreadIds]
  ).flatMap((id) => states.get(id) ?? []);
  if (rows.some((row) => row.status === "broken")) return "failed";
  if (
    rows.some(
      (row) =>
        ["working", "review"].includes(row.status) && row.moving !== false,
    )
  )
    return "working";
  if (
    rows.some(
      (row) =>
        row.status === "waiting-reset" ||
        (row.status === "stopped" &&
          /^waiting\b/i.test(row.secondLine?.text ?? "")),
    )
  )
    return "waiting";
  if (rows.some((row) => row.status === "stopped")) return "paused";
  return "idle";
}

export function showTeamProvider(
  boat: SidebarThreadDto | undefined,
  member: TeamMemberDto | undefined,
  assignee: TeamMemberDto | undefined,
  every: boolean,
) {
  if (every) return true;
  if (member) return false;
  if (boat?.role === "review") return true;
  if (!assignee) return true;
  // v1 has provider facts, but no handoff history or member default provider.
  return !!boat?.provider && boat.provider !== "claude";
}

/** Relocate existing chats only. No synthetic threads, no mutations to host data. */
export function partitionTeamThreads(
  threads: readonly SidebarThread[],
  team?: TeamSidebarDto,
) {
  if (!team?.enabled)
    return { sections: threads, members: [] as SidebarThread[] };
  const homes = new Set(
    [
      ...(team.lead ? [team.lead] : []),
      ...team.members.filter((m) => m.kind !== "project-lead"),
    ].map((m) => m.threadId),
  );
  const hidden = new Set([
    ...team.hideFromSections,
    ...homes,
    ...team.projects.map((p) => p.leadThreadId),
  ]);
  const byId = new Map(threads.map((t) => [t.id, t]));
  const projectsByLead = new Map(
    team.projects.map((p) => [p.leadThreadId, p.bbProjectId]),
  );
  const projectIds = new Set(team.projects.map((p) => p.bbProjectId));
  const projectFor = (thread: SidebarThread) => {
    if (projectIds.has(thread.projectId)) return thread.projectId;
    const seen = new Set<string>();
    let parent = thread.parentThreadId;
    while (parent && !seen.has(parent)) {
      const project = projectsByLead.get(parent);
      if (project) return project;
      seen.add(parent);
      parent = byId.get(parent)?.parentThreadId ?? null;
    }
    return undefined;
  };
  const projectByThread = new Map(threads.map((t) => [t.id, projectFor(t)]));
  const memberProjectByHome = new Map(
    team.members.map((m) => [
      m.threadId,
      m.backgroundThreadIds.map((id) => projectByThread.get(id)).find(Boolean),
    ]),
  );
  const belongsToMember = (thread: SidebarThread) => {
    if (homes.has(thread.id)) return true;
    // A project assignment belongs to work, not to the member's home tree.
    if (projectByThread.get(thread.id)) return false;
    const seen = new Set<string>();
    let parent = thread.parentThreadId;
    while (parent && !seen.has(parent)) {
      if (homes.has(parent)) return true;
      seen.add(parent);
      parent = byId.get(parent)?.parentThreadId ?? null;
    }
    return false;
  };
  const members = threads.filter(belongsToMember).map((t) =>
    homes.has(t.id)
      ? {
          ...t,
          parentThreadId: null,
          workbenchTeamProjectId: memberProjectByHome.get(t.id) ?? undefined,
        }
      : t,
  );
  const memberIds = new Set(members.map((t) => t.id));
  const sections = threads
    .filter((t) => !hidden.has(t.id) && !memberIds.has(t.id))
    .map((t) => ({
      ...t,
      workbenchTeamProjectId: projectByThread.get(t.id),
      parentThreadId:
        t.parentThreadId && hidden.has(t.parentThreadId)
          ? null
          : t.parentThreadId,
    }));
  return { sections, members };
}
