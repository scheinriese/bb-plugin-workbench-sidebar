import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

import type { SidebarThreadDto } from "../../shared/boat-sidebar.js";
export type SidebarThread = PluginSidebarThread & {
  boat?: SidebarThreadDto;
  boatSiblingCount?: number;
  workbenchHeldRank?: number;
  workbenchHeldThread?: SidebarThread;
};
