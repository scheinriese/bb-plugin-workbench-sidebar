import { OrderHoldProvider } from "./app/workbench/OrderHold.js";
import { ProjectHint } from "./app/workbench/ProjectHint.js";
import { SeenThreadsProvider } from "./app/workbench/SeenThreads.js";
import { BoatStateProvider } from "./app/workbench/BoatState.js";
import "./app/workbench/rows.css";
import "./app/workbench/review-font.css";
import {
  definePluginApp,
  type PluginThreadListProps,
} from "@get-bb/plugin-sdk/app";
import { CompactViewportOverrideProvider } from "@/components/ui/hooks/use-compact-viewport";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PreferencesSync } from "./app/preferences/PreferencesSync.js";
import { ProjectList } from "./app/list/ProjectList.js";
import { useSidebarThreadReveal } from "./app/list/useSidebarThreadReveal.js";
import { moveThreadAction } from "./app/rows/moveThreadAction.js";
import { ThreadSelectionProvider } from "./app/selection/threadSelection.js";

function SidebarReveal() {
  useSidebarThreadReveal();
  return null;
}

function ThreadList({
  activeThreadId,
  isCompactViewport,
  onNavigate,
}: PluginThreadListProps) {
  return (
    <CompactViewportOverrideProvider isCompactViewport={isCompactViewport}>
      <TooltipProvider>
        <BoatStateProvider>
          <SeenThreadsProvider activeThreadId={activeThreadId}>
            <OrderHoldProvider mobile={isCompactViewport}>
              <PreferencesSync />
              <SidebarReveal />
              <ProjectHint onNavigate={onNavigate} />
              <ThreadSelectionProvider activeThreadId={activeThreadId}>
                <ProjectList
                  activeThreadId={activeThreadId}
                  onProjectSelect={onNavigate}
                />
              </ThreadSelectionProvider>
            </OrderHoldProvider>
          </SeenThreadsProvider>
        </BoatStateProvider>
      </TooltipProvider>
    </CompactViewportOverrideProvider>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_threadList({
    id: "thread-list",
    title: "Workbench sidebar",
    description:
      "Pinned threads, custom sections, projects, machines, and nested threads.",
    component: ThreadList,
  });
  app.slots.experimental_threadAction(moveThreadAction);
});
