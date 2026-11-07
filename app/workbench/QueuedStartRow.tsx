import { useContext, useRef, useState } from "react";
import { useBbNavigate, useSdk } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsCompactViewport } from "@/components/ui/hooks/use-compact-viewport";
import { SidebarProvidersContext } from "../rows/ThreadRow.js";
import { ProviderActivity } from "./RowSignals.js";
import { rowGeometry } from "./presentation.js";
import { queueAction, queueHref, queueSecondLine } from "./queued-starts.js";
import type { SidebarQueuedStartDto } from "../../shared/boat-sidebar.js";

export function QueuedStartRow({ row, depth, onNavigate }: { row: SidebarQueuedStartDto; depth: number; onNavigate?: () => void }) {
  const sdk = useSdk(), navigate = useBbNavigate(), mobile = useIsCompactViewport();
  const providers = useContext(SidebarProvidersContext);
  const providerId = row.provider === "claude" ? "claude-code" : row.provider;
  const provider = providers.find(provider => provider.id === providerId);
  const href = queueHref(row), geometry = rowGeometry(depth, mobile, true);
  const busyRef = useRef(false); const [busy, setBusy] = useState(false);
  const act = async (action: "start" | "cancel") => {
    if (busyRef.current) return; busyRef.current = true; setBusy(true);
    try { await queueAction(sdk, row, action); if (action === "start" && row.sourceThreadId) { navigate.toThread(row.sourceThreadId); onNavigate?.(); } }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not update this request."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const startDisabled = busy || row.state !== "waiting" || !row.provider || !row.sourceThreadId;
  const menu = (Item: typeof DropdownMenuItem | typeof ContextMenuItem) => <>
    <Item disabled={startDisabled} onSelect={() => { void act("start"); }}>Start now</Item>
    <Item disabled={busy || row.state === "started"} onSelect={() => { void act("cancel"); }}>Cancel request</Item>
  </>;
  return <ContextMenu><ContextMenuTrigger asChild>
    <div className="wb-row wb-two-line wb-waiting-reset wb-queued-row" data-queued-start-id={row.id}
      data-queued-start-state={row.state} style={{ height: geometry.height, paddingLeft: geometry.paddingLeft,
        "--wb-highlight-left": `${geometry.highlightLeft}px` } as React.CSSProperties}>
      <a href={href ?? undefined} aria-disabled={!href || undefined} className="wb-queued-link" draggable={false} onDragStart={event => event.preventDefault()}
        onClick={event => { if (row.state !== "started" && row.sourceThreadId && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey) { event.preventDefault(); navigate.toThread(row.sourceThreadId); } onNavigate?.(); }}>
        <ProviderActivity provider={provider} providerId={providerId ?? "Agent"} working={false} review={false} done={false} />
        <span className="wb-text-column"><span className="wb-title">{row.title}</span><span className="wb-second-line">{queueSecondLine(row)}</span></span>
      </a>
      {row.state !== "started" ? <DropdownMenu><DropdownMenuTrigger asChild><button className="wb-request-actions" aria-label={`Request actions for ${row.title}`}>···</button></DropdownMenuTrigger><DropdownMenuContent>{menu(DropdownMenuItem)}</DropdownMenuContent></DropdownMenu> : null}
    </div>
  </ContextMenuTrigger><ContextMenuContent>{row.state !== "started" ? menu(ContextMenuItem) : null}</ContextMenuContent></ContextMenu>;
}
