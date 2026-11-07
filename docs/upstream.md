# Upstream and license

Workbench sidebar forks **all** of `plugins/thread-list` from get-bb/bb tag
`desktop-v0.48.1`, commit `e003e9510cbfd3bb6c26a28630b46ffb1c242a44`.
The installed application is BB 0.48.1, public Plugin SDK 0.6.104.
Upstream thread-list package version is 0.1.0. Source:
https://github.com/get-bb/bb/tree/e003e9510cbfd3bb6c26a28630b46ffb1c242a44/plugins/thread-list

Upstream is MIT, copyright (c) 2026 Michael Yong. The unmodified license is
preserved in LICENSE. `vendor/shared-ui` contains the transitive UI components
used by the fork, from that same revision; the registry's SDK-backed Icon flavor
replaces its private icon implementation. No private @bb package is required.

The initial fork commit records the full upstream list and tests before the
Workbench behavior changes. The package id, public dependencies, build scripts
and vendored imports are adapted for standalone distribution.

## Feature inventory

Preserved sources include project, machine, custom and built-in sections;
section order, pin order and chronological/alphabetic sorting; recursive thread
trees and collapse persistence; drafts, unread and execution indicators; provider
icons, shortcut pills and split pane mini-map; pointer/touch nested reorder and
split drag; inline and menu rename; archive/delete confirmations through host
menus; multi-selection and plugin thread actions; search through host navigation;
DOM targets for next/previous and numbered keyboard shortcuts; compact/mobile
layout, windowing, sticky headers and automatic active thread reveal; row action
customization; client/server preference sync, migrations and CLI management.

## Upstream sync procedure

1. Record installed BB and SDK versions; select its desktop release tag.
2. Download that immutable upstream source, inspect license changes, diff all of
   plugins/thread-list against the pinned revision, including its tests.
3. Merge behavior changes and update the vendored transitive shared UI graph.
4. Keep Workbench row geometry and Boat adapter in separate modules where possible.
5. Run typecheck, the upstream and Workbench tests, build, then the isolated demo
   feature and Paper comparison checks before changing the compatibility range.
6. Update this revision, attribution, feature inventory and API limits together.

The standalone source is published at https://github.com/scheinriese/bb-plugin-workbench-sidebar.
