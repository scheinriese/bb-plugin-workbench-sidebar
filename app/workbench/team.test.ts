import { expect, it } from "vitest";
import { teamFixture } from "./team-fixtures.js";
import {
  memberPreview,
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
