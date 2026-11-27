import "../../dist/app.css";
import "./preview.css";
import {
  installTestPluginRuntime,
  loadPluginApp,
  renderSlot,
} from "@get-bb/plugin-sdk/testing/app";
import { makeSidebarThread } from "../../app/model/fixtures.js";
import { teamFixture } from "../../app/workbench/team-fixtures.js";
import { defaultPreferences } from "../../shared/preferences.js";
import { setPreferencesMirrorStorageForTest } from "../../app/preferences/preferences-sync.js";

const params = new URLSearchParams(location.search);
const morning = params.get("time") === "09:00";
const light = params.has("light");
const calm = params.has("calm");
const phone = params.has("phone");
const enabled = !params.has("off");
document.documentElement.classList.toggle("dark", !light);
document.body.dataset.phone = String(phone);
document.getElementById("controls")!.innerHTML =
  `<strong>Team fixture · ${morning ? "09:00" : "14:30"}</strong><a href="?time=09:00">09:00</a><a href="?time=14:30">14:30</a><a href="?light">Light</a><a href="?phone">Phone drawer</a><a href="?calm">H2 · Calm faces</a>`;
installTestPluginRuntime();
setPreferencesMirrorStorageForTest(null);
const app = await loadPluginApp(() => import("../../app.js"));
const fixture = teamFixture(morning ? "09:00" : "14:30");
const sections: {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}[] = [];
if (params.has("review")) {
  sections.push({
    id: "my-chats",
    name: "My chats",
    createdAt: 1,
    updatedAt: 1,
  });
  const lead = {
    ...fixture.team.members[5]!,
    memberId: "second-lead",
    threadId: "thr_second_lead",
    name: "Second lead",
    backgroundThreadIds: ["thr_other_work"],
  };
  fixture.team.members.push(lead);
  fixture.team.projects.push({
    bbProjectId: "web",
    leadThreadId: lead.threadId,
    icon: "Book",
  });
  fixture.threads.push(
    makeSidebarThread({
      id: "thr_plain_web",
      title: "My Web chat",
      projectId: "web",
      sectionId: "my-chats",
    }),
    makeSidebarThread({
      id: "thr_plain_personal",
      title: "My Personal chat",
      projectId: "personal",
    }),
    makeSidebarThread({
      id: lead.threadId,
      title: lead.name,
      projectId: "web",
    }),
    makeSidebarThread({
      id: "thr_other_work",
      title: "Second lead work",
      projectId: "web",
      parentThreadId: lead.threadId,
    }),
  );
  fixture.states.push({
    ...fixture.states[0]!,
    threadId: "thr_other_work",
    parentThreadId: lead.threadId,
    status: "working",
    moving: true,
    secondLine: null,
  });
}
if (params.has("missingChief"))
  fixture.threads.splice(
    fixture.threads.findIndex((t) => t.id === fixture.team.lead!.threadId),
    1,
  );
const rendered = renderSlot(
  app.threadLists[0]!,
  {
    activeThreadId: null,
    activeProjectId: null,
    isCompactViewport: phone,
    searchQuery: "",
    onNavigate: () => {
      document.getElementById("route")!.textContent =
        "Navigation handled by the host (fixture preview).";
    },
  },
  {
    sidebarThreads: {
      status: "ready",
      threads: fixture.threads,
      projects: fixture.projects,
      sections,
    },
    rpc: {
      teamArtwork: async () => {
        const { teamAvatarImages } =
          await import("../../assets/team/avatar-data.js");
        return Object.fromEntries(
          Object.entries(teamAvatarImages)
            .filter(([key]) => /^h[23]\/face-nora-/.test(key))
            .map(([key, svg]) => [
              key,
              `data:image/svg+xml;base64,${btoa(svg)}`,
            ]),
        );
      },
      listPreferences: () => ({
        preferences: { ...defaultPreferences(), calmFaces: calm },
      }),
      setPreference: (input) => input,
    },
    sdk: {
      plugins: {
        callRpc: async () =>
          ({
            version: 1,
            revision: "fixture",
            threads: fixture.states,
            team: enabled ? fixture.team : undefined,
            truncated: false,
          }) as never,
      },
    },
  },
);
document.getElementById("sidebar")!.append(rendered.container);
