import { state } from "../core/state.js";
import { escapeHtml } from "../core/utils.js";

function getRows() {
  return Array.isArray(state.standings) ? state.standings : [];
}

function getLogo(row) {
  return (
    row.logoUrl ||
    row.LogoUrl ||
    row.teamLogoUrl ||
    ""
  );
}
function getTeamInitials(name) {
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

function getGroupKey(row) {
  return row.groupId || row.groupName || "general";
}

function groupStandings(rows) {
  const map = new Map();

  rows.forEach(row => {
    const key = getGroupKey(row);
    const name = row.groupName || "Tabla general";

    if (!map.has(key)) {
      map.set(key, {
        key,
        name,
        rows: []
      });
    }

    map.get(key).rows.push(row);
  });

  return Array.from(map.values());
}

function getPositionStyle(position) {
  if (position === 1) {
    return "bg-yellow-300 text-slate-950 shadow-[0_0_18px_rgba(250,204,21,.55)]";
  }

  if (position === 2) {
    return "bg-slate-200 dark:bg-slate-700 text-slate-950 dark:text-white";
  }

  if (position === 3) {
    return "bg-orange-300 text-slate-950";
  }

  return "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950";
}

function buildTeamLogo(row) {
  const logo = getLogo(row);
  const name = row.teamName || "Equipo";

  if (logo) {
    return `
      <img
        src="${escapeHtml(logo)}"
        alt="${escapeHtml(name)}"
        class="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-md"
        loading="lazy"
      />
    `;
  }

  return `
    <div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white ring-2 ring-white shadow-md">
      ${escapeHtml(getTeamInitials(name))}
    </div>
  `;
}

function buildEmpty() {
  return `
    <section class="rounded-[1.6rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white">
          🏆
        </div>

        <div>
          <p class="text-xs font-black uppercase tracking-[0.28em] text-emerald-600">
            Tabla
          </p>
          <h3 class="text-lg font-black text-slate-950 dark:text-white">
            Todavía no hay posiciones
          </h3>
          <p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Cuando se carguen resultados, la tabla va a aparecer acá.
          </p>
        </div>
      </div>
    </section>
  `;
}

function buildRow(row) {
  const position = Number(row.position || 0);
  const played = Number(row.played || 0);
  const won = Number(row.won || 0);
  const drawn = Number(row.drawn || 0);
  const lost = Number(row.lost || 0);
  const goalsFor = Number(row.goalsFor || 0);
  const goalsAgainst = Number(row.goalsAgainst || 0);
  const goalDifference = Number(row.goalDifference || 0);
  const points = Number(row.points || 0);

  const diffText = goalDifference > 0
    ? `+${goalDifference}`
    : `${goalDifference}`;

  const diffClass = goalDifference > 0
    ? "text-emerald-600"
    : goalDifference < 0
      ? "text-red-500"
      : "text-slate-500 dark:text-slate-400";

  return `
    <div class="grid grid-cols-[2.4rem_minmax(10rem,1fr)_2.2rem_2.2rem_2.2rem_2.2rem_2.6rem_2.8rem] items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-3 py-3 last:border-b-0">

      <div class="flex justify-center">
        <span class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${getPositionStyle(position)}">
          ${position || "-"}
        </span>
      </div>

      <div class="flex min-w-0 items-center gap-3">
        ${buildTeamLogo(row)}

        <div class="min-w-0">
          <p class="truncate text-sm font-black text-slate-950 dark:text-white">
            ${escapeHtml(row.teamName || "Equipo")}
          </p>
          <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            ${position === 1 ? "Puntero" : "Equipo"}
          </p>
        </div>
      </div>

      <div class="text-center text-sm font-black text-slate-700 dark:text-slate-200">${played}</div>
      <div class="text-center text-sm font-black text-emerald-600">${won}</div>
      <div class="text-center text-sm font-black text-slate-500 dark:text-slate-400">${drawn}</div>
      <div class="text-center text-sm font-black text-red-500">${lost}</div>

      <div class="text-center text-sm font-black ${diffClass}">
        ${escapeHtml(diffText)}
      </div>

      <div class="flex justify-end">
        <span class="rounded-full bg-slate-950 dark:bg-slate-100 px-3 py-1.5 text-sm font-black text-white dark:text-slate-950 shadow-md">
          ${points}
        </span>
      </div>

      <div class="col-span-full ml-[3.2rem] flex gap-2 text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500 sm:hidden">
        <span>GF ${goalsFor}</span>
        <span>GC ${goalsAgainst}</span>
        <span>DG ${escapeHtml(diffText)}</span>
      </div>

    </div>
  `;
}

function buildGroup(group, index, totalGroups) {
  const title = totalGroups > 1
    ? group.name
    : "Tabla de posiciones";

  return `
    <section class="overflow-hidden rounded-[1.6rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">

      <div class="relative overflow-hidden bg-slate-950 px-4 py-5 text-white">

        <div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl"></div>
        <div class="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-yellow-300/10 blur-2xl"></div>

        <div class="relative flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-black uppercase tracking-[0.35em] text-emerald-400">
              ${totalGroups > 1 ? "Grupo" : "Competencia"}
            </p>

            <h3 class="mt-1 text-xl font-black tracking-tight text-white">
              ${escapeHtml(title)}
            </h3>

            <p class="mt-1 text-sm font-semibold text-slate-300 dark:text-slate-400">
              ${group.rows.length} equipos peleando arriba
            </p>
          </div>

<div class="flex items-center gap-2">
  <button
    type="button"
    id="standingsHelpBtn"
    class="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-black text-white shadow-lg backdrop-blur transition active:scale-95"
  >
    ?
  </button>

  <div class="rounded-2xl bg-white dark:bg-slate-100 px-4 py-2 text-center text-slate-950 shadow-lg">
    <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">PTS</p>
    <p class="text-xl font-black">
      ${Number(group.rows[0]?.points || 0)}
    </p>
  </div>
</div>
        </div>

      </div>

      <div class="overflow-x-auto">
        <div class="min-w-[680px]">

          <div class="grid grid-cols-[2.4rem_minmax(10rem,1fr)_2.2rem_2.2rem_2.2rem_2.2rem_2.6rem_2.8rem] items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <div class="text-center">#</div>
            <div>Equipo</div>
            <div class="text-center">PJ</div>
            <div class="text-center">G</div>
            <div class="text-center">E</div>
            <div class="text-center">P</div>
            <div class="text-center">DG</div>
            <div class="text-right">PTS</div>
          </div>

          ${group.rows.map(buildRow).join("")}

        </div>
      </div>

    </section>
  `;
}

function buildTopSummary(rows) {
  const leader = rows[0];

  if (!leader) return "";

  return `
    <section class="rounded-[1.6rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div class="flex items-center justify-between gap-3">

        <div class="flex min-w-0 items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-emerald-400 text-xl shadow-lg">
            👑
          </div>

          <div class="min-w-0">
            <p class="text-xs font-black uppercase tracking-[0.32em] text-emerald-600">
              Puntero
            </p>
            <h3 class="truncate text-lg font-black text-slate-950 dark:text-white">
              ${escapeHtml(leader.teamName || "Equipo")}
            </h3>
          </div>
        </div>

        <div class="rounded-2xl bg-slate-950 dark:bg-slate-100 px-4 py-2 text-center text-white dark:text-slate-950 shadow-lg">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">PTS</p>
          <p class="text-2xl font-black leading-none">
            ${Number(leader.points || 0)}
          </p>
        </div>

      </div>
    </section>
  `;
}

function buildStandingsHelpModal() {
  return `
<div
  id="standingsHelpModal"
  class="fixed left-0 top-0 z-[999999] hidden h-screen w-screen"
>
  <div class="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"></div>

  <div class="relative flex h-screen w-screen items-center justify-center p-4">
    <div class="w-full max-w-sm rounded-[30px] bg-white dark:bg-slate-900 p-5 shadow-2xl">

      <div class="flex items-center justify-between">
        <h3 class="text-lg font-black text-slate-950 dark:text-white">
          Referencias
        </h3>

        <button
          id="closeStandingsHelpBtn"
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-sm font-black text-slate-700 dark:text-slate-200"
        >
          ✕
        </button>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-3">
        ${[
          ["PJ", "Partidos jugados"],
          ["G", "Ganados"],
          ["E", "Empatados"],
          ["P", "Perdidos"],
          ["GF", "Goles a favor"],
          ["GC", "Goles en contra"],
          ["DG", "Diferencia de gol"],
          ["PTS", "Puntos"]
        ].map(([abbr, label]) => `
          <div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3">
            <p class="text-xs font-black text-emerald-600">${abbr}</p>
            <p class="mt-1 text-sm font-bold text-slate-900 dark:text-white">${label}</p>
          </div>
        `).join("")}
      </div>

    </div>
  </div>
</div>
  `;
}

export function buildStandingsTab() {
  const rows = getRows();

  if (!rows.length) {
    return buildEmpty();
  }

  const sortedRows = [...rows].sort((a, b) => {
    const groupA = a.groupName || "";
    const groupB = b.groupName || "";

    if (groupA !== groupB) {
      return groupA.localeCompare(groupB);
    }

    return Number(a.position || 0) - Number(b.position || 0);
  });

  const groups = groupStandings(sortedRows);

  return `
    <div class="space-y-5 fade-up">

      ${buildTopSummary(sortedRows)}

      ${groups.map((group, index) =>
        buildGroup(group, index, groups.length)
      ).join("")}

      ${buildStandingsHelpModal()}

    </div>
  `;
}