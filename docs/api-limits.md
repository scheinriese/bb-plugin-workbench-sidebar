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
- Numeric automatic many-task collapse threshold is not specified in the
  handoff artboards. Existing manual collapse remains fully functional and
  shows the exact rollup. Do not invent a threshold before design review.
- Exact sidebar geometry overrides old upstream padding assertions. The full
  upstream interaction and model tests remain; rendering assertions now check
  Workbench's pencil/dots/ring and10/34/58 padding.
