import { state } from "../core/state.js";

export function renderStatsTab() {
  return `
    <section class="grid gap-4 xl:grid-cols-3">
      ${renderTopScorersCard()}
      ${renderTopTeamsCard()}
      ${renderFairPlayCard()}
    </section>
  `;
}

function renderTopScorersCard() {
  return `
    <section class="rounded-2xl border bg-white p-5">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900">
          Goleadores
        </h2>

        <span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
          TOP
        </span>
      </div>

      <div class="mt-5 space-y-3">
        ${
          !state.scorers.length
            ? `
              <div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Sin estadísticas todavía.
              </div>
            `
            : state.scorers.map((x, index) => `
                <div class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div class="flex items-center gap-3">
                    ${
                      x.playerPhotoUrl
                        ? `
                          <img
                            src="${x.playerPhotoUrl}"
                            alt="${x.playerName || "Jugador"}"
                            class="h-9 w-9 rounded-full border bg-white object-cover"
                          />
                        `
                        : `
                          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                            ${index + 1}
                          </div>
                        `
                    }

                    <div>
                      <div class="text-sm font-semibold text-slate-900">
                        ${x.playerName}
                      </div>

                      <div class="text-xs text-slate-500">
                        ${x.teamName || "-"}
                      </div>
                    </div>
                  </div>

                  <div class="text-xl font-black text-slate-900">
                    ${x.goals}
                  </div>
                </div>
              `).join("")
        }
      </div>
    </section>
  `;
}

function renderTopTeamsCard() {
  const ordered = [...state.teamStats]
    .sort((a, b) => (b.goalsFor || 0) - (a.goalsFor || 0))
    .slice(0, 5);

  return `
    <section class="rounded-2xl border bg-white p-5">
      <h2 class="text-lg font-semibold text-slate-900">
        Equipos más goleadores
      </h2>

      <div class="mt-5 space-y-3">
        ${
          !ordered.length
            ? `
              <div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Sin estadísticas todavía.
              </div>
            `
            : ordered.map(team => `
                <div class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div class="flex items-center gap-3">
                    ${renderTeamLogo(state.teams.find(x => x.id === team.teamId) || { name: team.teamName }, "h-10 w-10 rounded-lg")}

                    <div>
                      <div class="text-sm font-semibold text-slate-900">
                        ${team.teamName}
                      </div>

                      <div class="text-xs text-slate-500">
                        ${team.played || 0} PJ
                      </div>
                    </div>
                  </div>

                  <div class="text-right">
                    <div class="text-xl font-black text-slate-900">
                      ${team.goalsFor || 0}
                    </div>

                    <div class="text-xs text-slate-500">
                      goles
                    </div>
                  </div>
                </div>
              `).join("")
        }
      </div>
    </section>
  `;
}

function renderFairPlayCard() {
const ordered = [...state.teamStats]
  .map(team => {
    const playerTotals = state.playerStats
      .filter(player => player.teamId === team.teamId)
      .reduce((acc, player) => {
        acc.yellowCards += player.yellowCards || 0;
        acc.redCards += player.redCards || 0;
        return acc;
      }, {
        yellowCards: 0,
        redCards: 0
      });

    return {
      ...team,
      yellowCards: team.yellowCards || playerTotals.yellowCards,
      redCards: team.redCards || playerTotals.redCards
    };
  })
  .sort((a, b) =>
    (a.redCards || 0) - (b.redCards || 0) ||
    (a.yellowCards || 0) - (b.yellowCards || 0)
  );

  return `
    <section class="rounded-2xl border bg-white p-5">
      <h2 class="text-lg font-semibold text-slate-900">
        Fair Play
      </h2>

      <div class="mt-5 space-y-3">
        ${
          !ordered.length
            ? `
              <div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Sin estadísticas todavía.
              </div>
            `
            : ordered.map(team => `
                <div class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div class="flex items-center gap-3">
                    ${renderTeamLogo(state.teams.find(x => x.id === team.teamId) || { name: team.teamName }, "h-10 w-10 rounded-lg")}

                    <div class="text-sm font-semibold text-slate-900">
                      ${team.teamName}
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">
                      ${team.yellowCards || 0}A
                    </span>

                    <span class="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                      ${team.redCards || 0}R
                    </span>
                  </div>
                </div>
              `).join("")
        }
      </div>
    </section>
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
  if (!name) return "TR";

  const parts = name.trim().split(" ");

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}