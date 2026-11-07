# Security and privacy

Workbench runs as a full-trust bb plugin. Review the source before installing.

It reads bb's thread list, provider row statuses and sidebar preferences.
Viewed/new state and expand/collapse choices are stored through bb's public
storage APIs. It does not run an inference service, open a cloud sandbox,
read account credentials or send telemetry.

When Boat is installed, Workbench reads its versioned sidebar contract.
Only explicit user actions call its queued-start mutations: **Start now…**
requests Boat's in-thread paid confirmation, and **Cancel request** cancels
one waiting request. Opening a menu or rendering a row never approves a paid
start. An actual task chat replaces its request row without creating a
second thread; a headless task links to its actual task detail.

Native chat actions retain bb's existing rename, archive, Undo and navigation
behavior. Queued requests have none of the chat-only actions.

Boat is optional. Missing, unsupported or unavailable Boat data leaves the
generic bb list usable. Disabling Workbench restores bb's regular sidebar.

The package is pinned to its supported bb/SDK version range. Its build and
tests check public SDK usage; secret scans use the repository's gitleaks
configuration. Demo tools and local account data are excluded from the
publishable tree.
