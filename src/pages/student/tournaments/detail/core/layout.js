import { state } from "./state.js";

import { buildHero } from "../components/hero.js";
import { buildTabs } from "../components/tabs.js";

import { buildFixtureTab } from "../components/fixture-tab.js";
import { buildStandingsTab } from "../components/standings-tab.js";
import { buildResultsTab } from "../components/results-tab.js";
import { buildTeamsTab } from "../components/teams-tab.js";
import { buildPhotosTab } from "../components/photos-tab.js";

import { escapeHtml } from "./utils.js";

function buildActiveTab() {
  if (state.activeTab === "fixture") {
    return buildFixtureTab();
  }

  if (state.activeTab === "standings") {
    return buildStandingsTab();
  }

  if (state.activeTab === "results") {
    return buildResultsTab();
  }

  if (state.activeTab === "teams") {
    return buildTeamsTab();
  }

  if (state.activeTab === "photos") {
    return buildPhotosTab();
  }

  return "";
}

export function buildLoading() {
  return `
    <div class="min-h-screen flex items-center justify-center p-6">
      <div class="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div class="text-sm text-slate-500">
          Cargando torneo...
        </div>
      </div>
    </div>
  `;
}

export function buildError() {
  return `
    <div class="min-h-screen flex items-center justify-center p-6">
      <div class="w-full max-w-md rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm">
        <div class="text-lg font-bold text-slate-900">
          No se pudo cargar el torneo
        </div>

        <div class="mt-2 text-sm text-slate-500">
          ${escapeHtml(state.pageError || "Ocurrió un error inesperado.")}
        </div>
      </div>
    </div>
  `;
}

export function buildContent() {
  return `
    <div class="min-h-screen bg-slate-100">

      <main class="mx-auto w-full max-w-6xl px-4 py-5 pb-32">

        <div class="space-y-5 fade-up">

          ${buildHero()}

          ${buildTabs()}

          <div id="tabContent">
            ${buildActiveTab()}
          </div>

        </div>

      </main>

    </div>
  `;
}