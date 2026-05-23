import { state } from "../core/state.js";
import { escapeHtml } from "../core/utils.js";

function getPlayers() {
  return Array.isArray(state.stats?.players)
    ? state.stats.players.filter(x => Number(x.goals || 0) > 0)
    : [];
}

function getTeams() {
  return Array.isArray(state.stats?.teams) ? state.stats.teams : [];
}

function getInitials(name) {
  const value = String(name || "").trim();

  if (!value) return "CC";

  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(x => x[0])
    .join("")
    .toUpperCase();
}

function buildAvatar(url, name, sizeClass = "h-11 w-11") {
  if (url) {
    return `
      <img
        src="${escapeHtml(url)}"
        alt="${escapeHtml(name)}"
        class="${sizeClass} rounded-2xl object-cover ring-2 ring-white dark:ring-slate-800 shadow-md"
        loading="lazy"
      />
    `;
  }

  return `
    <div class="${sizeClass} flex items-center justify-center rounded-2xl bg-slate-950 dark:bg-slate-100 text-xs font-black text-white dark:text-slate-950 ring-2 ring-white dark:ring-slate-800 shadow-md">
      ${escapeHtml(getInitials(name))}
    </div>
  `;
}

function buildEmpty() {
  return `
    <section class="rounded-[1.6rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white">
          📊
        </div>

        <div>
          <p class="text-xs font-black uppercase tracking-[0.28em] text-emerald-600">
            Estadísticas
          </p>
          <h3 class="text-lg font-black text-slate-950 dark:text-white">
            Todavía no hay estadísticas
          </h3>
          <p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Cuando se carguen eventos de partidos, van a aparecer acá.
          </p>
        </div>
      </div>
    </section>
  `;
}

function buildTopScorer(players) {
  const scorer = players.find(x => Number(x.goals || 0) > 0) || players[0];

  if (!scorer) return "";

  return `
    <section class="relative overflow-hidden rounded-[1.8rem] bg-slate-950 p-5 text-white shadow-sm">

      <div class="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-400/20 blur-2xl"></div>
      <div class="absolute -bottom-14 -left-12 h-36 w-36 rounded-full bg-yellow-300/10 blur-2xl"></div>

      <div class="relative flex items-center justify-between gap-4">

        <div class="flex min-w-0 items-center gap-4">
          ${buildAvatar(scorer.playerPhotoUrl, scorer.playerName, "h-16 w-16")}

          <div class="min-w-0">
            <p class="text-xs font-black uppercase tracking-[0.35em] text-emerald-400">
              Goleador
            </p>

            <h3 class="mt-1 truncate text-2xl font-black tracking-tight text-white">
              ${escapeHtml(scorer.playerName || "Jugador")}
            </h3>

            <p class="mt-1 truncate text-sm font-semibold text-slate-300 dark:text-slate-400">
              ${escapeHtml(scorer.teamName || "Equipo")}
            </p>
          </div>
        </div>

        <div class="rounded-3xl bg-white px-4 py-3 text-center text-slate-950 shadow-lg">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Goles
          </p>
          <p class="text-3xl font-black leading-none">
            ${Number(scorer.goals || 0)}
          </p>
        </div>

      </div>
    </section>
  `;
}

function buildScorerRow(player, index) {
  const goals = Number(player.goals || 0);

  return `
    <div class="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">

      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-sm font-black text-slate-700 dark:text-slate-200 shadow-sm">
          ${index + 1}
        </div>

        ${buildAvatar(
          player.playerPhotoUrl,
          player.playerName,
          "h-12 w-12 shrink-0"
        )}

        <div class="min-w-0">
          <p class="truncate text-sm font-black text-slate-950 dark:text-white">
            ${escapeHtml(player.playerName || "Jugador")}
          </p>

          <p class="mt-1 truncate text-xs font-bold text-slate-400 dark:text-slate-500">
            ${escapeHtml(player.teamName || "Equipo")}
          </p>
        </div>
      </div>

      <div class="shrink-0 text-right">
        <p class="text-3xl font-black leading-none text-slate-950 dark:text-white">
          ${goals}
        </p>

        <p class="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
          goles
        </p>
      </div>

    </div>
  `;
}

function buildScorers(players) {
  const rows = [...players]
    .sort((a, b) =>
      Number(b.goals || 0) - Number(a.goals || 0) ||
      Number(b.assists || 0) - Number(a.assists || 0) ||
      String(a.playerName || "").localeCompare(String(b.playerName || ""))
    )
    .slice(0, 10);

  return `
    <section class="overflow-hidden rounded-[1.6rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">

      <div class="flex items-center justify-between gap-3 px-4 py-4">
        <div>
          <p class="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
            Ranking
          </p>
          <h3 class="text-lg font-black text-slate-950 dark:text-white">
            Goleadores
          </h3>
        </div>

        <span class="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700">
          TOP
        </span>
      </div>

${rows.length
  ? `<div class="space-y-3 px-4 pb-4">${rows.map(buildScorerRow).join("")}</div>`
        : `
          <div class="px-4 pb-4">
            <div class="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Sin goleadores todavía.
            </div>
          </div>
        `
      }

    </section>
  `;
}

function buildTeamRow(team, index) {
  return `
    <div class="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">

      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-sm font-black text-slate-700 dark:text-slate-200 shadow-sm">
          ${index + 1}
        </div>

        ${buildAvatar(team.teamLogoUrl, team.teamName, "h-11 w-11")}

        <div class="min-w-0">
          <p class="truncate text-sm font-black text-slate-950 dark:text-white">
            ${escapeHtml(team.teamName || "Equipo")}
          </p>

          <p class="text-xs font-bold text-slate-400 dark:text-slate-500">
            ${Number(team.played || 0)} PJ
          </p>
        </div>
      </div>

      <div class="text-right">
        <p class="text-2xl font-black text-slate-950 dark:text-white">
          ${Number(team.goals || 0)}
        </p>
        <p class="text-[11px] font-bold text-slate-400 dark:text-slate-500">
          goles
        </p>
      </div>

    </div>
  `;
}

function buildTopTeams(teams) {
  const rows = [...teams]
    .sort((a, b) =>
      Number(b.goals || 0) - Number(a.goals || 0) ||
      String(a.teamName || "").localeCompare(String(b.teamName || ""))
    )
    .slice(0, 5);

  return `
    <section class="rounded-[1.6rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">

      <div class="mb-4">
        <p class="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
          Equipos
        </p>
        <h3 class="text-lg font-black text-slate-950 dark:text-white">
          Más goleadores
        </h3>
      </div>

      <div class="space-y-3">
        ${rows.length
          ? rows.map(buildTeamRow).join("")
          : `
            <div class="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Sin estadísticas de equipos.
            </div>
          `
        }
      </div>

    </section>
  `;
}

function buildFairPlayRow(team) {
  const yellowCards = Number(team.yellowCards || 0);
  const redCards = Number(team.redCards || 0);

  return `
    <div class="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">

      <div class="flex min-w-0 items-center gap-3">
        ${buildAvatar(team.teamLogoUrl, team.teamName, "h-11 w-11")}

        <div class="min-w-0">
          <p class="truncate text-sm font-black text-slate-950 dark:text-white">
            ${escapeHtml(team.teamName || "Equipo")}
          </p>

          <p class="text-xs font-bold text-slate-400 dark:text-slate-500">
            ${Number(team.fouls || 0)} faltas
          </p>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <span class="rounded-full bg-yellow-100 px-2 py-1 text-xs font-black text-yellow-700">
          ${yellowCards}A
        </span>

        <span class="rounded-full bg-red-100 px-2 py-1 text-xs font-black text-red-600">
          ${redCards}R
        </span>
      </div>

    </div>
  `;
}

function buildFairPlay(teams) {
  const rows = [...teams]
    .sort((a, b) =>
      Number(a.yellowCards || 0) + Number(a.redCards || 0) * 2 -
      (Number(b.yellowCards || 0) + Number(b.redCards || 0) * 2)
    )
    .slice(0, 5);

  return `
    <section class="rounded-[1.6rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">

      <div class="mb-4">
        <p class="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
          Conducta
        </p>
        <h3 class="text-lg font-black text-slate-950 dark:text-white">
          Fair Play
        </h3>
      </div>

      <div class="space-y-3">
        ${rows.length
          ? rows.map(buildFairPlayRow).join("")
          : `
            <div class="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Sin tarjetas todavía.
            </div>
          `
        }
      </div>

    </section>
  `;
}

export function buildStatsTab() {
  const players = getPlayers();
  const teams = getTeams();

  if (!players.length && !teams.length) {
    return buildEmpty();
  }

  return `
    <div class="space-y-5 fade-up">

      ${buildTopScorer(players)}

      ${buildScorers(players)}

      <div class="grid gap-5 lg:grid-cols-2">
        ${buildTopTeams(teams)}
        ${buildFairPlay(teams)}
      </div>

    </div>
  `;
}