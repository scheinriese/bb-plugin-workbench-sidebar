import type { SidebarProject } from "../model/use-sidebar-data.js";
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
  const projectNames = new Map<string, string>();
  const orbit: TeamMemberDto[] = [],
    dock: TeamMemberDto[] = [];
  if (team) {
    for (const p of team.projects) {
      projectIcons.set(p.leadThreadId, p.icon);
      const lead = team.members.find((m) => m.threadId === p.leadThreadId);
      projectNames.set(p.leadThreadId, projectLabel(lead?.name));
    }
    const seenHomes = new Set<string>();
    for (const m of [...(team.lead ? [team.lead] : []), ...team.members]) {
      if (seenHomes.has(m.threadId)) continue;
      seenHomes.add(m.threadId);
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
    projectNames,
    orbit,
    dock: dock.slice(-3),
    dockOverflow: Math.max(0, dock.length - 3),
  };
}
export function teamSectionId(leadId: string): `project:${string}` {
  return `project:team:${leadId}`;
}

function projectLabel(leadName?: string) {
  const label = (leadName ?? "Project").replace(/\s+lead$/i, "").trim();
  return label && !/^personal$/i.test(label) ? label : "Project";
}
/** Header identity is Harbormaster's project, never the native BB container.
 * A native home supplies storage/routing only, and is not a display label. */
export function resolveTeamProjects(
  team: TeamSidebarDto | undefined,
  projects: readonly SidebarProject[],
) {
  if (!team?.enabled) return [];
  const byId = new Map(projects.map((p) => [p.id, p]));
  const byThread = new Map(
    projects.flatMap((p) => p.threads).map((t) => [t.id, t]),
  );
  const members = new Map(team.members.map((m) => [m.threadId, m]));
  const seen = new Set<string>();
  return team.projects.flatMap((input) => {
    if (seen.has(input.leadThreadId)) return [];
    const home = byThread.get(input.leadThreadId);
    const native = home ? byId.get(home.projectId) : undefined;
    const lead = members.get(input.leadThreadId);
    const project =
      native ??
      byId.get(input.bbProjectId) ??
      byId.get(lead?.bbProjectId ?? "");
    if (!project) return [];
    // ce85486 has no project display-name field. Do not show opaque IDs or
    // "Personal"; the documented fallback is the lead name minus its role.
    const name = projectLabel(lead?.name ?? home?.displayTitle);
    seen.add(input.leadThreadId);
    return [
      {
        project: { ...project, name },
        teamProject: {
          ...input,
          bbProjectId: project.id,
          orchestratorProjectId:
            input.orchestratorProjectId ?? lead?.orchestratorProjectId ?? null,
        },
      },
    ];
  });
}
export function groupTeamProjects(
  resolved: ReturnType<typeof resolveTeamProjects>,
  threads: readonly SidebarThread[],
  pinned: ReadonlySet<string>,
) {
  if (!resolved.length) return [];
  const groups = new Map<
    string,
    {
      project: SidebarProject;
      teamProject: TeamSidebarDto["projects"][number];
      leadThreadIds: string[];
    }
  >();
  for (const { project, teamProject } of resolved) {
    const identity = teamProject.orchestratorProjectId
      ? `hm:${teamProject.orchestratorProjectId}`
      : `lead:${teamProject.leadThreadId}`;
    const group = groups.get(identity);
    if (group) group.leadThreadIds.push(teamProject.leadThreadId);
    else
      groups.set(identity, {
        project: { ...project, threads: [] },
        teamProject,
        leadThreadIds: [teamProject.leadThreadId],
      });
  }
  const byLead = new Map(
    [...groups.values()].flatMap((g) =>
      g.leadThreadIds.map((id) => [id, g] as const),
    ),
  );
  for (const t of threads) {
    const group = t.workbenchTeamLeadThreadId
      ? byLead.get(t.workbenchTeamLeadThreadId)
      : undefined;
    if (group && !pinned.has(t.id)) group.project.threads.push(t);
  }
  return [...groups.values()];
}

/** Ownership comes only from explicit roots and their descendants. A shared BB
 * project is not ownership: in particular, Personal is never swept into Team. */
export function partitionTeamThreads(
  threads: readonly SidebarThread[],
  team?: TeamSidebarDto,
  nativeLeadIds: ReadonlySet<string> = new Set(),
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
  const byId = new Map(threads.map((t) => [t.id, t]));
  type Ownership = {
    native?: true;
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
      if (leads.has(id) || homes.has(id) || nativeLeadIds.has(id)) {
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
      if (nativeLeadIds.has(child)) ownership = { native: true };
      else if (lead) ownership = { project: lead };
      else if (home)
        ownership = { home: home.threadId, memberId: home.memberId };
      else if (ownership.native) {
        /* Unresolved project work stays native, even when assigned. */
      } else if (owner) {
        // Assignment identity comes from its owning lead or ancestry, never
        // from a shared native container such as proj_personal.
        ownership = {
          home: owner.threadId,
          memberId: owner.memberId,
          project: ownership.project ?? leads.get(owner.threadId),
        };
        // A skipped/unresolved project lead and its work must remain native.
        if (owner.kind === "project-lead" && !ownership.project) ownership = {};
      }
      resolved.set(child, ownership);
    }
  }
  const activeProjects = new Map<string, string>();
  const activeLeads = new Map<string, string>();
  for (const m of roster) {
    const project = m.backgroundThreadIds
      .map((id) => resolved.get(id)?.project?.bbProjectId)
      .find(Boolean);
    if (project) activeProjects.set(m.threadId, project);
    const lead = m.backgroundThreadIds
      .map((id) => resolved.get(id)?.project?.leadThreadId)
      .find(Boolean);
    if (lead) activeLeads.set(m.threadId, lead);
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
              workbenchTeamLeadThreadId: activeLeads.get(t.id),
            }
          : { ...t, workbenchTeamMemberId: own.memberId },
      );
    } else if (own.native) {
      sections.push(t);
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
