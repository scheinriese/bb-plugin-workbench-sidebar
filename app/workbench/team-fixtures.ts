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
    kind: "specialist",
    avatar: memberId,
    status: "idle",
    preview: null,
    unread: { messages: 0, cards: 0 },
    order: 0,
    backgroundThreadIds: [],
    ...extra,
  });
  const team = teamSidebarSchema.parse({
    enabled: true,
    yourMove: { count: morning ? 2 : 3, overdue: 0, confirm: morning ? 0 : 1 },
    lead: member("nora", "Nora", {
      kind: "chief",
      preview: {
        kind: "last-message",
        text: morning
          ? "Morning check-in at 09:00"
          : "The car service is booked for Thursday",
        tone: "neutral",
      },
    }),
    members: [
      member("iris", "Iris", {
        projectId: "web",
        order: 0,
        status: morning ? "needs-you" : "waiting",
        backgroundThreadIds: ["thr_pricing"],
      }),
      member("developer", "Developer", { order: 1 }),
      member("writer", "Writer", {
        projectId: "docs",
        order: 2,
        status: morning ? "working" : "needs-you",
        backgroundThreadIds: ["thr_notes"],
      }),
      member("olive", "Olive", {
        order: 3,
        preview: {
          kind: "last-message",
          text: morning ? "Idle" : "Booked Thu 3 Dec, 08:30",
          tone: "neutral",
        },
      }),
      member("scout", "Scout", {
        order: 4,
        status: morning ? "idle" : "waiting",
        preview: morning
          ? null
          : {
              kind: "needs-you",
              text: "Enter the new jobs database key",
              tone: "attention",
            },
        unread: { messages: 0, cards: morning ? 0 : 1 },
      }),
      member("web-lead", "Web app lead", {
        kind: "project-lead",
        provider: "claude",
        status: "needs-you",
        backgroundThreadIds: ["thr_checkout"],
      }),
      member("docs-lead", "Docs lead", {
        kind: "project-lead",
        provider: "claude",
        status: "working",
        backgroundThreadIds: ["thr_search"],
      }),
    ],
    projects: [
      { bbProjectId: "web", icon: "Globe", leadThreadId: "thr_web-lead" },
      { bbProjectId: "docs", icon: "Book", leadThreadId: "thr_docs-lead" },
    ],
    hideFromSections: [
      "thr_nora",
      "thr_iris",
      "thr_developer",
      "thr_writer",
      "thr_olive",
      "thr_scout",
      "thr_web-lead",
      "thr_docs-lead",
    ],
  });
  const projects = [
    makePluginProject({ id: "personal", name: "Personal", isPersonal: true }),
    makePluginProject({ id: "web", name: "Web app" }),
    makePluginProject({ id: "docs", name: "Docs site" }),
  ];
  const threads = [team.lead, ...team.members].map((m) =>
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
    assigneeMemberId: string,
    role: SidebarThreadDto["role"] = "task",
    provider: "claude" | "codex" = "claude",
  ) {
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
      assigneeMemberId,
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
