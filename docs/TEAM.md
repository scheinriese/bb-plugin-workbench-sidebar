# Team in Workbench

Team is optional. Workbench still makes one bounded, read-only `boat.sidebarState`
v1 request, every 3 seconds foreground / 30 seconds background. Missing, disabled
or malformed Team data leaves the existing sidebar intact; a bad Team block
never discards valid Boat thread rows. No Team RPC writes are made.

## Build, install and rollback

In a checkout of the `team` branch, with the bb CLI on PATH:

```sh
npm ci --ignore-scripts
npm rebuild better-sqlite3
npm run build
npm run typecheck
npm test
npm run lint
# Operator only, after reviewing the draft PR:
bb plugin install <checkout>
```

`<checkout>` means this repository's checkout directory. The install command
was **not** run by the task agent: it would reach the live bb instance.
Rollback without changing any chats: `bb plugin disable workbench-sidebar`.
To roll back just this version, check out the prior reviewed revision, rebuild,
and let the operator reinstall that checkout. No host thread data is migrated.

Organize → Rows → **Show provider on every row** is off by default.
Organize → Appearance → **Calm faces** selects H2 instead of H3 Orbit.
The Team disclosure and existing project/thread disclosures are persisted.
The needs-you pill opens `/plugins/boat/cloud-agents/today`, using the current
Harbormaster panel path `cloud-agents` and `today` subpath. Tile and member links
open existing home chats; project header links open existing lead chats.

## Parsed DTO (consumer contract)

`shared/team-sidebar.ts` is the single Team compatibility boundary. Unknown
properties are stripped. The additive `team` field on v1 is:

```ts
type Team = {
  enabled: boolean;
  yourMove: { count: number; overdue?: number; confirm?: number };
  lead: Member;
  members?: Member[]; // max 200
  projects?: { bbProjectId: string; icon: string; leadThreadId: string }[];
  hideFromSections?: string[]; // max 2000
};
type Member = {
  memberId: string; threadId: string; name: string;
  kind: 'chief' | 'project-lead' | 'specialist';
  avatar?: string; // local identity key; never arbitrary markup or a remote URL
  status?: 'idle' | 'working' | 'waiting' | 'paused' | 'stalled' | 'error'
    | 'failed' | 'quiet' | 'needs-you' | 'attention';
  preview?: { kind: 'needs-you' | 'activity' | 'counts' | 'last-message';
    text: string; tone?: 'neutral' | 'attention' | 'danger' | 'success' } | null;
  unread?: { messages?: number; cards?: number };
  order?: number;
  backgroundThreadIds?: string[];
  projectId?: string | null;
  provider?: 'claude' | 'codex' | null;
};
```

IDs are nonempty strings up to 200 characters, names up to 100, preview text
up to 500. Counts are nonnegative integers, capped at 100,000. Missing counts
other than `yourMove.count` default to zero; missing arrays to empty; missing
status to idle; missing preview to null; missing order to zero. Missing required
identity/count fields or invalid enum values ignore the whole Team block.

Optional additive **thread** fields parsed in `shared/boat-sidebar.ts`:

```ts
assigneeMemberId?: string;
defaultProvider?: 'claude' | 'codex';
handoff?: { from: 'claude' | 'codex'; to: 'claude' | 'codex';
  at: string; reason: string };
```

An assignee can also be found through `backgroundThreadIds`. Default provider
falls back to the member's provider, then Claude; plain non-Team rows retain
their old provider rules. Invalid handoffs are ignored. Review marks always
show. A task's face and neutral running ring are independent of its mark.

**Producer alignment:** the upstream `team` branch at `659f604` publishes the
§11 sketch and design assets, but no implemented Team DTO yet. The consumer's
optional `projectId`, `provider`, and thread assignment/handoff fields above
are explicitly provisional. Align this one parser with the engine's exact
reported DTO before joint release; no engine behavior has been invented here.
The chief must supply her latest line as `preview.kind = 'last-message'`.
Workbench never substitutes a next-ask title or unread count for that line.

## Presentation and evidence

H3/H2 SVGs are copied from the upstream design handoff at `659f604`, unchanged,
under `assets/team/`. `node scripts/team-assets.mjs` rebuilds the trusted inline
SVG module (bb's build has no CSS SVG loader). No placeholders remain.
Unknown identity keys use the Developer silhouette, never external resources.
Dark/light variants, baked state badges, 18 px dock discs with a 10 px step,
64 × 50 orbit slot, 64 px tile, static reduced-motion states and background/
unfocused pauses are implemented. The orbit uses one rAF loop and a 36 s lap.
H2 has no orbit/dock; hover provides breathe/blink/glance.

The orbit and dock are driven by member statuses and assignment ownership, not
by a clock or hardcoded snapshot. Project asks stay on blocked work rows,
not repeated on member rows. Projectless work remains below its member.
Project tasks use the existing recursive tree, context menus, pinning, drafts,
new-thread action, collapse preferences and hidden-groups/More controls.

The isolated fixture preview uses the public SDK test runtime, not live bb:

```sh
npm run build
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.on.boat.dev \
  node_modules/.bin/vite --config scripts/team-preview.config.ts \
  --host 0.0.0.0 --port 4173
```

Open `/`, `/?time=09:00`, `/?light`, `/?phone`, or `/?calm` on the preview host.
Its surrounding chrome and named icon stand-ins are preview-only. Fictional
fixtures come from `EXAMPLE-DAY.md` (14:30 Nora preview follows the later
latest-line decision). Live installation screenshots remain operator-owned.

### Known limits

- Joint engine integration and the final Today route require producer alignment.
- Orbit re-spacing is immediate; detailed join/leave-to-dock, wink and H2 petal
  choreography are not yet reproduced. Count entry and hover motion are present.
- Dock ordering follows producer member order (the sketch has no ask timestamps).
  More than six working faces uses the first six in that order.
- Background assignment placement relies on host project IDs plus the engine's
  ownership metadata. The parser intentionally does not infer projects by name.
