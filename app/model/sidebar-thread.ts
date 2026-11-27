import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

import type { SidebarThreadDto } from "../../shared/boat-sidebar.js";
export type SidebarThread = PluginSidebarThread & {
  boat?: SidebarThreadDto;
  /** Presentation-only project placement; never a mutation of the host project. */
  workbenchTeamProjectId?: string;
  boatSiblingCount?: number;
  workbenchChildren?: { open: number; working: number };
  workbenchWaiting?: number;
  workbenchQueuedStartId?: string;
  workbenchHeldRank?: number;
  workbenchHeldThread?: SidebarThread;
};
