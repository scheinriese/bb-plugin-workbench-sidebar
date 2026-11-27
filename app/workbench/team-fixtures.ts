/** Fictional cast and snapshots from Harbormaster docs/team/EXAMPLE-DAY.md. */
import {
  teamSidebarSchema,
  type TeamMemberDto,
} from "../../shared/team-sidebar.js";
import type { SidebarThreadDto } from "../../shared/boat-sidebar.js";
import { makeSidebarThread, makePluginProject } from "../model/fixtures.js";
export function teamFixture(time: "09:00" | "14:30" = "14:30") {
  const morning = time === "09:00";
  const member = (
    memberId: string,
    name: string,
    extra: Partial<TeamMemberDto> = {},
  ) => ({
    memberId,
    name,
    threadId: `thr_${memberId}`,
    bbProjectId:
      memberId === "web-lead"
        ? "web"
        : memberId === "docs-lead"
          ? "docs"
          : "personal",
    orchestratorProjectId:
      memberId === "web-lead"
        ? "hm-web"
        : memberId === "docs-lead"
          ? "hm-docs"
          : null,
    kind: "specialist",
    avatar: { initials: name.slice(0, 1), color: "blue" },
    status: "active",
    preview: { kind: "last-message", text: "Ready", tone: "neutral" },
    unread: { messages: 0, cards: 0 },
    order: 0,
    backgroundThreadIds: [],
    ...extra,
  });
  const team = teamSidebarSchema.parse({
    version: 1,
    enabled: true,
    revision: `example-${time}`,
    truncated: false,
    yourMove: { count: morning ? 2 : 3, overdue: 0, confirm: morning ? 0 : 1 },
    lead: member("nora", "Nora", {
      kind: "lead",
      preview: {
        kind: "needs-you",
        text: morning
          ? "Morning check-in at 09:00"
          : "The car service is booked for Thursday",
        tone: "neutral",
      },
    }),
    members: [
      member("iris", "Iris", {
        order: 0,
        preview: {
          kind: morning ? "needs-you" : "activity",
          text: morning
            ? "Pick a pricing page layout"
            : "waiting for the build Mac · offline since 14:00",
          tone: "neutral",
        },
        backgroundThreadIds: ["thr_pricing"],
      }),
      member("developer", "Developer", { order: 1 }),
      member("writer", "Writer", {
        order: 2,
        preview: {
          kind: morning ? "activity" : "needs-you",
          text: morning
            ? "Writing the release notes"
            : "Review the Docs 2.4 release notes",
          tone: "neutral",
        },
        backgroundThreadIds: ["thr_notes"],
      }),
      member("olive", "Olive", {
        order: 3,
        preview: {
          kind: "last-message",
          text: morning ? "Ready" : "Booked Thu 3 Dec, 08:30",
          tone: "neutral",
        },
      }),
      member("scout", "Scout", {
        order: 4,
        preview: morning
          ? { kind: "last-message", text: "Ready", tone: "neutral" }
          : {
              kind: "needs-you",
              text: "Enter the new jobs database key",
              tone: "attention",
            },
        unread: { messages: 0, cards: morning ? 0 : 1 },
      }),
      member("web-lead", "Web app lead", {
        kind: "project-lead",
        preview: {
          kind: "needs-you",
          text: morning
            ? "Restart the staging API"
            : "Review and merge the checkout fix",
          tone: "neutral",
        },
        backgroundThreadIds: ["thr_checkout"],
      }),
      member("docs-lead", "Docs site lead", {
        kind: "project-lead",
        preview: {
          kind: "activity",
          text: "Updating the search index",
          tone: "neutral",
        },
        backgroundThreadIds: ["thr_search"],
      }),
    ],
    projects: [
      {
        bbProjectId: "web",
        orchestratorProjectId: "hm-web",
        icon: "Folder",
        leadThreadId: "thr_web-lead",
      },
      {
        bbProjectId: "docs",
        orchestratorProjectId: "hm-docs",
        icon: "Folder",
        leadThreadId: "thr_docs-lead",
      },
    ],
    hideFromSections: [
      "thr_nora",
      "thr_iris",
      "thr_developer",
      "thr_writer",
      "thr_olive",
      "thr_scout",
    ],
  });
  const projects = [
    makePluginProject({ id: "personal", name: "Personal", isPersonal: true }),
    makePluginProject({ id: "web", name: "Web app" }),
    makePluginProject({ id: "docs", name: "Docs site" }),
  ];
  const threads = [team.lead!, ...team.members].map((m) =>
    makeSidebarThread({
      id: m.threadId,
      projectId:
        m.memberId === "web-lead"
          ? "web"
          : m.memberId === "docs-lead"
            ? "docs"
            : "personal",
      title: m.name,
    }),
  );
  const states: SidebarThreadDto[] = [];
  function task(
    id: string,
    title: string,
    projectId: string,
    parentThreadId: string,
    status: SidebarThreadDto["status"],
    text: string,
    ownerId: string,
    role: SidebarThreadDto["role"] = "task",
    provider: "claude" | "codex" = "claude",
  ) {
    const assignee = team.members.find((m) => m.memberId === ownerId);
    if (assignee && !assignee.backgroundThreadIds.includes(id))
      assignee.backgroundThreadIds.push(id);
    threads.push(makeSidebarThread({ id, title, projectId, parentThreadId }));
    states.push({
      threadId: id,
      parentThreadId,
      role,
      status,
      provider,
      moving: status === "working" || status === "review",
      secondLine: {
        text,
        tone:
          status === "needs-you" || (id === "thr_pricing" && !morning)
            ? "attention"
            : "neutral",
      },
      hidden: false,
      listedIn: null,
      createdFor: "you",
      rollup: null,
      updatedAt: "2026-11-26T14:30:00Z",
    });
  }
  task(
    "thr_checkout",
    "Fix the checkout total rounding",
    "web",
    "thr_web-lead",
    "needs-you",
    morning ? "Restart the staging API" : "Review and merge the checkout fix",
    "web-lead",
  );
  task(
    "thr_pricing",
    "Pricing page",
    "web",
    "thr_web-lead",
    morning ? "needs-you" : "stopped",
    morning
      ? "Pick a pricing page layout"
      : "waiting for the build Mac · offline since 14:00",
    "iris",
  );
  task(
    "thr_search",
    "Fix the docs search index",
    "docs",
    "thr_docs-lead",
    "working",
    "Updating the search index",
    "docs-lead",
  );
  task(
    "thr_notes",
    "Docs 2.4 release notes",
    "docs",
    "thr_docs-lead",
    morning ? "working" : "needs-you",
    morning ? "Writing the release notes" : "Review the Docs 2.4 release notes",
    "writer",
  );
  return { team, threads, projects, states };
}

/** Fictional reproduction of the first-live-render shape, not owner data. */
export function teamLiveShapeFixture() {
  const f = teamFixture();
  f.team.lead!.name = "Nora the long-named chief of staff";
  f.team.yourMove = { count: 57, overdue: 2, confirm: 14 };
  f.projects[1]!.name = "Portfolio";
  f.team.members[5]!.name = "Portfolio lead";
  f.team.projects[0]!.bbProjectId = "hm-internal-portfolio";
  f.team.projects.push({ ...f.team.projects[0]! });
  const alias = {
    ...f.team.members[5]!,
    memberId: "portfolio-alias",
    threadId: "thr_portfolio_alias",
    backgroundThreadIds: ["thr_alias_work"],
  };
  f.team.members.push(alias);
  f.team.projects.push({
    bbProjectId: "another-internal-id",
    orchestratorProjectId: "hm-web",
    leadThreadId: alias.threadId,
    icon: "Folder",
  });
  f.threads.push(
    makeSidebarThread({
      id: alias.threadId,
      title: alias.name,
      projectId: "web",
    }),
    makeSidebarThread({
      id: "thr_alias_work",
      title: "Portfolio follow-up",
      projectId: "web",
      parentThreadId: alias.threadId,
    }),
  );
  f.states.push({
    ...f.states[0]!,
    threadId: "thr_alias_work",
    parentThreadId: alias.threadId,
  });
  for (const id of ["developer", "olive"])
    f.team.members.find((m) => m.memberId === id)!.preview = {
      kind: "needs-you",
      text: "Review this work",
      tone: "neutral",
    };
  return f;
}

/** Different Harbormaster projects may share the same native Personal container. */
export function teamSharedContainerFixture() {
  const f = teamLiveShapeFixture();
  const personal = f.projects.find((p) => p.isPersonal)!;
  personal.id = "proj_personal";
  personal.href = "/projects/proj_personal";
  personal.settingsHref = "/settings/projects/proj_personal";
  f.projects.find((p) => p.id === "web")!.name = "Boat plugin";
  for (const t of f.threads)
    if (t.projectId === "personal") {
      t.projectId = "proj_personal";
      t.href = `/projects/proj_personal/threads/${t.id}`;
    }
  f.team.lead!.bbProjectId = "proj_personal";
  for (const m of f.team.members) m.bbProjectId = "proj_personal";
  const titles = new Map([
    ["thr_web-lead", "Portfolio"],
    ["thr_docs-lead", "Docs site"],
    ["thr_portfolio_alias", "Portfolio"],
  ]);
  for (const m of f.team.members.filter((m) => m.kind === "project-lead")) {
    m.name = `${titles.get(m.threadId)} lead`;
    const home = f.threads.find((t) => t.id === m.threadId)!;
    home.projectId = "proj_personal";
    home.href = `/projects/proj_personal/threads/${home.id}`;
  }
  f.team.projects = f.team.projects.map((p) => ({
    ...p,
    bbProjectId: "proj_personal",
  }));
  for (const [id, name, native] of [
    ["video", "Video pipeline", "proj_personal"],
    ["search", "Search app", "proj_personal"],
    ["boat", "Boat plugin", "web"],
  ]) {
    const lead = {
      ...f.team.members[5]!,
      memberId: id!,
      threadId: `thr_${id}_lead`,
      name: `${name} lead`,
      bbProjectId: native!,
      orchestratorProjectId: `hm-${id}`,
      backgroundThreadIds: [`thr_${id}_work`],
    };
    f.team.members.push(lead);
    f.team.projects.push({
      bbProjectId: native!,
      orchestratorProjectId: lead.orchestratorProjectId,
      leadThreadId: lead.threadId,
      icon: "Folder",
    });
    f.threads.push(
      makeSidebarThread({
        id: lead.threadId,
        title: lead.name,
        projectId: native,
      }),
      makeSidebarThread({
        id: lead.backgroundThreadIds[0],
        title: `${name} work`,
        projectId: native,
        parentThreadId: lead.threadId,
      }),
    );
    f.states.push({
      ...f.states[0]!,
      threadId: lead.backgroundThreadIds[0]!,
      parentThreadId: lead.threadId,
    });
  }
  f.threads.push(
    makeSidebarThread({
      id: "plain-personal",
      title: "Plain Personal chat",
      projectId: "proj_personal",
    }),
  );
  return f;
}
