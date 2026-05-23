import { state } from "../core/state.js";

export function renderStandingsTab() {
  return `
    <section class="rounded-2xl border bg-white p-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">
            Tabla de posiciones
          </h2>

          <p class="mt-1 text-sm text-slate-500">
            Posiciones actualizadas automáticamente.
          </p>
        </div>

        <details class="relative">
          <summary class="cursor-pointer list-none rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Ayuda
          </summary>

          <div class="absolute right-0 z-20 mt-2 w-72 rounded-2xl border bg-white p-4 text-sm shadow-xl">
            <div class="font-semibold text-slate-900">
              Referencias
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2 text-slate-600">
              <div><b>PJ</b>: Jugados</div>
              <div><b>PG</b>: Ganados</div>
              <div><b>PE</b>: Empatados</div>
              <div><b>PP</b>: Perdidos</div>
              <div><b>GF</b>: Goles a Favor</div>
              <div><b>GC</b>: Goles Recibidos</div>
              <div><b>DG</b>: Diferencia</div>
              <div><b>PTS</b>: Puntos</div>
            </div>
          </div>
        </details>
      </div>

      ${
        !state.standings.length
          ? `
            <div class="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Todavía no hay tabla calculada.
            </div>
          `
          : `
            <div class="mt-6 overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-slate-500">
                    <th class="px-3 py-3">#</th>
                    <th class="px-3 py-3">Equipo</th>
                    <th class="px-3 py-3 text-center">PJ</th>
                    <th class="px-3 py-3 text-center">PG</th>
                    <th class="px-3 py-3 text-center">PE</th>
                    <th class="px-3 py-3 text-center">PP</th>
                    <th class="px-3 py-3 text-center">GF</th>
                    <th class="px-3 py-3 text-center">GC</th>
                    <th class="px-3 py-3 text-center">DG</th>
                    <th class="px-3 py-3 text-center">PTS</th>
                  </tr>
                </thead>

                <tbody>
                  ${state.standings.map(renderStandingRow).join("")}
                </tbody>
              </table>
            </div>
          `
      }
    </section>
  `;
}

function renderStandingRow(row) {
  const team = state.teams.find(x => x.id === row.teamId);

  return `
    <tr class="border-b last:border-0">
      <td class="px-3 py-3 font-bold text-slate-900">
        ${row.position}
      </td>

      <td class="px-3 py-3">
        <div class="flex items-center gap-3">
          ${renderTeamLogo(team || { name: row.teamName }, "h-10 w-10 rounded-lg")}

          <div class="font-medium text-slate-900">
            ${row.teamName}
          </div>
        </div>
      </td>

      <td class="px-3 py-3 text-center">${row.played}</td>
      <td class="px-3 py-3 text-center">${row.won}</td>
      <td class="px-3 py-3 text-center">${row.drawn}</td>
      <td class="px-3 py-3 text-center">${row.lost}</td>
      <td class="px-3 py-3 text-center">${row.goalsFor}</td>
      <td class="px-3 py-3 text-center">${row.goalsAgainst}</td>
      <td class="px-3 py-3 text-center">${row.goalDifference}</td>

      <td class="px-3 py-3 text-center">
        <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
          ${row.points}
        </span>
      </td>
    </tr>
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