import { get, post, put, del, postForm } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";
import { hasModule } from "../../../shared/js/modules.js";

let company = null;
let tournaments = [];

let filters = {
  search: "",
  status: "",
  sportType: ""
};

let selectedTournamentId = null;
let selectedLogoPath = null;
let selectedLogoUrl = null;
let selectedBannerPath = null;
let selectedBannerUrl = null;
let confirmAction = null;
let invitations = [];

function buildContent() {
  return `
    <section class="space-y-6">
      <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-widest text-slate-300">Torneos</p>
            <h1 class="text-3xl font-bold">Torneos y ligas</h1>
            <p class="text-sm text-slate-300">Administración de competencias internas y compartidas.</p>
          </div>

          <button id="openTournamentModalBtn" type="button" class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
            Crear torneo
          </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div class="bg-white/10 rounded-xl p-4">
            <div class="text-xs text-slate-300">Torneos</div>
            <div id="totalTournaments" class="text-xl font-bold">0</div>
          </div>

          <div class="bg-white/10 rounded-xl p-4">
            <div class="text-xs text-slate-300">Publicados</div>
            <div id="publishedTournaments" class="text-xl font-bold">0</div>
          </div>

          <div class="bg-white/10 rounded-xl p-4">
            <div class="text-xs text-slate-300">Equipos</div>
            <div id="totalTeams" class="text-xl font-bold">0</div>
          </div>

          <div class="bg-white/10 rounded-xl p-4">
            <div class="text-xs text-slate-300">Partidos</div>
            <div id="totalMatches" class="text-xl font-bold">0</div>
          </div>
        </div>
      </section>

      <section id="invitationsSection"></section>

<section class="bg-white rounded-2xl border p-4">
        <div class="grid gap-3 lg:grid-cols-[220px_220px_1fr]">
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Estado</label>
            <select id="statusFilter" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="Draft">Borrador</option>
              <option value="WaitingParticipantsAuthorization">Esperando autorización</option>
              <option value="ReadyToPublish">Listo para publicar</option>
              <option value="Published">Publicado</option>
              <option value="InProgress">En curso</option>
              <option value="Finished">Finalizado</option>
              <option value="Cancelled">Cancelado</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Deporte</label>
            <select id="sportFilter" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="Football">Fútbol</option>
              <option value="Futsal">Futsal</option>
              <option value="Basketball">Básquet</option>
              <option value="Volleyball">Vóley</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Buscar</label>
            <input id="searchFilter" type="text" placeholder="Buscar por nombre o descripción" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
      </section>

      <section id="tournamentsList" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"></section>
    </section>

    ${renderTournamentModal()}
    ${renderConfirmModal()}
    ${renderMessageModal()}
  `;
}

function renderTournamentModal() {
  return `
    <div id="tournamentModal" class="fixed inset-0 z-50 hidden p-4">
      <div class="absolute inset-0 bg-slate-950/60" data-close-tournament-modal="true"></div>

      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 id="tournamentModalTitle" class="text-lg font-semibold text-slate-900">Crear torneo</h3>
              <p class="text-sm text-slate-500">Configuración inicial de la competencia.</p>
            </div>

            <button id="closeTournamentModalBtn" type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cerrar
            </button>
          </div>

          <form id="tournamentForm" class="p-5 space-y-5">
            <div class="grid gap-4 md:grid-cols-2">
              ${inputText("Nombre", "tournamentNameInput", "Liga Apertura 2026")}

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">Deporte</label>
                <select id="tournamentSportTypeInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="1">Fútbol</option>
                  <option value="2">Futsal</option>
                  <option value="3">Básquet</option>
                  <option value="4">Vóley</option>
                  <option value="99">Otro</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                <select id="tournamentScopeInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="InternalCompany">Interno de empresa</option>
                  <option value="Shared">Compartido</option>
                  <option value="Mixed">Mixto</option>
                  <option value="ExternalOnly">Solo externos</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">Visibilidad</label>
                <select id="tournamentVisibilityInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="Private">Privado</option>
                  <option value="CompanyOnly">Solo empresa</option>
                  <option value="ParticipantsOnly">Participantes</option>
                </select>
              </div>

              ${inputDate("Inicio", "tournamentStartDateInput")}
              ${inputDate("Fin", "tournamentEndDateInput")}

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">Formato</label>
                <select id="competitionFormatInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="League">Liga</option>
                  <option value="Knockout">Eliminatoria</option>
                  <option value="GroupsAndPlayoffs">Grupos + Playoffs</option>
                  <option value="Friendly">Amistoso</option>
                  <option value="Custom">Personalizado</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">Fixture</label>
                <select id="fixtureGenerationModeInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automático</option>
                  <option value="Mixed">Mixto</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">Rondas</label>
                <select id="roundModeInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="SingleRound">Solo ida</option>
                  <option value="HomeAndAway">Ida y vuelta</option>
                  <option value="CustomRounds">Rondas personalizadas</option>
                </select>
              </div>

              ${inputNumber("Jugadores en cancha", "playersOnFieldInput", 7)}
              ${inputNumber("Mínimo jugadores por equipo", "minPlayersPerTeamInput", 7)}
              ${inputNumber("Máximo jugadores por equipo", "maxPlayersPerTeamInput", 18)}
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
              <textarea id="tournamentDescriptionInput" rows="3" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
            </div>

            <div class="rounded-2xl border border-slate-200 p-4">
              <h4 class="font-semibold text-slate-900">Puntuación</h4>
              <div class="mt-4 grid gap-4 md:grid-cols-3">
                ${inputNumber("Ganado", "winPointsInput", 3)}
                ${inputNumber("Empatado", "drawPointsInput", 1)}
                ${inputNumber("Perdido", "lossPointsInput", 0)}
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 p-4">
  <div>
    <h4 class="font-semibold text-slate-900">Calendario y partidos</h4>
    <p class="mt-1 text-sm text-slate-500">
      Configuración usada para calcular fecha y hora tentativa del fixture automático.
    </p>
  </div>

  <div class="mt-4">
    <label class="block text-xs font-medium text-slate-500 mb-2">Días de juego</label>
    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      ${playDayCheckbox(1, "Lunes")}
      ${playDayCheckbox(2, "Martes")}
      ${playDayCheckbox(3, "Miércoles")}
      ${playDayCheckbox(4, "Jueves")}
      ${playDayCheckbox(5, "Viernes")}
      ${playDayCheckbox(6, "Sábado")}
      ${playDayCheckbox(0, "Domingo")}
    </div>
  </div>

  <div class="mt-4 grid gap-4 md:grid-cols-3">
  <div>
    <label class="block text-xs font-medium text-slate-500 mb-1">Hora inicio</label>
    <input id="defaultMatchStartTimeInput" type="time" value="10:00" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
  </div>

  <div>
    <label class="block text-xs font-medium text-slate-500 mb-1">Hora fin</label>
    <input id="defaultMatchEndTimeInput" type="time" value="18:00" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
  </div>

  ${inputNumber("Cantidad de canchas", "courtsCountInput", 1)}
  ${inputNumber("Cantidad de tiempos", "matchPeriodsCountInput", 2)}
  ${inputNumber("Minutos por tiempo", "minutesPerPeriodInput", 25)}
  ${inputNumber("Descanso entre tiempos", "halftimeBreakMinutesInput", 5)}
  ${inputNumber("Break entre partidos", "breakBetweenMatchesMinutesInput", 10)}
</div>

<div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
  <label class="flex items-start gap-3">
    <input
      id="allowMultipleMatchesPerTeamPerDayInput"
      type="checkbox"
      class="mt-1 h-4 w-4 rounded border-slate-300"
    />

    <div>
      <div class="text-sm font-medium text-slate-800">
        Permitir más de un partido por equipo en el mismo día
      </div>

      <div class="mt-1 text-xs text-slate-500">
        Ideal para torneos relámpago o jornadas compactas.
      </div>
    </div>
  </label>
</div>

<div class="mt-4 grid gap-4 md:grid-cols-2">
  ${inputText("Sede default", "defaultVenueInput", "Ej: Cancha principal")}
  ${inputText("Dirección default", "defaultAddressInput", "Ej: Av. Siempre Viva 123")}
</div>
</div>

            <div class="grid gap-4 md:grid-cols-2">
              ${renderUploadBox(
                "Logo",
                "tournamentLogoInput",
                "tournamentLogoPreview",
                "removeTournamentLogoBtn"
              )}

              ${renderUploadBox(
                "Banner",
                "tournamentBannerInput",
                "tournamentBannerPreview",
                "removeTournamentBannerBtn"
              )}
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
  <label class="flex items-start gap-3">
    <input
      id="useBannerAsHomeBackgroundInput"
      type="checkbox"
      checked
      class="mt-1 h-4 w-4 rounded border-slate-300"
    />

    <div>
      <div class="text-sm font-semibold text-slate-800">
        Usar banner como fondo en Home
      </div>

      <div class="mt-1 text-xs text-slate-500">
        Si está desactivado, la card “En competencia” usará un fondo deportivo automático.
      </div>
    </div>
  </label>
</div>

            <div id="tournamentFormMessage" class="hidden rounded-xl px-3 py-2 text-sm"></div>

            <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button id="cancelTournamentModalBtn" type="button" class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>

              <button id="submitTournamentBtn" type="submit" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">
                Guardar torneo
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

function inputText(label, id, placeholder = "") {
  return `
    <div>
      <label class="block text-xs font-medium text-slate-500 mb-1">${label}</label>
      <input id="${id}" type="text" placeholder="${placeholder}" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
    </div>
  `;
}

function inputDate(label, id) {
  return `
    <div>
      <label class="block text-xs font-medium text-slate-500 mb-1">${label}</label>
      <input id="${id}" type="date" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
    </div>
  `;
}

function inputNumber(label, id, value) {
  return `
    <div>
      <label class="block text-xs font-medium text-slate-500 mb-1">${label}</label>
      <input id="${id}" type="number" value="${value}" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
    </div>
  `;
}

function playDayCheckbox(value, label) {
  return `
    <label class="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
      <input type="checkbox" data-play-day="${value}" class="rounded border-slate-300" />
      <span>${label}</span>
    </label>
  `;
}

function getSelectedPlayDaysJson() {
  const days = Array.from(document.querySelectorAll("[data-play-day]:checked"))
    .map(x => Number(x.dataset.playDay));

  return JSON.stringify(days);
}

function setSelectedPlayDays(playDaysJson) {
  let days = [];

  try {
    days = JSON.parse(playDaysJson || "[]");
  } catch {
    days = [];
  }

  document.querySelectorAll("[data-play-day]").forEach(input => {
    input.checked = days.includes(Number(input.dataset.playDay));
  });
}

function renderUploadBox(label, inputId, previewId, removeButtonId) {
return `
  <div class="rounded-2xl border border-slate-200 p-4">
    <label class="block text-xs font-medium text-slate-500 mb-2">${label}</label>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div
        id="${previewId}"
        class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-400"
      >
        Sin imagen
      </div>

      <div class="flex-1 space-y-2">
        <input
          id="${inputId}"
          type="file"
          accept="image/*"
          class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />

        <button
          id="${removeButtonId}"
          type="button"
          class="hidden rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Eliminar imagen
        </button>
      </div>
    </div>
  </div>
`;
}

function renderConfirmModal() {
  return `
    <div id="confirmModal" class="fixed inset-0 z-50 hidden p-4">
      <div class="absolute inset-0 bg-slate-950/60" data-close-confirm-modal="true"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
          <div class="p-6">
            <h3 id="confirmTitle" class="text-lg font-semibold text-slate-900">Confirmar acción</h3>
            <p id="confirmText" class="mt-2 text-sm text-slate-500">¿Querés continuar?</p>

            <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button id="cancelConfirmBtn" type="button" class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>

              <button id="acceptConfirmBtn" type="button" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderInvitations() {
  const container = document.getElementById("invitationsSection");
  if (!container) return;

  if (!invitations.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <section class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-slate-900">Solicitudes</h2>
        <p class="text-sm text-slate-600">Empresas que te invitaron a participar en torneos.</p>
      </div>

      <div class="grid gap-3">
        ${invitations.map(inv => `
          <article class="flex flex-col gap-3 rounded-2xl border bg-white p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 class="font-semibold text-slate-900">${inv.tournamentName}</h3>
              <p class="text-sm text-slate-500">
                Invitado por ${inv.ownerCompanyName} · ${getSportText(inv.sportType)}
              </p>
            </div>

            <div class="flex gap-2">
              <button 
                type="button" 
                data-accept-invitation-id="${inv.participantId}"
                data-accept-tournament-id="${inv.tournamentId}"
                class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Aceptar
              </button>

              <button 
                type="button" 
                data-reject-invitation-id="${inv.participantId}"
                data-reject-tournament-id="${inv.tournamentId}"
                class="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                Rechazar
              </button>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

async function loadInvitations() {
  try {
    const result = await get(`/api/admin/${company.slug}/tournaments/invitations`);
    invitations = unwrapList(result);
    renderInvitations();
  } catch {
    invitations = [];
    renderInvitations();
  }
}

async function acceptInvitation(tournamentId, participantId) {
  await post(`/api/admin/${company.slug}/tournaments/${tournamentId}/participants/${participantId}/accept`, {});
  await loadInvitations();
  await loadTournaments();
  openMessageModal("Invitación aceptada correctamente.");
}

async function rejectInvitation(tournamentId, participantId) {
  await post(`/api/admin/${company.slug}/tournaments/${tournamentId}/participants/${participantId}/reject`, {});
  await loadInvitations();
  await loadTournaments();
  openMessageModal("Invitación rechazada correctamente.");
}

function renderMessageModal() {
  return `
    <div id="messageModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-slate-950/60"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
          <div class="p-6 text-center">
            <div id="messageModalIcon" class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">✓</div>
            <h3 id="messageModalTitle" class="mt-4 text-lg font-semibold text-slate-900">Operación realizada</h3>
            <p id="messageModalText" class="mt-2 text-sm text-slate-500">Listo.</p>
            <button id="closeMessageModalBtn" type="button" class="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-black">
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function unwrapList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.tournaments)) return result.tournaments;
  return [];
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function normalizeTimeInput(value) {
  if (!value) return "10:00";

  const text = String(value);

  if (/^\d{2}:\d{2}$/.test(text)) return text;
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5);

  return "10:00";
}

function toDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function toUtcDate(value, endOfDay = false) {
  if (!value) return null;
  return `${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
}

function getSportText(value) {
  if (value === 1 || value === "1" || value === "Football") return "Fútbol";
  if (value === 2 || value === "2" || value === "Futsal") return "Futsal";
  if (value === 3 || value === "3" || value === "Basketball") return "Básquet";
  if (value === 4 || value === "4" || value === "Volleyball") return "Vóley";
  return value || "Otro";
}

function getSportFilterValue(value) {
  if (value === 1 || value === "1" || value === "Football") return "Football";
  if (value === 2 || value === "2" || value === "Futsal") return "Futsal";
  if (value === 3 || value === "3" || value === "Basketball") return "Basketball";
  if (value === 4 || value === "4" || value === "Volleyball") return "Volleyball";
  return String(value || "");
}

function getSportNumber(value) {
  if (value === 1 || value === "1" || value === "Football") return 1;
  if (value === 2 || value === "2" || value === "Futsal") return 2;
  if (value === 3 || value === "3" || value === "Basketball") return 3;
  if (value === 4 || value === "4" || value === "Volleyball") return 4;
  return 99;
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

function renderStatus(status, isPublished) {
  if (status === "Cancelled") {
    return `<span class="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">Cancelado</span>`;
  }

  if (status === "Finished") {
    return `<span class="rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-700">Finalizado</span>`;
  }

  if (isPublished || status === "Published" || status === "InProgress") {
    return `<span class="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">${getStatusText(status)}</span>`;
  }

  return `<span class="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">${getStatusText(status)}</span>`;
}

function getFilteredTournaments() {
  let result = [...tournaments];

  if (filters.status) {
    result = result.filter(x => String(x.status) === filters.status);
  }

  if (filters.sportType) {
    result = result.filter(x => getSportFilterValue(x.sportType) === filters.sportType);
  }

  const search = normalizeText(filters.search);

  if (search) {
    result = result.filter(x =>
      normalizeText(x.name).includes(search) ||
      normalizeText(x.description).includes(search)
    );
  }

  return result;
}

function renderSummary() {
  const filtered = getFilteredTournaments();

  const total = filtered.length;
  const published = filtered.filter(x => x.isPublished || x.status === "Published" || x.status === "InProgress").length;
  const teams = filtered.reduce((acc, x) => acc + Number(x.teamsCount || 0), 0);
  const matches = filtered.reduce((acc, x) => acc + Number(x.matchesCount || 0), 0);

  document.getElementById("totalTournaments").textContent = total;
  document.getElementById("publishedTournaments").textContent = published;
  document.getElementById("totalTeams").textContent = teams;
  document.getElementById("totalMatches").textContent = matches;
}

function renderTournaments() {
  const container = document.getElementById("tournamentsList");

    document.getElementById("invitationsSection")?.addEventListener("click", e => {
    const acceptId = e.target.dataset.acceptInvitationId;
    const acceptTournamentId = e.target.dataset.acceptTournamentId;

    const rejectId = e.target.dataset.rejectInvitationId;
    const rejectTournamentId = e.target.dataset.rejectTournamentId;

    if (acceptId) {
      openConfirmModal({
        title: "Aceptar invitación",
        text: "Al aceptar, este torneo aparecerá en tu listado.",
        confirmText: "Aceptar",
        action: () => acceptInvitation(acceptTournamentId, acceptId)
      });
      return;
    }

    if (rejectId) {
      openConfirmModal({
        title: "Rechazar invitación",
        text: "La invitación quedará rechazada.",
        confirmText: "Rechazar",
        danger: true,
        action: () => rejectInvitation(rejectTournamentId, rejectId)
      });
    }
  });
  const filtered = getFilteredTournaments();

  if (!filtered.length) {
    container.innerHTML = `
      <div class="md:col-span-2 xl:col-span-3 rounded-2xl border bg-white p-6 text-center text-slate-500">
        No hay torneos para los filtros seleccionados.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => `
    <article class="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
      <div class="relative h-32 bg-slate-900">
        ${
          t.bannerUrl
            ? `<img src="${t.bannerUrl}" alt="${t.name || "Torneo"}" class="h-full w-full object-cover" />`
            : `<div class="flex h-full w-full items-center justify-center text-sm font-semibold text-white/70">Sin banner</div>`
        }

        <div class="absolute left-4 top-4">
          ${renderStatus(t.status, t.isPublished)}
        </div>
      </div>

      <div class="p-5">
        <div class="flex gap-4">
          ${
            t.logoUrl
              ? `<img src="${t.logoUrl}" alt="${t.name || "Torneo"}" class="h-16 w-16 rounded-2xl border border-slate-200 bg-white object-cover shadow-sm" />`
              : `<div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">${getInitials(t.name)}</div>`
          }

          <div class="min-w-0 flex-1">
            <h3 class="truncate text-lg font-bold text-slate-900">${t.name || "Sin nombre"}</h3>
            <p class="text-sm text-slate-500">${getSportText(t.sportType)} · ${getStatusText(t.status)}</p>
            <p class="mt-1 line-clamp-2 text-sm text-slate-500">${t.description || "Sin descripción"}</p>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div class="rounded-xl bg-slate-50 p-3">
            <div class="text-xs text-slate-500">Equipos</div>
            <div class="font-bold text-slate-900">${t.teamsCount ?? 0}</div>
          </div>

          <div class="rounded-xl bg-slate-50 p-3">
            <div class="text-xs text-slate-500">Partidos</div>
            <div class="font-bold text-slate-900">${t.matchesCount ?? 0}</div>
          </div>

          <div class="rounded-xl bg-slate-50 p-3">
            <div class="text-xs text-slate-500">Inicio</div>
            <div class="font-bold text-slate-900">${formatDate(t.startDateUtc)}</div>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" data-detail-tournament-id="${t.id}" class="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-black">
            Ver detalle
          </button>

        ${t.canEditTournament ? `
          <button type="button" data-edit-tournament-id="${t.id}" class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Editar
          </button>
        ` : ""}

          ${
            t.canPublishTournament && !(t.isPublished || t.status === "Published" || t.status === "InProgress")
              ? `
                <button type="button" data-publish-tournament-id="${t.id}" class="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50">
                  Publicar
                </button>
              `
              : ""
          }

          ${
            t.canCancelTournament && t.status !== "Cancelled"
              ? `
                <button type="button" data-cancel-tournament-id="${t.id}" class="rounded-lg border border-amber-200 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50">
                  Cancelar
                </button>
              `
              : ""
          }

        ${t.canDeleteTournament ? `
          <button type="button" data-delete-tournament-id="${t.id}" class="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            Eliminar
          </button>
        ` : ""}
        </div>
      </div>
    </article>
  `).join("");
}

function getInitials(name) {
  if (!name) return "TR";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function setTournamentFormMessage(message, isError = false) {
  const element = document.getElementById("tournamentFormMessage");
  element.textContent = message;
  element.className = `rounded-xl px-3 py-2 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`;
  element.classList.remove("hidden");
}

function clearTournamentFormMessage() {
  const element = document.getElementById("tournamentFormMessage");
  if (!element) return;
  element.textContent = "";
  element.classList.add("hidden");
}

function renderPreview(previewId, url, removeButtonId = null) {
  const container = document.getElementById(previewId);
  if (!container) return;

  if (!url) {
    container.innerHTML = "Sin imagen";
    if (removeButtonId) {
      document.getElementById(removeButtonId)?.classList.add("hidden");
    }
    return;
  }

  container.innerHTML = `<img src="${url}" alt="Preview" class="h-full w-full object-cover" />`;
  if (removeButtonId) {
  document.getElementById(removeButtonId)?.classList.remove("hidden");
}
}

function openTournamentModal(tournament = null) {
  selectedTournamentId = tournament?.id || null;
  selectedLogoPath = tournament?.logoPath || null;
  selectedLogoUrl = tournament?.logoUrl || null;
  selectedBannerPath = tournament?.bannerPath || null;
  selectedBannerUrl = tournament?.bannerUrl || null;

  clearTournamentFormMessage();

  document.getElementById("tournamentModalTitle").textContent =
    selectedTournamentId ? "Editar torneo" : "Crear torneo";

  document.getElementById("tournamentNameInput").value = tournament?.name || "";
  document.getElementById("tournamentDescriptionInput").value = tournament?.description || "";
  document.getElementById("tournamentSportTypeInput").value = getSportNumber(tournament?.sportType || 1);

  document.getElementById("tournamentScopeInput").value = normalizeScope(tournament?.scope);
  document.getElementById("tournamentVisibilityInput").value = normalizeVisibility(tournament?.visibility);

  document.getElementById("tournamentStartDateInput").value = toDateInputValue(tournament?.startDateUtc);
  document.getElementById("tournamentEndDateInput").value = toDateInputValue(tournament?.endDateUtc);

  document.getElementById("competitionFormatInput").value = normalizeCompetitionFormat(tournament?.competitionFormat);
  document.getElementById("fixtureGenerationModeInput").value = normalizeFixtureMode(tournament?.fixtureGenerationMode);
  document.getElementById("roundModeInput").value = normalizeRoundMode(tournament?.roundMode);

  document.getElementById("playersOnFieldInput").value = Number(tournament?.playersOnField || 7);
  document.getElementById("minPlayersPerTeamInput").value = Number(tournament?.minPlayersPerTeam || 7);
  document.getElementById("maxPlayersPerTeamInput").value = Number(tournament?.maxPlayersPerTeam || 18);

  document.getElementById("winPointsInput").value = Number(tournament?.winPoints ?? 3);
  document.getElementById("drawPointsInput").value = Number(tournament?.drawPoints ?? 1);
  document.getElementById("lossPointsInput").value = Number(tournament?.lossPoints ?? 0);
setSelectedPlayDays(tournament?.playDaysJson || "[6]");

document.getElementById("defaultMatchStartTimeInput").value =
  normalizeTimeInput(tournament?.defaultMatchStartTime || "10:00");

  document.getElementById("defaultMatchEndTimeInput").value =
  normalizeTimeInput(tournament?.defaultMatchEndTime || "18:00");

document.getElementById("courtsCountInput").value = Number(tournament?.courtsCount || 1);
document.getElementById("matchPeriodsCountInput").value = Number(tournament?.matchPeriodsCount || 2);
document.getElementById("minutesPerPeriodInput").value = Number(tournament?.minutesPerPeriod || 25);
document.getElementById("halftimeBreakMinutesInput").value = Number(tournament?.halftimeBreakMinutes ?? 5);
document.getElementById("breakBetweenMatchesMinutesInput").value = Number(tournament?.breakBetweenMatchesMinutes ?? 10);
document.getElementById("defaultVenueInput").value = tournament?.defaultVenue || "";
document.getElementById("defaultAddressInput").value = tournament?.defaultAddress || "";
document.getElementById("allowMultipleMatchesPerTeamPerDayInput").checked = tournament?.allowMultipleMatchesPerTeamPerDay === true;
  document.getElementById("tournamentLogoInput").value = "";
  document.getElementById("tournamentBannerInput").value = "";

renderPreview(
  "tournamentLogoPreview",
  selectedLogoUrl,
  "removeTournamentLogoBtn"
);

renderPreview(
  "tournamentBannerPreview",
  selectedBannerUrl,
  "removeTournamentBannerBtn"
);

document.getElementById("useBannerAsHomeBackgroundInput").checked =
  tournament?.useBannerAsHomeBackground !== false;

  document.getElementById("tournamentModal").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function normalizeScope(value) {
  if (value === "InternalCompany" || value === 1 || value === "1") return "InternalCompany";
  if (value === "Shared" || value === 2 || value === "2") return "Shared";
  if (value === "Mixed" || value === 3 || value === "3") return "Mixed";
  if (value === "ExternalOnly" || value === 4 || value === "4") return "ExternalOnly";
  return "InternalCompany";
}

function normalizeVisibility(value) {
  if (value === "Private" || value === 1 || value === "1") return "Private";
  if (value === "CompanyOnly" || value === 2 || value === "2") return "CompanyOnly";
  if (value === "ParticipantsOnly" || value === 3 || value === "3") return "ParticipantsOnly";
  return "CompanyOnly";
}

function normalizeCompetitionFormat(value) {
  if (value === "League" || value === 1 || value === "1") return "League";
  if (value === "Knockout" || value === 2 || value === "2") return "Knockout";
  if (value === "GroupsAndPlayoffs" || value === 3 || value === "3") return "GroupsAndPlayoffs";
  if (value === "Friendly" || value === 4 || value === "4") return "Friendly";
  if (value === "Custom" || value === 99 || value === "99") return "Custom";
  return "League";
}

function normalizeFixtureMode(value) {
  if (value === "Manual" || value === 1 || value === "1") return "Manual";
  if (value === "Automatic" || value === 2 || value === "2") return "Automatic";
  if (value === "Mixed" || value === 3 || value === "3") return "Mixed";
  return "Manual";
}

function normalizeRoundMode(value) {
  if (value === "SingleRound" || value === 1 || value === "1") return "SingleRound";
  if (value === "HomeAndAway" || value === 2 || value === "2") return "HomeAndAway";
  if (value === "CustomRounds" || value === 3 || value === "3") return "CustomRounds";
  return "SingleRound";
}

function closeTournamentModal() {
  selectedTournamentId = null;
  selectedLogoPath = null;
  selectedLogoUrl = null;
  selectedBannerPath = null;
  selectedBannerUrl = null;

  document.getElementById("tournamentModal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

function openMessageModal(message, title = "Operación realizada", isError = false) {
  const modal = document.getElementById("messageModal");
  const icon = document.getElementById("messageModalIcon");

  document.getElementById("messageModalTitle").textContent = title;
  document.getElementById("messageModalText").textContent = message || "Listo.";

  icon.textContent = isError ? "!" : "✓";
  icon.className = `mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
    isError ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
  }`;

  modal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function closeMessageModal() {
  document.getElementById("messageModal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

function openConfirmModal({ title, text, confirmText = "Confirmar", danger = false, action }) {
  confirmAction = action;

  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmText").textContent = text;
  document.getElementById("acceptConfirmBtn").textContent = confirmText;
  document.getElementById("acceptConfirmBtn").className = `rounded-xl px-4 py-2 text-sm font-medium text-white ${
    danger ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-black"
  }`;

  document.getElementById("confirmModal").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function closeConfirmModal() {
  confirmAction = null;
  document.getElementById("confirmModal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

async function uploadImageIfNeeded(inputId, endpoint, previewId, setValues) {
  const input = document.getElementById(inputId);
  const file = input?.files?.[0];

  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  const result = await postForm(endpoint, formData);

  setValues(result?.path || null, result?.url || null);
  renderPreview(
  previewId,
  result?.url || null,
  inputId === "tournamentLogoInput"
    ? "removeTournamentLogoBtn"
    : "removeTournamentBannerBtn"
);
}

async function uploadTournamentImagesIfNeeded() {
  await uploadImageIfNeeded(
    "tournamentLogoInput",
    `/api/admin/${company.slug}/tournaments/uploads/logo`,
    "tournamentLogoPreview",
    (path, url) => {
      selectedLogoPath = path;
      selectedLogoUrl = url;
    }
  );

  await uploadImageIfNeeded(
    "tournamentBannerInput",
    `/api/admin/${company.slug}/tournaments/uploads/banner`,
    "tournamentBannerPreview",
    (path, url) => {
      selectedBannerPath = path;
      selectedBannerUrl = url;
    }
  );
}

function buildTournamentRequestBody() {
  return {
    name: document.getElementById("tournamentNameInput").value.trim(),
    description: document.getElementById("tournamentDescriptionInput").value.trim() || null,

    sportType: Number(document.getElementById("tournamentSportTypeInput").value),

    scope: document.getElementById("tournamentScopeInput").value,
    visibility: document.getElementById("tournamentVisibilityInput").value,

    logoPath: selectedLogoPath,
    bannerPath: selectedBannerPath,

    startDateUtc: toUtcDate(document.getElementById("tournamentStartDateInput").value),
    endDateUtc: toUtcDate(document.getElementById("tournamentEndDateInput").value, true),

    competitionFormat: document.getElementById("competitionFormatInput").value,
    fixtureGenerationMode: document.getElementById("fixtureGenerationModeInput").value,
    roundMode: document.getElementById("roundModeInput").value,

    winPoints: Number(document.getElementById("winPointsInput").value || 3),
    drawPoints: Number(document.getElementById("drawPointsInput").value || 1),
    lossPoints: Number(document.getElementById("lossPointsInput").value || 0),

    minPlayersPerTeam: Number(document.getElementById("minPlayersPerTeamInput").value || 0),
    maxPlayersPerTeam: Number(document.getElementById("maxPlayersPerTeamInput").value || 0),
    playersOnField: Number(document.getElementById("playersOnFieldInput").value || 0),

playDaysJson: getSelectedPlayDaysJson(),
defaultMatchStartTime: `${document.getElementById("defaultMatchStartTimeInput").value || "10:00"}:00`,
defaultMatchEndTime: `${document.getElementById("defaultMatchEndTimeInput").value || "18:00"}:00`,
courtsCount: Number(document.getElementById("courtsCountInput").value || 1),
matchPeriodsCount: Number(document.getElementById("matchPeriodsCountInput").value || 2),
minutesPerPeriod: Number(document.getElementById("minutesPerPeriodInput").value || 25),
halftimeBreakMinutes: Number(document.getElementById("halftimeBreakMinutesInput").value || 0),
breakBetweenMatchesMinutes: Number(document.getElementById("breakBetweenMatchesMinutesInput").value || 0),
defaultVenue: document.getElementById("defaultVenueInput").value.trim() || null,
defaultAddress: document.getElementById("defaultAddressInput").value.trim() || null,
useBannerAsHomeBackground:
  document.getElementById("useBannerAsHomeBackgroundInput")?.checked === true,

allowMultipleMatchesPerTeamPerDay:
  document.getElementById("allowMultipleMatchesPerTeamPerDayInput")?.checked === true
  };
}

function validateTournamentBody(body) {
  if (!body.name) return "Ingresá el nombre del torneo.";
  if (!body.startDateUtc) return "Seleccioná la fecha de inicio.";
  if (!body.endDateUtc) return "Seleccioná la fecha de fin.";
  if (new Date(body.startDateUtc) > new Date(body.endDateUtc)) return "La fecha de inicio no puede ser mayor a la fecha de fin.";
  if (body.playersOnField <= 0) return "Los jugadores en cancha deben ser mayor a cero.";
  if (body.minPlayersPerTeam <= 0) return "El mínimo de jugadores debe ser mayor a cero.";
  if (body.maxPlayersPerTeam <= 0) return "El máximo de jugadores debe ser mayor a cero.";
  if (body.minPlayersPerTeam > body.maxPlayersPerTeam) return "El mínimo de jugadores no puede ser mayor al máximo.";
  const playDays = JSON.parse(body.playDaysJson || "[]");

if (!playDays.length) return "Seleccioná al menos un día de juego.";
if (body.courtsCount <= 0) return "La cantidad de canchas debe ser mayor a cero.";
if (body.matchPeriodsCount <= 0 || body.matchPeriodsCount > 2) return "La cantidad de tiempos debe ser 1 o 2.";
if (body.minutesPerPeriod <= 0) return "Los minutos por tiempo deben ser mayores a cero.";
if (body.halftimeBreakMinutes < 0) return "El descanso entre tiempos no puede ser negativo.";
if (body.breakBetweenMatchesMinutes < 0) return "El break entre partidos no puede ser negativo.";
if (body.defaultMatchEndTime <= body.defaultMatchStartTime) {
  return "La hora fin de jornada debe ser mayor a la hora inicio.";
}
  return null;
}

async function onSubmitTournament(event) {
  event.preventDefault();

  clearTournamentFormMessage();

  const button = document.getElementById("submitTournamentBtn");

  try {
    button.disabled = true;
    button.textContent = "Guardando...";

    await uploadTournamentImagesIfNeeded();

    const body = buildTournamentRequestBody();
    const validation = validateTournamentBody(body);

    if (validation) {
      setTournamentFormMessage(validation, true);
      return;
    }

    if (selectedTournamentId) {
      await put(`/api/admin/${company.slug}/tournaments/${selectedTournamentId}`, body);
    } else {
      await post(`/api/admin/${company.slug}/tournaments`, body);
    }

    closeTournamentModal();
    await loadTournaments();

    openMessageModal("El torneo fue guardado correctamente.");
  } catch (error) {
    setTournamentFormMessage(error?.message || "No se pudo guardar el torneo.", true);
  } finally {
    button.disabled = false;
    button.textContent = "Guardar torneo";
  }
}

async function publishTournament(id) {
  await post(`/api/admin/${company.slug}/tournaments/${id}/publish`, {});
  await loadTournaments();
  openMessageModal("El torneo fue publicado correctamente.");
}

async function cancelTournament(id) {
  await post(`/api/admin/${company.slug}/tournaments/${id}/cancel`, {});
  await loadTournaments();
  openMessageModal("El torneo fue cancelado correctamente.");
}

async function deleteTournament(id) {
  await del(`/api/admin/${company.slug}/tournaments/${id}`);
  await loadTournaments();
  openMessageModal("El torneo fue eliminado correctamente.");
}

async function loadTournaments() {
  try {
    const result = await get(`/api/admin/${company.slug}/tournaments`);
    tournaments = unwrapList(result);

    renderSummary();
    renderTournaments();
  } catch (error) {
    tournaments = [];
    renderSummary();

    document.getElementById("tournamentsList").innerHTML = `
      <div class="md:col-span-2 xl:col-span-3 rounded-2xl border bg-white p-6 text-center text-red-600">
        ${error?.message || "No se pudieron cargar los torneos."}
      </div>
    `;
  }
}

function bindEvents() {
  document.getElementById("openTournamentModalBtn")?.addEventListener("click", () => {
    openTournamentModal();
  });

  document.getElementById("closeTournamentModalBtn")?.addEventListener("click", closeTournamentModal);
  document.getElementById("cancelTournamentModalBtn")?.addEventListener("click", closeTournamentModal);

  document.getElementById("tournamentModal")?.addEventListener("click", e => {
    if (e.target.dataset.closeTournamentModal === "true") {
      closeTournamentModal();
    }
  });

  document.getElementById("tournamentForm")?.addEventListener("submit", onSubmitTournament);

document.getElementById("tournamentLogoInput")?.addEventListener("change", e => {
  const file = e.target.files?.[0];

  renderPreview(
    "tournamentLogoPreview",
    file ? URL.createObjectURL(file) : selectedLogoUrl,
    "removeTournamentLogoBtn"
  );
});

document.getElementById("tournamentBannerInput")?.addEventListener("change", e => {
  const file = e.target.files?.[0];

  renderPreview(
    "tournamentBannerPreview",
    file ? URL.createObjectURL(file) : selectedBannerUrl,
    "removeTournamentBannerBtn"
  );
});

  document.getElementById("statusFilter")?.addEventListener("change", e => {
    filters.status = e.target.value;
    renderSummary();
    renderTournaments();
  });

  document.getElementById("sportFilter")?.addEventListener("change", e => {
    filters.sportType = e.target.value;
    renderSummary();
    renderTournaments();
  });

  document.getElementById("searchFilter")?.addEventListener("input", e => {
    filters.search = e.target.value;
    renderSummary();
    renderTournaments();
  });

  document.getElementById("removeTournamentLogoBtn")?.addEventListener("click", () => {
  selectedLogoPath = null;
  selectedLogoUrl = null;

  document.getElementById("tournamentLogoInput").value = "";

  renderPreview(
    "tournamentLogoPreview",
    null,
    "removeTournamentLogoBtn"
  );
});

document.getElementById("removeTournamentBannerBtn")?.addEventListener("click", () => {
  selectedBannerPath = null;
  selectedBannerUrl = null;

  document.getElementById("tournamentBannerInput").value = "";

  renderPreview(
    "tournamentBannerPreview",
    null,
    "removeTournamentBannerBtn"
  );
});

  document.getElementById("tournamentsList")?.addEventListener("click", e => {
    const detailId = e.target.dataset.detailTournamentId;
    const editId = e.target.dataset.editTournamentId;
    const publishId = e.target.dataset.publishTournamentId;
    const cancelId = e.target.dataset.cancelTournamentId;
    const deleteId = e.target.dataset.deleteTournamentId;

    if (detailId) {
      window.location.href =`/src/pages/admin/tournaments/detail/?id=${detailId}`;
      return;
    }

    if (editId) {
      const tournament = tournaments.find(x => x.id === editId);
      if (tournament) openTournamentModal(tournament);
      return;
    }

    if (publishId) {
      openConfirmModal({
        title: "Publicar torneo",
        text: "El torneo será visible para los participantes según su configuración.",
        confirmText: "Publicar",
        action: () => publishTournament(publishId)
      });
      return;
    }

    if (cancelId) {
      openConfirmModal({
        title: "Cancelar torneo",
        text: "El torneo quedará cancelado. ¿Querés continuar?",
        confirmText: "Cancelar torneo",
        danger: true,
        action: () => cancelTournament(cancelId)
      });
      return;
    }

    if (deleteId) {
      openConfirmModal({
        title: "Eliminar torneo",
        text: "Esta acción eliminará el torneo seleccionado.",
        confirmText: "Eliminar",
        danger: true,
        action: () => deleteTournament(deleteId)
      });
    }
  });

  document.getElementById("confirmModal")?.addEventListener("click", e => {
    if (e.target.dataset.closeConfirmModal === "true") {
      closeConfirmModal();
    }
  });

  document.getElementById("cancelConfirmBtn")?.addEventListener("click", closeConfirmModal);

  document.getElementById("acceptConfirmBtn")?.addEventListener("click", async () => {
    if (typeof confirmAction !== "function") return;

    const button = document.getElementById("acceptConfirmBtn");

    try {
      button.disabled = true;
      button.textContent = "Procesando...";

      const action = confirmAction;
      closeConfirmModal();

      await action();
    } catch (error) {
      openMessageModal(error?.message || "No se pudo completar la acción.", "Error", true);
    } finally {
      button.disabled = false;
      button.textContent = "Confirmar";
    }
  });

  document.getElementById("closeMessageModalBtn")?.addEventListener("click", closeMessageModal);
}

async function init() {
  await loadConfig();
  requireAuth();

  const app = document.getElementById("app");

  app.innerHTML = renderAdminLayout({
    activeKey: "tournaments",
    pageTitle: "Torneos",
    contentHtml: buildContent()
  });

  const layout = await setupAdminLayout({
    onCompanyChanged: async selectedCompany => {
      company = selectedCompany;

      if (!hasModule(company, "tournaments")) {
        window.location.replace("/src/pages/admin/students/index.html");
        return;
      }

      await loadInvitations();
      await loadTournaments();
    }
  });

  company = layout.activeCompany;

  if (!hasModule(company, "tournaments")) {
    window.location.replace("/src/pages/admin/students/index.html");
    return;
  }

  bindEvents();
 await loadInvitations();
await loadTournaments();
}

init();