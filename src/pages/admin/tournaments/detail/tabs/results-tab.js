export function renderResultsTab({
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
}) {
  const grouped = groupMatchesByRound(matches);

  const rounds = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return `
    <section class="space-y-4">
      <div class="rounded-2xl border bg-white p-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">
              Resultados
            </h2>

            <p class="mt-1 text-sm text-slate-500">
              Resultados, estados y marcador de partidos.
            </p>
          </div>

        ${isOwner ? `
          <button
            id="recalculateStandingsBtn"
            type="button"
            class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Recalcular tabla
          </button>
        ` : ""}
        </div>

        ${
          resultsMessage
            ? `<div class="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">${resultsMessage}</div>`
            : ""
        }

        ${
          resultsError
            ? `<div class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">${resultsError}</div>`
            : ""
        }

        <div class="mt-6 space-y-6">
          ${
            !rounds.length
              ? `
                <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  Todavía no hay partidos cargados.
                </div>
              `
              : rounds.map(round => `
                  <section class="space-y-3">
                    <div class="flex items-center justify-between">
                      <h3 class="text-sm font-bold uppercase tracking-wide text-slate-500">
                        Fecha ${round}
                      </h3>

                      <span class="text-xs text-slate-400">
                        ${grouped[round].length} partidos
                      </span>
                    </div>

                    <div class="space-y-3">
                      ${grouped[round].map(match => renderResultCard({
                        match,
                        teams,
                        formatDateTime,
                        getMatchStatusText,
                        isOwner,
                        myCompanyTeamIds
                      })).join("")}
                    </div>
                  </section>
                `).join("")
          }
        </div>
      </div>

      ${resultModalOpen ? renderResultModal({ resultForm }) : ""}
      ${eventModalOpen ? renderEventModal() : ""}
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

function renderResultCard({
  match,
  teams,
  formatDateTime,
  getMatchStatusText,
  isOwner,
  myCompanyTeamIds
}) {
  const homeTeam = teams.find(x => x.id === match.homeTeamId);
  const awayTeam = teams.find(x => x.id === match.awayTeamId);

  const hasResult =
    match.homeScore !== null &&
    match.homeScore !== undefined &&
    match.awayScore !== null &&
    match.awayScore !== undefined;

const canManageMatch =
  isOwner ||
  (myCompanyTeamIds || []).includes(match.homeTeamId) ||
  (myCompanyTeamIds || []).includes(match.awayTeamId);

  return `
    <article class="rounded-2xl border border-slate-200 bg-white p-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          ${renderTeamLogo(homeTeam || { name: match.homeTeamName }, "h-12 w-12 rounded-xl")}

          <div class="min-w-0">
            <div class="truncate text-sm font-bold text-slate-900">
              ${match.homeTeamName || homeTeam?.name || "Local"}
            </div>

            <div class="mt-1 text-xs text-slate-500">
              ${formatDateTime(match.matchDateUtc)}
            </div>
          </div>
        </div>

        <div class="flex flex-col items-center justify-center px-4">
          ${
            hasResult
              ? `
                <div class="flex items-center gap-2 text-2xl font-black text-slate-900">
                  <span>${match.homeScore}</span>
                  <span class="text-slate-400">-</span>
                  <span>${match.awayScore}</span>
                </div>
              `
              : `
                <div class="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
                  VS
                </div>
              `
          }

          <div class="mt-2 text-xs text-slate-500">
            ${getMatchStatusText(match.status)}
          </div>
        </div>

        <div class="flex min-w-0 flex-1 items-center justify-end gap-3">
          <div class="min-w-0 text-right">
            <div class="truncate text-sm font-bold text-slate-900">
              ${match.awayTeamName || awayTeam?.name || "Visitante"}
            </div>

            <div class="mt-1 text-xs text-slate-500">
              ${match.venue || "Sin cancha"}
            </div>
          </div>

          ${renderTeamLogo(awayTeam || { name: match.awayTeamName }, "h-12 w-12 rounded-xl")}
        </div>
      </div>

      ${canManageMatch ? `
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            data-open-events-modal="${match.id}"
            class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Eventos
          </button>

          <button
            type="button"
            data-open-result-modal="${match.id}"
            class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            ${hasResult ? "Editar resultado" : "Cargar resultado"}
          </button>
        </div>
      ` : ""}
    </article>
  `;
}

function renderResultModal({ resultForm }) {
  return `
    <div class="fixed inset-0 z-50 p-4">
      <div class="absolute inset-0 bg-slate-950/60" data-close-result-modal="true"></div>

      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div class="border-b px-5 py-4">
            <h3 class="text-lg font-semibold text-slate-900">
              Cargar resultado
            </h3>
          </div>

          <div class="space-y-4 p-5">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">
                  Goles local
                </label>

                <input
                  id="resultHomeScoreInput"
                  type="number"
                  min="0"
                  value="${resultForm.homeScore}"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label class="mb-1 block text-xs font-medium text-slate-500">
                  Goles visitante
                </label>

                <input
                  id="resultAwayScoreInput"
                  type="number"
                  min="0"
                  value="${resultForm.awayScore}"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <label class="flex items-center gap-2 text-sm">
              <input
                id="resultFinishMatchInput"
                type="checkbox"
                ${resultForm.finishMatch ? "checked" : ""}
                class="rounded border-slate-300"
              />

              <span class="text-slate-700">
                Finalizar partido
              </span>
            </label>

            <button
              id="saveResultBtn"
              type="button"
              class="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-black"
            >
              Guardar resultado
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