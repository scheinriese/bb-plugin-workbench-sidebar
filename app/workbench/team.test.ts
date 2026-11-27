import { makeSidebarThread } from "../model/fixtures.js";
import { expect, it } from "vitest";
import { teamFixture } from "./team-fixtures.js";
import {
  memberPreview,
  resolveTeamProjects,
  groupTeamProjects,
  buildTeamIndex,
  partitionTeamThreads,
  showTeamProvider,
  teamMemberVisualState,
} from "./team.js";
import { applyBoatState } from "./presentation.js";
it("moves homes once and keeps project work nested without its hidden lead", () => {
  const { team, threads, states } = teamFixture();
  const decorated = applyBoatState(
    threads,
    new Map(states.map((s) => [s.threadId, s])),
  );
  const result = partitionTeamThreads(decorated, team);
  expect(result.members).toHaveLength(6);
  expect(result.sections).toHaveLength(4);
  expect(result.sections.every((t) => t.parentThreadId === null)).toBe(true);
  expect(
    result.sections.some((t) => team.hideFromSections.includes(t.id)),
  ).toBe(false);
  expect(partitionTeamThreads(threads).sections).toBe(threads);
  expect(partitionTeamThreads(threads, undefined).sections).toBe(threads);
});
it("keeps deep nesting and non-project member work", () => {
  const { team, threads } = teamFixture();
  const base = threads[0];
  const review = {
    ...base,
    id: "review",
    parentThreadId: "thr_pricing",
    projectId: "web",
  };
  const sub = {
    ...base,
    id: "sub",
    parentThreadId: "review",
    projectId: "web",
  };
  const car = { ...base, id: "car", parentThreadId: "thr_olive" };
  const result = partitionTeamThreads([...threads, review, sub, car], team);
  expect(result.sections.find((t) => t.id === "sub")?.parentThreadId).toBe(
    "review",
  );
  expect(result.members.find((t) => t.id === "car")?.parentThreadId).toBe(
    "thr_olive",
  );
});
it("prioritizes needs-you, activity, unread totals, then last message; project is neutral", () => {
  const m = teamFixture().team.members[4];
  expect(memberPreview(m).text).toContain("jobs database key");
  expect(memberPreview(m, "Web app")).toEqual({
    text: "in Web app",
    tone: "neutral",
  });
  expect(
    memberPreview({
      ...m,
      preview: { kind: "activity", text: "Working", tone: "neutral" },
    }).text,
  ).toBe("Working");
  expect(
    memberPreview({
      ...m,
      preview: { kind: "last-message", text: "Hello", tone: "neutral" },
      unread: { messages: 2, cards: 1 },
    }).text,
  ).toBe("3 unread");
});
it("keeps plain marks; omits Team defaults; always marks reviews", () => {
  const { team, states } = teamFixture();
  const task = states[0];
  const member = team.members[0];
  expect(showTeamProvider(undefined, undefined, undefined, false)).toBe(true);
  expect(showTeamProvider(task, member, undefined, false)).toBe(false);
  expect(showTeamProvider(task, undefined, member, false)).toBe(false);
  expect(
    showTeamProvider({ ...task, provider: "codex" }, undefined, member, false),
  ).toBe(true);
  expect(
    showTeamProvider({ ...task, role: "review" }, undefined, member, false),
  ).toBe(true);
  expect(showTeamProvider(task, member, undefined, true)).toBe(true);
});
it("resolves project ownership through hidden leads without changing host project facts", () => {
  const { team, threads } = teamFixture();
  const worker = {
    ...threads[0]!,
    id: "cross",
    projectId: "personal",
    parentThreadId: "thr_web-lead",
  };
  team.members[0]!.backgroundThreadIds = ["cross"];
  const result = partitionTeamThreads([...threads, worker], team);
  expect(
    result.sections.find((t) => t.id === "cross")?.workbenchTeamProjectId,
  ).toBe("web");
  expect(result.sections.find((t) => t.id === "cross")?.projectId).toBe(
    "personal",
  );
  expect(
    result.members.find((t) => t.id === "thr_iris")?.workbenchTeamProjectId,
  ).toBe("web");
});

it("does not treat active lifecycle as measured work activity", () => {
  const { team, states } = teamFixture();
  const idle = team.members[1]!;
  const working = team.members[6]!;
  const boat = new Map(states.map((s) => [s.threadId, s]));
  expect(teamMemberVisualState(idle, boat)).toBe("idle");
  expect(teamMemberVisualState(working, boat)).toBe("working");
  expect(teamMemberVisualState({ ...working, status: "paused" }, boat)).toBe(
    "paused",
  );
  expect(teamMemberVisualState({ ...working, status: "archived" }, boat)).toBe(
    "quiet",
  );
});
it("keeps the chief's latest line even when the engine labels its kind needs-you", () => {
  const lead = teamFixture().team.lead!;
  expect(lead.preview.kind).toBe("needs-you");
  expect(memberPreview(lead)).toEqual({
    text: "The car service is booked for Thursday",
    tone: "neutral",
  });
});

it("uses a task's own measured state instead of another assignment's activity", () => {
  const { team, states } = teamFixture();
  const member = {
    ...team.members[0]!,
    backgroundThreadIds: ["thr_pricing", "thr_search"],
  };
  const boat = new Map(states.map((row) => [row.threadId, row]));
  expect(teamMemberVisualState(member, boat)).toBe("working");
  expect(teamMemberVisualState(member, boat, "thr_pricing")).toBe("waiting");
});

it("never treats a shared BB project or Personal as Team ownership", () => {
  const f = teamFixture();
  const plainWeb = makeSidebarThread({
    id: "my-web-chat",
    projectId: "web",
    sectionId: "my-section",
  });
  const personal = makeSidebarThread({
    id: "my-personal-chat",
    projectId: "personal",
  });
  f.team.projects.push({
    bbProjectId: "personal",
    orchestratorProjectId: null,
    leadThreadId: "projectless-lead",
    icon: "Folder",
  });
  const result = partitionTeamThreads(
    [...f.threads, plainWeb, personal],
    f.team,
  );
  expect(result.sections.find((t) => t.id === plainWeb.id)).toBe(plainWeb);
  expect(result.sections.find((t) => t.id === personal.id)).toBe(personal);
  expect(
    result.members.some((t) => t.id === plainWeb.id || t.id === personal.id),
  ).toBe(false);
});
it("places explicitly owned work and descendants, without sweeping sibling chats", () => {
  const f = teamFixture();
  f.team.members[0]!.backgroundThreadIds = ["assigned"];
  const assigned = makeSidebarThread({
    id: "assigned",
    projectId: "web",
    parentThreadId: "thr_web-lead",
  });
  const child = makeSidebarThread({
    id: "assigned-child",
    projectId: "personal",
    parentThreadId: "assigned",
  });
  const plain = makeSidebarThread({ id: "plain-sibling", projectId: "web" });
  const result = partitionTeamThreads(
    [...f.threads, assigned, child, plain],
    f.team,
  );
  expect(
    result.sections.find((t) => t.id === assigned.id)
      ?.workbenchTeamLeadThreadId,
  ).toBe("thr_web-lead");
  expect(
    result.sections.find((t) => t.id === child.id)?.workbenchTeamLeadThreadId,
  ).toBe("thr_web-lead");
  expect(result.sections.find((t) => t.id === plain.id)).toBe(plain);
});
it("keeps two leads in a shared project separate by ancestry", () => {
  const f = teamFixture();
  f.team.projects.push({
    bbProjectId: "web",
    orchestratorProjectId: null,
    leadThreadId: "other-lead",
    icon: "Book",
  });
  const taskA = makeSidebarThread({
    id: "a",
    projectId: "web",
    parentThreadId: "thr_web-lead",
  });
  const taskB = makeSidebarThread({
    id: "b",
    projectId: "web",
    parentThreadId: "other-lead",
  });
  const result = partitionTeamThreads([...f.threads, taskA, taskB], f.team);
  expect(
    result.sections.find((t) => t.id === "a")?.workbenchTeamLeadThreadId,
  ).toBe("thr_web-lead");
  expect(
    result.sections.find((t) => t.id === "b")?.workbenchTeamLeadThreadId,
  ).toBe("other-lead");
});
it("precomputes the roster, assignees, inherited review owners and orbit once", () => {
  const f = teamFixture();
  const states = new Map(f.states.map((s) => [s.threadId, s]));
  states.set("deep-review", {
    ...f.states[0]!,
    threadId: "deep-review",
    role: "review",
    parentThreadId: "thr_pricing",
  });
  const index = buildTeamIndex(f.team, states);
  expect(index.assignees.get("deep-review")?.memberId).toBe("iris");
  expect(index.membersByHome.get("thr_nora")?.kind).toBe("lead");
  expect(index.orbit.map((m) => m.memberId)).toEqual(["docs-lead"]);
  expect(index.projectIcons.get("thr_docs-lead")).toBe("Folder");
});

it("uses the lead native home project even if the claimed id is Personal", () => {
  const f = teamFixture();
  f.team.projects[0]!.bbProjectId = "personal";
  const projects = f.projects.map((p) => ({
    ...p,
    threads: f.threads.filter((t) => t.projectId === p.id),
  }));
  expect(
    resolveTeamProjects(f.team, projects).find(
      (p) => p.teamProject.leadThreadId === "thr_web-lead",
    )?.project.id,
  ).toBe("web");
});
it("does not invent an empty Personal header from an unknown id or an unloaded home", () => {
  const f = teamFixture();
  f.team.projects[0]!.bbProjectId = "hm-portfolio";
  const home = f.threads.find((t) => t.id === "thr_web-lead")!;
  home.projectId = "personal";
  f.threads = f.threads.filter((t) => t.parentThreadId !== home.id);
  const projects = f.projects.map((p) => ({
    ...p,
    threads: f.threads.filter((t) => t.projectId === p.id),
  }));
  const resolved = resolveTeamProjects(f.team, projects).find(
    (p) => p.teamProject.leadThreadId === home.id,
  )!;
  expect(resolved.project.name).toBe("Web app");
  expect(resolved.project.name).not.toBe("Personal");
});

it("groups aliases into one project while retaining both work trees and all lead ids", () => {
  const f = teamFixture();
  const alias = { ...f.team.projects[0]!, leadThreadId: "alias-home" };
  f.team.projects.push({ ...f.team.projects[0]! }, alias);
  f.threads.push(
    makeSidebarThread({ id: "alias-home", projectId: "web" }),
    makeSidebarThread({
      id: "alias-work",
      projectId: "web",
      parentThreadId: "alias-home",
    }),
  );
  const projects = f.projects.map((p) => ({
    ...p,
    threads: f.threads.filter((t) => t.projectId === p.id),
  }));
  const resolved = resolveTeamProjects(f.team, projects);
  const placement = partitionTeamThreads(f.threads, {
    ...f.team,
    projects: resolved.map((p) => p.teamProject),
  });
  const groups = groupTeamProjects(resolved, placement.sections, new Set());
  expect(groups).toHaveLength(2);
  const web = groups.find((g) => g.project.id === "web")!;
  expect(web.leadThreadIds).toEqual(["thr_web-lead", "alias-home"]);
  expect(web.project.threads.some((t) => t.id === "alias-work")).toBe(true);
  expect(web.project.threads.some((t) => t.id === "thr_checkout")).toBe(true);
});
