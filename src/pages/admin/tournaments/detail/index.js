import { get, post, put, del } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth } from "../../../../shared/js/session.js";
import {
  renderAdminLayout,
  setupAdminLayout
} from "../../../../shared/js/admin-layout.js";
import { buildContent } from "./core/layout.js";
import { hasModule } from "../../../../shared/js/modules.js";
import { state } from "./core/state.js";
import { renderPhotosTab, bindPhotosTabEvents } from "./tabs/photos-tab.js";
import { renderStatsTab } from "./tabs/stats-tab.js";
import { renderPlayersTab } from "./tabs/players-tab.js";
import { renderStandingsTab } from "./tabs/standings-tab.js";
import { renderSettingsTab } from "./tabs/settings-tab.js";
import { renderSummaryTab } from "./tabs/summary-tab.js";
import { renderParticipantsTab } from "./tabs/participants-tab.js";
import { renderTeamsTab } from "./tabs/teams-tab.js";
import { renderFixtureTab } from "./tabs/fixture-tab.js";
import { renderResultsTab } from "./tabs/results-tab.js";
import { renderEventModal as renderEventModalContent } from "./tabs/events-tab.js";

let company = null;
let tournamentId = null;
let tournament = null;
let participants = [];
let externalParticipantModalOpen = false;
let externalParticipantName = "";
let companyParticipantModalOpen = false;
let availableCompanies = [];
let selectedParticipantCompanyId = "";
let companyParticipantPermissions = {
  canManageOwnTeam: true,
  canUploadResults: false,
  canUploadPhotos: true,
  canManagePlayers: true
};
let participantMessage = "";
let participantError = "";
let savingParticipant = false;
let deletingParticipant = false;
let teams = [];
let teamModalOpen = false;
let selectedTeamId = null;
let teamForm = {
  participantId: "",
  companyTeamId: null,
  name: "",
  shortName: "",
  logoPath: null,
  category: "",
  coachName: "",
  importPlayersFromCompanyTeam: false,
  isActive: true
};
let savingTeam = false;
let deletingTeam = false;
let teamMessage = "";
let teamError = "";
let companyTeams = [];
let activeTab = "summary";
let matches = [];
let fixtureMessage = "";
let fixtureError = "";
let generatingFixture = false;
let deletingMatch = false;
let openedMatchMenuId = null;
let matchConfirmModalOpen = false;
let matchConfirmAction = null;
let matchConfirmText = "";
let editingMatchId = null;
let manualMatchModalOpen = false;
let savingManualMatch = false;
let manualMatchForm = {
  roundNumber: 1,
  homeTeamId: "",
  awayTeamId: "",
  matchDateUtc: "",
  venue: "",
  address: "",
  notes: "",
  isPublished: false
};
let standings = [];
let resultsMessage = "";
let resultsError = "";
let standingsMessage = "";
let standingsError = "";
let resultModalOpen = false;
let savingResult = false;
let selectedResultMatchId = null;
let resultForm = {
  homeScore: "",
  awayScore: "",
  finishMatch: true
};
let matchEvents = [];
let eventModalOpen = false;
let selectedEventMatchId = null;
let savingEvent = false;
let deletingEvent = false;
let eventMessage = "";
let eventError = "";

let eventForm = {
  teamId: "",
  playerId: null,
  eventType: "Goal",
  minute: "",
  value: "",
  notes: ""
};
let scorers = [];
let playerStats = [];
let teamStats = [];
let eventPlayers = [];

const tabs = [
  {
    key: "summary",
    label: "Resumen"
  },
  {
    key: "participants",
    label: "Participantes"
  },
  {
    key: "teams",
    label: "Equipos"
  },
  {
    key: "fixture",
    label: "Fixture"
  },
  {
    key: "results",
    label: "Resultados"
  },
{
  key: "standings",
  label: "Tabla"
},
{
  key: "stats",
  label: "Estadísticas"
},
{
  key: "players",
  label: "Jugadores"
},
{
  key: "photos",
  label: "Fotos"
},
  {
    key: "settings",
    label: "Configuración"
  }
];

async function loadEventPlayers(teamId) {
  if (!teamId) {
    eventPlayers = [];
    return;
  }

  const result = await get(
    `/api/admin/${company.slug}/tournaments/${tournamentId}/teams/${teamId}/players`
  );

  eventPlayers = Array.isArray(result)
    ? result
    : result?.items || result?.players || [];
}

async function loadMatchEvents(matchId) {
  const result = await get(
    `/api/admin/${company.slug}/tournaments/${tournamentId}/matches/${matchId}/events`
  );

  matchEvents = Array.isArray(result)
    ? result
    : result?.items || result?.events || [];
}

async function loadTournamentStats() {
  try {
    const result = await get(
      `/api/admin/${company.slug}/tournaments/${tournamentId}/stats`
    );

    scorers = result?.scorers || [];
    playerStats = result?.players || [];
    teamStats = result?.teams || [];
  } catch {
    scorers = [];
    playerStats = [];
    teamStats = [];
  }
}

async function loadStandings() {
  const result = await get(`/api/admin/${company.slug}/tournaments/${tournamentId}/standings`);

  standings = Array.isArray(result)
    ? result
    : result?.items || result?.standings || [];
}

async function recalculateStandings() {
  await post(`/api/admin/${company.slug}/tournaments/${tournamentId}/recalculate-standings`, {});
  await loadStandings();
}

async function loadCompanyTeams() {
  const result = await get(`/api/admin/${company.slug}/teams`);
  companyTeams = Array.isArray(result)
    ? result
    : result?.items || result?.teams || [];
}

async function deleteMatch(matchId) {
  fixtureMessage = "";
  fixtureError = "";

  await del(`/api/admin/${company.slug}/tournaments/${tournamentId}/matches/${matchId}`);

  fixtureMessage = "Partido eliminado correctamente.";

  await loadMatches();
  await loadTournament();
}

async function publishMatch(matchId) {
  fixtureMessage = "";
  fixtureError = "";

  await post(
    `/api/admin/${company.slug}/tournaments/${tournamentId}/matches/${matchId}/publish`,
    {}
  );

  fixtureMessage = "Partido publicado correctamente.";

  await loadMatches();
  await loadTournament();
}

function openMatchConfirmModal(text, action) {
  matchConfirmText = text;
  matchConfirmAction = action;
  matchConfirmModalOpen = true;
  renderActiveTab();
}

function closeMatchConfirmModal() {
  matchConfirmModalOpen = false;
  matchConfirmAction = null;
  matchConfirmText = "";
  renderActiveTab();
}


async function confirmMatchAction() {
  if (!matchConfirmAction) return;

  try {
    generatingFixture = true;

    await matchConfirmAction();

    matchConfirmModalOpen = false;
    matchConfirmAction = null;
    matchConfirmText = "";

    renderActiveTab();
  } finally {
    generatingFixture = false;

    renderActiveTab();
  }
}

function renderHero() {
  const container = document.getElementById("tournamentHero");

  if (!tournament) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <section class="overflow-hidden rounded-[30px] border bg-white shadow-sm">
      <div class="relative h-52 bg-slate-900">
        ${
          tournament.bannerUrl
            ? `
              <img
                src="${tournament.bannerUrl}"
                alt="${tournament.name}"
                class="h-full w-full object-cover"
              />
            `
            : `
              <div class="flex h-full w-full items-center justify-center text-white/70">
                Sin banner
              </div>
            `
        }

        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10"></div>

        <div class="absolute bottom-0 left-0 right-0 p-6">
          <div class="flex flex-col gap-4 md:flex-row md:items-end">
            ${
              tournament.logoUrl
                ? `
                  <img
                    src="${tournament.logoUrl}"
                    alt="${tournament.name}"
                    class="h-24 w-24 rounded-3xl border-4 border-white bg-white object-cover shadow-xl"
                  />
                `
                : `
                  <div class="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-slate-900 text-2xl font-bold text-white shadow-xl">
                    ${getInitials(tournament.name)}
                  </div>
                `
            }

            <div class="flex-1 text-white">
              <div class="flex flex-wrap items-center gap-2">
                ${renderStatus()}
              </div>

              <h1 class="mt-3 text-3xl font-bold">
                ${tournament.name || "Torneo"}
              </h1>

              <div class="mt-2 flex flex-wrap gap-3 text-sm text-white/80">
                <span>${getSportText(tournament.sportType)}</span>
                <span>${formatDate(tournament.startDateUtc)}</span>
                <span>${formatDate(tournament.endDateUtc)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 border-t bg-white p-5 md:grid-cols-4">
        ${summaryCard("Participantes", tournament.participantsCount ?? 0)}
        ${summaryCard("Equipos", tournament.teamsCount ?? 0)}
        ${summaryCard("Partidos", tournament.matchesCount ?? 0)}
        ${summaryCard("Estado", getStatusText(tournament.status))}
      </div>
    </section>
  `;
}

function summaryCard(label, value) {
  return `
    <div class="rounded-2xl bg-slate-50 p-4">
      <div class="text-xs text-slate-500">
        ${label}
      </div>

      <div class="mt-1 text-xl font-bold text-slate-900">
        ${value}
      </div>
    </div>
  `;
}

function getStatusText(value) {
  const map = {
    Draft: "Borrador",
    WaitingParticipantsAuthorization: "Esperando autorización",
    ReadyToPublish: "Listo para publicar",
    Published: "Publicado",
    InProgress: "En curso",
    Finished: "Finalizado",
    Cancelled: "Cancelado"
  };

  return map[value] || value || "-";
}

function getScopeText(value) {
  const map = {
    InternalCompany: "Interno",
    Shared: "Compartido",
    Mixed: "Mixto",
    ExternalOnly: "Solo externos"
  };

  return map[value] || value || "-";
}

function getVisibilityText(value) {
  const map = {
    Private: "Privado",
    CompanyOnly: "Solo empresa",
    ParticipantsOnly: "Participantes"
  };

  return map[value] || value || "-";
}

function getCompetitionFormatText(value) {
  const map = {
    League: "Liga",
    Knockout: "Eliminatoria",
    GroupsAndPlayoffs: "Grupos + Playoffs",
    Friendly: "Amistoso",
    Custom: "Personalizado"
  };

  return map[value] || value || "-";
}

function getFixtureModeText(value) {
  const map = {
    Manual: "Manual",
    Automatic: "Automático",
    Mixed: "Mixto"
  };

  return map[value] || value || "-";
}

function getRoundModeText(value) {
  const map = {
    SingleRound: "Solo ida",
    HomeAndAway: "Ida y Vuelta",
    CustomRounds: "Rondas personalizadas"
  };

  return map[value] || value || "-";
}

function renderStatus() {
  if (!tournament)
    return "";

  if (tournament.status === "Cancelled") {
    return `
      <span class="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-100">
        Cancelado
      </span>
    `;
  }

  if (tournament.status === "Finished") {
    return `
      <span class="rounded-full bg-slate-500/20 px-3 py-1 text-xs font-medium text-white">
        Finalizado
      </span>
    `;
  }

  if (tournament.isPublished) {
    return `
      <span class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-100">
        Publicado
      </span>
    `;
  }

  return `
    <span class="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-100">
      Borrador
    </span>
  `;
}

function renderActiveTab() {
  document.querySelectorAll(".tournament-tab-btn")
    .forEach(button => {
      const isActive = button.dataset.tab === activeTab;

      button.className = `
        tournament-tab-btn
        rounded-xl
        px-4
        py-2
        text-sm
        font-medium
        transition
        ${
          isActive
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }
      `;
    });

  const container = document.getElementById("tabContent");

  switch (activeTab) {
    case "summary":
      state.tournament = tournament;

      container.innerHTML = renderSummaryTab();
      return;

    case "participants":
      const isOwner = participants.some(
        x =>
          x.companyId === company?.id &&
          x.participantRole === "Owner"
      );

      container.innerHTML = renderParticipantsTab({
        participants,
        participantMessage,
        participantError,
        companyParticipantModalOpen,
        externalParticipantModalOpen,
        externalParticipantName,
        availableCompanies,
        companyParticipantPermissions,
        isOwner
      });
      break;

      case "teams":
        container.innerHTML = renderTeamsTab({
          teams,
          teamMessage,
          teamError,
          teamModalOpen,
          selectedTeamId,
          teamForm,
          participants,
          companyTeams,
          company,
          tournament
        });
        break;

      case "fixture": {
          const isOwner = participants.some(
            x =>
              x.companyId === company?.id &&
              x.participantRole === "Owner"
          );

        container.innerHTML = renderFixtureTab({
          matchConfirmText,
          isOwner,
          matches,
          teams,
          tournament,
          fixtureMessage,
          fixtureError,
          generatingFixture,
          manualMatchModalOpen,
          matchConfirmModalOpen,
          editingMatchId,
          savingManualMatch,
          manualMatchForm,
          openedMatchMenuId,
          getFixtureModeText,
          formatDateTime,
          getMatchStatusText,
          toDatetimeLocalValue
        });
        break;
      }

      case "results": {
        const isOwner = participants.some(
          x =>
            x.companyId === company?.id &&
            x.participantRole === "Owner"
        );

        const myParticipantIds = participants
          .filter(x => x.companyId === company?.id)
          .map(x => x.id);

        const myCompanyTeamIds = teams
          .filter(x => myParticipantIds.includes(x.participantId))
          .map(x => x.id);

        container.innerHTML = renderResultsTab({
          isOwner,
          myCompanyTeamIds,
          matches,
          teams,
          resultsMessage,
          resultsError,
          resultModalOpen,
          eventModalOpen,
          resultForm,
          renderEventModal,
          formatDateTime,
          getMatchStatusText
        });

        break;
      }

    case "standings":
      state.standings = standings;
      state.teams = teams;

      container.innerHTML = renderStandingsTab();
      return;

    case "photos": {
      const isOwner = participants.some(
        x =>
          x.companyId === company?.id &&
          x.participantRole === "Owner"
      );

      const myParticipantIds = participants
        .filter(x => x.companyId === company?.id)
        .map(x => x.id);

      const myCompanyTeamIds = teams
        .filter(x => myParticipantIds.includes(x.participantId))
        .map(x => x.id);

      state.matches = matches;

      container.innerHTML = renderPhotosTab({
        isOwner,
        myCompanyTeamIds
      });

      bindPhotosTabEvents(renderActiveTab);

      return;
    }

    case "settings":
      state.tournament = tournament;

      container.innerHTML = renderSettingsTab();
      return;

    case "stats":
      state.scorers = scorers;
      state.playerStats = playerStats;
      state.teamStats = teamStats;
      state.teams = teams;

      container.innerHTML = renderStatsTab();
      return;

    case "players":
      state.playerStats = playerStats;

      container.innerHTML = renderPlayersTab();
      return;
    default:
      container.innerHTML = "";
      break;
  }

  bindDynamicTabEvents();
}

function renderTeamLogo(team, className = "h-12 w-12 rounded-xl") {
  const logoUrl =
    team.logoUrl ||
    team.companyTeamLogoUrl ||
    team.externalLogoUrl ||
    team.logoPathUrl ||
    null;

  if (logoUrl) {
    return `
      <img
        src="${logoUrl}"
        alt="${team.name || "Equipo"}"
        class="${className} shrink-0 border bg-white object-cover"
      />
    `;
  }

  return `
    <div class="${className} flex shrink-0 items-center justify-center bg-slate-900 text-sm font-bold text-white">
      ${getInitials(team.name)}
    </div>
  `;
}

async function openEventModal(match) {
  selectedEventMatchId = match.id;
  eventMessage = "";
  eventError = "";

  const isOwner = participants.some(
    x =>
      x.companyId === company?.id &&
      x.participantRole === "Owner"
  );

  const myParticipantIds = participants
    .filter(x => x.companyId === company?.id)
    .map(x => x.id);

  const myCompanyTeamIds = teams
    .filter(x => myParticipantIds.includes(x.participantId))
    .map(x => x.id);

  const defaultTeamId = isOwner
    ? match.homeTeamId || ""
    : myCompanyTeamIds.includes(match.homeTeamId)
      ? match.homeTeamId
      : myCompanyTeamIds.includes(match.awayTeamId)
        ? match.awayTeamId
        : "";

  eventForm = {
    teamId: defaultTeamId,
    playerId: null,
    eventType: "Goal",
    minute: "",
    value: "",
    notes: ""
  };

  await loadMatchEvents(match.id);

  if (eventForm.teamId) {
    await loadEventPlayers(eventForm.teamId);
  } else {
    eventPlayers = [];
  }

  eventModalOpen = true;
  renderActiveTab();
}

function closeEventModal() {
  eventModalOpen = false;
  selectedEventMatchId = null;
  matchEvents = [];
  eventMessage = "";
  eventError = "";

  eventForm = {
    teamId: "",
    playerId: null,
    eventType: "Goal",
    minute: "",
    value: "",
    notes: ""
  };

  renderActiveTab();
}

function getMatchStatusText(status) {
  const map = {
    Draft: "Borrador",
    Scheduled: "Programado",
    InProgress: "En juego",
    Finished: "Finalizado",
    Cancelled: "Cancelado",
    Postponed: "Postergado"
  };

  return map[status] || status || "Borrador";
}

function toDatetimeLocalValue(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);

  return localDate.toISOString().slice(0, 16);
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

async function generateFixture(clearExistingDraftMatches = false) {
  fixtureMessage = "";
  fixtureError = "";

  const body = {
    groupId: null,
    roundMode: tournament?.settings?.roundMode || "SingleRound",
    firstMatchDateUtc: null,
    daysBetweenRounds: 7,
    clearExistingDraftMatches,
    publishMatches: false
  };

  await post(
    `/api/admin/${company.slug}/tournaments/${tournamentId}/matches/generate-fixture`,
    body
  );

  fixtureMessage = clearExistingDraftMatches
    ? "Fixture regenerado correctamente."
    : "Fixture generado correctamente.";

  await loadMatches();
  await loadTournament();
}

function requestGenerateFixture() {
  const hasDraftMatches = matches.some(
    x => x.status === "Draft" && x.isPublished !== true
  );

  if (hasDraftMatches) {
    openMatchConfirmModal(
      "Ya existen partidos borrador. ¿Querés eliminarlos y regenerar el fixture con la nueva configuración?",
      async () => {
        await generateFixture(true);
      }
    );

    return;
  }

  openMatchConfirmModal(
    "¿Querés generar el fixture automático?",
    async () => {
      await generateFixture(false);
    }
  );
}

function resetManualMatchForm() {
  manualMatchForm = {
    roundNumber: 1,
    homeTeamId: "",
    awayTeamId: "",
    matchDateUtc: "",
    venue: "",
    address: "",
    notes: "",
    isPublished: false
  };
}

function openManualMatchModal() {
  fixtureMessage = "";
  fixtureError = "";
  editingMatchId = null;

  resetManualMatchForm();

  manualMatchModalOpen = true;
  renderActiveTab();
}

function closeManualMatchModal() {
  manualMatchModalOpen = false;
  editingMatchId = null;
  resetManualMatchForm();
  renderActiveTab();
}

function buildManualMatchBody() {
  const matchDateValue = document.getElementById("manualMatchDateInput")?.value || null;

  return {
    roundNumber: Number(document.getElementById("manualMatchRoundInput")?.value || 1),
    homeTeamId: document.getElementById("manualMatchHomeTeamInput")?.value || "",
    awayTeamId: document.getElementById("manualMatchAwayTeamInput")?.value || "",
    matchDateUtc: matchDateValue ? new Date(matchDateValue).toISOString() : null,
    venue: document.getElementById("manualMatchVenueInput")?.value?.trim() || null,
    address: document.getElementById("manualMatchAddressInput")?.value?.trim() || null,
    notes: document.getElementById("manualMatchNotesInput")?.value?.trim() || null,
    isPublished: document.getElementById("manualMatchIsPublishedInput")?.checked === true
  };
}

async function saveManualMatch() {
  fixtureMessage = "";
  fixtureError = "";

  const body = buildManualMatchBody();

  if (!body.roundNumber || body.roundNumber < 1) {
    fixtureError = "Ingresá una fecha válida.";
    renderActiveTab();
    return;
  }

  if (!body.homeTeamId) {
    fixtureError = "Seleccioná el equipo local.";
    renderActiveTab();
    return;
  }

  if (!body.awayTeamId) {
    fixtureError = "Seleccioná el equipo visitante.";
    renderActiveTab();
    return;
  }

  if (body.homeTeamId === body.awayTeamId) {
    fixtureError = "El local y el visitante no pueden ser el mismo equipo.";
    renderActiveTab();
    return;
  }

  if (editingMatchId) {
  await put(
    `/api/admin/${company.slug}/tournaments/${tournamentId}/matches/${editingMatchId}`,
    body
  );

  fixtureMessage = "Partido actualizado correctamente.";
} else {
  await post(`/api/admin/${company.slug}/tournaments/${tournamentId}/matches`, body);

  fixtureMessage = "Partido creado correctamente.";
}

manualMatchModalOpen = false;
editingMatchId = null;
resetManualMatchForm();

  await loadMatches();
  await loadTournament();
}

function renderEventModal() {
  const isOwner = participants.some(
    x =>
      x.companyId === company?.id &&
      x.participantRole === "Owner"
  );

  const myParticipantIds = participants
    .filter(x => x.companyId === company?.id)
    .map(x => x.id);

  const myCompanyTeamIds = teams
    .filter(x => myParticipantIds.includes(x.participantId))
    .map(x => x.id);

  return renderEventModalContent({
    isOwner,
    myCompanyTeamIds,
    matches,
    teams,
    selectedEventMatchId,
    eventForm,
    eventPlayers,
    matchEvents,
    eventMessage,
    eventError
  });
}

async function saveMatchEvent() {
  eventMessage = "";
  eventError = "";

  const body = {
  teamId: document.getElementById("eventTeamInput")?.value || "",
  playerId: document.getElementById("eventPlayerInput")?.value || null,
    eventType: document.getElementById("eventTypeInput")?.value || "Goal",
    minute: document.getElementById("eventMinuteInput")?.value
      ? Number(document.getElementById("eventMinuteInput").value)
      : null,
    value: document.getElementById("eventValueInput")?.value
      ? Number(document.getElementById("eventValueInput").value)
      : null,
    notes: document.getElementById("eventNotesInput")?.value?.trim() || null
    
  };
console.log("Evento a guardar:", body);
  if (!body.teamId) {
    eventError = "Seleccioná el equipo.";
    renderActiveTab();
    return;
  }

  await post(
    `/api/admin/${company.slug}/tournaments/${tournamentId}/matches/${selectedEventMatchId}/events`,
    body
  );

eventMessage = "Evento guardado correctamente.";

await loadMatchEvents(selectedEventMatchId);
  await loadStandings();
  await loadTournamentStats();

  renderActiveTab();
}

async function deleteMatchEvent(eventId) {
  await del(
    `/api/admin/${company.slug}/tournaments/${tournamentId}/matches/${selectedEventMatchId}/events/${eventId}`
  );

  eventMessage = "Evento eliminado correctamente.";

  await loadMatchEvents(selectedEventMatchId);
  await loadStandings();
  await loadTournamentStats();

  renderActiveTab();
}

function openResultModal(match) {
  selectedResultMatchId = match.id;

  resultForm = {
    homeScore: match.homeScore ?? "",
    awayScore: match.awayScore ?? "",
    finishMatch: match.status !== "InProgress"
  };

  resultModalOpen = true;

  renderActiveTab();
}

function closeResultModal() {
  resultModalOpen = false;

  selectedResultMatchId = null;

  resultForm = {
    homeScore: "",
    awayScore: "",
    finishMatch: true
  };

  renderActiveTab();
}

async function saveResult() {
  resultsMessage = "";
  resultsError = "";

  const body = {
    homeScore: Number(document.getElementById("resultHomeScoreInput")?.value || 0),
    awayScore: Number(document.getElementById("resultAwayScoreInput")?.value || 0),
    finishMatch: document.getElementById("resultFinishMatchInput")?.checked === true
  };

  await post(
    `/api/admin/${company.slug}/tournaments/${tournamentId}/matches/${selectedResultMatchId}/result`,
    body
  );

  resultsMessage = "Resultado guardado correctamente.";

  resultModalOpen = false;

  await loadMatches();
  await loadStandings();
  await loadTournament();

  renderActiveTab();
}

function getSportText(value) {
  if (!value)
    return "Otro";

  const normalized = String(value).toLowerCase();

  if (normalized.includes("football"))
    return "Fútbol";

  if (normalized.includes("futsal"))
    return "Futsal";

  if (normalized.includes("basket"))
    return "Básquet";

  if (normalized.includes("volley"))
    return "Vóley";

  return value;
}

function getInitials(name) {
  if (!name)
    return "TR";

  const parts = name.trim().split(" ");

  if (parts.length === 1)
    return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatDate(value) {
  if (!value)
    return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime()))
    return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

async function loadParticipants() {
  participants = await get(`/api/admin/${company.slug}/tournaments/${tournamentId}/participants`);
}

async function saveExternalParticipant() {
  participantMessage = "";
  participantError = "";

  const name = document.getElementById("externalParticipantNameInput")?.value?.trim();

  if (!name) {
    participantError = "Ingresá el nombre del externo.";
    renderActiveTab();
    bindDynamicTabEvents();
    return;
  }

  await post(`/api/admin/${company.slug}/tournaments/${tournamentId}/participants`, {
    externalName: name,
    canManageOwnTeam: true,
    canUploadResults: false,
    canUploadPhotos: true,
    canManagePlayers: true
  });

  externalParticipantModalOpen = false;
  externalParticipantName = "";
  participantMessage = "Participante externo agregado correctamente.";

  await loadParticipants();
  await loadTournament();
}

async function deleteParticipant(participantId) {
  participantMessage = "";
  participantError = "";

  await del(`/api/admin/${company.slug}/tournaments/${tournamentId}/participants/${participantId}`);

  participantMessage = "Participante eliminado correctamente.";

  await loadParticipants();
  await loadTournament();
}

async function loadAvailableCompanies() {
  const url = `/api/admin/companies/available-for-tournament?tournamentId=${tournamentId}&companySlug=${company.slug}`;

  console.log("URL empresas disponibles:", url);

  const result = await get(url);

  console.log("Empresas disponibles result:", result);

  availableCompanies = Array.isArray(result)
    ? result
    : result?.items || result?.companies || [];
}

async function saveCompanyParticipant() {
  participantMessage = "";
  participantError = "";

if (
  !selectedParticipantCompanyId ||
  selectedParticipantCompanyId === "undefined" ||
  selectedParticipantCompanyId === "null"
) {
  participantError = "Seleccioná una empresa válida.";
  renderActiveTab();
  return;
}

  const body = {
    companyId: selectedParticipantCompanyId || null,
    companyTeamId: null,

    canManageOwnTeam: companyParticipantPermissions.canManageOwnTeam,
    canUploadResults: companyParticipantPermissions.canUploadResults,
    canUploadPhotos: companyParticipantPermissions.canUploadPhotos,
    canManagePlayers: companyParticipantPermissions.canManagePlayers
  };

  console.log("body participante empresa:", body);

  await post(`/api/admin/${company.slug}/tournaments/${tournamentId}/participants`, body);

  companyParticipantModalOpen = false;
  selectedParticipantCompanyId = "";
  participantMessage = "Empresa agregada correctamente. Quedará pendiente de autorización.";

  await loadParticipants();
  await loadTournament();
}

async function loadTeams() {
  teams = await get(`/api/admin/${company.slug}/tournaments/${tournamentId}/teams`);
}

async function loadMatches() {
  const result = await get(`/api/admin/${company.slug}/tournaments/${tournamentId}/matches`);

  matches = Array.isArray(result)
    ? result
    : result?.items || result?.matches || [];
}

function resetTeamForm() {
  const ownerParticipant = participants.find(p => p.participantRole === "Owner");

  selectedTeamId = null;
  teamForm = {
    participantId: ownerParticipant?.id || "",
    companyTeamId: null,
    name: "",
    shortName: "",
    logoPath: null,
    category: "",
    coachName: "",
    importPlayersFromCompanyTeam: false,
    isActive: true
  };
}

function openTeamModal(team = null) {
  teamMessage = "";
  teamError = "";

  if (team) {
    selectedTeamId = team.id;
    teamForm = {
      participantId: team.participantId || "",
      companyTeamId: team.companyTeamId || null,
      name: team.name || "",
      shortName: team.shortName || "",
      logoPath: team.logoPath || null,
      category: team.category || "",
      coachName: team.coachName || "",
      importPlayersFromCompanyTeam: false,
      isActive: team.isActive !== false
    };
  } else {
    resetTeamForm();
  }

  teamModalOpen = true;
  renderActiveTab();
}

function closeTeamModal() {
  teamModalOpen = false;
  resetTeamForm();
  renderActiveTab();
}

function buildTeamBody() {
  return {
    participantId: document.getElementById("teamParticipantInput")?.value || "",
    companyTeamId: document.getElementById("companyTeamInput")?.value || null,
    name: document.getElementById("teamNameInput")?.value?.trim() || "",
    shortName: document.getElementById("teamShortNameInput")?.value?.trim() || null,
    logoPath: teamForm.logoPath || null,
    category: document.getElementById("teamCategoryInput")?.value?.trim() || null,
    coachName: document.getElementById("teamCoachInput")?.value?.trim() || null,
    importPlayersFromCompanyTeam: false,
    isActive: document.getElementById("teamIsActiveInput")?.checked === true
  };
}

async function saveTeam() {
  teamMessage = "";
  teamError = "";

  const body = buildTeamBody();

  if (!body.participantId) {
    teamError = "Seleccioná el participante.";
    renderActiveTab();
    return;
  }

  if (!body.name) {
    teamError = "Ingresá el nombre del equipo.";
    renderActiveTab();
    return;
  }

  if (selectedTeamId) {
    await put(`/api/admin/${company.slug}/tournaments/${tournamentId}/teams/${selectedTeamId}`, body);
    teamMessage = "Equipo actualizado correctamente.";
  } else {
    await post(`/api/admin/${company.slug}/tournaments/${tournamentId}/teams`, body);
    teamMessage = "Equipo creado correctamente.";
  }

  teamModalOpen = false;
  resetTeamForm();

  await loadTeams();
  await loadTournament();
}

async function deleteTeam(teamId) {
  teamMessage = "";
  teamError = "";

  await del(`/api/admin/${company.slug}/tournaments/${tournamentId}/teams/${teamId}`);

  teamMessage = "Equipo eliminado correctamente.";

  await loadTeams();
  await loadTournament();
}

function bindDynamicTabEvents() {
  document.getElementById("openCompanyParticipantModalBtn")?.addEventListener("click", async () => {
  try {
    participantMessage = "";
    participantError = "";
    selectedParticipantCompanyId = "";
    companyParticipantModalOpen = true;

    await loadAvailableCompanies();

    renderActiveTab();
  } catch (error) {
    participantError = error?.message || "No se pudieron cargar las empresas.";
    renderActiveTab();
  }
});

document.getElementById("closeCompanyParticipantModalBtn")?.addEventListener("click", () => {
  companyParticipantModalOpen = false;
  renderActiveTab();
});

document.querySelector("[data-close-company-modal='true']")?.addEventListener("click", () => {
  companyParticipantModalOpen = false;
  renderActiveTab();
});

document.getElementById("companyParticipantSelect")?.addEventListener("change", e => {
  selectedParticipantCompanyId = e.target.value;
});

document.querySelectorAll("[data-company-permission]").forEach(input => {
  input.addEventListener("change", e => {
    const key = e.target.dataset.companyPermission;
    companyParticipantPermissions[key] = e.target.checked;
  });
});

document.getElementById("saveCompanyParticipantBtn")?.addEventListener("click", async () => {
  if (savingParticipant) return;

  try {
    savingParticipant = true;
    await saveCompanyParticipant();
    renderActiveTab();
  } catch (error) {
    participantError = error?.message || "No se pudo agregar la empresa.";
    renderActiveTab();
  } finally {
    savingParticipant = false;
  }
});

  document.getElementById("openExternalParticipantModalBtn")?.addEventListener("click", () => {
    externalParticipantModalOpen = true;
    participantMessage = "";
    participantError = "";
    renderActiveTab();
  });

  document.getElementById("closeExternalParticipantModalBtn")?.addEventListener("click", () => {
    externalParticipantModalOpen = false;
    renderActiveTab();
  });

  document.querySelector("[data-close-external-modal='true']")?.addEventListener("click", () => {
    externalParticipantModalOpen = false;
    renderActiveTab();
  });

  document.getElementById("externalParticipantNameInput")?.addEventListener("input", e => {
    externalParticipantName = e.target.value;
  });

  document.getElementById("saveExternalParticipantBtn")?.addEventListener("click", async () => {
    if (savingParticipant) return;

    try {
      savingParticipant = true;
      await saveExternalParticipant();
      renderActiveTab();
    } catch (error) {
      participantError = error?.message || "No se pudo agregar el participante.";
      renderActiveTab();
    } finally {
      savingParticipant = false;
    }
  });

  document.querySelectorAll("[data-delete-participant-id]").forEach(button => {
    button.addEventListener("click", async () => {
      if (deletingParticipant) return;

      try {
        deletingParticipant = true;
        await deleteParticipant(button.dataset.deleteParticipantId);
        renderActiveTab();
      } catch (error) {
        participantError = error?.message || "No se pudo eliminar el participante.";
        renderActiveTab();
      } finally {
        deletingParticipant = false;
      }
    });
  });

    document.getElementById("openTeamModalBtn")?.addEventListener("click", () => {
    openTeamModal();
  });

  document.getElementById("closeTeamModalBtn")?.addEventListener("click", () => {
    closeTeamModal();
  });

  document.querySelector("[data-close-team-modal='true']")?.addEventListener("click", () => {
    closeTeamModal();
  });

  document.getElementById("teamParticipantInput")?.addEventListener("change", e => {
    teamForm.participantId = e.target.value;
  });

  document.getElementById("teamNameInput")?.addEventListener("input", e => {
    teamForm.name = e.target.value;
  });

  document.getElementById("teamShortNameInput")?.addEventListener("input", e => {
    teamForm.shortName = e.target.value;
  });

  document.getElementById("teamCategoryInput")?.addEventListener("input", e => {
    teamForm.category = e.target.value;
  });

document.getElementById("teamCoachInput")?.addEventListener("input", e => {
  teamForm.coachName = e.target.value;
});

  document.getElementById("teamIsActiveInput")?.addEventListener("change", e => {
    teamForm.isActive = e.target.checked;
  });

  document.getElementById("saveTeamBtn")?.addEventListener("click", async () => {
    if (savingTeam) return;

    try {
      savingTeam = true;
      await saveTeam();
      renderActiveTab();
    } catch (error) {
      teamError = error?.message || "No se pudo guardar el equipo.";
      renderActiveTab();
    } finally {
      savingTeam = false;
    }
  });

  document.querySelectorAll("[data-edit-team-id]").forEach(button => {
    button.addEventListener("click", () => {
      const team = teams.find(x => x.id === button.dataset.editTeamId);
      if (team) openTeamModal(team);
    });
  });

document.getElementById("companyTeamInput")?.addEventListener("change", e => {
  const selected = companyTeams.find(x => x.id === e.target.value);

  const participantInput = document.getElementById("teamParticipantInput");

  teamForm.companyTeamId = e.target.value || null;

  if (participantInput) {
    teamForm.participantId = participantInput.value || "";
  }

  if (selected) {
    teamForm.name = selected.name || "";
    teamForm.shortName = selected.shortName || "";
    teamForm.category = selected.category || "";
    teamForm.coachName = selected.coachName || "";

    renderActiveTab();
  }
});

  document.querySelectorAll("[data-delete-team-id]").forEach(button => {
    button.addEventListener("click", async () => {
      if (deletingTeam) return;

      try {
        deletingTeam = true;
        await deleteTeam(button.dataset.deleteTeamId);
        renderActiveTab();
      } catch (error) {
        teamError = error?.message || "No se pudo eliminar el equipo.";
        renderActiveTab();
      } finally {
        deletingTeam = false;
      }
    });
  });

document.getElementById("generateFixtureBtn")?.addEventListener("click", async () => {
  if (generatingFixture) return;

  try {
    requestGenerateFixture();
  } catch (error) {
    fixtureError = error?.message || "No se pudo generar el fixture.";

    renderActiveTab();
  }
});

document.getElementById("openManualMatchModalBtn")?.addEventListener("click", () => {
  const fixtureMode = tournament?.settings?.fixtureGenerationMode || "Manual";

  if (fixtureMode !== "Manual" && fixtureMode !== "Mixed") {
    fixtureError = "Este torneo no permite carga manual de partidos.";
    renderActiveTab();
    return;
  }

  openManualMatchModal();
});

document.getElementById("closeManualMatchModalBtn")?.addEventListener("click", () => {
  closeManualMatchModal();
});

document.querySelector("[data-close-manual-match-modal='true']")?.addEventListener("click", () => {
  closeManualMatchModal();
});

document.getElementById("saveManualMatchBtn")?.addEventListener("click", async () => {
  const fixtureMode = tournament?.settings?.fixtureGenerationMode || "Manual";

  if (fixtureMode !== "Manual" && fixtureMode !== "Mixed") {
    fixtureError = "Este torneo no permite carga manual de partidos.";
    renderActiveTab();
    return;
  }

  if (savingManualMatch) return;

try {
  savingManualMatch = true;

await saveManualMatch();

renderActiveTab();
  } catch (error) {
    fixtureError = error?.message || "No se pudo crear el partido.";
    renderActiveTab();
  } finally {
    savingManualMatch = false;
    renderActiveTab();
  }
});

document.querySelectorAll("[data-match-menu-btn]").forEach(button => {
  button.addEventListener("click", () => {
    const matchId = button.dataset.matchMenuBtn;

    openedMatchMenuId =
      openedMatchMenuId === matchId
        ? null
        : matchId;

    renderActiveTab();
  });
});

document.querySelectorAll("[data-delete-match-id]").forEach(button => {
  button.addEventListener("click", () => {
    const matchId = button.dataset.deleteMatchId;

    openMatchConfirmModal("¿Querés eliminar este partido?", async () => {
      if (deletingMatch) return;

      try {
        deletingMatch = true;

        await deleteMatch(matchId);

        openedMatchMenuId = null;

        renderActiveTab();
      } catch (error) {
        fixtureError = error?.message || "No se pudo eliminar el partido.";
        renderActiveTab();
      } finally {
        deletingMatch = false;
      }
    });
  });
});

document.querySelectorAll("[data-publish-match-id]").forEach(button => {
  button.addEventListener("click", async () => {
    try {
      await publishMatch(button.dataset.publishMatchId);

      openedMatchMenuId = null;

      renderActiveTab();
    } catch (error) {
      fixtureError = error?.message || "No se pudo publicar el partido.";
      renderActiveTab();
    }
  });
});

document.querySelectorAll("[data-edit-match-id]").forEach(button => {
  button.addEventListener("click", () => {
    const match = matches.find(x => x.id === button.dataset.editMatchId);
    if (!match) return;

    editingMatchId = match.id;

    manualMatchForm = {
      roundNumber: match.roundNumber || 1,
      homeTeamId: match.homeTeamId || "",
      awayTeamId: match.awayTeamId || "",
      matchDateUtc: toDatetimeLocalValue(match.matchDateUtc),
      venue: match.venue || "",
      address: match.address || "",
      notes: match.notes || "",
      isPublished: match.isPublished === true
    };

    openedMatchMenuId = null;
    manualMatchModalOpen = true;
    renderActiveTab();
  });
});

document.getElementById("cancelMatchConfirmBtn")?.addEventListener("click", () => {
  closeMatchConfirmModal();
});

document.querySelector("[data-close-match-confirm='true']")?.addEventListener("click", () => {
  closeMatchConfirmModal();
});

document.getElementById("acceptMatchConfirmBtn")?.addEventListener("click", async () => {
  try {
    await confirmMatchAction();
    renderActiveTab();
  } catch (error) {
    fixtureError = error?.message || "No se pudo completar la acción.";
    renderActiveTab();
  }
});

document.querySelectorAll("[data-open-result-modal]").forEach(button => {
  button.addEventListener("click", () => {
    const match = matches.find(x => x.id === button.dataset.openResultModal);

    if (!match) return;

    openResultModal(match);
  });
});

document.querySelector("[data-close-result-modal='true']")?.addEventListener("click", () => {
  closeResultModal();
});

document.getElementById("saveResultBtn")?.addEventListener("click", async () => {
  if (savingResult) return;

  try {
    savingResult = true;

    await saveResult();
  } catch (error) {
    resultsError = error?.message || "No se pudo guardar el resultado.";
    renderActiveTab();
  } finally {
    savingResult = false;
  }
});

document.getElementById("recalculateStandingsBtn")?.addEventListener("click", async () => {
  try {
    await recalculateStandings();

    standingsMessage = "Tabla recalculada correctamente.";

    renderActiveTab();
  } catch (error) {
    standingsError = error?.message || "No se pudo recalcular la tabla.";
    renderActiveTab();
  }
});

document.querySelectorAll("[data-open-events-modal]").forEach(button => {
  button.addEventListener("click", async () => {
    const match = matches.find(x => x.id === button.dataset.openEventsModal);
    if (!match) return;

    try {
      await openEventModal(match);
    } catch (error) {
      resultsError = error?.message || "No se pudieron cargar los eventos.";
      renderActiveTab();
    }
  });
});

document.getElementById("closeEventModalBtn")?.addEventListener("click", () => {
  closeEventModal();
});

document.querySelector("[data-close-event-modal='true']")?.addEventListener("click", () => {
  closeEventModal();
});

document.getElementById("saveEventBtn")?.addEventListener("click", async () => {
  if (savingEvent) return;

  try {
    savingEvent = true;
    await saveMatchEvent();
  } catch (error) {
    eventError = error?.message || "No se pudo guardar el evento.";
    renderActiveTab();
  } finally {
    savingEvent = false;
  }
});

document.querySelectorAll("[data-delete-event-id]").forEach(button => {
  button.addEventListener("click", async () => {
    if (deletingEvent) return;

    try {
      deletingEvent = true;
      await deleteMatchEvent(button.dataset.deleteEventId);
    } catch (error) {
      eventError = error?.message || "No se pudo eliminar el evento.";
      renderActiveTab();
    } finally {
      deletingEvent = false;
    }
  });
});

document.getElementById("eventTeamInput")?.addEventListener("change", async e => {
  try {
    await loadEventPlayers(e.target.value);

    eventForm.teamId = e.target.value;
    eventForm.playerId = null;

    renderActiveTab();
  } catch (error) {
    eventError = error?.message || "No se pudieron cargar jugadores.";
    renderActiveTab();
  }
});

}

async function loadTournament() {
  tournament = await get(
    `/api/admin/${company.slug}/tournaments/${tournamentId}`
  );

await loadParticipants();
await loadCompanyTeams();
await loadTeams();
await loadMatches();
await loadStandings();
await loadTournamentStats();

  renderHero();
  renderActiveTab();
}

function bindEvents() {
  document.querySelectorAll(".tournament-tab-btn")
    .forEach(button => {
      button.addEventListener("click", () => {
        activeTab = button.dataset.tab;
        renderActiveTab();
      });
    });
}

async function init() {
  await loadConfig();

  requireAuth();

  const params = new URLSearchParams(window.location.search);

  tournamentId = params.get("id");

  if (!tournamentId) {
    window.location.replace("/src/pages/admin/tournaments/index.html");
    return;
  }

  const app = document.getElementById("app");

  app.innerHTML = renderAdminLayout({
    activeKey: "tournaments",
    pageTitle: "Detalle torneo",
    contentHtml: buildContent()
  });

const layout = await setupAdminLayout();

company = layout.activeCompany;

state.company = company;
state.tournamentId = tournamentId;

if (!company) {
  window.location.replace("/src/pages/admin/tournaments/index.html");
  return;
}

if (!hasModule(company, "tournaments")) {
  window.location.replace("/src/pages/admin/students/index.html");
  return;
}

bindEvents();

await loadTournament();
}

init();