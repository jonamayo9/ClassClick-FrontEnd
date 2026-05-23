import { state } from "../core/state.js";

export function renderPlayersTab() {
  return `
    <section class="rounded-2xl border bg-white p-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">
            Jugadores
          </h2>

          <p class="mt-1 text-sm text-slate-500">
            Estadísticas individuales del torneo.
          </p>
        </div>
      </div>

      ${
        !state.playerStats.length
          ? `
            <div class="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Todavía no hay estadísticas de jugadores.
            </div>
          `
          : `
            <div class="mt-6 overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-slate-500">
                    <th class="px-3 py-3">Jugador</th>
                    <th class="px-3 py-3">Equipo</th>
                    <th class="px-3 py-3 text-center">Goles</th>
                    <th class="px-3 py-3 text-center">Asist.</th>
                    <th class="px-3 py-3 text-center">A</th>
                    <th class="px-3 py-3 text-center">R</th>
                  </tr>
                </thead>

                <tbody>
                  ${state.playerStats.map(renderPlayerStatsRow).join("")}
                </tbody>
              </table>
            </div>
          `
      }
    </section>
  `;
}

function renderPlayerStatsRow(player) {
  return `
    <tr class="border-b last:border-0">
      <td class="px-3 py-3 font-medium text-slate-900">
        ${player.playerName}
      </td>

      <td class="px-3 py-3 text-slate-600">
        ${player.teamName || "-"}
      </td>

      <td class="px-3 py-3 text-center font-bold">
        ${player.goals || 0}
      </td>

      <td class="px-3 py-3 text-center">
        ${player.assists || 0}
      </td>

      <td class="px-3 py-3 text-center">
        ${player.yellowCards || 0}
      </td>

      <td class="px-3 py-3 text-center">
        ${player.redCards || 0}
      </td>
    </tr>
  `;
}