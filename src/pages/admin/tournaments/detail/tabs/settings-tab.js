import { state } from "../core/state.js";

export function renderSettingsTab() {
  return `
    <section class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-2xl border bg-white p-5">
        <h2 class="text-lg font-semibold text-slate-900">
          Configuración torneo
        </h2>

        <div class="mt-5 space-y-4 text-sm">
          ${infoRow("Formato", getCompetitionFormatText(state.tournament?.settings?.competitionFormat))}
          ${infoRow("Fixture", getFixtureModeText(state.tournament?.settings?.fixtureGenerationMode))}
          ${infoRow("Rondas", getRoundModeText(state.tournament?.settings?.roundMode))}
          ${infoRow("Jugadores cancha", state.tournament?.settings?.playersOnField || "-")}
          ${infoRow("Mínimo jugadores", state.tournament?.settings?.minPlayersPerTeam || "-")}
          ${infoRow("Máximo jugadores", state.tournament?.settings?.maxPlayersPerTeam || "-")}
        </div>
      </div>

      <div class="rounded-2xl border bg-white p-5">
        <h2 class="text-lg font-semibold text-slate-900">
          Reglas
        </h2>

        <div class="mt-5 space-y-4 text-sm">
          ${infoRow("Victoria", state.tournament?.rules?.winPoints || "-")}
          ${infoRow("Empate", state.tournament?.rules?.drawPoints || "-")}
          ${infoRow("Derrota", state.tournament?.rules?.lossPoints || "-")}
          ${infoRow("WO", state.tournament?.rules?.walkoverPoints || "-")}
        </div>
      </div>
    </section>
  `;
}

function infoRow(label, value) {
  return `
    <div class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <span class="text-slate-500">
        ${label}
      </span>

      <span class="font-medium text-slate-900">
        ${value}
      </span>
    </div>
  `;
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