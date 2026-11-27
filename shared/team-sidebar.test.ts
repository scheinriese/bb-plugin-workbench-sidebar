import { describe, expect, it } from "vitest";
import { parseTeamSidebar } from "./team-sidebar.js";
import { sidebarRpcMethods } from "./boat-sidebar.js";
import { teamFixture } from "../app/workbench/team-fixtures.js";

describe("optional Team compatibility boundary", () => {
  it("parses the two canonical snapshots", () => {
    expect(parseTeamSidebar(teamFixture("09:00").team)?.yourMove.count).toBe(2);
    expect(parseTeamSidebar(teamFixture().team)?.yourMove).toEqual({
      count: 3,
      confirm: 1,
      overdue: 0,
    });
  });
  it("defaults nonessential partial fields", () => {
    const lead = {
      memberId: "nora",
      threadId: "thr_nora",
      name: "Nora",
      kind: "chief",
    };
    expect(
      parseTeamSidebar({ enabled: true, lead, yourMove: { count: 0 } })
        ?.members,
    ).toEqual([]);
  });
  it.each([
    undefined,
    null,
    {},
    { enabled: false },
    { enabled: true, lead: null },
    { ...teamFixture().team, yourMove: { count: -1 } },
    { ...teamFixture().team, members: [false] },
  ])(
    "ignores missing, disabled or malformed blocks without dropping Boat",
    (value) => {
      expect(parseTeamSidebar(value)).toBeUndefined();
      expect(
        sidebarRpcMethods.sidebarState.output.parse({
          version: 1,
          revision: "a",
          threads: [],
          truncated: false,
          team: value,
        }).threads,
      ).toEqual([]);
    },
  );
  it("strips future additions and bounds lists", () => {
    expect(
      parseTeamSidebar({ ...teamFixture().team, future: 123 }),
    ).not.toHaveProperty("future");
    expect(
      parseTeamSidebar({
        ...teamFixture().team,
        members: Array(201).fill(teamFixture().team.lead),
      }),
    ).toBeUndefined();
  });
});
