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
    ? [team.lead, ...team.members].find(
        (member) => member.threadId === threadId,
      )
    : undefined;
}
export function memberPreview(member: TeamMemberDto, projectName?: string) {
  if (member.kind === "chief")
    return member.preview?.kind === "last-message"
      ? member.preview
      : { text: "", tone: "neutral" as const };
  // Project work, including its asks, is drawn once under the project, not the person.
  if (projectName)
    return { text: `in ${projectName}`, tone: "neutral" as const };
  if (member.preview && ["needs-you", "activity"].includes(member.preview.kind))
    return member.preview;
  const unread = member.unread.messages + member.unread.cards;
  if (unread) return { text: `${unread} unread`, tone: "neutral" as const };
  return (
    member.preview ?? {
      text: member.status === "idle" ? "idle" : member.status,
      tone: "neutral" as const,
    }
  );
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
  return (
    !!boat?.handoff ||
    (!!boat?.provider &&
      boat.provider !== (boat.defaultProvider ?? assignee.provider ?? "claude"))
  );
}
/** Relocate existing chats only. No synthetic threads, no mutations to host data. */
export function partitionTeamThreads(
  threads: readonly SidebarThread[],
  team?: TeamSidebarDto,
) {
  if (!team?.enabled)
    return { sections: threads, members: [] as SidebarThread[] };
  const homes = new Set(
    [team.lead, ...team.members.filter((m) => m.kind !== "project-lead")].map(
      (m) => m.threadId,
    ),
  );
  const hidden = new Set([
    ...team.hideFromSections,
    ...homes,
    ...team.projects.map((p) => p.leadThreadId),
  ]);
  const byId = new Map(threads.map((t) => [t.id, t]));
  const belongsToMember = (thread: SidebarThread) => {
    if (homes.has(thread.id)) return true;
    // A project assignment belongs to work, not to the member's home tree.
    if (team.projects.some((p) => p.bbProjectId === thread.projectId))
      return false;
    const seen = new Set<string>();
    let parent = thread.parentThreadId;
    while (parent && !seen.has(parent)) {
      if (homes.has(parent)) return true;
      seen.add(parent);
      parent = byId.get(parent)?.parentThreadId ?? null;
    }
    return false;
  };
  const members = threads
    .filter(belongsToMember)
    .map((t) => (homes.has(t.id) ? { ...t, parentThreadId: null } : t));
  const memberIds = new Set(members.map((t) => t.id));
  const sections = threads
    .filter((t) => !hidden.has(t.id) && !memberIds.has(t.id))
    .map((t) =>
      t.parentThreadId && hidden.has(t.parentThreadId)
        ? { ...t, parentThreadId: null }
        : t,
    );
  return { sections, members };
}
