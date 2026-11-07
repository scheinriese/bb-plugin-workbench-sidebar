# Public API evidence and fidelity decisions

No private BB imports or host DOM mutation are used. The plugin replaces only
its owned exclusive thread-list slot. Navigation and footer remain host-owned.
The full SDK UI works without any experimental DOM tweaks setting; no such
fallback is currently needed.

- SDK0.6.104 `PluginThreadListProps` supplies `activeThreadId`, compact state
  and `onNavigate`; `experimental_useSidebarThreads` supplies nesting, resolved
  href/title, lifecycle, `lastReadAt`, activity and unread state. Evidence:
  node_modules/@get-bb/plugin-sdk/bundled-types/bb-plugin-sdk-app.d.ts.
- Host keyboard navigation requires `data-sidebar-thread-shortcut-target` and
  `data-sidebar-thread-id`; both upstream anchor attributes are retained.
- Public row-status, draft, shortcut, split, provider icon and thread action
  APIs are retained. No custom confirmation replaces host archive/delete.
- `useSdk().plugins.callRpc` requires `outputSchema` and supports AbortSignal;
  the Boat boundary validates the bounded v1 envelope (same SDK declaration).
- Standard upstream CSS provides sticky tiers using public rendered component
  attributes. Our scoped row CSS must preserve sticky positioning and override
  per-stack geometry; the first live capture revealed/fixed this interaction.
- Exact sidebar geometry overrides old upstream padding assertions. The full
  upstream interaction and model tests remain; rendering assertions now check
  Workbench's pencil/dots/ring and10/34/58 padding.

Owner-confirmed ordering (updated sidebar-spec.md):7or more open tasks
triggers automatic first collapse, then persists the user's choice. Basic
groups keep BB order; rollup groups use urgency with stable BB order inside
buckets. Pointer or keyboard interaction freezes auto-ordering until release.

The SDK thread-list slot only supplies the sidebar scroll area, not navigation,
header, footer or the Settings route's separate sidebar. Source evidence at the
pinned upstream revision: apps/app/src/components/sidebar/PluginThreadList.tsx
and apps/app/src/components/settings/LazySettingsSidebar.tsx. Native footer
usage pills and OS browser/status chrome are outside this plugin's slot.

The global thread-action registry remains shared while the builtin list is
enabled. A live smoke check found duplicate Move entries. Workbench now reads
the builtin's public preference RPC and reuses its live chronological Move
action, retaining the full forked fallback when absent. No foreign settings
are changed. Static quick-action choices retain provider-qualified names.

The screenshot API returns JPEG payloads even under .png filenames; its
schema offers no format field. Read-only Paper export with explicit1xPNG
removes this compression for final reference images. Existing user downloads
are checked before export, and references are copied into this repo.

Exact evidence at the pinned upstream revision:
- Public SDK0.6.104 bundled-types/bb-plugin-sdk-app.d.ts:19177 describes the
  exclusive scrolling thread area; :19180 lists its supplied props. :19872
  defines PluginSidebarThread, with originKind/originPluginId at :19898.
- [Host list mount](https://github.com/get-bb/bb/blob/e003e9510cbfd3bb6c26a28630b46ffb1c242a44/apps/app/src/components/sidebar/PluginThreadList.tsx#L83)
  receives only the thread-list props.
- [Host navigation/footer/list separation](https://github.com/get-bb/bb/blob/e003e9510cbfd3bb6c26a28630b46ffb1c242a44/apps/app/src/components/sidebar/AppSidebar.tsx#L225)
  places navigation at225, footer256, list339.
- [Separate Settings sidebar loader](https://github.com/get-bb/bb/blob/e003e9510cbfd3bb6c26a28630b46ffb1c242a44/apps/app/src/components/settings/LazySettingsSidebar.tsx#L29).

Final audit: all115 pinned upstream paths are present. The public SDK
distribution scanner reports zero private dependencies and zero violations;
531 tests across46 files, typecheck and the own-wrapper build pass.
`build-shots/fidelity/sidebar-final-audit.json` records the exact source commit
and validation. Generic rollups derive only from public BB threads/activity,
so disabling or removing Boat preserves the same seven-child behavior.
No outside-SDK UI fallback or experimental host tweak was introduced.
