// Boat is independent of the sidebar. Consumers call this additive v1 RPC.
import { z } from "zod";
/** Versioned Team projection, synced with Harbormaster ce85486. */
export const TEAM_SIDEBAR_VERSION = 1 as const;
export const TEAM_SIDEBAR_LIMITS = {
  members: 200,
  projects: 200,
  hidden: 201,
  backgroundThreads: 100,
} as const;
const sidebarId = z.string().min(1).max(200);
export const teamPreviewSchema = z.object({
  kind: z.enum(["needs-you", "activity", "counts", "last-message"]),
  text: z.string().max(160),
  tone: z.enum(["neutral", "attention", "danger", "success"]),
});
export const teamMemberSchema = z.object({
  memberId: sidebarId,
  threadId: sidebarId,
  bbProjectId: sidebarId,
  orchestratorProjectId: sidebarId.nullable(),
  name: z.string().max(40),
  kind: z.enum(["lead", "specialist", "project-lead"]),
  avatar: z.object({ initials: z.string().max(8), color: z.string().max(32) }),
  status: z.enum(["active", "paused", "archived"]),
  preview: teamPreviewSchema,
  unread: z.object({
    messages: z.number().int().nonnegative(),
    cards: z.number().int().nonnegative(),
  }),
  order: z.number().int(),
  backgroundThreadIds: z
    .array(sidebarId)
    .max(TEAM_SIDEBAR_LIMITS.backgroundThreads),
});
const teamSidebarV1Schema = z.object({
  version: z.literal(1),
  enabled: z.literal(true),
  yourMove: z.object({
    count: z.number().int().nonnegative(),
    overdue: z.number().int().nonnegative(),
    confirm: z.number().int().nonnegative(),
  }),
  projects: z
    .array(
      z.object({
        bbProjectId: sidebarId,
        orchestratorProjectId: sidebarId.nullable(),
        icon: z.string().max(64),
        leadThreadId: sidebarId,
      }),
    )
    .max(TEAM_SIDEBAR_LIMITS.projects),
  lead: teamMemberSchema.nullable(),
  members: z.array(teamMemberSchema).max(TEAM_SIDEBAR_LIMITS.members),
  hideFromSections: z.array(sidebarId).max(TEAM_SIDEBAR_LIMITS.hidden),
  revision: z.string().max(64),
  truncated: z.boolean(),
});
/** Slice before validating: oversized projections retain their chief/count and
 * expose truncation instead of disabling Team or walking unbounded arrays. */
function boundTeamProjection(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  let truncated = false;
  const slice = (value: unknown, cap: number) => {
    if (!Array.isArray(value)) return value;
    if (value.length > cap) truncated = true;
    return value.slice(0, cap);
  };
  const member = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return value;
    const row = value as Record<string, unknown>;
    return {
      ...row,
      backgroundThreadIds: slice(
        row.backgroundThreadIds,
        TEAM_SIDEBAR_LIMITS.backgroundThreads,
      ),
    };
  };
  const members = slice(input.members, TEAM_SIDEBAR_LIMITS.members);
  const projects = slice(input.projects, TEAM_SIDEBAR_LIMITS.projects);
  const hidden = slice(input.hideFromSections, TEAM_SIDEBAR_LIMITS.hidden);
  const lead = input.lead === null ? null : member(input.lead);
  const boundedMembers = Array.isArray(members) ? members.map(member) : members;
  return {
    ...input,
    lead,
    members: boundedMembers,
    projects,
    hideFromSections: hidden,
    // Do not hide malformed/missing flags by supplying a default.
    truncated:
      typeof input.truncated === "boolean"
        ? input.truncated || truncated
        : input.truncated,
  };
}
export const teamSidebarSchema = z.preprocess(
  boundTeamProjection,
  teamSidebarV1Schema,
);
export type TeamSidebarDto = z.infer<typeof teamSidebarSchema>;
export type TeamMemberDto = z.infer<typeof teamMemberSchema>;
/** Invalid additive Team data must not discard otherwise valid Boat rows. */
export const optionalTeamSidebarSchema = teamSidebarSchema
  .optional()
  .catch(undefined);
export function parseTeamSidebar(value: unknown): TeamSidebarDto | undefined {
  return optionalTeamSidebarSchema.parse(value);
}
export const sidebarStatusSchema = z.enum([
  "working",
  "review",
  "ready",
  "shipped",
  "needs-you",
  "broken",
  "stopped",
  "waiting-reset",
]);
export const sidebarThreadSchema = z.object({
  threadId: z.string(),
  role: z.enum(["orchestrator", "task", "review", "chat"]),
  status: sidebarStatusSchema,
  provider: z.enum(["claude", "codex"]).nullable(),
  moving: z.boolean().optional(),
  secondLine: z
    .object({
      text: z.string(),
      tone: z.enum(["neutral", "attention", "danger", "success"]),
    })
    .nullable(),
  parentThreadId: z.string().nullable(),
  rollup: z
    .object({
      needsYou: z.number(),
      stopped: z.number(),
      ready: z.number(),
      working: z.number(),
      shippedToday: z.number(),
    })
    .nullable(),
  createdFor: z.enum(["you"]).nullable(),
  listedIn: z.string().nullable(),
  hidden: z.boolean(),
  updatedAt: z.string(),
});
export type SidebarThreadDto = z.infer<typeof sidebarThreadSchema>;
export const sidebarQueuedStartSchema = z.object({
  id: z.string().min(1).max(100),
  revision: z.number().int().nonnegative(),
  title: z.string().max(200),
  sourceThreadId: z.string().max(200).nullable(),
  provider: z.enum(["claude", "codex"]).nullable(),
  resetsAt: z.string().max(100).nullable(),
  createdAt: z.string().max(100),
  state: z.enum(["waiting", "dispatching", "started"]),
  taskId: z.string().max(200).nullable(),
  taskThreadId: z.string().max(200).nullable(),
  secondLine: z
    .object({ text: z.string().max(200), tone: z.literal("neutral") })
    .nullable()
    .optional(),
});
export type SidebarQueuedStartDto = z.infer<typeof sidebarQueuedStartSchema>;
export const sidebarRpcMethods = {
  sidebarState: {
    input: z.object({
      version: z.literal(1),
      timeZone: z.string().max(64).optional(),
      timezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
    }),
    output: z.object({
      version: z.literal(1),
      revision: z.string(),
      threads: z.array(sidebarThreadSchema).max(2000),
      queuedStarts: z.array(sidebarQueuedStartSchema).max(200).optional(),
      truncated: z.boolean(),
      team: optionalTeamSidebarSchema,
    }),
  },
};
