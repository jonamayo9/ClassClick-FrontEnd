import { state } from "../core/state.js";
import { escapeHtml } from "../core/utils.js";

function getTournamentBanner() {
  return state.tournament?.bannerUrl || "";
}

function getTournamentLogo() {
  return state.tournament?.logoUrl || "";
}

function getTournamentName() {
  return state.tournament?.name || "Torneo";
}

function getTournamentDescription() {
  return state.tournament?.description || "";
}

export function buildHero() {
const banner = getTournamentBanner();
const logo = getTournamentLogo();

const useBanner =
  !!banner &&
  state.tournament?.useBannerAsHomeBackground === true;

  return `
<section class="relative overflow-hidden rounded-[34px] bg-slate-950 text-white shadow-2xl">

    ${
      useBanner
        ? `
          <img
            src="${escapeHtml(banner)}"
            alt="${escapeHtml(getTournamentName())}"
            class="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        `
        : ""
    }

<div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.35),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_30%),linear-gradient(135deg,#020617_0%,#07111f_45%,#020617_100%)]"></div>
<div class="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/35 to-slate-950/75"></div>

${
  !useBanner
    ? `
<div class="pointer-events-none absolute inset-0 z-[25] opacity-100">

  <!-- borde cancha -->
  <div class="absolute inset-6 rounded-[24px] border border-white/[0.07]"></div>

  <!-- línea media -->
  <div class="absolute left-1/2 top-6 bottom-6 w-px -translate-x-1/2 bg-white/[0.07]"></div>

  <!-- círculo central -->
  <div class="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.075]"></div>

  <!-- punto central -->
  <div class="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.10]"></div>

  <!-- área grande izquierda -->
  <div class="absolute left-6 top-1/2 h-32 w-20 -translate-y-1/2 border border-white/[0.075] border-l-0"></div>

  <!-- área chica izquierda -->
  <div class="absolute left-6 top-1/2 h-[72px] w-9 -translate-y-1/2 border border-white/[0.07] border-l-0"></div>

  <!-- área grande derecha -->
  <div class="absolute right-6 top-1/2 h-32 w-20 -translate-y-1/2 border border-white/[0.075] border-r-0"></div>

  <!-- área chica derecha -->
  <div class="absolute right-6 top-1/2 h-[72px] w-9 -translate-y-1/2 border border-white/[0.07] border-r-0"></div>

</div>
    `
    : ""
}

<div class="hero-shine absolute inset-0 z-10 opacity-35"></div>

<div class="relative z-[30] p-4 sm:p-5">
    <div class="flex items-start justify-between gap-4">

        <button
            id="backBtn"
            type="button"
            class="glass inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg text-white"
        >
            ←
        </button>

        <div class="glass rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white">
            ${escapeHtml(state.tournament?.competitionFormatLabel || "Torneo")}
        </div>
    </div>

    <div class="mt-5 flex flex-col items-center text-center">

        ${
          logo
            ? `
              <div class="h-20 w-20 overflow-hidden rounded-[24px] border border-white/15 bg-white shadow-2xl">
                  <img
                      src="${escapeHtml(logo)}"
                      alt="${escapeHtml(getTournamentName())}"
                      class="h-full w-full object-cover"
                  />
              </div>
            `
            : ""
        }

        <h1 class="mt-4 text-3xl font-black tracking-tight text-white">
            ${escapeHtml(getTournamentName())}
        </h1>

        ${
          getTournamentDescription()
            ? `
              <p class="mt-3 max-w-xl text-sm leading-7 text-white/75">
                  ${escapeHtml(getTournamentDescription())}
              </p>
            `
            : ""
        }

        <div class="mt-4 flex flex-wrap items-center justify-center gap-2">

            <div class="rounded-full bg-amber-300 px-4 py-2 text-xs font-black text-slate-950">
                🏆 En competencia
            </div>

            ${
              state.tournament?.myTeamName
                ? `
                  <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white">
                      ⚽ ${escapeHtml(state.tournament.myTeamName)}
                  </div>
                `
                : ""
            }
        </div>
    </div>
</div>
</section>
  `;
}