import { z } from "zod";

const id = z.string().min(1).max(200);
const text = z.string().max(500);
const count = z.number().int().nonnegative().max(100000);
export const teamPreviewSchema = z.object({
  kind: z.enum(["needs-you", "activity", "counts", "last-message"]),
  text,
  tone: z
    .enum(["neutral", "attention", "danger", "success"])
    .default("neutral"),
});
export const teamMemberSchema = z.object({
  memberId: id,
  threadId: id,
  name: z.string().min(1).max(100),
  kind: z.enum(["chief", "project-lead", "specialist"]),
  avatar: z.string().max(100).default(""),
  status: z
    .enum([
      "idle",
      "working",
      "waiting",
      "paused",
      "stalled",
      "error",
      "failed",
      "quiet",
      "needs-you",
      "attention",
    ])
    .default("idle"),
  preview: teamPreviewSchema.nullable().default(null),
  unread: z
    .object({ messages: count.default(0), cards: count.default(0) })
    .default({ messages: 0, cards: 0 }),
  order: z.number().int().default(0),
  backgroundThreadIds: z.array(id).max(200).default([]),
  projectId: id.nullable().optional(),
  provider: z.enum(["claude", "codex"]).nullable().optional(),
});
export const teamSidebarSchema = z.object({
  enabled: z.boolean(),
  yourMove: z.object({
    count,
    overdue: count.default(0),
    confirm: count.default(0),
  }),
  projects: z
    .array(
      z.object({
        bbProjectId: id,
        icon: z.string().max(100),
        leadThreadId: id,
      }),
    )
    .max(200)
    .default([]),
  lead: teamMemberSchema,
  members: z.array(teamMemberSchema).max(200).default([]),
  hideFromSections: z.array(id).max(2000).default([]),
});
export type TeamSidebarDto = z.infer<typeof teamSidebarSchema>;
export type TeamMemberDto = z.infer<typeof teamMemberSchema>;
/** One compatibility boundary. A bad additive block must not discard Boat rows. */
export const optionalTeamSidebarSchema = teamSidebarSchema
  .optional()
  .catch(undefined);
export function parseTeamSidebar(value: unknown): TeamSidebarDto | undefined {
  const parsed = optionalTeamSidebarSchema.parse(value);
  return parsed?.enabled ? parsed : undefined;
}
