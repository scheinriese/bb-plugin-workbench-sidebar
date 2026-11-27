import "../../dist/app.css";
import "./preview.css";
import {
  installTestPluginRuntime,
  loadPluginApp,
  renderSlot,
} from "@get-bb/plugin-sdk/testing/app";
import { teamFixture } from "../../app/workbench/team-fixtures.js";
import { defaultPreferences } from "../../shared/preferences.js";
import { setPreferencesMirrorStorageForTest } from "../../app/preferences/preferences-sync.js";

const params = new URLSearchParams(location.search);
const morning = params.get("time") === "09:00";
const light = params.has("light");
const calm = params.has("calm");
const phone = params.has("phone");
document.documentElement.classList.toggle("dark", !light);
document.body.dataset.phone = String(phone);
document.getElementById("controls")!.innerHTML =
  `<strong>Team fixture · ${morning ? "09:00" : "14:30"}</strong><a href="?time=09:00">09:00</a><a href="?time=14:30">14:30</a><a href="?light">Light</a><a href="?phone">Phone drawer</a><a href="?calm">H2 · Calm faces</a>`;
installTestPluginRuntime();
setPreferencesMirrorStorageForTest(null);
const app = await loadPluginApp(() => import("../../app.js"));
const fixture = teamFixture(morning ? "09:00" : "14:30");
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
      sections: [],
    },
    rpc: {
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
            team: fixture.team,
            truncated: false,
          }) as never,
      },
    },
  },
);
document.getElementById("sidebar")!.append(rendered.container);
