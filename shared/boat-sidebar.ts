// Boat is independent of the sidebar. Consumers call this additive v1 RPC.
import { z } from "zod";
/** Team uses sidebarState's v1 envelope; it has no separate wire version field.
 * Synced with Harbormaster contract-team.ts at e0dce6d. */
export const TEAM_SIDEBAR_VERSION = 1 as const;
export const teamPreviewSchema = z.object({
  kind: z.enum(["needs-you", "activity", "counts", "last-message"]),
  text: z.string(),
  tone: z.enum(["neutral", "attention", "danger", "success"]),
});
export const teamMemberSchema = z.object({
  memberId: z.string(),
  threadId: z.string().min(1),
  name: z.string(),
  kind: z.enum(["lead", "specialist", "project-lead"]),
  avatar: z.object({ initials: z.string(), color: z.string() }),
  status: z.enum(["active", "paused", "archived"]),
  preview: teamPreviewSchema,
  unread: z.object({
    messages: z.number().int().nonnegative(),
    cards: z.number().int().nonnegative(),
  }),
  order: z.number().int(),
  backgroundThreadIds: z.array(z.string()),
});
const teamSidebarV1Schema = z.object({
  enabled: z.literal(true),
  yourMove: z.object({
    count: z.number().int().nonnegative(),
    overdue: z.number().int().nonnegative(),
    confirm: z.number().int().nonnegative(),
  }),
  projects: z.array(
    z.object({
      bbProjectId: z.string(),
      icon: z.string(),
      leadThreadId: z.string(),
    }),
  ),
  lead: teamMemberSchema.nullable(),
  members: z.array(teamMemberSchema),
  hideFromSections: z.array(z.string()),
  revision: z.string(),
  truncated: z.boolean(),
});
// A future explicit block version must not be silently interpreted as v1.
export const teamSidebarSchema = z.preprocess(
  (value) =>
    value &&
    typeof value === "object" &&
    "version" in value &&
    value.version !== TEAM_SIDEBAR_VERSION
      ? undefined
      : value,
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
