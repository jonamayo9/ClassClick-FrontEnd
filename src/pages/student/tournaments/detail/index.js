import { get } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth } from "../../../../shared/js/session.js";
import { getMe, setMe, getStudentMe } from "../../../../shared/js/storage.js";
import { initTheme, applyThemePreference } from "../../../../shared/js/theme.js";
import { hasModule } from "../../../../shared/js/modules.js";
import { buildTabs, bindTabs } from "./components/tabs.js";
import { state } from "./core/state.js";
import { buildFixtureTab } from "./components/fixture-tab.js";
import { buildStandingsTab } from "./components/standings-tab.js";
import { buildResultsTab, bindResultsTab } from "./components/results-tab.js";
import { buildTeamsTab, bindTeamsTab } from "./components/teams-tab.js";
import { buildPhotosTab, bindPhotosTab } from "./components/photos-tab.js";
import { qs, escapeHtml, getTournamentIdFromUrl } from "./core/utils.js";
import { buildLoading, buildError } from "./core/layout.js";
import { buildHero } from "./components/hero.js";
import { bindFixtureTab } from "./components/fixture-tab.js";
import { buildStatsTab } from "./components/stats-tab.js";
import { buildPlayersTab } from "./components/players-tab.js";


function buildActiveTab() {
  console.log("ACTIVE TAB:", state.activeTab);
  console.log("PLAYER SUMMARY:", state.playerSummary);

  if (state.activeTab === "fixture") return buildFixtureTab();
  if (state.activeTab === "standings") return buildStandingsTab();
  if (state.activeTab === "results") return buildResultsTab();
  if (state.activeTab === "teams") return buildTeamsTab();
  if (state.activeTab === "photos") return buildPhotosTab();
  if (state.activeTab === "stats") return buildStatsTab();

  if (
    state.activeTab === "players" ||
    state.activeTab === "player-summary" ||
    state.activeTab === "jugadores"
  ) {
    return buildPlayersTab();
  }

  return "";
}

function buildContent() {
  return `
<div class="min-h-screen bg-slate-100 dark:bg-slate-950">

    <main class="mx-auto w-full max-w-6xl px-4 py-5 pb-32">

        <div class="space-y-5 fade-up text-slate-900 dark:text-white">

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

function render() {
  if (state.loading) {
    return buildLoading();
  }

  if (state.pageError) {
    return buildError();
  }

  return buildContent();
}

function rerender() {
  const app = qs("#app");

  if (!app) {
    return;
  }

  app.innerHTML = render();

  bindEvents();
}

function bindPlayersHelp() {
  const modal = document.querySelector("#playersHelpModal");

  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  if (window.__playersHelpBound) return;
  window.__playersHelpBound = true;

  document.addEventListener("click", event => {

    const modal = document.querySelector("#playersHelpModal");

    if (event.target.closest("#playersHelpBtn")) {

      modal?.classList.remove("hidden");

      document.documentElement.classList.add("overflow-hidden");
      document.body.classList.add("overflow-hidden");

      return;
    }

    if (
      event.target.closest("#closePlayersHelpBtn") ||
      event.target === modal
    ) {

      modal?.classList.add("hidden");

      document.documentElement.classList.remove("overflow-hidden");
      document.body.classList.remove("overflow-hidden");
    }
  });
}

function bindStandingsHelp() {
  const modal = document.querySelector("#standingsHelpModal");

  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  if (window.__standingsHelpBound) return;
  window.__standingsHelpBound = true;

  document.addEventListener("click", event => {

    const modal = document.querySelector("#standingsHelpModal");

    if (event.target.closest("#standingsHelpBtn")) {

      modal?.classList.remove("hidden");

      document.documentElement.classList.add("overflow-hidden");
      document.body.classList.add("overflow-hidden");

      return;
    }

    if (
      event.target.closest("#closeStandingsHelpBtn") ||
      event.target === modal
    ) {

      modal?.classList.add("hidden");

      document.documentElement.classList.remove("overflow-hidden");
      document.body.classList.remove("overflow-hidden");
    }
  });
}

function bindEvents() {
  qs("#backBtn")?.addEventListener("click", () => {
    window.history.back();
  });

  bindTabs(buildActiveTab, () => {
    if (state.activeTab === "fixture") {
      bindFixtureTab(buildActiveTab);
    }

    if (state.activeTab === "photos") {
      bindPhotosTab();
    }

    if (state.activeTab === "standings") {
      bindStandingsHelp();
    }

    if (state.activeTab === "players") {
      bindPlayersHelp();
    }

    if (state.activeTab === "results") {
      bindResultsTab();
    }

    if (state.activeTab === "teams") {
      bindTeamsTab();
    }
  });

  if (state.activeTab === "fixture") {
    bindFixtureTab(buildActiveTab);
  }

  if (state.activeTab === "photos") {
    bindPhotosTab();
  }

  if (state.activeTab === "standings") {
    bindStandingsHelp();
  }

  if (state.activeTab === "players") {
    bindPlayersHelp();
  }
  
  if (state.activeTab === "results") {
    bindResultsTab();
  }

  if (state.activeTab === "teams") {
    bindTeamsTab();
  }
}

async function loadTournament() {

const [detail, fixtureResult, standingsResult, teamsResult, photosResult, statsResult, playerSummaryResult] = await Promise.all([
  get(`/api/student/${state.companySlug}/tournaments/${state.tournamentId}`),
  get(`/api/student/${state.companySlug}/tournaments/${state.tournamentId}/fixture`),
  get(`/api/student/${state.companySlug}/tournaments/${state.tournamentId}/standings`),
  get(`/api/student/${state.companySlug}/tournaments/${state.tournamentId}/teams`),
  get(`/api/student/${state.companySlug}/tournaments/${state.tournamentId}/photos`),
  get(`/api/student/${state.companySlug}/tournaments/${state.tournamentId}/stats`),
  get(`/api/student/${state.companySlug}/tournaments/${state.tournamentId}/stats/player-summary`)
]);

state.tournament = detail;

state.fixture = Array.isArray(fixtureResult) ? fixtureResult : [];
state.standings = Array.isArray(standingsResult) ? standingsResult : [];
state.teams = Array.isArray(teamsResult) ? teamsResult : [];
state.photos = Array.isArray(photosResult) ? photosResult : [];

state.stats = {
  players: statsResult?.players || statsResult?.Players || [],
  teams: statsResult?.teams || statsResult?.Teams || []
};

state.playerSummary = Array.isArray(playerSummaryResult)
  ? playerSummaryResult
  : [];
}

async function init() {
initTheme();
  try {

    await loadConfig();

    const session = requireAuth();

    if (!session) {
      return;
    }

    state.companySlug = session.activeCompanySlug;
    const student = getStudentMe(state.companySlug);
    applyThemePreference(student?.themePreference || "system"); 

    state.tournamentId = getTournamentIdFromUrl();

    if (!state.tournamentId) {
      throw new Error("No se encontró el torneo.");
    }

    let me = getMe();

    if (!me) {
      me = await get("/api/admin/me");
      setMe(me);
    }

    state.company =
      (me.companies || []).find(
        x => x.companySlug === state.companySlug
      ) || null;

    if (!state.company) {
      throw new Error("No se encontró la empresa.");
    }

    if (!hasModule(state.company, "tournaments")) {
      throw new Error("El módulo torneos no está habilitado.");
    }

    await loadTournament();

  } catch (error) {

    state.pageError =
      error?.message ||
      "No se pudo cargar el torneo.";

  } finally {

    state.loading = false;

    rerender();
  }
}

init();