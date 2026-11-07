import { useState } from "react";
import { experimental_useSidebarThreads } from "@get-bb/plugin-sdk/app";
export function ProjectHint({ onNavigate }: { onNavigate?: () => void }) {
  const { status, projects, sections } = experimental_useSidebarThreads();
  const [dismissed, setDismissed] = useState(false);
  if (
    dismissed ||
    status !== "ready" ||
    sections.length ||
    projects.some((project) => !project.isPersonal)
  )
    return null;
  return (
    <div className="wb-project-hint">
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-7Z"
          fill="none"
          stroke="#8A8A8A"
          strokeWidth="1.2"
        />
      </svg>
      <span>
        Projects you add appear here as sections
        <a href="/settings/projects" onClick={onNavigate}>
          Add a project
        </a>
      </span>
      <button
        type="button"
        aria-label="Dismiss project hint"
        onClick={() => setDismissed(true)}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M3 3l6 6M9 3l-6 6"
            fill="none"
            stroke="#6E6E6E"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
