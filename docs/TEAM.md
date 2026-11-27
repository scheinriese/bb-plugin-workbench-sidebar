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
The needs-you pill opens `/plugins/boat/cloud-agents`, using Harbormaster's
registered `cloud-agents` panel and empty Today subpath (`subPath: ""`). Tile and member links
open existing home chats; project header links open existing lead chats.

## Parsed DTO (engine contract v1)

The parser and types live in `shared/boat-sidebar.ts`; `shared/team-sidebar.ts`
only re-exports them. They match Harbormaster `contract-team.ts` and
`docs/team/SIDEBAR-DTO.md` at commit `e0dce6d` on branch
`boat/7db539cc-build-team-phase-1a-engine-asks-and-team`.

**Versioning:** this is **Team DTO v1**, carried by the existing
`sidebarState({version: 1})` / response `version: 1` envelope. There is **no
separate Team version field**. Missing or disabled Team, malformed required
fields, or a future explicit unsupported Team version are ignored without
losing valid Boat rows. An unsupported outer response version restores the
normal BB sidebar. Unknown additive fields are stripped; v1 required fields
are not filled in with speculative defaults.

```ts
type Team = {
  enabled: true;
  yourMove: { count: number; overdue: number; confirm: number };
  projects: { bbProjectId: string; icon: string; leadThreadId: string }[];
  lead: Member | null; // before a real chief home exists
  members: Member[]; // excludes chief, includes specialists and project leads
  hideFromSections: string[];
  revision: string;
  truncated: boolean;
};
type Member = {
  memberId: string;
  threadId: string; // existing, nonempty home chat ID
  name: string;
  kind: 'lead' | 'specialist' | 'project-lead';
  avatar: { initials: string; color: string };
  status: 'active' | 'paused' | 'archived';
  preview: {
    kind: 'needs-you' | 'activity' | 'counts' | 'last-message';
    text: string;
    tone: 'neutral' | 'attention' | 'danger' | 'success';
  };
  unread: { messages: number; cards: number };
  order: number;
  backgroundThreadIds: string[];
};
```

All fields are required, except the additive `team` block itself. `lead` can
be null. Counts are nonnegative integers and order is an integer, exactly as
in the producer's schema. Root v1 keeps its existing 2,000-thread and
200-queued-start bounds. Team has its own revision and truncation indicator;
changes to that revision refresh Team even if the outer revision is unchanged.

`status` is a **member lifecycle**, not work activity: active does not imply
working. Avatar activity comes only from the existing Boat thread status and
moving facts; paused/archived members do not orbit. The avatar object's
initials/color are metadata, not an SVG path, URL or arbitrary markup. Workbench
selects only its own bundled H3/H2 role silhouettes.

There are no per-member project/provider fields, nor thread assignment/default-
provider/handoff fields, in the engine's v1 DTO. The provisional fields have
been removed from the parser and all consumers. `backgroundThreadIds`, actual
BB projects and parent links identify ownership and project placement without
rewriting host project facts. Existing thread provider facts still drive
review and non-default provider marks (Claude is the sidebar's default).
V1 cannot supply a truthful handoff-history chip, so none is invented.

The engine's chief preview text is always her **latest line**, including when
its kind is `needs-you` while asks exist. The tile renders that text neutrally
and keeps attention on the one count. Other members only receive a home-row
ask marker when the engine supplies a `needs-you` preview with attention tone;
neutral blocked-task asks and `unread.cards` alone never add duplicate markers.
The chief tile opens the existing native home-chat link for `lead.threadId`,
matching the engine's `navigate.toThread(chief.homeThreadId)` destination.

## Time display

Workbench-generated clock times use the local timezone and an explicit
24-hour `h23` cycle (`00:00` through `23:59`), independent of locale defaults.
Queued reset lines prefer the producer's canonical neutral second line and
use this 24-hour formatter for older producers without that line. The poll
also passes the IANA timezone and existing numeric offset to Harbormaster.
Agent/message preview text is displayed as supplied, not rewritten.

## Presentation and evidence

H3/H2 SVGs are copied from the upstream design handoff at `659f604`, unchanged,
under `assets/team/`. `node scripts/team-assets.mjs` rebuilds the trusted inline
SVG module (bb's build has no CSS SVG loader). No placeholders remain.
Unknown member names use the Developer silhouette, never external resources.
Dark/light variants, baked state badges, 18 px dock discs with a 10 px step,
64 × 50 orbit slot, 64 px tile, static reduced-motion states and background/
unfocused pauses are implemented. The orbit uses one rAF loop and a 36 s lap.
H2 has no orbit/dock; hover provides breathe/blink/glance.

The orbit and dock are driven by measured Boat activity and assignment ownership, not
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

- V1 does not expose handoff history or per-member default providers.
- Orbit re-spacing is immediate; detailed join/leave-to-dock, wink and H2 petal
  choreography are not yet reproduced. Count entry and hover motion are present.
- Dock ordering follows producer member order (v1 has no ask timestamps).
  More than six working faces uses the first six in that order.
- Background assignment placement relies on host project IDs plus the engine's
  ownership metadata. The parser intentionally does not infer projects by name.
