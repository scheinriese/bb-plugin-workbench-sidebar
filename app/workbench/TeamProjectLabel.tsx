import { useBbNavigate } from "@get-bb/plugin-sdk/app";
import { Icon } from "@/components/ui/icon";
import { useAtomValue } from "jotai";
import { useTeamIndex } from "./BoatState.js";
import { calmFacesAtom } from "../preferences/atoms.js";
import { TeamAvatar } from "./TeamAvatar.js";
import type { TeamSidebarDto } from "../../shared/boat-sidebar.js";
export function TeamProjectLabel({
  project,
  teamProject,
  onNavigate,
}: {
  project: { name: string; href: string };
  teamProject: TeamSidebarDto["projects"][number];
  onNavigate?: () => void;
}) {
  const navigate = useBbNavigate();
  const calm = useAtomValue(calmFacesAtom);
  const index = useTeamIndex();
  const lead = index.membersByHome.get(teamProject.leadThreadId);
  const glyph = /book|docs/i.test(teamProject.icon)
    ? "Book"
    : /globe|web/i.test(teamProject.icon)
      ? "Globe"
      : "Folder";
  return (
    <a
      className="wb-team-project-label"
      data-sidebar-thread-shortcut-target=""
      data-sidebar-thread-id={teamProject.leadThreadId}
      href={`${project.href}/threads/${encodeURIComponent(teamProject.leadThreadId)}`}
      onClick={(event) => {
        event.preventDefault();
        navigate.toThread(teamProject.leadThreadId);
        onNavigate?.();
      }}
      aria-label={`Open ${project.name} lead chat`}
    >
      <Icon name={glyph} className="size-3.5" />
      <span>{project.name}</span>
      {lead && (
        <>
          <TeamAvatar
            member={lead}
            calm={calm}
            projectIcon={teamProject.icon}
          />
          <span className="wb-project-lead-name">{lead.name}</span>
        </>
      )}
    </a>
  );
}
