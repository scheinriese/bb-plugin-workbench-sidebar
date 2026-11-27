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

export type TeamIndex = ReturnType<typeof buildTeamIndex>;
/** Derived once per snapshot, never scan the roster from individual rows. */
export function buildTeamIndex(
  team: TeamSidebarDto | undefined,
  states: ReadonlyMap<string, SidebarThreadDto>,
) {
  const membersByHome = new Map<string, TeamMemberDto>();
  const membersById = new Map<string, TeamMemberDto>();
  const assignees = new Map<string, TeamMemberDto>();
  const visuals = new Map<string, TeamVisualState>();
  const projectIcons = new Map<string, string>();
  const orbit: TeamMemberDto[] = [],
    dock: TeamMemberDto[] = [];
  if (team) {
    for (const p of team.projects) projectIcons.set(p.leadThreadId, p.icon);
    for (const m of [...(team.lead ? [team.lead] : []), ...team.members]) {
      membersByHome.set(m.threadId, m);
      membersById.set(m.memberId, m);
      for (const id of m.backgroundThreadIds)
        if (!assignees.has(id)) assignees.set(id, m);
      const visual = teamMemberVisualState(m, states);
      visuals.set(m.memberId, visual);
      if (m !== team.lead) {
        if (visual === "working") orbit.push(m);
        if (
          m.preview.kind === "needs-you" ||
          m.backgroundThreadIds.some(
            (id) => states.get(id)?.status === "needs-you",
          )
        )
          dock.push(m);
      }
    }
    // Reviews and deeper work inherit their assignment through the Boat tree.
    for (const row of states.values()) {
      if (assignees.has(row.threadId)) continue;
      const chain: string[] = [],
        seen = new Set<string>();
      let id: string | null = row.threadId;
      while (id && !seen.has(id) && !assignees.has(id)) {
        seen.add(id);
        chain.push(id);
        id = states.get(id)?.parentThreadId ?? null;
      }
      const owner = id ? assignees.get(id) : undefined;
      if (owner) for (const child of chain) assignees.set(child, owner);
    }
  }
  return {
    membersByHome,
    membersById,
    assignees,
    visuals,
    projectIcons,
    orbit,
    dock: dock.slice(-3),
  };
}
export function teamSectionId(leadId: string): `project:${string}` {
  return `project:team:${leadId}`;
}

/** Ownership comes only from explicit roots and their descendants. A shared BB
 * project is not ownership: in particular, Personal is never swept into Team. */
export function partitionTeamThreads(
  threads: readonly SidebarThread[],
  team?: TeamSidebarDto,
) {
  if (!team?.enabled)
    return { sections: threads, members: [] as SidebarThread[] };
  const roster = [...(team.lead ? [team.lead] : []), ...team.members];
  const homes = new Map(
    roster.filter((m) => m.kind !== "project-lead").map((m) => [m.threadId, m]),
  );
  const backgrounds = new Map<string, TeamMemberDto>();
  for (const m of roster)
    for (const id of m.backgroundThreadIds)
      if (!backgrounds.has(id)) backgrounds.set(id, m);
  const leads = new Map(team.projects.map((p) => [p.leadThreadId, p]));
  const projectsById = new Map<string, TeamSidebarDto["projects"]>();
  for (const p of team.projects)
    projectsById.set(p.bbProjectId, [
      ...(projectsById.get(p.bbProjectId) ?? []),
      p,
    ]);
  const byId = new Map(threads.map((t) => [t.id, t]));
  type Ownership = {
    home?: string;
    memberId?: string;
    project?: TeamSidebarDto["projects"][number];
  };
  const resolved = new Map<string, Ownership>();
  for (const thread of threads) {
    const path: string[] = [],
      seen = new Set<string>();
    let id: string | null = thread.id;
    while (id && !resolved.has(id) && !seen.has(id)) {
      seen.add(id);
      path.push(id);
      if (leads.has(id) || homes.has(id)) {
        id = null;
        break;
      }
      id = byId.get(id)?.parentThreadId ?? null;
    }
    let ownership: Ownership = id ? (resolved.get(id) ?? {}) : {};
    for (const child of path.reverse()) {
      const lead = leads.get(child),
        home = homes.get(child),
        owner = backgrounds.get(child);
      if (lead) ownership = { project: lead };
      else if (home)
        ownership = { home: home.threadId, memberId: home.memberId };
      else if (owner) {
        // Only an explicitly owned work root may use its BB project to find a
        // unique lead. Ambiguous/shared projects stay with the member unless
        // ancestry names a lead. Never guess the first of two leads.
        const candidates =
          projectsById.get(byId.get(child)?.projectId ?? "") ?? [];
        ownership = {
          home: owner.threadId,
          memberId: owner.memberId,
          project:
            ownership.project ??
            (candidates.length === 1 ? candidates[0] : undefined),
        };
      }
      resolved.set(child, ownership);
    }
  }
  const activeProjects = new Map<string, string>();
  for (const m of roster) {
    const project = m.backgroundThreadIds
      .map((id) => resolved.get(id)?.project?.bbProjectId)
      .find(Boolean);
    if (project) activeProjects.set(m.threadId, project);
  }
  const hidden = new Set([
    ...team.hideFromSections,
    ...homes.keys(),
    ...leads.keys(),
  ]);
  const members: SidebarThread[] = [],
    sections: SidebarThread[] = [];
  for (const t of threads) {
    const own = resolved.get(t.id) ?? {};
    if (homes.has(t.id) || (own.home && !own.project)) {
      members.push(
        homes.has(t.id)
          ? {
              ...t,
              parentThreadId: null,
              workbenchTeamProjectId: activeProjects.get(t.id),
            }
          : { ...t, workbenchTeamMemberId: own.memberId },
      );
    } else if (!hidden.has(t.id)) {
      sections.push(
        own.project
          ? {
              ...t,
              workbenchTeamProjectId: own.project.bbProjectId,
              workbenchTeamLeadThreadId: own.project.leadThreadId,
              workbenchTeamMemberId: own.memberId,
              parentThreadId:
                t.parentThreadId === own.project.leadThreadId
                  ? null
                  : t.parentThreadId,
            }
          : t,
      );
    }
  }
  return { sections, members };
}
