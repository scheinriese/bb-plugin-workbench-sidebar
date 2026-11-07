import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

import type { SidebarThreadDto } from "../../shared/boat-sidebar.js";
export type SidebarThread = PluginSidebarThread & {
  boat?: SidebarThreadDto;
  boatSiblingCount?: number;
  workbenchChildren?: { open: number; working: number };
  workbenchWaiting?: number;
  workbenchQueuedStartId?: string;
  workbenchHeldRank?: number;
  workbenchHeldThread?: SidebarThread;
};
