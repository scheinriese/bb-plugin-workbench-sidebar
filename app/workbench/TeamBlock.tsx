import { useBbNavigate } from "@get-bb/plugin-sdk/app";
import { useAtom, useAtomValue } from "jotai";
import { useBoatState, useTeamState } from "./BoatState.js";
import {
  collapsedProjectIdsAtom,
  teamCollapsedAtom,
  calmFacesAtom,
  sidebarHiddenGroupsAtom,
  sidebarSectionOrderAtom,
} from "../preferences/atoms.js";
import { ProjectRow, ProjectThreadTree } from "../list/ProjectRow.js";
import type { SidebarProject } from "../model/use-sidebar-data.js";
import type { SidebarThread } from "../model/sidebar-thread.js";
import { useEffect, type ComponentProps, type CSSProperties } from "react";
import { TeamAvatar } from "./TeamAvatar.js";
import {
  ThreadListVisibility,
  ThreadListVisibilityGroupScope,
  ThreadListMore,
} from "../list/ThreadListVisibility.js";
import type { SidebarSectionId } from "../model/sidebar-section-id.js";

export function TeamBlock({
  projects,
  threads,
  treeProps,
  onNavigate,
  onCreateProjectThread,
}: {
  onCreateProjectThread?: (id: string) => void;
  projects: readonly SidebarProject[];
  threads: readonly SidebarThread[];
  treeProps: Omit<ComponentProps<typeof ProjectThreadTree>, "threadListState">;
  onNavigate?: () => void;
}) {
  const navigate = useBbNavigate();
  const team = useTeamState();
  const boatStates = useBoatState();
  useEffect(() => {
    if (!team?.enabled) return;
    const update = () =>
      document.documentElement.toggleAttribute(
        "data-wb-team-motion-paused",
        document.hidden || !document.hasFocus(),
      );
    update();
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
      document.removeEventListener("visibilitychange", update);
      document.documentElement.removeAttribute("data-wb-team-motion-paused");
    };
  }, [team?.enabled]);
  const [collapsedProjects, setCollapsedProjects] = useAtom(
    collapsedProjectIdsAtom,
  );
  const [collapsed, setCollapsed] = useAtom(teamCollapsedAtom);
  const calm = useAtomValue(calmFacesAtom);
  const hidden = useAtomValue(sidebarHiddenGroupsAtom);
  const [projectOrder, setProjectOrder] = useAtom(sidebarSectionOrderAtom);
  if (!team?.enabled) return null;
  const chief = threads.filter((t) => t.id === team.lead?.threadId);
  const members = threads.filter((t) => t.id !== team.lead?.threadId);
  const order = new Map(team.members.map((m) => [m.threadId, m.order]));
  const compareThreads = (a: SidebarThread, b: SidebarThread) =>
    (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
  const docked = team.members
    .filter(
      (m) =>
        m.preview.kind === "needs-you" ||
        m.backgroundThreadIds.some(
          (id) => boatStates.get(id)?.status === "needs-you",
        ),
    )
    .slice(-3);
  const renderProject = (project: SidebarProject, close?: () => void) => (
    <ProjectRow
      {...treeProps}
      project={project}
      threadListState={{ status: "ready", threads: project.threads }}
      onCreateProjectThread={onCreateProjectThread}
      onProjectSelect={() => {
        close?.();
        onNavigate?.();
      }}
      isActive={false}
      isCollapsed={collapsedProjects.includes(project.id)}
      onToggleProjectCollapsed={(id) =>
        setCollapsedProjects((current) =>
          current.includes(id)
            ? current.filter((p) => p !== id)
            : [...current, id],
        )
      }
    />
  );
  const orderedProjects = [...projects].sort((a, b) => {
    const rank = (id: string) => {
      const i = projectOrder.indexOf(`project:${id}`);
      return i < 0 ? 10000 : i;
    };
    return rank(a.id) - rank(b.id);
  });
  const sectionOrder = orderedProjects.map(
    (p) => `project:${p.id}` as SidebarSectionId,
  );
  return (
    <ThreadListVisibility
      groups={orderedProjects.map((p) => ({
        id: `project:${p.id}` as SidebarSectionId,
        title: p.name,
        threads: p.threads,
        renderContent: (close) => renderProject(p, close),
      }))}
      label="Team projects"
      order={sectionOrder}
      selectedThreadId={treeProps.selectedThreadId}
      onOrderChange={(order) =>
        setProjectOrder((current) => [
          ...order,
          ...current.filter(
            (id) => !sectionOrder.includes(id as SidebarSectionId),
          ),
        ])
      }
    >
      <section className="wb-team-block" aria-label="Team">
        {chief.length > 0 && (
          <div
            className="wb-chief-tile"
            style={
              {
                "--wb-chief-trailing-width": `${team.yourMove.count ? (calm ? 28 : (docked.length ? 18 + 10 * (docked.length - 1) : 0) + 28) : 0}px`,
              } as CSSProperties
            }
          >
            <ProjectThreadTree
              {...treeProps}
              threadListState={{ status: "ready", threads: chief }}
            />
            {team.yourMove.count > 0 && (
              <div className="wb-chief-trailing">
                {!calm && (
                  <span
                    className="wb-team-dock"
                    aria-hidden="true"
                    style={{
                      width: docked.length ? 18 + 10 * (docked.length - 1) : 0,
                    }}
                  >
                    {docked.map((m, i) => (
                      <span key={m.memberId} style={{ left: i * 10 }}>
                        <TeamAvatar member={m} badge={false} />
                      </span>
                    ))}
                  </span>
                )}
                <a
                  className="wb-your-move"
                  href="/plugins/boat/cloud-agents"
                  onClick={(event) => {
                    event.preventDefault();
                    navigate.toPluginPanel("cloud-agents", {
                      subPath: "",
                    });
                    onNavigate?.();
                  }}
                  aria-label={`${team.yourMove.count} need you. Open Team Today`}
                  title={`${team.yourMove.overdue} overdue · ${team.yourMove.confirm} need confirmation`}
                >
                  <span key={team.yourMove.count}>{team.yourMove.count}</span>
                </a>
              </div>
            )}
          </div>
        )}
        {members.length > 0 && (
          <>
            <button
              type="button"
              className="wb-team-heading"
              onClick={() => setCollapsed(!collapsed)}
              aria-expanded={!collapsed}
              aria-controls="wb-team-members"
            >
              Team <span aria-hidden="true">{collapsed ? "›" : "⌄"}</span>
            </button>
            {!collapsed && (
              <div id="wb-team-members">
                <ProjectThreadTree
                  {...treeProps}
                  compareThreads={compareThreads}
                  threadListState={{ status: "ready", threads: members }}
                />
              </div>
            )}
          </>
        )}
        {orderedProjects
          .filter((p) => !hidden.includes(`project:${p.id}`))
          .map((project) => (
            <div className="wb-team-project" key={project.id}>
              <ThreadListVisibilityGroupScope id={`project:${project.id}`}>
                {renderProject(project)}
              </ThreadListVisibilityGroupScope>
            </div>
          ))}
        <ThreadListMore />
      </section>
    </ThreadListVisibility>
  );
}
