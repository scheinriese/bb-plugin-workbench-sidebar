import { describe, expect, it } from "vitest";
import {
  parseTeamSidebar,
  teamMemberSchema,
  TEAM_SIDEBAR_VERSION,
} from "./team-sidebar.js";
import { sidebarRpcMethods } from "./boat-sidebar.js";
import { teamFixture } from "../app/workbench/team-fixtures.js";

const envelope = (team?: unknown, version = 1) => ({
  version,
  revision: "outer-v1",
  threads: teamFixture().states,
  truncated: false,
  ...(team === undefined ? {} : { team }),
});
describe("Harbormaster sidebarState Team v1 compatibility", () => {
  it("parses the actual required fields without defaults, additions or loss", () => {
    expect(TEAM_SIDEBAR_VERSION).toBe(1);
    for (const time of ["09:00", "14:30"] as const) {
      const team = teamFixture(time).team;
      expect(parseTeamSidebar(team)).toEqual(team);
      expect(
        sidebarRpcMethods.sidebarState.output.parse(envelope(team)).team,
      ).toEqual(team);
      expect(team.lead!.kind).toBe("lead");
      expect(team.lead!.avatar).toEqual({ initials: "N", color: "blue" });
      expect(team.lead!.status).toBe("active");
      expect(team.lead!.preview.kind).toBe("needs-you");
      expect(team.revision).toBe(`example-${time}`);
      expect(team.truncated).toBe(false);
      expect(team.yourMove.count).toBe(time === "09:00" ? 2 : 3);
    }
  });
  it("accepts a null lead before a real home exists", () => {
    const team = { ...teamFixture().team, lead: null, truncated: true };
    expect(parseTeamSidebar(team)).toEqual(team);
  });
  it.each(["lead", "specialist", "project-lead"])(
    "accepts the producer kind %s",
    (kind) => {
      expect(
        teamMemberSchema.safeParse({ ...teamFixture().team.lead!, kind })
          .success,
      ).toBe(true);
    },
  );
  it.each(["active", "paused", "archived"])(
    "accepts lifecycle %s, not activity status",
    (status) => {
      expect(
        teamMemberSchema.safeParse({ ...teamFixture().team.lead!, status })
          .success,
      ).toBe(true);
    },
  );
  it.each(["neutral", "attention", "danger", "success"])(
    "accepts the producer tone %s",
    (tone) => {
      const lead = teamFixture().team.lead!;
      expect(
        teamMemberSchema.safeParse({
          ...lead,
          preview: { ...lead.preview, tone },
        }).success,
      ).toBe(true);
    },
  );
  it.each([
    "yourMove",
    "projects",
    "lead",
    "members",
    "hideFromSections",
    "revision",
    "truncated",
  ])("rejects partial data missing %s without losing Boat rows", (key) => {
    const team: Record<string, unknown> = { ...teamFixture().team };
    delete team[key];
    expect(parseTeamSidebar(team)).toBeUndefined();
    const parsed = sidebarRpcMethods.sidebarState.output.parse(envelope(team));
    expect(parsed.team).toBeUndefined();
    expect(parsed.threads).toEqual(teamFixture().states);
  });
  it.each([
    undefined,
    null,
    {},
    { enabled: false },
    { ...teamFixture().team, enabled: false },
    { ...teamFixture().team, yourMove: { count: -1, overdue: 0, confirm: 0 } },
    { ...teamFixture().team, members: [false] },
    { ...teamFixture().team, version: 2 },
    {
      ...teamFixture().team,
      lead: { ...teamFixture().team.lead, avatar: "nora" },
    },
    {
      ...teamFixture().team,
      lead: { ...teamFixture().team.lead, kind: "chief" },
    },
    {
      ...teamFixture().team,
      lead: { ...teamFixture().team.lead, status: "working" },
    },
    {
      ...teamFixture().team,
      lead: {
        ...teamFixture().team.lead,
        preview: { kind: "activity", text: "Ready", tone: "slate" },
      },
    },
  ])(
    "ignores absent, disabled, malformed or explicitly unknown Team versions",
    (value) => {
      expect(parseTeamSidebar(value)).toBeUndefined();
      expect(
        sidebarRpcMethods.sidebarState.output.parse(envelope(value)).team,
      ).toBeUndefined();
    },
  );
  it("rejects unknown or missing envelope versions", () => {
    expect(
      sidebarRpcMethods.sidebarState.output.safeParse(
        envelope(teamFixture().team, 2),
      ).success,
    ).toBe(false);
    const { version: _version, ...missing } = envelope();
    expect(
      sidebarRpcMethods.sidebarState.output.safeParse(missing).success,
    ).toBe(false);
  });
  it("strips uncontracted member and thread hints instead of consuming invented fields", () => {
    const f = teamFixture();
    const parsed = sidebarRpcMethods.sidebarState.output.parse({
      ...envelope({
        ...f.team,
        future: 1,
        members: [
          { ...f.team.members[0], projectId: "web", provider: "codex" },
        ],
      }),
      threads: [
        {
          ...f.states[0],
          assigneeMemberId: "iris",
          defaultProvider: "codex",
          handoff: {
            from: "claude",
            to: "codex",
            at: "16:00",
            reason: "limit",
          },
        },
      ],
    });
    expect(parsed.team).not.toHaveProperty("future");
    expect(parsed.team!.members[0]).not.toHaveProperty("projectId");
    expect(parsed.team!.members[0]).not.toHaveProperty("provider");
    expect(parsed.threads[0]).not.toHaveProperty("assigneeMemberId");
    expect(parsed.threads[0]).not.toHaveProperty("defaultProvider");
    expect(parsed.threads[0]).not.toHaveProperty("handoff");
  });
});

it("requires the final explicit nested version and enforces string limits", () => {
  const { version: _, ...unversioned } = teamFixture().team;
  expect(parseTeamSidebar(unversioned)).toBeUndefined();
  const team = teamFixture().team;
  for (const lead of [
    { ...team.lead!, memberId: "" },
    { ...team.lead!, threadId: "x".repeat(201) },
    { ...team.lead!, name: "x".repeat(41) },
    { ...team.lead!, avatar: { initials: "x".repeat(9), color: "blue" } },
    { ...team.lead!, avatar: { initials: "A", color: "x".repeat(33) } },
    {
      ...team.lead!,
      preview: { ...team.lead!.preview, text: "x".repeat(161) },
    },
  ])
    expect(parseTeamSidebar({ ...team, lead })).toBeUndefined();
});
it("slices oversized arrays before validation, retains the chief/all asks and marks truncation", () => {
  const f = teamFixture();
  const input = {
    ...f.team,
    yourMove: { count: 999, overdue: 2, confirm: 4 },
    lead: {
      ...f.team.lead!,
      backgroundThreadIds: Array.from({ length: 101 }, (_, i) => `chief-${i}`),
    },
    members: [
      ...Array.from({ length: 200 }, (_, i) => ({
        ...f.team.members[0]!,
        memberId: `m${i}`,
        backgroundThreadIds: Array.from({ length: 101 }, (_, n) => `b${n}`),
      })),
      false,
    ],
    projects: [...Array(200).fill(f.team.projects[0]), false],
    hideFromSections: [...Array(201).fill("home"), false],
  };
  const parsed = parseTeamSidebar(input)!;
  expect(parsed.members).toHaveLength(200);
  expect(parsed.projects).toHaveLength(200);
  expect(parsed.hideFromSections).toHaveLength(201);
  expect(parsed.members[0]!.backgroundThreadIds).toHaveLength(100);
  expect(parsed.lead!.backgroundThreadIds).toHaveLength(100);
  expect(parsed.lead!.threadId).toBe("thr_nora");
  expect(parsed.yourMove).toEqual(input.yourMove);
  expect(parsed.truncated).toBe(true);
});
