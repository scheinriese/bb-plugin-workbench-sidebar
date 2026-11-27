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
### Roll back to Workbench 0.1.3 (operator only)

Disabling Workbench restores bb's native sidebar; **it is not a version
rollback**. To keep Workbench and roll back this Team change, reinstall its
previous source revision (the 0.1.3 package at `c88fd56`):

```sh
# In the repository, create a separate rollback checkout; keep team intact.
git worktree add --detach ../workbench-sidebar-0.1.3 c88fd5691f207ec83e635d68203c77ae97a53e4a
cd ../workbench-sidebar-0.1.3
npm ci --ignore-scripts
npm rebuild better-sqlite3
npm run build
bb plugin install "$PWD"
```

This is the concrete source rollback for `workbench-sidebar@0.1.3`; no npm
publication or version tag is assumed. A previous reviewed source checkout
can be built and installed the same way. Main ignores the new Team preference
keys. No chats, sections or host thread data are migrated or deleted.

**Does a path install replace a URL install? No, not on bb 0.50.1.** The same
plugin id cannot be registered from a different source kind: bb refuses the
install and asks for removal first. A path-to-path reinstall/move of the same
id is supported and retains the registration's settings. See bb's
[install registration checks](https://github.com/get-bb/bb/blob/desktop-v0.50.1/apps/server/src/services/plugins/plugin-registration.ts).
For an existing URL/catalog installation, the operator must explicitly switch
sources. First export the sidebar layout outside the repository:

```sh
bb workbench-sidebar prefs list --json > "$HOME/workbench-sidebar-prefs.json"
# Only when switching URL/catalog ↔ path sources:
bb plugin remove workbench-sidebar
bb plugin install <built-checkout>
```

Removal clears plugin settings/secrets/schedules; back up before doing it.
Restore layout values if needed using `bb workbench-sidebar prefs set <key>
'<JSON value>'` from the saved JSON. On 0.1.3 omit the unavailable `calmFaces`,
`teamCollapsed` and `showProviderOnEveryRow` keys. Do not remove any bb database
or chat data. These commands are instructions for the operator: none were run
by the task agent against a live bb instance.

Organize → Rows → **Show provider on every row** is off by default.
Organize → Appearance → **Calm faces** selects H2 instead of H3 Orbit.
The Team disclosure and existing project/thread disclosures are persisted.
The needs-you pill opens `/plugins/boat/cloud-agents`, using Harbormaster's
registered `cloud-agents` panel and empty Today subpath (`subPath: ""`). Tile and member links
open existing home chats; project header links open existing lead chats.

## Parsed DTO (engine contract v1)

The parser and types live in `shared/boat-sidebar.ts`; `shared/team-sidebar.ts`
only re-exports them. They match Harbormaster `contract-team.ts` and
`docs/team/SIDEBAR-DTO.md` at commit `0b2a349` on branch
`boat/7db539cc-build-team-phase-1a-engine-asks-and-team`.

**Versioning:** the outer `sidebarState` response and nested Team projection
both require **`version: 1`**. Missing or disabled Team, a missing/unsupported
nested version, or malformed retained data is ignored without losing valid
Boat rows. An unsupported outer response version restores the normal BB
sidebar. Unknown additive fields are stripped.

```ts
type Team = {
  version: 1;
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

All fields are required, except the additive `team` block itself; `lead` can
be null. IDs are nonempty and at most 200 characters, names 40, preview text
160, initials 8, colour 32, glyph 64, and revision 64. Counts are nonnegative
integers and order is an integer. Oversized arrays are **sliced before
validation**: members/projects 200, hidden ids 201, backgrounds 100 per member.
Omissions set `truncated: true`, retaining the chief and the complete needs-you
count. Root v1 retains its 2,000-thread and 200-queued-start bounds. Changes to
Team's own revision refresh it even if the outer revision is unchanged.

`status` is a **member lifecycle**, not work activity: active does not imply
working. Avatar activity comes only from the existing Boat thread status and
moving facts; paused/archived members do not orbit. The avatar object's
initials/color are metadata, not an SVG path, URL or arbitrary markup. Workbench
selects only its own bundled H3/H2 role silhouettes.

There are no per-member project/provider fields, nor thread assignment/default-
provider/handoff fields, in the engine's v1 DTO. The provisional fields have
been removed from the parser and all consumers. `leadThreadId`, member homes, and `backgroundThreadIds` plus their descendants
identify ownership. **A matching BB project id alone never makes a chat Team
work.** Only explicitly owned work roots may use their host project to select
a unique lead; ambiguous shared-project work stays with its member unless
ancestry identifies a lead. Each lead has its own section/disclosure, even
when two leads share a BB project. Plain chats retain native grouping and
custom sections. Host project facts are never rewritten. Existing thread provider facts still drive
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

H3/H2 SVGs are copied from the upstream design handoff at `659f604` under
`assets/team/`. Only the chief kind identifies a named face in the current DTO;
its bundled H3/H2 artwork is fetched once via the read-only `teamArtwork` RPC
when Team is enabled. It is returned as bounded data-image URIs and displayed
as inert images, never injected RPC markup. No artwork request or SVG table
is downloaded with Team off. The old bb 0.50.1 builder inlines dynamic imports,
so using `import()` alone would not defer the SVG bytes.

The DTO has no specialist role selector. Unknown specialists use a generic
face generated from their stable member id, not names, initials or fixture
identities. Project-lead kinds use a box face with their explicit project glyph.
Renaming a member never changes the face. H2 retains no orbit or dock. Orbit
rAF is cancelled under reduced motion, hidden documents and blurred windows,
then resumed on the corresponding event. The count remains visible if the
chief home is missing or filtered out, and the chief's accessible name is
"Nora, chief of staff" (or the configured chief name).

`npm run build` invokes **only bb's own `buildPluginApp` pipeline**, matching
what `bb plugin install <path>` rebuilds. The former Terser post-step and its
private-property mangling have been removed: that output was not what the
installer shipped. The installer-equivalent eager JS is about **529 KB**, not
the previously reported post-processed 509 KB. It includes Team UI code but
not the lazily requested SVG table. No claim of a main-sized eager bundle is
made; the same-toolchain main baseline is 511,138 bytes.

`npm run check:bundle` reports the actual bb-built byte count and its delta
from that baseline, and checks that the artwork table is absent. It no longer
asserts the invalid post-processing budget. Run:

```sh
npm run build
npm run check:bundle
npm run test:built
```

`test:built` smoke-tests the **unmodified bb-built artifact**, with Team off/on,
native chat preservation, disclosures and navigation. It uses only declared
public packages as test-host runtime slots. The ordinary suite skips artifact
QA when no build has been requested, so it also works in a fresh checkout.

Native project groups and Team lead headers have separate drag-and-drop
namespaces (`project:<bb-id>` versus `project:team:<lead-thread-id>`), including
separate root sortable-list keys. Native drop lookup cannot accidentally treat
a Team header as the owner's normal project group; assignment ownership still
comes from the engine, not from dropping a plain chat into Team.

The orbit and dock are driven by measured Boat activity and assignment ownership, not
by a clock or hardcoded snapshot. Project asks stay on blocked work rows,
not repeated on member rows. Projectless work remains below its member.
Large Team groups use the same first-crossing rollup collapse as native groups.
Project tasks use the existing recursive tree, context menus, pinning, drafts,
new-thread action, collapse preferences and hidden-groups/More controls.

The isolated fixture preview uses the public SDK test runtime, not live bb:

```sh
npm run build
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.on.boat.dev \
  node_modules/.bin/vite --config scripts/team-preview.config.ts \
  --host 0.0.0.0 --port 4173
```

Open `/`, `/?time=09:00`, `/?light`, `/?phone`, `/?calm`, or `/?off` on the preview host.
Its surrounding chrome and named icon stand-ins are preview-only. Fictional
fixtures come from `EXAMPLE-DAY.md` (14:30 Nora preview follows the later
latest-line decision). Live installation screenshots remain operator-owned.

### Known limits

- V1 does not expose handoff history or per-member default providers.
- Generic specialist faces are used until the DTO carries an explicit role/art selector.
- Orbit re-spacing is immediate; detailed join/leave-to-dock, wink and H2 petal
  choreography are not yet reproduced. Count entry and hover motion are present.
- Dock ordering follows producer member order (v1 has no ask timestamps).
  More than six working faces uses the first six in that order.
- Background assignment placement relies on host project IDs plus the engine's
  ownership metadata. The parser intentionally does not infer projects by name.
