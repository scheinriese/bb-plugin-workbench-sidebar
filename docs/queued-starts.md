# Queued Boat starts

Optional `sidebarState({version:1})` field `queuedStarts` is bounded to200.
Each entry has id(max100), revision(nonnegative integer), title(max200),
sourceThreadId(nullable,max200), provider(claude/codex/null),
resetsAt(nullable,max100), createdAt(max100), state(waiting/dispatching/started),
taskId(nullable,max200) and taskThreadId(nullable,max200). Absent means no
requests; older producers keep the complete SDK sidebar. Queue changes must
change the response revision. Producer reads validate open tasks and any
actual BB chat; failed/cancelled requests and closed tasks leave the list.

A request is separate from a BB thread. Under a visible source it follows
all real tasks, in producer request order, with normal level2 geometry and a
provider mark when known. It has no ring/dot/new state, thread identity,
shortcut, rename, archive, selection or drag behavior. Local reset time comes
from the timestamp, with no invented time when absent. Dispatching says
“Starting…”. A collapsed parent appends “2 waiting” after working counts;
requests do not manufacture open BB children or urgency statuses.

The only request actions are Start now and Cancel request. Both first read
public `boat/queuedStart({id})` for the latest revision. Start now calls
`requestPaidStart({id,revision,provider})`, which opens Boat's existing
requestInput form. The sidebar never submits approval or calls a paid-start
confirmation. Cancel calls `cancelQueuedStart({id,revision})`; dispatching
can be cancelled, while a started task is never cancelled as a request.
A changed request fails through normal action feedback;
polling removes terminal entries. No external service is called directly.

Once a real task chat is available, its complete native subtree replaces the
request in the same request slot. It is removed from its normal sorted
position to prevent duplication; other thread/environment/section groups
retain their interactions. Its new marker is suppressed immediately and its
seen state is persisted, because the work was already listed. Normal BB
task actions resume on that actual row. A started task with no verified chat
links to its actual Boat task detail; it never receives a fabricated BB id.
The producer's existing passive chat-mirroring gap remains truthful here.

Source and task detail navigation use public thread navigation and normal
links. SDK0.6.104 `BbNavigate.toPluginPanel` only addresses this plugin's own
panels, so the cross-plugin actual task uses its registered Boat panel href.
No host DOM styling or outside-SDK UI fallback is used.
