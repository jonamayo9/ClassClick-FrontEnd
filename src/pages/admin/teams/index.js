import { get, post, put, del, postForm } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";
import { hasModule } from "../../../shared/js/modules.js";

let company = null;
let teams = [];

let filters = {
  search: "",
  onlyActive: ""
};

let selectedTeamId = null;
let selectedLogoPath = null;
let selectedLogoUrl = null;
let selectedPlayersTeam = null;
let teamPlayers = [];
let studentResults = [];

function buildContent() {
  return `
    <section class="space-y-6">

      <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-widest text-slate-300">
              Torneos
            </p>

            <h1 class="text-3xl font-bold">
              Equipos deportivos
            </h1>

            <p class="text-sm text-slate-300">
              Administración de equipos internos de la empresa.
            </p>
          </div>

          <button
            id="openTeamModalBtn"
            type="button"
            class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Crear equipo
          </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div class="bg-white/10 rounded-xl p-4">
            <div class="text-xs text-slate-300">Equipos</div>
            <div id="totalTeams" class="text-xl font-bold">0</div>
          </div>

          <div class="bg-white/10 rounded-xl p-4">
            <div class="text-xs text-slate-300">Activos</div>
            <div id="activeTeams" class="text-xl font-bold">0</div>
          </div>

          <div class="bg-white/10 rounded-xl p-4">
            <div class="text-xs text-slate-300">Inactivos</div>
            <div id="inactiveTeams" class="text-xl font-bold">0</div>
          </div>

          <div class="bg-white/10 rounded-xl p-4">
            <div class="text-xs text-slate-300">Jugadores</div>
            <div id="totalPlayers" class="text-xl font-bold">0</div>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-2xl border p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="w-full lg:max-w-xs">
            <label class="block text-xs font-medium text-slate-500 mb-1">
              Estado
            </label>

            <select
              id="activeFilter"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          <div class="w-full">
            <label class="block text-xs font-medium text-slate-500 mb-1">
              Buscar
            </label>

            <input
              id="searchFilter"
              type="text"
              placeholder="Buscar por nombre, categoría o deporte"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section id="teamsList" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"></section>
    </section>

    ${renderTeamModal()}
    ${renderPlayersModal()}
    ${renderConfirmDeleteModal()}
    ${renderMessageModal()}
  `;
}

function renderTeamModal() {
  return `
    <div id="teamModal" class="fixed inset-0 z-50 hidden p-4">
      <div class="absolute inset-0 bg-slate-950/60" data-close-team-modal="true"></div>

      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 id="teamModalTitle" class="text-lg font-semibold text-slate-900">
                Crear equipo
              </h3>
              <p class="text-sm text-slate-500">
                Cargá los datos básicos del equipo.
              </p>
            </div>

            <button
              id="closeTeamModalBtn"
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>

          <form id="teamForm" class="p-5 space-y-4">
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">
                  Nombre
                </label>
                <input
                  id="teamNameInput"
                  type="text"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Sub 15"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">
                  Nombre corto
                </label>
                <input
                  id="teamShortNameInput"
                  type="text"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="S15"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">
                  Categoría
                </label>
                <input
                  id="teamCategoryInput"
                  type="text"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="2010"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">
                  Deporte
                </label>
                <select
                  id="teamSportTypeInput"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="1">Fútbol</option>
                  <option value="2">Futsal</option>
                  <option value="3">Básquet</option>
                  <option value="4">Vóley</option>
                  <option value="99">Otro</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">
                  Mínimo jugadores
                </label>
                <input
                  id="teamMinPlayersInput"
                  type="number"
                  min="0"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">
                  Máximo jugadores
                </label>
                <input
                  id="teamMaxPlayersInput"
                  type="number"
                  min="0"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 p-4">
              <label class="block text-xs font-medium text-slate-500 mb-2">
                Logo del equipo
              </label>

              <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div
                  id="teamLogoPreview"
                  class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-400"
                >
                  Sin logo
                </div>

                <div class="flex-1">
                  <input
                    id="teamLogoInput"
                    type="file"
                    accept="image/*"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <p class="mt-1 text-xs text-slate-500">
                    Se sube como FormData. El backend devuelve URL temporal y path.
                  </p>
                </div>
              </div>
            </div>

            <label class="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <input
                id="teamIsActiveInput"
                type="checkbox"
                checked
                class="rounded border-slate-300"
              />
              Equipo activo
            </label>

            <div id="teamFormMessage" class="hidden rounded-xl px-3 py-2 text-sm"></div>

            <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                id="cancelTeamModalBtn"
                type="button"
                class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                id="submitTeamBtn"
                type="submit"
                class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

function renderPlayersModal() {
  return `
    <div id="playersModal" class="fixed inset-0 z-50 hidden p-4">
      <div class="absolute inset-0 bg-slate-950/60" data-close-players-modal="true"></div>

      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 id="playersModalTitle" class="text-lg font-semibold text-slate-900">
                Jugadores
              </h3>
              <p id="playersModalSubtitle" class="text-sm text-slate-500">
                Asignación de alumnos al equipo.
              </p>
            </div>

            <button
              id="closePlayersModalBtn"
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>

          <div class="grid gap-5 p-5 lg:grid-cols-[1fr_1.2fr]">
            <section class="space-y-4">
              <div class="rounded-2xl border border-slate-200 p-4">
                <h4 class="font-semibold text-slate-900">Agregar jugador</h4>

                <div class="mt-4 space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1">
                      Buscar alumno
                    </label>
                    <input
                      id="playerStudentSearchInput"
                      type="text"
                      placeholder="Nombre, apellido o DNI"
                      class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>

                  <div
                    id="playerStudentResults"
                    class="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white text-sm"
                  ></div>

                  <input type="hidden" id="selectedStudentIdInput" />

                  <div id="selectedStudentText" class="hidden rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"></div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label class="block text-xs font-medium text-slate-500 mb-1">
                        Número
                      </label>
                      <input
                        id="playerNumberInput"
                        type="number"
                        min="0"
                        class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label class="block text-xs font-medium text-slate-500 mb-1">
                        Posición
                      </label>
                      <input
                        id="playerPositionInput"
                        type="text"
                        placeholder="Delantero"
                        class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <label class="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                    <input
                      id="playerCaptainInput"
                      type="checkbox"
                      class="rounded border-slate-300"
                    />
                    Capitán
                  </label>

                  <div id="playersMessage" class="hidden rounded-xl px-3 py-2 text-sm"></div>

                  <button
                    id="addPlayerBtn"
                    type="button"
                    class="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-black"
                  >
                    Agregar jugador
                  </button>
                </div>
              </div>
            </section>

            <section>
              <div class="rounded-2xl border border-slate-200 overflow-hidden">
                <div class="border-b bg-slate-50 px-4 py-3">
                  <h4 class="font-semibold text-slate-900">Jugadores asignados</h4>
                </div>

                <div id="teamPlayersList" class="divide-y"></div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderConfirmDeleteModal() {
  return `
    <div id="deleteTeamModal" class="fixed inset-0 z-50 hidden p-4">
      <div class="absolute inset-0 bg-slate-950/60" data-close-delete-modal="true"></div>

      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
          <div class="p-6">
            <h3 class="text-lg font-semibold text-slate-900">
              Eliminar equipo
            </h3>

            <p class="mt-2 text-sm text-slate-500">
              Esta acción eliminará el equipo seleccionado. ¿Querés continuar?
            </p>

            <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                id="cancelDeleteTeamBtn"
                type="button"
                class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                id="confirmDeleteTeamBtn"
                type="button"
                class="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMessageModal() {
  return `
    <div id="messageModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-slate-950/60"></div>

      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
          <div class="p-6 text-center">
            <div id="messageModalIcon" class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
              ✓
            </div>

            <h3 id="messageModalTitle" class="mt-4 text-lg font-semibold text-slate-900">
              Operación realizada
            </h3>

            <p id="messageModalText" class="mt-2 text-sm text-slate-500">
              Listo.
            </p>

            <button
              id="closeMessageModalBtn"
              type="button"
              class="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-black"
            >
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
  if (Array.isArray(result?.teams)) return result.teams;
  return [];
}

function getSportTypeText(value) {
  if (value === 1 || value === "1" || value === "Football") return "Fútbol";
  if (value === 2 || value === "2" || value === "Futsal") return "Futsal";
  if (value === 3 || value === "3" || value === "Basketball") return "Básquet";
  if (value === 4 || value === "4" || value === "Volleyball") return "Vóley";
  return value || "Otro";
}

function getSportTypeValue(value) {
  if (value === 1 || value === "1" || value === "Football") return 1;
  if (value === 2 || value === "2" || value === "Futsal") return 2;
  if (value === 3 || value === "3" || value === "Basketball") return 3;
  if (value === 4 || value === "4" || value === "Volleyball") return 4;
  return 99;
}

function getInitials(name) {
  if (!name) return "EQ";

  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function renderStatus(isActive) {
  if (isActive) {
    return `
      <span class="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">
        Activo
      </span>
    `;
  }

  return `
    <span class="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">
      Inactivo
    </span>
  `;
}

function getFilteredTeams() {
  let result = [...teams];

  if (filters.onlyActive !== "") {
    const expected = filters.onlyActive === "true";
    result = result.filter(x => Boolean(x.isActive) === expected);
  }

  const search = normalizeText(filters.search);

  if (search) {
    result = result.filter(x => {
      return normalizeText(x.name).includes(search)
        || normalizeText(x.shortName).includes(search)
        || normalizeText(x.category).includes(search)
        || normalizeText(getSportTypeText(x.sportType)).includes(search);
    });
  }

  return result;
}

function renderSummary() {
  const total = teams.length;
  const active = teams.filter(x => x.isActive).length;
  const inactive = total - active;
  const players = teams.reduce((acc, x) => acc + Number(x.playersCount || 0), 0);

  document.getElementById("totalTeams").textContent = total;
  document.getElementById("activeTeams").textContent = active;
  document.getElementById("inactiveTeams").textContent = inactive;
  document.getElementById("totalPlayers").textContent = players;
}

function renderTeams() {
  const container = document.getElementById("teamsList");
  const filteredTeams = getFilteredTeams();

  if (!filteredTeams.length) {
    container.innerHTML = `
      <div class="md:col-span-2 xl:col-span-3 bg-white p-6 rounded-xl text-center text-slate-500 border">
        No hay equipos para los filtros seleccionados.
      </div>
    `;
    return;
  }

  container.innerHTML = filteredTeams.map(team => `
    <article class="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md">
      <div class="flex items-start gap-4">
        ${
          team.logoUrl
            ? `
              <img
                src="${team.logoUrl}"
                alt="${team.name || "Equipo"}"
                class="h-16 w-16 rounded-2xl border border-slate-200 object-cover bg-slate-50"
              />
            `
            : `
              <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">
                ${getInitials(team.name)}
              </div>
            `
        }

        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h3 class="truncate text-base font-bold text-slate-900">
                ${team.name || "Sin nombre"}
              </h3>

              <p class="text-sm text-slate-500">
                ${team.shortName || "-"} · ${team.category || "Sin categoría"}
              </p>
            </div>

            ${renderStatus(team.isActive)}
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-xl bg-slate-50 p-3">
              <div class="text-xs text-slate-500">Deporte</div>
              <div class="font-semibold text-slate-900">${getSportTypeText(team.sportType)}</div>
            </div>

            <div class="rounded-xl bg-slate-50 p-3">
              <div class="text-xs text-slate-500">Jugadores</div>
              <div class="font-semibold text-slate-900">${team.playersCount ?? 0}</div>
            </div>

            <div class="rounded-xl bg-slate-50 p-3">
              <div class="text-xs text-slate-500">Mínimo</div>
              <div class="font-semibold text-slate-900">${team.minPlayers ?? "-"}</div>
            </div>

            <div class="rounded-xl bg-slate-50 p-3">
              <div class="text-xs text-slate-500">Máximo</div>
              <div class="font-semibold text-slate-900">${team.maxPlayers ?? "-"}</div>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <button
                type="button"
                data-players-team-id="${team.id}"
                class="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-black"
                >
                Jugadores
            </button>
            <button
              type="button"
              data-edit-team-id="${team.id}"
              class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Editar
            </button>

            <button
              type="button"
              data-delete-team-id="${team.id}"
              class="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </article>
  `).join("");
}

function setTeamFormMessage(message, isError = false) {
  const element = document.getElementById("teamFormMessage");

  element.textContent = message;
  element.className = `rounded-xl px-3 py-2 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`;
  element.classList.remove("hidden");
}

function clearTeamFormMessage() {
  const element = document.getElementById("teamFormMessage");
  if (!element) return;

  element.textContent = "";
  element.classList.add("hidden");
}

function renderLogoPreview(url) {
  const container = document.getElementById("teamLogoPreview");
  if (!container) return;

  if (!url) {
    container.innerHTML = `Sin logo`;
    return;
  }

  container.innerHTML = `
    <img
      src="${url}"
      alt="Logo"
      class="h-full w-full object-cover"
    />
  `;
}

function openMessageModal(message, title = "Operación realizada", isError = false) {
  const modal = document.getElementById("messageModal");
  const icon = document.getElementById("messageModalIcon");
  const titleElement = document.getElementById("messageModalTitle");
  const text = document.getElementById("messageModalText");

  titleElement.textContent = title;
  text.textContent = message || "Listo.";

  icon.className = `mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
    isError
      ? "bg-red-100 text-red-600"
      : "bg-emerald-100 text-emerald-600"
  }`;

  icon.textContent = isError ? "!" : "✓";

  modal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function closeMessageModal() {
  document.getElementById("messageModal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

function openTeamModal(team = null) {
  selectedTeamId = team?.id || null;
  selectedLogoPath = team?.logoPath || null;
  selectedLogoUrl = team?.logoUrl || null;

  clearTeamFormMessage();

  document.getElementById("teamModalTitle").textContent = selectedTeamId
    ? "Editar equipo"
    : "Crear equipo";

  document.getElementById("teamNameInput").value = team?.name || "";
  document.getElementById("teamShortNameInput").value = team?.shortName || "";
  document.getElementById("teamCategoryInput").value = team?.category || "";
  document.getElementById("teamSportTypeInput").value = getSportTypeValue(team?.sportType || 1);
  document.getElementById("teamMinPlayersInput").value = team?.minPlayers ?? "";
  document.getElementById("teamMaxPlayersInput").value = team?.maxPlayers ?? "";
  document.getElementById("teamIsActiveInput").checked = team?.isActive ?? true;
  document.getElementById("teamLogoInput").value = "";

  renderLogoPreview(selectedLogoUrl);

  document.getElementById("teamModal").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function closeTeamModal() {
  selectedTeamId = null;
  selectedLogoPath = null;
  selectedLogoUrl = null;

  document.getElementById("teamModal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

function openDeleteTeamModal(teamId) {
  selectedTeamId = teamId;
  document.getElementById("deleteTeamModal").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function closeDeleteTeamModal() {
  selectedTeamId = null;
  document.getElementById("deleteTeamModal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

async function uploadLogoIfNeeded() {
  const input = document.getElementById("teamLogoInput");
  const file = input?.files?.[0];

  if (!file) {
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  const result = await postForm(
    `/api/admin/${company.slug}/tournaments/uploads/team-logo`,
    formData
  );

  selectedLogoPath = result?.path || null;
  selectedLogoUrl = result?.url || null;

  renderLogoPreview(selectedLogoUrl);
}

async function onSubmitTeam(event) {
  event.preventDefault();

  clearTeamFormMessage();

  const submitButton = document.getElementById("submitTeamBtn");

  const name = document.getElementById("teamNameInput").value.trim();
  const shortName = document.getElementById("teamShortNameInput").value.trim();
  const category = document.getElementById("teamCategoryInput").value.trim();
  const sportType = Number(document.getElementById("teamSportTypeInput").value);
  const minPlayers = Number(document.getElementById("teamMinPlayersInput").value || 0);
  const maxPlayers = Number(document.getElementById("teamMaxPlayersInput").value || 0);
  const isActive = document.getElementById("teamIsActiveInput").checked;

  if (!name) {
    setTeamFormMessage("Ingresá el nombre del equipo.", true);
    return;
  }

  if (maxPlayers > 0 && minPlayers > maxPlayers) {
    setTeamFormMessage("El mínimo de jugadores no puede ser mayor al máximo.", true);
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Guardando...";

    await uploadLogoIfNeeded();

    const body = {
      name,
      shortName: shortName || null,
      category: category || null,
      sportType,
      logoPath: selectedLogoPath,
      minPlayers,
      maxPlayers,
      isActive
    };

    if (selectedTeamId) {
      await put(`/api/admin/${company.slug}/teams/${selectedTeamId}`, body);
    } else {
      await post(`/api/admin/${company.slug}/teams`, body);
    }

    closeTeamModal();
    await loadTeams();

    openMessageModal("El equipo fue guardado correctamente.");
  } catch (error) {
    setTeamFormMessage(error?.message || "No se pudo guardar el equipo.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Guardar";
  }
}

async function onDeleteTeam() {
  if (!selectedTeamId) return;

  const button = document.getElementById("confirmDeleteTeamBtn");

  try {
    button.disabled = true;
    button.textContent = "Eliminando...";

    await del(`/api/admin/${company.slug}/teams/${selectedTeamId}`);

    closeDeleteTeamModal();
    await loadTeams();

    openMessageModal("El equipo fue eliminado correctamente.");
  } catch (error) {
    closeDeleteTeamModal();
    openMessageModal(
      error?.message || "No se pudo eliminar el equipo.",
      "No se pudo eliminar",
      true
    );
  } finally {
    button.disabled = false;
    button.textContent = "Eliminar";
  }
}

function setPlayersMessage(message, isError = false) {
  const element = document.getElementById("playersMessage");

  element.textContent = message;
  element.className = `rounded-xl px-3 py-2 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`;
  element.classList.remove("hidden");
}

function clearPlayersMessage() {
  const element = document.getElementById("playersMessage");
  if (!element) return;

  element.textContent = "";
  element.classList.add("hidden");
}

function renderStudentResults() {
  const container = document.getElementById("playerStudentResults");
  if (!container) return;

  if (!studentResults.length) {
    container.innerHTML = `
      <div class="px-3 py-2 text-slate-500">
        Sin resultados
      </div>
    `;
    return;
  }

  container.innerHTML = studentResults.map(student => `
    <button
      type="button"
      data-select-student-id="${student.id}"
      class="block w-full px-3 py-2 text-left hover:bg-slate-50"
    >
      ${getStudentName(student)}${student.dni ? ` - DNI ${student.dni}` : ""}
    </button>
  `).join("");
}

function getStudentName(student) {
  return student.name
    || student.fullName
    || `${student.firstName || ""} ${student.lastName || ""}`.trim()
    || student.email
    || "Sin nombre";
}

function renderTeamPlayers() {
  const container = document.getElementById("teamPlayersList");
  if (!container) return;

  if (!teamPlayers.length) {
    container.innerHTML = `
      <div class="p-5 text-center text-sm text-slate-500">
        Este equipo todavía no tiene jugadores.
      </div>
    `;
    return;
  }

  container.innerHTML = teamPlayers.map(player => `
    <div class="flex items-center justify-between gap-3 px-4 py-3">
      <div class="min-w-0">
        <div class="font-semibold text-slate-900">
          ${player.studentName || "Sin nombre"}
          ${player.isCaptain ? `<span class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">C</span>` : ""}
        </div>

        <div class="text-sm text-slate-500">
          ${player.number ? `#${player.number}` : "Sin número"} · ${player.position || "Sin posición"}
        </div>
      </div>

      <button
        type="button"
        data-remove-player-id="${player.id}"
        class="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
      >
        Quitar
      </button>
    </div>
  `).join("");
}

async function openPlayersModal(teamId) {
  selectedTeamId = teamId;
  clearPlayersMessage();

  document.getElementById("playerStudentSearchInput").value = "";
  document.getElementById("selectedStudentIdInput").value = "";
  document.getElementById("selectedStudentText").classList.add("hidden");
  document.getElementById("selectedStudentText").textContent = "";
  document.getElementById("playerNumberInput").value = "";
  document.getElementById("playerPositionInput").value = "";
  document.getElementById("playerCaptainInput").checked = false;

  studentResults = [];
  renderStudentResults();

  document.getElementById("playersModal").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");

  await loadTeamDetail();
}

function closePlayersModal() {
  selectedTeamId = null;
  selectedPlayersTeam = null;
  teamPlayers = [];
  studentResults = [];

  document.getElementById("playersModal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

async function loadTeamDetail() {
  const detail = await get(`/api/admin/${company.slug}/teams/${selectedTeamId}`);

  selectedPlayersTeam = detail;
  teamPlayers = detail?.players || [];

  document.getElementById("playersModalTitle").textContent = `Jugadores · ${detail?.name || "Equipo"}`;
  document.getElementById("playersModalSubtitle").textContent = `${detail?.shortName || "-"} · ${detail?.category || "Sin categoría"}`;

  renderTeamPlayers();
}

async function searchStudentsForPlayer(search) {
  if (search.length < 2) {
    studentResults = [];
    renderStudentResults();
    return;
  }

  const result = await get(`/api/admin/${company.slug}/students?search=${encodeURIComponent(search)}`);
  const students = unwrapList(result);

  const alreadyIds = (teamPlayers || []).map(x => x.studentId);

  studentResults = students.filter(student =>
    !alreadyIds.includes(student.id)
  );

  renderStudentResults();
}

async function addPlayerToTeam() {
  clearPlayersMessage();

  const studentId = document.getElementById("selectedStudentIdInput").value;
  const numberValue = document.getElementById("playerNumberInput").value;
  const position = document.getElementById("playerPositionInput").value.trim();
  const isCaptain = document.getElementById("playerCaptainInput").checked;

if (!studentId) {
  setPlayersMessage("Seleccioná un alumno.", true);
  return;
}

const maxPlayers = Number(selectedPlayersTeam?.maxPlayers || 0);

if (maxPlayers > 0 && teamPlayers.length >= maxPlayers) {
  setPlayersMessage(`Este equipo ya llegó al máximo de ${maxPlayers} jugadores.`, true);
  return;
}

  const body = {
    studentId,
    number: numberValue ? Number(numberValue) : null,
    position: position || null,
    isCaptain
  };

  await post(`/api/admin/${company.slug}/teams/${selectedTeamId}/players`, body);

  document.getElementById("playerStudentSearchInput").value = "";
  document.getElementById("selectedStudentIdInput").value = "";
  document.getElementById("selectedStudentText").classList.add("hidden");
  document.getElementById("selectedStudentText").textContent = "";
  document.getElementById("playerNumberInput").value = "";
  document.getElementById("playerPositionInput").value = "";
  document.getElementById("playerCaptainInput").checked = false;

  studentResults = [];
  renderStudentResults();

  await loadTeamDetail();
  await loadTeams();

  setPlayersMessage("Jugador agregado correctamente.");
}

async function removePlayerFromTeam(playerId) {
  await del(`/api/admin/${company.slug}/teams/${selectedTeamId}/players/${playerId}`);

  await loadTeamDetail();
  await loadTeams();

  setPlayersMessage("Jugador quitado correctamente.");
}

async function loadTeams() {
  try {
    const result = await get(`/api/admin/${company.slug}/teams`);
    teams = unwrapList(result);

    renderSummary();
    renderTeams();
  } catch (error) {
    teams = [];
    renderSummary();

    document.getElementById("teamsList").innerHTML = `
      <div class="md:col-span-2 xl:col-span-3 bg-white p-6 rounded-xl text-center text-red-600 border">
        ${error?.message || "No se pudieron cargar los equipos."}
      </div>
    `;
  }
}

function bindEvents() {
  document.getElementById("openTeamModalBtn")?.addEventListener("click", () => {
    openTeamModal();
  });

  document.getElementById("closeTeamModalBtn")?.addEventListener("click", closeTeamModal);
  document.getElementById("cancelTeamModalBtn")?.addEventListener("click", closeTeamModal);

  document.getElementById("teamModal")?.addEventListener("click", e => {
    if (e.target.dataset.closeTeamModal === "true") {
      closeTeamModal();
    }
  });

  document.getElementById("teamForm")?.addEventListener("submit", onSubmitTeam);

  document.getElementById("teamLogoInput")?.addEventListener("change", e => {
    const file = e.target.files?.[0];

    if (!file) {
      renderLogoPreview(selectedLogoUrl);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    renderLogoPreview(localUrl);
  });

  document.getElementById("activeFilter")?.addEventListener("change", e => {
    filters.onlyActive = e.target.value;
    renderTeams();
  });

  document.getElementById("searchFilter")?.addEventListener("input", e => {
    filters.search = e.target.value;
    renderTeams();
  });

  document.getElementById("teamsList")?.addEventListener("click", e => {
    const playersId = e.target.dataset.playersTeamId;
    const editId = e.target.dataset.editTeamId;
    const deleteId = e.target.dataset.deleteTeamId;

    if (playersId) {
    openPlayersModal(playersId);
    return;
    }

    if (editId) {
    const team = teams.find(x => x.id === editId);

    if (team) {
        openTeamModal(team);
    }

    return;
    }

    if (deleteId) {
    openDeleteTeamModal(deleteId);
    }
  });

  document.getElementById("deleteTeamModal")?.addEventListener("click", e => {
    if (e.target.dataset.closeDeleteModal === "true") {
      closeDeleteTeamModal();
    }
  });

  document.getElementById("cancelDeleteTeamBtn")?.addEventListener("click", closeDeleteTeamModal);
  document.getElementById("confirmDeleteTeamBtn")?.addEventListener("click", onDeleteTeam);

  document.getElementById("closeMessageModalBtn")?.addEventListener("click", closeMessageModal);
  document.getElementById("closePlayersModalBtn")?.addEventListener("click", closePlayersModal);

document.getElementById("playersModal")?.addEventListener("click", e => {
  if (e.target.dataset.closePlayersModal === "true") {
    closePlayersModal();
  }
});

document.getElementById("playerStudentSearchInput")?.addEventListener("input", async e => {
  try {
    await searchStudentsForPlayer(e.target.value.trim());
  } catch (error) {
    studentResults = [];
    renderStudentResults();
  }
});

document.getElementById("playerStudentResults")?.addEventListener("click", e => {
  const studentId = e.target.dataset.selectStudentId;
  if (!studentId) return;

  const student = studentResults.find(x => x.id === studentId);
  if (!student) return;

  document.getElementById("selectedStudentIdInput").value = student.id;

  const selectedText = document.getElementById("selectedStudentText");
  selectedText.textContent = `Seleccionado: ${getStudentName(student)}`;
  selectedText.classList.remove("hidden");

  studentResults = [];
  renderStudentResults();
});

document.getElementById("addPlayerBtn")?.addEventListener("click", async () => {
  const button = document.getElementById("addPlayerBtn");

  try {
    button.disabled = true;
    button.textContent = "Agregando...";

    await addPlayerToTeam();
  } catch (error) {
    setPlayersMessage(error?.message || "No se pudo agregar el jugador.", true);
  } finally {
    button.disabled = false;
    button.textContent = "Agregar jugador";
  }
});

document.getElementById("teamPlayersList")?.addEventListener("click", async e => {
  const playerId = e.target.dataset.removePlayerId;
  if (!playerId) return;

  try {
    await removePlayerFromTeam(playerId);
  } catch (error) {
    setPlayersMessage(error?.message || "No se pudo quitar el jugador.", true);
  }
});
}

async function init() {
  await loadConfig();
  requireAuth();

  const app = document.getElementById("app");

  app.innerHTML = renderAdminLayout({
    activeKey: "sports-teams",
    pageTitle: "Equipos deportivos",
    contentHtml: buildContent()
  });

  const layout = await setupAdminLayout({
    onCompanyChanged: async selectedCompany => {
      company = selectedCompany;

      if (!hasModule(company, "tournaments")) {
        window.location.replace("/src/pages/admin/students/index.html");
        return;
      }

      await loadTeams();
    }
  });

  company = layout.activeCompany;

  if (!hasModule(company, "tournaments")) {
    window.location.replace("/src/pages/admin/students/index.html");
    return;
  }

  bindEvents();

  await loadTeams();
}

init();