export function renderFixtureTab({
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
}) {
  const grouped = groupMatchesByRound(matches);

  const fixtureMode = tournament?.settings?.fixtureGenerationMode || "Manual";

  const isManual = fixtureMode === "Manual";
  const isAutomatic = fixtureMode === "Automatic";
  const isMixed = fixtureMode === "Mixed";

  const canGenerate = isOwner && (isAutomatic || isMixed);
  const canCreateManualMatch = isOwner && (isManual || isMixed);

  return `
    <section class="space-y-4">
      <div class="rounded-2xl border bg-white p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-semibold text-slate-900">Fixture</h2>

              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                ${getFixtureModeText(fixtureMode)}
              </span>
            </div>

            <p class="mt-1 text-sm text-slate-500">
              Fechas, jornadas y partidos del torneo.
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            ${
              canGenerate
                ? `
                  <button
                    id="generateFixtureBtn"
                    type="button"
                    class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                    ${generatingFixture ? "disabled" : ""}
                  >
                    ${generatingFixture ? "Generando..." : "Generar fixture"}
                  </button>
                `
                : ""
            }

            ${
              canCreateManualMatch
                ? `
                  <button
                    id="openManualMatchModalBtn"
                    type="button"
                    class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Crear partido
                  </button>
                `
                : ""
            }
          </div>
        </div>

        ${
          isManual
            ? `
              <div class="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Este torneo está en modo manual. Los partidos se cargan uno por uno.
              </div>
            `
            : ""
        }

        ${
          isAutomatic
            ? `
              <div class="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-700">
                Este torneo está en modo automático. El fixture se genera desde los equipos cargados.
              </div>
            `
            : ""
        }

        ${
          isMixed
            ? `
              <div class="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Este torneo está en modo mixto. Podés generar el fixture y también crear partidos manualmente.
              </div>
            `
            : ""
        }

        ${fixtureMessage ? `<div class="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">${fixtureMessage}</div>` : ""}
        ${fixtureError ? `<div class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">${fixtureError}</div>` : ""}

        <div class="mt-6 space-y-4">
          ${renderFixtureRounds({
            grouped,
            teams,
            openedMatchMenuId,
            formatDateTime,
            getMatchStatusText,
            isOwner
          })}
        </div>
      </div>

      ${manualMatchModalOpen ? renderManualMatchModal({
        teams,
        editingMatchId,
        savingManualMatch,
        manualMatchForm
      }) : ""}

      ${matchConfirmModalOpen ? renderMatchConfirmModal() : ""}
    </section>
  `;
}

function groupMatchesByRound(items) {
  return items.reduce((acc, match) => {
    const round = match.roundNumber || 1;

    if (!acc[round]) {
      acc[round] = [];
    }

    acc[round].push(match);
    return acc;
  }, {});
}

function getRoundDateText(matches) {
  const dates = [...new Set(
    matches
      .map(x => toDateKey(x.matchDateUtc))
      .filter(Boolean)
  )];

  if (!dates.length) {
    return "· Sin fecha";
  }

  if (dates.length === 1) {
    return `· ${formatDateOnly(dates[0])}`;
  }

  return `· ${dates.length} días`;
}

function toDateKey(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

function formatDateOnly(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function renderFixtureRounds({
  grouped,
  teams,
  openedMatchMenuId,
  formatDateTime,
  getMatchStatusText,
  isOwner
}) {
  const rounds = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  if (!rounds.length) {
    return `
      <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Todavía no hay partidos generados.
      </div>
    `;
  }

  return rounds.map(round => `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="font-semibold text-slate-900">
          Ronda ${round} ${getRoundDateText(grouped[round])}
        </h3>
        <span class="text-xs text-slate-500">${grouped[round].length} partidos</span>
      </div>

      <div class="space-y-3">
        ${grouped[round].map(match => renderMatchCard({
          match,
          teams,
          openedMatchMenuId,
          formatDateTime,
          getMatchStatusText,
          isOwner
        })).join("")}
      </div>
    </div>
  `).join("");
}

function renderMatchCard({
  match,
  teams,
  openedMatchMenuId,
  formatDateTime,
  getMatchStatusText,
  isOwner
}) {
  const homeTeam = teams.find(x => x.id === match.homeTeamId);
  const awayTeam = teams.find(x => x.id === match.awayTeamId);
  const isMenuOpen = openedMatchMenuId === match.id;

  return `
    <article class="rounded-2xl border bg-white p-4">
      <div class="mb-3 flex items-center justify-between">
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          ${getMatchStatusText(match.status)}
        </span>

        ${isOwner ? `
  <div class="relative">
    <button
      type="button"
      data-match-menu-btn="${match.id}"
      class="rounded-lg bg-slate-100 px-3 py-1 text-slate-600 hover:bg-slate-200"
    >
      ···
    </button>

    ${
      isMenuOpen
        ? `
          <div class="absolute right-0 top-10 z-20 w-56 rounded-2xl border bg-white p-2 shadow-2xl">
            <div class="border-b px-3 py-2 text-xs text-slate-500">
              ${formatDateTime(match.matchDateUtc)}<br/>
              ${match.venue || "Sin cancha"}
            </div>

            <button type="button" data-edit-match-id="${match.id}" class="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
              Editar partido
            </button>

            ${
              !match.isPublished
                ? `<button type="button" data-publish-match-id="${match.id}" class="flex w-full rounded-xl px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50">
                    Publicar partido
                  </button>`
                : ""
            }

            <button type="button" data-delete-match-id="${match.id}" class="flex w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
              Eliminar partido
            </button>
          </div>
        `
        : ""
    }
  </div>
` : ""}
      </div>

      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div class="flex flex-col items-center text-center">
          ${renderTeamLogo(homeTeam || { name: match.homeTeamName }, "h-16 w-16 rounded-2xl")}
          <div class="mt-2 text-sm font-bold text-slate-900">
            ${match.homeTeamName || homeTeam?.name || "Local"}
          </div>
        </div>

        <div class="flex flex-col items-center justify-center">
          <div class="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white shadow-sm">
            VS
          </div>

          <div class="mt-3 text-center text-xs leading-5 text-slate-500">
            <div>${formatDateTime(match.matchDateUtc)}</div>
            <div>${match.venue || "Sin cancha"}</div>
          </div>
        </div>

        <div class="flex flex-col items-center text-center">
          ${renderTeamLogo(awayTeam || { name: match.awayTeamName }, "h-16 w-16 rounded-2xl")}
          <div class="mt-2 text-sm font-bold text-slate-900">
            ${match.awayTeamName || awayTeam?.name || "Visitante"}
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderManualMatchModal({
  teams,
  editingMatchId,
  savingManualMatch,
  manualMatchForm
}) {
  const buildTeamOptions = (selectedId) => teams
    .filter(x => x.isActive !== false)
    .map(team => `
      <option value="${team.id}" ${selectedId === team.id ? "selected" : ""}>
        ${team.name}${team.category ? ` · ${team.category}` : ""}
      </option>
    `)
    .join("");

  return `
    <div class="fixed inset-0 z-50 p-4">
      <div class="absolute inset-0 bg-slate-950/60" data-close-manual-match-modal="true"></div>

      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">
                ${editingMatchId ? "Editar partido" : "Crear partido"}
              </h3>
              <p class="text-sm text-slate-500">Carga manual del fixture.</p>
            </div>

            <button id="closeManualMatchModalBtn" type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cerrar
            </button>
          </div>

          <div class="space-y-4 p-5">
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Ronda del fixture</label>
                <input
                  id="manualMatchRoundInput"
                  value="${manualMatchForm.roundNumber}"
                  min="1"
                  type="number"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Día y horario</label>
                <input
                  id="manualMatchDateInput"
                  value="${manualMatchForm.matchDateUtc || ""}"
                  type="datetime-local"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Local</label>
                <select id="manualMatchHomeTeamInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Seleccionar local</option>
                  ${buildTeamOptions(manualMatchForm.homeTeamId)}
                </select>
              </div>

              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Visitante</label>
                <select id="manualMatchAwayTeamInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Seleccionar visitante</option>
                  ${buildTeamOptions(manualMatchForm.awayTeamId)}
                </select>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Cancha / sede</label>
                <input
                  id="manualMatchVenueInput"
                  value="${manualMatchForm.venue || ""}"
                  type="text"
                  placeholder="Ej: Cancha 1"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">Dirección</label>
                <input
                  id="manualMatchAddressInput"
                  value="${manualMatchForm.address || ""}"
                  type="text"
                  placeholder="Opcional"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-slate-500">Notas</label>
              <textarea
                id="manualMatchNotesInput"
                rows="3"
                placeholder="Opcional"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >${manualMatchForm.notes || ""}</textarea>
            </div>

            <label class="flex items-center gap-2 text-sm">
              <input id="manualMatchIsPublishedInput" type="checkbox" ${manualMatchForm.isPublished ? "checked" : ""} class="rounded border-slate-300" />
              <span class="text-slate-700">Publicar partido</span>
            </label>

            <button
              id="saveManualMatchBtn"
              type="button"
              class="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
              ${savingManualMatch ? "disabled" : ""}
            >
              ${savingManualMatch ? "Guardando..." : editingMatchId ? "Guardar cambios" : "Guardar partido"}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMatchConfirmModal() {
  return `
    <div class="fixed inset-0 z-50 p-4">
      <div class="absolute inset-0 bg-slate-950/60" data-close-match-confirm="true"></div>

      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div class="border-b px-5 py-4">
            <h3 class="text-lg font-semibold text-slate-900">Confirmar acción</h3>
            <p class="mt-1 text-sm text-slate-500">¿Querés eliminar este partido?</p>
          </div>

          <div class="flex justify-end gap-2 p-5">
            <button id="cancelMatchConfirmBtn" type="button" class="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>

            <button id="acceptMatchConfirmBtn" type="button" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
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

function getInitials(name) {
  if (!name)
    return "TR";

  const parts = name.trim().split(" ");

  if (parts.length === 1)
    return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}