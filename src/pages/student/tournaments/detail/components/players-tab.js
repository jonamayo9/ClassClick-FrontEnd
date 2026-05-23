import { state } from "../core/state.js";
import { escapeHtml } from "../core/utils.js";

function getRows() {
  return Array.isArray(state.playerSummary) ? state.playerSummary : [];
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

function buildAvatar(url, name) {
  if (url) {
    return `
      <img
        src="${escapeHtml(url)}"
        alt="${escapeHtml(name)}"
        class="h-11 w-11 rounded-2xl object-cover ring-2 ring-white shadow-md"
        loading="lazy"
      />
    `;
  }

  return `
    <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xs font-black text-white ring-2 ring-white shadow-md">
      ${escapeHtml(getInitials(name))}
    </div>
  `;
}

function buildEmpty() {
  return `
    <section class="rounded-[1.6rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white">
          👥
        </div>

        <div>
          <p class="text-xs font-black uppercase tracking-[0.28em] text-emerald-600">
            Jugadores
          </p>

          <h3 class="text-lg font-black text-slate-950 dark:text-white">
            Todavía no hay estadísticas
          </h3>

          <p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Cuando se carguen goles, tarjetas o asistencias, van a aparecer acá.
          </p>
        </div>
      </div>
    </section>
  `;
}

function buildMobileRow(player) {
  const goals = Number(player.goals || 0);
  const assists = Number(player.assists || 0);
  const yellowCards = Number(player.yellowCards || 0);
  const redCards = Number(player.redCards || 0);
  const fouls = Number(player.fouls || 0);

  return `
    <div class="rounded-[1.4rem] bg-slate-50 dark:bg-slate-800 p-3">

      <div class="flex items-center gap-3">
        ${buildAvatar(player.playerPhotoUrl, player.playerName)}

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-black text-slate-950 dark:text-white">
            ${escapeHtml(player.playerName || "Jugador")}
          </p>

          <p class="mt-1 truncate text-xs font-bold text-slate-400">
            ${escapeHtml(player.teamName || "Equipo")}
          </p>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-5 gap-2 text-center">
        <div class="rounded-2xl bg-white dark:bg-slate-900 px-2 py-2 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-widest text-emerald-600">G</p>
          <p class="text-lg font-black text-slate-950">${goals}</p>
        </div>

        <div class="rounded-2xl bg-white dark:bg-slate-900 px-2 py-2 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">A</p>
          <p class="text-lg font-black text-slate-950">${assists}</p>
        </div>

        <div class="rounded-2xl border border-yellow-500/15 bg-yellow-500/10 px-2 py-2">
          <p class="text-[10px] font-black uppercase tracking-widest text-yellow-600">TA</p>
          <p class="text-lg font-black text-yellow-300">${yellowCards}</p>
        </div>

        <div class="rounded-2xl border border-red-500/15 bg-red-500/10 px-2 py-2">
          <p class="text-[10px] font-black uppercase tracking-widest text-red-500">TR</p>
          <p class="text-lg font-black text-red-300">${redCards}</p>
        </div>

        <div class="rounded-2xl bg-white dark:bg-slate-900 px-2 py-2 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">F</p>
          <p class="text-lg font-black text-slate-950">${fouls}</p>
        </div>
      </div>

    </div>
  `;
}

function buildDesktopRow(player) {
  return `
    <tr class="border-b border-slate-100 dark:border-slate-800 last:border-b-0">

      <td class="px-4 py-3">
        <div class="flex min-w-0 items-center gap-3">
          ${buildAvatar(player.playerPhotoUrl, player.playerName)}

          <div class="min-w-0">
            <p class="truncate text-sm font-black text-slate-950 dark:text-white">
              ${escapeHtml(player.playerName || "Jugador")}
            </p>

            <p class="truncate text-xs font-bold text-slate-400">
              ${escapeHtml(player.teamName || "Equipo")}
            </p>
          </div>
        </div>
      </td>

      <td class="px-4 py-3 text-center text-sm font-black text-slate-950 dark:text-white">
        ${Number(player.goals || 0)}
      </td>

      <td class="px-4 py-3 text-center text-sm font-black text-slate-950 dark:text-white">
        ${Number(player.assists || 0)}
      </td>

      <td class="px-4 py-3 text-center">
        <span class="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700">
          ${Number(player.yellowCards || 0)}
        </span>
      </td>

      <td class="px-4 py-3 text-center">
        <span class="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-600">
          ${Number(player.redCards || 0)}
        </span>
      </td>

      <td class="px-4 py-3 text-center text-sm font-black text-slate-500 dark:text-slate-400">
        ${Number(player.fouls || 0)}
      </td>

    </tr>
  `;
}

function buildTopSummary(rows) {
  const totalGoals = rows.reduce(
    (acc, x) => acc + Number(x.goals || 0),
    0
  );

  const totalYellow = rows.reduce(
    (acc, x) => acc + Number(x.yellowCards || 0),
    0
  );

  const totalRed = rows.reduce(
    (acc, x) => acc + Number(x.redCards || 0),
    0
  );

  return `
    <section class="grid grid-cols-3 gap-3">

      <div class="rounded-[1.4rem] bg-gradient-to-br from-emerald-500 to-cyan-500 px-3 py-4 text-center shadow-sm">
        <p class="text-[11px] font-black uppercase tracking-[0.3em] text-white/80">
          Goles
        </p>

        <p class="mt-2 text-3xl font-black text-white">
          ${totalGoals}
        </p>
      </div>

      <div class="rounded-[1.4rem] border border-yellow-500/20 bg-yellow-500/10 px-3 py-4 text-center shadow-sm">
        <p class="text-[11px] font-black uppercase tracking-[0.3em] text-yellow-600">
          Amarillas
        </p>

        <p class="mt-2 text-3xl font-black text-yellow-300">
          ${totalYellow}
        </p>
      </div>

      <div class="rounded-[1.4rem] border border-red-500/20 bg-red-500/10 px-3 py-4 text-center shadow-sm">
        <p class="text-[11px] font-black uppercase tracking-[0.3em] text-red-500">
          Rojas
        </p>

        <p class="mt-2 text-3xl font-black text-red-300">
          ${totalRed}
        </p>
      </div>

    </section>
  `;
}

export function buildPlayersTab() {
  const rows = [...getRows()].sort((a, b) =>
    Number(b.goals || 0) - Number(a.goals || 0) ||
    Number(b.assists || 0) - Number(a.assists || 0) ||
    Number(b.yellowCards || 0) - Number(a.yellowCards || 0) ||
    String(a.playerName || "").localeCompare(String(b.playerName || ""))
  );

  if (!rows.length) {
    return buildEmpty();
  }

  return `
    <div class="space-y-5 fade-up">

      ${buildTopSummary(rows)}

      <section class="overflow-hidden rounded-[1.6rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">

<div class="flex items-start justify-between gap-3 px-4 py-4">
  <div>
            <p class="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
              Estadísticas
            </p>

            <h3 class="text-lg font-black text-slate-950 dark:text-white">
              Jugadores
            </h3>

            <p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Goles, asistencias, tarjetas y faltas.
            </p>
  </div>

<button
  id="playersHelpBtn"
  type="button"
  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition active:scale-95"
>
<svg
  xmlns="http://www.w3.org/2000/svg"
  class="h-5 w-5 text-slate-500 dark:text-slate-400"
  fill="none"
  viewBox="0 0 24 24"
  stroke="currentColor"
  stroke-width="2"
>
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  />
</svg>
</button>

</div>

        <div class="space-y-3 px-4 pb-4 md:hidden">
          ${rows.map(buildMobileRow).join("")}
        </div>

        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[720px]">
            <thead class="bg-slate-50 dark:bg-slate-800 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <tr>
                <th class="px-4 py-3 text-left">Jugador</th>
                <th class="px-4 py-3 text-center">Goles</th>
                <th class="px-4 py-3 text-center">Asist.</th>
                <th class="px-4 py-3 text-center">A</th>
                <th class="px-4 py-3 text-center">R</th>
                <th class="px-4 py-3 text-center">Faltas</th>
              </tr>
            </thead>

            <tbody>
              ${rows.map(buildDesktopRow).join("")}
            </tbody>
          </table>
        </div>

      </section>

      ${buildPlayersHelpModal()}

    </div>
  `;
}

function buildPlayersHelpModal() {
  return `
<div
  id="playersHelpModal"
  class="fixed inset-0 z-[999999] hidden"
>

  <div class="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"></div>

  <div class="relative flex min-h-screen items-center justify-center p-4">

    <div class="w-full max-w-sm rounded-[30px] bg-white dark:bg-slate-900 p-5 shadow-2xl">

      <div class="flex items-center justify-between">
        <h3 class="text-lg font-black text-slate-950 dark:text-white">
          Referencias
        </h3>

        <button
          id="closePlayersHelpBtn"
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-sm font-black text-slate-700 dark:text-slate-200"
        >
          ✕
        </button>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-3">

        <div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3">
          <p class="text-xs font-black text-emerald-600">G</p>
          <p class="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            Goles
          </p>
        </div>

        <div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3">
          <p class="text-xs font-black text-slate-500 dark:text-slate-400">A</p>
          <p class="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            Asistencias
          </p>
        </div>

        <div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3">
          <p class="text-xs font-black text-yellow-600">TA</p>
          <p class="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            Tarjetas amarillas
          </p>
        </div>

        <div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3">
          <p class="text-xs font-black text-red-500">TR</p>
          <p class="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            Tarjetas rojas
          </p>
        </div>

        <div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3">
          <p class="text-xs font-black text-slate-500 dark:text-slate-400">F</p>
          <p class="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            Faltas
          </p>
        </div>

      </div>

    </div>

  </div>

</div>
  `;
}