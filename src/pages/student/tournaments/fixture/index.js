import { get } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth } from "../../../../shared/js/session.js";
import { getMe, setMe } from "../../../../shared/js/storage.js";
import { hasModule } from "../../../../shared/js/modules.js";

let companySlug = null;
let tournamentId = null;
let tournament = null;
let fixture = [];

let loading = true;
let pageError = "";

function qs(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTournamentIdFromUrl() {
  const url = new URL(window.location.href);

  return (
    url.searchParams.get("tournamentId") ||
    url.searchParams.get("id") ||
    sessionStorage.getItem("selectedTournamentId") ||
    ""
  );
}

function getDateKey(value) {
  if (!value) return "sin-fecha";

  const date = new Date(value);
  return date.toISOString().slice(0, 10);
}

function formatJornadaDate(dateKey) {
  if (dateKey === "sin-fecha") return "Sin fecha";

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

function formatMatchHour(value) {
  if (!value) return "--:--";

  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getTeamInitials(name) {
  return String(name || "EQ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(x => x.charAt(0).toUpperCase())
    .join("") || "EQ";
}

function hasResult(match) {
  return (
    match.homeScore !== null &&
    match.homeScore !== undefined &&
    match.awayScore !== null &&
    match.awayScore !== undefined
  );
}

function getStatusLabel(status) {
  const value = String(status || "").toLowerCase();

  if (value.includes("finish") || value.includes("final")) return "Finalizado";
  if (value.includes("progress") || value.includes("curso")) return "En juego";
  if (value.includes("cancel")) return "Cancelado";
  if (value.includes("suspend")) return "Suspendido";

  return "Programado";
}

function getStatusClasses(status) {
  const label = getStatusLabel(status).toLowerCase();

  if (label === "finalizado") {
    return "border-emerald-400/45 bg-emerald-400/15 text-emerald-300";
  }

  if (label === "en juego") {
    return "border-amber-300/45 bg-amber-300/15 text-amber-200";
  }

  if (label === "cancelado" || label === "suspendido") {
    return "border-rose-400/45 bg-rose-400/15 text-rose-300";
  }

  return "border-sky-300/45 bg-sky-300/15 text-sky-200";
}

function buildStatusIcon(status) {
  const label = getStatusLabel(status).toLowerCase();

  if (label === "finalizado") return "✓";
  if (label === "programado") return "◷";
  if (label === "en juego") return "●";
  if (label === "cancelado") return "×";
  if (label === "suspendido") return "!";

  return "◷";
}

function buildLoading() {
  return `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div class="rounded-[28px] border border-white/10 bg-white/10 px-6 py-5 text-white shadow-xl">
        Cargando fixture...
      </div>
    </div>
  `;
}

function buildError() {
  return `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div class="w-full max-w-md rounded-[28px] border border-rose-400/30 bg-white p-6 shadow-xl">
        <div class="text-lg font-black text-slate-950">
          No se pudo cargar el fixture
        </div>

        <div class="mt-2 text-sm text-slate-500">
          ${escapeHtml(pageError || "Ocurrió un error inesperado.")}
        </div>
      </div>
    </div>
  `;
}

function buildTeamLogo(url, name) {
  if (!url) {
    return `
      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/10 text-[9px] font-black text-white shadow">
        ${escapeHtml(getTeamInitials(name))}
      </div>
    `;
  }

  return `
    <div class="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/45 bg-white shadow">
      <img
        src="${escapeHtml(url)}"
        alt="${escapeHtml(name || "Equipo")}"
        class="h-full w-full object-cover"
      />
    </div>
  `;
}

function buildMatchRow(match) {
  const result = hasResult(match);
  const statusLabel = getStatusLabel(match.status);

  return `
<article class="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65 px-3 py-2.5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/35">

  <div
    class="pointer-events-none absolute inset-0 opacity-35"
    style="
      background-image:
        linear-gradient(to bottom, rgba(2,6,23,.55), rgba(2,6,23,.45)),
        url('/public/assets/icons/fondo-cancha1.png');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    "
  ></div>

  <div class="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-transparent to-amber-300/10"></div>

  <div class="pointer-events-none absolute -left-24 top-0 h-full w-16 -skew-x-12 bg-white/15 opacity-0 blur-sm transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100"></div>

      <div class="relative flex items-center justify-between gap-2">

        <div class="flex min-w-0 flex-1 items-center gap-2">
          ${buildTeamLogo(match.homeTeamLogoUrl, match.homeTeamName)}
          <span class="truncate text-[11px] font-black text-white">
            ${escapeHtml(match.homeTeamName || "Local")}
          </span>
        </div>

        <div class="flex w-[58px] shrink-0 items-center justify-center">
          ${
            result
              ? `
                <div class="flex h-8 min-w-[54px] items-center justify-center rounded-lg bg-white/95 px-2 text-[12px] font-black leading-none text-slate-950 shadow">
                  ${escapeHtml(match.homeScore)} - ${escapeHtml(match.awayScore)}
                </div>
              `
              : `
                <div class="flex h-8 min-w-[54px] items-center justify-center rounded-lg border border-white/15 bg-white/10 px-2 text-[10px] font-black leading-none text-white/90">
                  VS
                </div>
              `
          }
        </div>

        <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span class="truncate text-right text-[11px] font-black text-white">
            ${escapeHtml(match.awayTeamName || "Visitante")}
          </span>
          ${buildTeamLogo(match.awayTeamLogoUrl, match.awayTeamName)}
        </div>

      </div>

      <div class="relative mt-2 flex items-center justify-between gap-2">

        <span class="inline-flex max-w-[112px] items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${getStatusClasses(match.status)}">
          <span>${buildStatusIcon(match.status)}</span>
          <span class="truncate">${escapeHtml(statusLabel)}</span>
        </span>

        <div class="flex min-w-0 items-center justify-end gap-3 text-[9px] font-bold text-white/70">
          <span class="whitespace-nowrap text-emerald-300">◷ ${escapeHtml(formatMatchHour(match.matchDateUtc))}</span>
          <span class="min-w-0 truncate"><span class="text-rose-400">⌖</span> ${escapeHtml(match.venue || "Cancha 1")}</span>
        </div>

      </div>

    </article>
  `;
}

function buildContent() {
  const grouped = fixture.reduce((acc, match) => {
    const key = getDateKey(match.matchDateUtc);

    if (!acc[key]) acc[key] = [];
    acc[key].push(match);

    return acc;
  }, {});

  const orderedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return `
    <div class="relative min-h-screen overflow-hidden bg-slate-950 text-white">

      <style>
        @keyframes fixturePageLight {
          0% {
            transform: translateX(-140vw) rotate(-8deg);
            opacity: 0;
          }
          12% {
            opacity: .85;
          }
          45% {
            opacity: .45;
          }
          100% {
            transform: translateX(180vw) rotate(-8deg);
            opacity: 0;
          }
        }

        .fixture-page-light {
          animation: fixturePageLight 5.5s ease-in-out infinite;
        }
      </style>

      <div class="pointer-events-none fixed inset-y-0 left-[-70vw] z-20 w-[70vw] fixture-page-light">
        <div class="h-full w-full bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent blur-2xl"></div>
      </div>

      <main class="relative z-30 mx-auto min-h-screen w-full max-w-5xl overflow-hidden">

        <section class="relative min-h-screen px-4 py-5 pb-12">

          <div class="relative space-y-6">

            <header class="grid grid-cols-[44px_1fr_44px] items-center gap-4">
              <button
                id="backBtn"
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl font-black text-white shadow-lg backdrop-blur"
              >
                ←
              </button>

              <div class="text-center">
                <h1 class="text-xl font-black leading-tight text-white">
                  ${escapeHtml(tournament?.name || "Fixture")}
                </h1>
                <div class="text-xs font-semibold text-white/60">
                  Fixture completo
                </div>
              </div>

              <div class="h-11 w-11"></div>
            </header>

            ${
              !fixture.length
                ? `
                  <div class="rounded-[28px] border border-white/10 bg-white/10 p-5 text-sm text-white/70 backdrop-blur">
                    Todavía no hay partidos para mostrar.
                  </div>
                `
                : `
                  <section class="space-y-5">
                    ${orderedKeys.map((dateKey, index) => `
                      <section class="space-y-2.5">

                        <div class="flex items-end justify-between gap-3 px-1">
                          <div class="min-w-0">
                            <div class="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-400">
                              Jornada ${index + 1}
                              <span class="ml-1 text-[9px] tracking-normal text-white/55">
                                · ${escapeHtml(formatJornadaDate(dateKey))}
                              </span>
                            </div>
                          </div>

                          <div class="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">
                            ${grouped[dateKey].length} partido${grouped[dateKey].length === 1 ? "" : "s"}
                          </div>
                        </div>

                        <div class="space-y-2">
                          ${grouped[dateKey]
                            .sort((a, b) => new Date(a.matchDateUtc) - new Date(b.matchDateUtc))
                            .map(buildMatchRow)
                            .join("")}
                        </div>

                      </section>
                    `).join("")}
                  </section>
                `
            }

          </div>

        </section>

      </main>
    </div>
  `;
}

function render() {
  if (loading) return buildLoading();
  if (pageError) return buildError();

  return buildContent();
}

function rerender() {
  const app = qs("#app");
  if (!app) return;

  app.innerHTML = render();
  bindEvents();
}

function bindEvents() {
  qs("#backBtn")?.addEventListener("click", () => {
    window.history.back();
  });
}

async function loadPage() {
  const [detail, fixtureResult] = await Promise.all([
    get(`/api/student/${companySlug}/tournaments/${tournamentId}`),
    get(`/api/student/${companySlug}/tournaments/${tournamentId}/fixture`)
  ]);

  tournament = detail;

  fixture = Array.isArray(fixtureResult)
    ? fixtureResult
    : [];
}

async function init() {
  try {
    await loadConfig();

    const session = requireAuth();

    if (!session) {
      return;
    }

    companySlug = session.activeCompanySlug;
    tournamentId = getTournamentIdFromUrl();

    if (!tournamentId) {
      throw new Error("No se encontró el torneo.");
    }

    let me = getMe();

    if (!me) {
      me = await get("/api/admin/me");
      setMe(me);
    }

    const company =
      (me.companies || []).find(x => x.companySlug === companySlug) || null;

    if (!company) {
      throw new Error("No se encontró la empresa.");
    }

    if (!hasModule(company, "tournaments")) {
      throw new Error("El módulo torneos no está habilitado.");
    }

    await loadPage();
  } catch (error) {
    pageError = error?.message || "No se pudo cargar el fixture.";
  } finally {
    loading = false;
    rerender();
  }
}

init();