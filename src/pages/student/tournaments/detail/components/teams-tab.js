import { state } from "../core/state.js";
import { get } from "../../../../../shared/js/api.js";
import { escapeHtml, getTeamInitials } from "../core/utils.js";

function getTeams() {
  return Array.isArray(state.teams) ? state.teams : [];
}

function getLogo(team) {
  return team.logoUrl || team.teamLogoUrl || team.logo || "";
}

function getPlayersCount(team) {
  return team.playersCount ?? team.playerCount ?? team.players?.length ?? 0;
}

function buildEmpty() {
  return `
<section class="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
  <div class="flex items-center gap-3">
    <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white">
      🛡️
    </div>

    <div>
      <div class="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-600">
        Equipos
      </div>

      <h3 class="text-lg font-black text-slate-950 dark:text-white">
        Todavía no hay equipos
      </h3>

      <p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
        Cuando se carguen equipos, van a aparecer acá.
      </p>
    </div>
  </div>
</section>
  `;
}

function buildTeamLogo(team) {
  const logo = getLogo(team);
  const name = team.name || team.teamName || "Equipo";

  if (logo) {
    return `
<div class="h-16 w-16 overflow-hidden rounded-full border border-white/40 bg-white shadow-xl ring-2 ring-white/20">
  <img
    src="${escapeHtml(logo)}"
    alt="${escapeHtml(name)}"
    class="h-full w-full object-cover"
    loading="lazy"
  />
</div>
    `;
  }

  return `
<div class="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/15 text-lg font-black text-white shadow-xl ring-2 ring-white/10 backdrop-blur">
  ${escapeHtml(getTeamInitials(name))}
</div>
  `;
}

function buildTeamCard(team, index) {
  const name = team.name || team.teamName || "Equipo";
  const shortName = team.shortName || "";
  const category = team.category || "Sin categoría";
  const playersCount = getPlayersCount(team);

  return `
<article
  data-team-id="${escapeHtml(team.id)}"
  class="team-detail-card relative cursor-pointer overflow-hidden rounded-[30px] bg-slate-950 p-4 text-white shadow-[0_14px_40px_rgba(2,6,23,0.45)] dark:shadow-[0_14px_40px_rgba(0,0,0,0.55)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(2,6,23,0.55)] dark:hover:shadow-[0_18px_50px_rgba(0,0,0,0.70)] active:scale-[0.99]"
>

  <img
    src="/public/icons/fondo-cancha.png"
    alt=""
    class="absolute inset-0 h-full w-full object-cover opacity-95"
  />

  <div class="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/10 to-slate-950/55"></div>
  <div class="hero-shine absolute inset-0 opacity-35"></div>

  <div class="relative">

    <div class="mb-4 flex items-center justify-between gap-3">
      <span class="inline-flex rounded-full border border-white/10 bg-white/12 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/70 backdrop-blur">
        Equipo
      </span>

      <span class="rounded-full border border-white/10 bg-white/12 px-3 py-1.5 text-[11px] font-black text-white/80 backdrop-blur">
        #${index + 1}
      </span>
    </div>

    <div class="flex items-center gap-4">

      <div class="shrink-0">
        ${buildTeamLogo(team)}
      </div>

      <div class="min-w-0 flex-1">
        <h3 class="truncate text-2xl font-black leading-tight text-white drop-shadow-lg">
          ${escapeHtml(name)}
        </h3>

        <div class="mt-1 flex flex-wrap items-center gap-2">
          ${
            shortName
              ? `
                <span class="rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white/80 backdrop-blur">
                  ${escapeHtml(shortName)}
                </span>
              `
              : ""
          }

          <span class="rounded-full bg-emerald-400/20 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-200 backdrop-blur">
            ${escapeHtml(category)}
          </span>
        </div>
      </div>

    </div>

    <div class="mt-5 grid grid-cols-2 gap-3">
      <div class="rounded-2xl border border-white/10 bg-white/12 p-3 text-center backdrop-blur">
        <div class="text-2xl font-black leading-none text-white">
          ${playersCount}
        </div>
        <div class="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
          Jugadores
        </div>
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/12 p-3 text-center backdrop-blur">
        <div class="text-2xl font-black leading-none text-white">
          ⚽
        </div>
        <div class="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
          Fútbol
        </div>
      </div>
    </div>

  </div>

</article>
  `;
}

export function buildTeamsTab() {
  const teams = getTeams();

  if (!teams.length) {
    return buildEmpty();
  }

  return `
<section class="space-y-5 fade-up">

  <section class="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
    <p class="text-xs font-black uppercase tracking-[0.35em] text-emerald-600">
      Equipos
    </p>

    <div class="mt-1 flex items-end justify-between gap-3">
      <div>
        <h3 class="text-xl font-black text-slate-950 dark:text-white">
          Participantes
        </h3>

        <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">
          ${teams.length} equipo${teams.length === 1 ? "" : "s"} en competencia
        </p>
      </div>

      <div class="rounded-2xl bg-slate-950 dark:bg-slate-100 px-4 py-2 text-center text-white dark:text-slate-950 shadow-lg">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Total
        </p>

        <p class="text-xl font-black leading-none">
          ${teams.length}
        </p>
      </div>
    </div>
  </section>

  <section class="space-y-4">
    ${teams.map(buildTeamCard).join("")}
  </section>

</section>
  `;
}

export function bindTeamsTab() {
  document.querySelectorAll(".team-detail-card").forEach(card => {
    card.addEventListener("click", () => {
      const teamId = card.dataset.teamId;

      if (!teamId) return;

      openTeamFrame(teamId);
    });
  });
}

async function openTeamFrame(teamId) {
  const team = getTeams().find(x => String(x.id) === String(teamId));

  if (!team) return;

  document.querySelector("#teamFrameModal")?.remove();

  document.body.insertAdjacentHTML("beforeend", buildTeamFrame(team, []));

  document.documentElement.classList.add("overflow-hidden");
  document.body.classList.add("overflow-hidden");

  bindTeamFrameClose();

  try {
    const matchInfo = findMatchByTeam(team);

    if (!matchInfo?.match) {
      console.warn("No se encontró partido para el equipo", team);
      return;
    }

    const detail = await get(
      `/api/student/${state.companySlug}/tournaments/${state.tournamentId}/matches/${matchInfo.match.id}/detail`
    );

    const players = matchInfo.side === "home"
      ? detail?.homePlayers || detail?.HomePlayers || []
      : detail?.awayPlayers || detail?.AwayPlayers || [];

    document.querySelector("#teamFrameModal")?.remove();

    document.body.insertAdjacentHTML(
      "beforeend",
      buildTeamFrame(team, players)
    );

    bindTeamFrameClose();

  } catch (error) {
    console.error("No se pudo cargar el plantel del equipo", error);
  }
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function findMatchByTeam(team) {
  const matches = Array.isArray(state.fixture) ? state.fixture : [];
  const teamId = String(team.id || team.Id || "");

  if (!teamId) return null;

  for (const match of matches) {
    const homeTeamId = String(match.homeTeamId || match.HomeTeamId || "");
    const awayTeamId = String(match.awayTeamId || match.AwayTeamId || "");

    if (homeTeamId === teamId) {
      return { match, side: "home" };
    }

    if (awayTeamId === teamId) {
      return { match, side: "away" };
    }
  }

  return null;
}

function buildTeamFrame(team, players = []) {
  const name = team.name || team.teamName || "Equipo";
  const shortName = team.shortName || "";
  const category = team.category || "Sin categoría";
  const playersCount = players.length || getPlayersCount(team);

  return `
<div
  id="teamFrameModal"
  class="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
>
  <div class="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[32px] bg-white dark:bg-slate-900 shadow-2xl">

    <button
      id="closeTeamFrameBtn"
      type="button"
      class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/80 dark:bg-slate-100 text-white dark:text-slate-950 shadow-lg"
    >
      ✕
    </button>

    <div class="relative overflow-hidden rounded-t-[32px] bg-slate-950 p-5 text-white">
      <img
        src="/public/icons/fondo-cancha.png"
        alt=""
        class="absolute inset-0 h-full w-full object-cover opacity-90"
      />

      <div class="absolute inset-0 bg-gradient-to-b from-slate-950/15 via-slate-950/30 to-slate-950/85"></div>
      <div class="hero-shine absolute inset-0 opacity-35"></div>

      <div class="relative pt-8 text-center">
        <div class="mx-auto w-fit">
          ${buildTeamLogo(team)}
        </div>

        <h2 class="mt-4 text-2xl font-black leading-tight text-white">
          ${escapeHtml(name)}
        </h2>

        <div class="mt-3 flex flex-wrap justify-center gap-2">
          ${
            shortName
              ? `
                <span class="rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white/80 backdrop-blur">
                  ${escapeHtml(shortName)}
                </span>
              `
              : ""
          }

          <span class="rounded-full bg-emerald-400/20 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-200 backdrop-blur">
            ${escapeHtml(category)}
          </span>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <div class="rounded-2xl border border-white/10 bg-white/12 p-3 text-center backdrop-blur">
            <div class="text-2xl font-black leading-none text-white">
              ${playersCount}
            </div>
            <div class="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
              Jugadores
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/12 p-3 text-center backdrop-blur">
            <div class="text-2xl font-black leading-none text-white">
              ⚽
            </div>
            <div class="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
              Fútbol
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-4 p-5">
      ${buildTeamPlayersSection(players, playersCount)}
    </div>

  </div>
</div>
  `;
}

function buildTeamPlayersSection(players, playersCount) {
  return `
<section class="rounded-[26px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
  <div class="flex items-center justify-between gap-3">
    <div class="text-[11px] font-black uppercase tracking-[0.20em] text-emerald-600">
      Plantel
    </div>

    <div class="rounded-full bg-slate-950 dark:bg-slate-100 px-3 py-1 text-[10px] font-black text-white dark:text-slate-950">
      ${playersCount}
    </div>
  </div>

  <div class="mt-4">
    ${
      players.length
        ? `
          <div class="grid grid-cols-1 gap-2">
            ${players.map(buildTeamPlayerCard).join("")}
          </div>
        `
        : `
          <div class="rounded-[22px] bg-white dark:bg-slate-900 p-4 text-sm font-bold text-slate-500 dark:text-slate-400 shadow-sm dark:shadow-none">
            Este equipo todavía no tiene jugadores visibles para mostrar.
          </div>
        `
    }
  </div>
</section>
  `;
}

function buildTeamPlayerCard(player) {
  const name =
    player.name ||
    player.playerName ||
    player.fullName ||
    player.Name ||
    player.PlayerName ||
    "Jugador";

  const photoUrl =
    player.photoUrl ||
    player.playerPhotoUrl ||
    player.PhotoUrl ||
    player.PlayerPhotoUrl ||
    "";

  return `
<div class="flex items-center gap-3 rounded-[20px] bg-white dark:bg-slate-900 p-3 shadow-sm dark:shadow-none">
  ${
    photoUrl
      ? `
        <img
          src="${escapeHtml(photoUrl)}"
          alt="${escapeHtml(name)}"
          class="h-11 w-11 rounded-full object-cover"
        />
      `
      : `
        <div class="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-500 dark:text-slate-300">
          ${escapeHtml(getTeamInitials(name))}
        </div>
      `
  }

  <div class="min-w-0 flex-1">
    <div class="truncate text-sm font-black text-slate-950 dark:text-white">
      ${escapeHtml(name)}
    </div>
    <div class="text-xs font-bold text-slate-500 dark:text-slate-400">
      Jugador
    </div>
  </div>
</div>
  `;
}

function bindTeamFrameClose() {
  document.querySelector("#closeTeamFrameBtn")?.addEventListener("click", closeTeamFrame);

  document.querySelector("#teamFrameModal")?.addEventListener("click", event => {
    if (event.target.id === "teamFrameModal") {
      closeTeamFrame();
    }
  });
}

function closeTeamFrame() {
  document.querySelector("#teamFrameModal")?.remove();

  document.documentElement.classList.remove("overflow-hidden");
  document.body.classList.remove("overflow-hidden");
}