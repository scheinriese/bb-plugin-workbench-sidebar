import type { TeamMemberDto } from "../../shared/boat-sidebar.js";
import type { TeamVisualState } from "./team.js";
export interface TeamAvatarProps {
  member: TeamMemberDto;
  calm?: boolean;
  chief?: boolean;
  working?: boolean;
  task?: boolean;
  badge?: boolean;
  providerLabel?: string;
  visualState?: TeamVisualState;
  orbitMembers?: readonly TeamMemberDto[];
  projectIcon?: string;
}
