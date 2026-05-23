import { state } from "../core/state.js";
import { get } from "../../../../../shared/js/api.js";

import {
  escapeHtml,
  getTeamInitials
} from "../core/utils.js";

function buildEmptyCard(text) {
  return `
<div class="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
  <div class="text-sm text-slate-500 dark:text-slate-400">
    ${escapeHtml(text)}
  </div>
</div>
  `;
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

function formatDateShort(dateKey) {
  if (dateKey === "sin-fecha") return "Sin fecha";

  const [, month, day] = dateKey.split("-");
  return `${day}-${month}`;
}

function formatMatchHour(value) {
  if (!value) return "--:--";

  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function isToday(value) {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return date.toDateString() === now.toDateString();
}

function isFinished(match) {
  return String(match.status || "").toLowerCase().includes("final") ||
    (
      match.homeScore !== null &&
      match.homeScore !== undefined &&
      match.awayScore !== null &&
      match.awayScore !== undefined
    );
}

function getFilteredFixture() {
  const now = new Date();

  let items = [...state.fixture];

  const search = String(state.fixtureSearch || "").trim().toLowerCase();

if (search) {
  items = items.filter(x =>
    String(x.homeTeamName || "").toLowerCase().includes(search) ||
    String(x.awayTeamName || "").toLowerCase().includes(search) ||
    String(x.venue || "").toLowerCase().includes(search)
  );
}

  if (state.fixtureFilter === "today") {
    items = items.filter(x => isToday(x.matchDateUtc));
  }
  

  if (state.fixtureFilter === "upcoming") {
    items = items.filter(x =>
      x.matchDateUtc &&
      new Date(x.matchDateUtc) >= now &&
      !isFinished(x)
    );
  }

  if (state.fixtureFilter === "past") {
    items = items.filter(x =>
      x.matchDateUtc &&
      new Date(x.matchDateUtc) < now
    );
  }

  if (state.fixtureFilter === "played") {
    items = items.filter(x => isFinished(x));
  }

  if (state.fixtureDateKey && state.fixtureDateKey !== "all") {
    items = items.filter(x => getDateKey(x.matchDateUtc) === state.fixtureDateKey);
  }

  return items.sort((a, b) => new Date(a.matchDateUtc) - new Date(b.matchDateUtc));
}

function getAvailableDates(items) {
  return [...new Set(
    items
      .map(x => getDateKey(x.matchDateUtc))
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}

function buildTeamLogo(url, name) {
  if (!url) {
    return `
      <div class="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10 text-[10px] font-black text-white shadow-lg">
        ${escapeHtml(getTeamInitials(name))}
      </div>
    `;
  }

  return `
    <div class="h-11 w-11 overflow-hidden rounded-full border border-white/40 bg-white dark:bg-slate-900 shadow-lg ring-1 ring-white/10">
      <img
        src="${escapeHtml(url)}"
        alt="${escapeHtml(name || "Equipo")}"
        class="h-full w-full object-cover"
      />
    </div>
  `;
}

function buildFixtureRow(match) {
  const hasResult =
    match.homeScore !== null &&
    match.homeScore !== undefined &&
    match.awayScore !== null &&
    match.awayScore !== undefined;

  const statusText = escapeHtml(match.status || "Programado");

  return `
<article
  data-match-id="${escapeHtml(match.id)}"
  class="fixture-match-card relative cursor-pointer overflow-hidden rounded-[26px] bg-slate-950 p-4 text-white shadow-[0_14px_40px_rgba(2,6,23,0.45)] transition active:scale-[0.99]"
>

  <img
    src="/public/icons/fondo-cancha.png"
    alt=""
    class="absolute inset-0 h-full w-full object-cover opacity-95"
  />

  <div class="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/10 to-slate-950/45"></div>
  <div class="hero-shine absolute inset-0 opacity-35"></div>

  <div class="relative">

    <div class="mb-3">
      <span class="inline-flex rounded-full border border-white/10 bg-white/12 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/70 backdrop-blur">
        ${statusText}
      </span>
    </div>

    <div class="grid grid-cols-[1fr_58px_1fr] items-center gap-3">

      <div class="min-w-0 text-center">
        <div class="mx-auto w-fit">
          ${buildTeamLogo(match.homeTeamLogoUrl, match.homeTeamName)}
        </div>

        <div class="mt-3 truncate text-lg font-black leading-5 text-white drop-shadow-lg">
          ${escapeHtml(match.homeTeamName || "Local")}
        </div>
      </div>

      <div class="flex items-center justify-center">
        ${
          hasResult
            ? `
              <div class="flex h-[56px] w-[42px] items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-center text-lg font-black leading-none text-slate-950 dark:text-white shadow-lg">
                ${escapeHtml(match.homeScore)}-${escapeHtml(match.awayScore)}
              </div>
            `
            : `
             <div class="flex h-9 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-[10px] font-black tracking-[0.1em] text-white/85 shadow-[0_0_12px_rgba(255,255,255,0.08)] backdrop-blur">
                VS
              </div>
            `
        }
      </div>

      <div class="min-w-0 text-center">
        <div class="mx-auto w-fit">
          ${buildTeamLogo(match.awayTeamLogoUrl, match.awayTeamName)}
        </div>

        <div class="mt-2 truncate text-sm font-black leading-4 text-white drop-shadow-lg">
          ${escapeHtml(match.awayTeamName || "Visitante")}
        </div>
      </div>

    </div>

    <div class="mt-4 flex justify-center">
      <div class="inline-flex items-center rounded-full border border-white/10 bg-white/12 px-4 py-2 text-[12px] font-bold text-white/90 shadow-md backdrop-blur">
        🕘 ${escapeHtml(formatMatchHour(match.matchDateUtc))}
        <span class="mx-2 text-white/40">·</span>
        📍 ${escapeHtml(match.venue || "Sede a confirmar")}
      </div>
    </div>

  </div>

</article>
  `;
}

function buildMatchFrame(match, detail = null) {
  const hasResult =
    match.homeScore !== null &&
    match.homeScore !== undefined &&
    match.awayScore !== null &&
    match.awayScore !== undefined;
  const homePlayers = detail?.homePlayers || detail?.HomePlayers || [];
  const awayPlayers = detail?.awayPlayers || detail?.AwayPlayers || [];
  const events = detail?.events || detail?.Events || [];
  const photos = detail?.photos || detail?.Photos || [];

  return `
<div
  id="matchFrameModal"
  class="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
>
  <div class="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[32px] bg-white dark:bg-slate-900 shadow-2xl">

    <button
      id="closeMatchFrameBtn"
      type="button"
      class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-950 shadow-lg"
    >
      ✕
    </button>

    <div class="relative overflow-hidden rounded-t-[32px] bg-slate-950 p-5 text-white">

      <img
        src="/public/icons/fondo-cancha.png"
        alt=""
        class="absolute inset-0 h-full w-full object-cover opacity-80"
      />

      <div class="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/30 to-slate-950/80"></div>
      <div class="hero-shine absolute inset-0 opacity-35"></div>

      <div class="relative pt-8 text-center">

        <div class="mb-4 inline-flex rounded-full border border-white/10 bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/75 backdrop-blur">
          ${escapeHtml(match.status || "Programado")}
        </div>

        <div class="grid grid-cols-[1fr_70px_1fr] items-center gap-3">

          <div class="min-w-0">
            <div class="mx-auto w-fit">
              ${buildTeamLogo(match.homeTeamLogoUrl, match.homeTeamName)}
            </div>
            <div class="mt-3 truncate text-base font-black">
              ${escapeHtml(match.homeTeamName || "Local")}
            </div>
          </div>

          <div class="flex justify-center">
            ${
              hasResult
                ? `
                  <div class="flex h-16 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 text-xl font-black text-slate-950 dark:text-white shadow-xl">
                    ${escapeHtml(match.homeScore)}-${escapeHtml(match.awayScore)}
                  </div>
                `
                : `
                  <div class="flex h-12 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-xs font-black tracking-[0.12em] text-white shadow-lg backdrop-blur">
                    VS
                  </div>
                `
            }
          </div>

          <div class="min-w-0">
            <div class="mx-auto w-fit">
              ${buildTeamLogo(match.awayTeamLogoUrl, match.awayTeamName)}
            </div>
            <div class="mt-3 truncate text-base font-black">
              ${escapeHtml(match.awayTeamName || "Visitante")}
            </div>
          </div>

        </div>

        <div class="mt-5 inline-flex items-center rounded-full border border-white/10 bg-white/12 px-4 py-2 text-xs font-bold text-white/90 backdrop-blur">
          🕘 ${escapeHtml(formatMatchHour(match.matchDateUtc))}
          <span class="mx-2 text-white/40">·</span>
          📍 ${escapeHtml(match.venue || "Sede a confirmar")}
        </div>

      </div>
    </div>

    <div class="space-y-4 p-5">
    ${buildPlayersSection(match, homePlayers, awayPlayers)}
      ${buildMatchNewsSection(match, events, photos)}
    </div>

  </div>
</div>
  `;
}

async function openMatchFrame(matchId) {
  const match = state.fixture.find(x => String(x.id) === String(matchId));

  if (!match) return;

  document.querySelector("#matchFrameModal")?.remove();

  document.body.insertAdjacentHTML("beforeend", buildMatchFrameLoading(match));

  document.documentElement.classList.add("overflow-hidden");
  document.body.classList.add("overflow-hidden");

  bindMatchFrameClose();
  bindMatchPhotosCarousel();

  try {
    const detail = await get(
      `/api/student/${state.companySlug}/tournaments/${state.tournamentId}/matches/${matchId}/detail`
    );

    document.querySelector("#matchFrameModal")?.remove();

    document.body.insertAdjacentHTML(
      "beforeend",
      buildMatchFrame(match, detail)
    );

    bindMatchFrameClose();
    bindMatchPhotosCarousel();

  } catch (error) {
    document.querySelector("#matchFrameBody")?.insertAdjacentHTML(
      "afterbegin",
      `
      <div class="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
        No se pudo cargar el detalle del partido.
      </div>
      `
    );
  }
}

function buildPlayerMiniCard(player) {
  const name = player.name || player.Name || "Jugador";
  const photoUrl = player.photoUrl || player.PhotoUrl || "";

  return `
    <div class="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-sm">
      ${
        photoUrl
          ? `
            <img
              src="${escapeHtml(photoUrl)}"
              alt="${escapeHtml(name)}"
              class="h-9 w-9 rounded-full object-cover"
            />
          `
          : `
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500 dark:text-slate-400">
              ${escapeHtml(getTeamInitials(name))}
            </div>
          `
      }

      <div class="min-w-0">
        <div class="truncate text-xs font-black text-slate-900 dark:text-white">
          ${escapeHtml(name)}
        </div>
      </div>
    </div>
  `;
}

function buildPlayersList(players) {
  if (!players.length) {
    return `
      <div class="rounded-2xl bg-white dark:bg-slate-900 p-3 text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm">
        Sin jugadores cargados.
      </div>
    `;
  }

  return players.map(buildPlayerMiniCard).join("");
}

function buildPlayersSection(match, homePlayers, awayPlayers) {
  return `
    <section class="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
      <div class="text-[11px] font-black uppercase tracking-[0.20em] text-emerald-600">
        Jugadores
      </div>

      <div class="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div class="mb-2 text-sm font-black text-slate-950 dark:text-white">
            ${escapeHtml(match.homeTeamName || "Local")}
          </div>
          <div class="space-y-2">
            ${buildPlayersList(homePlayers)}
          </div>
        </div>

        <div>
          <div class="mb-2 text-sm font-black text-slate-950 dark:text-white">
            ${escapeHtml(match.awayTeamName || "Visitante")}
          </div>
          <div class="space-y-2">
            ${buildPlayersList(awayPlayers)}
          </div>
        </div>
      </div>
    </section>
  `;
}

function getEventIcon(eventType) {
  const value = String(eventType || "").toLowerCase();

  if (value.includes("goal")) return "⚽";
  if (value.includes("yellow")) return "🟨";
  if (value.includes("red")) return "🟥";
  if (value.includes("assist")) return "🎯";
  if (value.includes("foul")) return "⚠️";
  if (value.includes("penalty")) return "🥅";
  if (value.includes("save")) return "🧤";

  return "•";
}

function buildMatchPhotosGallery(photos) {
  const validPhotos = photos
    .map(photo => photo.fileUrl || photo.FileUrl || "")
    .filter(Boolean)
    .slice(0, 6);

  if (!validPhotos.length) return "";

  return `
    <div class="mt-5">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-[11px] font-black uppercase tracking-[0.20em] text-slate-500 dark:text-slate-400">
          Fotos del partido
        </div>

        <div class="rounded-full bg-slate-950 dark:bg-slate-100 px-3 py-1 text-[10px] font-black text-white dark:text-slate-950">
          ${validPhotos.length}
        </div>
      </div>

      <div
        id="matchPhotosCarousel"
        class="relative overflow-x-auto scroll-smooth rounded-[24px] bg-slate-100 dark:bg-slate-800 shadow-sm pb-8"
        style="scrollbar-width: none;"
        data-count="${validPhotos.length}"
      >
      <div
        id="matchPhotosTrack"
        class="flex w-full snap-x snap-mandatory"
      >
          ${validPhotos.map((url, index) => `
            <div class="min-w-full snap-center h-48 shrink-0">
              <img
                src="${escapeHtml(url)}"
                alt="Foto del partido ${index + 1}"
                class="h-full w-full object-cover"
              />
            </div>
          `).join("")}
        </div>

        ${validPhotos.length > 1 ? `
          <div class="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1.5">
            ${validPhotos.map((_, index) => `
              <button
                type="button"
                data-photo-dot="${index}"
                class="match-photo-dot h-2 rounded-full transition-all ${
                  index === 0 ? "w-5 bg-white dark:bg-slate-100" : "w-2 bg-white/45 dark:bg-slate-400/40"
                }"
              ></button>
            `).join("")}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function bindMatchPhotosCarousel() {
  const carousel = document.querySelector("#matchPhotosCarousel");
  const track = document.querySelector("#matchPhotosTrack");

  if (!carousel || !track) return;

  const total = Number(carousel.dataset.count || 0);
  if (total <= 1) return;

  let currentIndex = 0;
  let intervalId = null;

  const updateDots = () => {
    document.querySelectorAll(".match-photo-dot").forEach(dot => {
      const isActive = Number(dot.dataset.photoDot) === currentIndex;

      dot.className = `match-photo-dot h-2 rounded-full transition-all ${
        isActive ? "w-5 bg-white dark:bg-slate-100" : "w-2 bg-white/45 dark:bg-slate-400/40"
      }`;
    });
  };

  const scrollToIndex = (index) => {
    currentIndex = (index + total) % total;

    carousel.scrollTo({
      left: carousel.clientWidth * currentIndex,
      behavior: "smooth"
    });

    updateDots();
  };

  const next = () => {
    scrollToIndex(currentIndex + 1);
  };

  const start = () => {
    intervalId = setInterval(next, 5000);
  };

  const stop = () => {
    if (intervalId) clearInterval(intervalId);
  };

  const restart = () => {
    stop();
    start();
  };

  carousel.addEventListener("scroll", () => {
    const index = Math.round(carousel.scrollLeft / carousel.clientWidth);

    if (index !== currentIndex) {
      currentIndex = index;
      updateDots();
    }
  });

  carousel.addEventListener("pointerdown", stop);
  carousel.addEventListener("pointerup", restart);
  carousel.addEventListener("touchstart", stop, { passive: true });
  carousel.addEventListener("touchend", restart);

  document.querySelectorAll("[data-photo-dot]").forEach(dot => {
    dot.addEventListener("click", () => {
      scrollToIndex(Number(dot.dataset.photoDot || 0));
      restart();
    });
  });

  start();
}

function buildMatchNewsSection(match, events, photos) {
  const hasResult =
    match.homeScore !== null &&
    match.homeScore !== undefined &&
    match.awayScore !== null &&
    match.awayScore !== undefined;

  return `
    <section class="overflow-hidden rounded-[26px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">

      <div class="bg-slate-950 px-4 py-4 text-white">
        <div class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-400">
          ${hasResult ? "Resultado y novedades" : "Novedades"}
        </div>

        ${
          hasResult
            ? `
              <div class="mt-2 flex items-center justify-between gap-3">
                <div class="min-w-0 text-sm font-black">
                  ${escapeHtml(match.homeTeamName || "Local")}
                </div>

                <div class="rounded-2xl bg-white dark:bg-slate-900 px-4 py-2 text-xl font-black text-slate-950 dark:text-white shadow-lg">
                  ${escapeHtml(match.homeScore)} - ${escapeHtml(match.awayScore)}
                </div>

                <div class="min-w-0 text-right text-sm font-black">
                  ${escapeHtml(match.awayTeamName || "Visitante")}
                </div>
              </div>
            `
            : `
              <div class="mt-2 text-sm font-bold text-white/75">
                Partido programado. Todavía no hay resultado cargado.
              </div>
            `
        }
      </div>

      <div class="p-4">
        <div class="space-y-2">
          ${
            events.length
              ? events.map(event => {
                  const type = event.eventType || event.EventType || "";
                  const label = event.eventLabel || event.EventLabel || type || "Novedad";
                  const playerName = event.playerName || event.PlayerName || "Jugador no informado";
                  const teamName = event.teamName || event.TeamName || "";
                  const minute = event.minute ?? event.Minute ?? "-";
                  const notes = event.notes || event.Notes || "";

                  return `
                    <div class="flex items-center gap-3 rounded-[20px] bg-slate-50 dark:bg-slate-800 p-3 shadow-sm">
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 text-lg shadow-sm">
                        ${getEventIcon(type)}
                      </div>

                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-black text-slate-950 dark:text-white">
                          ${escapeHtml(minute)}' · ${escapeHtml(label)}
                        </div>

                        <div class="mt-0.5 truncate text-xs font-bold text-slate-500 dark:text-slate-400">
                          ${escapeHtml(playerName)}
                          ${teamName ? ` · ${escapeHtml(teamName)}` : ""}
                        </div>

                        ${
                          notes
                            ? `<div class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">${escapeHtml(notes)}</div>`
                            : ""
                        }
                      </div>
                    </div>
                  `;
                }).join("")
              : `
                <div class="rounded-[20px] bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                  Sin novedades cargadas todavía.
                </div>
              `
          }
        </div>

        ${buildMatchPhotosGallery(photos)}
      </div>
    </section>
  `;
}

function buildMatchFrameLoading(match) {
  return `
<div
  id="matchFrameModal"
  class="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
>
  <div class="w-full max-w-md rounded-[32px] bg-white dark:bg-slate-900 p-5 shadow-2xl">
    <div class="flex items-center justify-between">
      <div>
        <div class="text-[11px] font-black uppercase tracking-[0.20em] text-emerald-600">
          Cargando partido
        </div>
        <div class="mt-1 text-lg font-black text-slate-950 dark:text-white">
          ${escapeHtml(match.homeTeamName)} vs ${escapeHtml(match.awayTeamName)}
        </div>
      </div>

      <button
        id="closeMatchFrameBtn"
        type="button"
        class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-950 shadow-lg"
      >
        ✕
      </button>
    </div>

    <div class="mt-5 space-y-3">
      <div class="h-20 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800"></div>
      <div class="h-20 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800"></div>
      <div class="h-20 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800"></div>
    </div>
  </div>
</div>
  `;
}

function bindMatchFrameClose() {
  document.querySelector("#closeMatchFrameBtn")?.addEventListener("click", closeMatchFrame);

  document.querySelector("#matchFrameModal")?.addEventListener("click", event => {
    if (event.target.id === "matchFrameModal") {
      closeMatchFrame();
    }
  });
}

function closeMatchFrame() {
  document.querySelector("#matchFrameModal")?.remove();

  document.documentElement.classList.remove("overflow-hidden");
  document.body.classList.remove("overflow-hidden");
}

function buildFilterLabel() {
  if (state.fixtureFilter === "today") return "Partidos de hoy";
  if (state.fixtureFilter === "upcoming") return "Próximos partidos";
  if (state.fixtureFilter === "past") return "Partidos anteriores";
  if (state.fixtureFilter === "played") return "Partidos jugados";
  return "Todos los partidos";
}

function buildFixtureControls(allItems, filteredItems) {
  const dates = getAvailableDates(allItems);

  const filters = [
    { key: "all", label: "Todos" },
    { key: "today", label: "Hoy" },
    { key: "upcoming", label: "Próximos" },
    { key: "past", label: "Anteriores" },
    { key: "played", label: "Jugados" }
  ];

  return `
<section class="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">

  <div class="flex items-center justify-between gap-3">
    <div>
      <div class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">
        Fixture
      </div>

      <div class="text-sm font-bold text-slate-500 dark:text-slate-400">
        ${filteredItems.length} partido${filteredItems.length === 1 ? "" : "s"} encontrados
      </div>
    </div>

    <button
      id="fullFixtureBtn"
      type="button"
      class="shrink-0 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white shadow-lg"
    >
      Fixture completo
    </button>
  </div>

  <div class="mt-4">
    <input
      id="fixtureSearchInput"
      type="search"
      value="${escapeHtml(state.fixtureSearch || "")}"
      placeholder="Buscar equipo o cancha..."
      class="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
    />
  </div>

  <div class="mt-3 hide-scrollbar flex gap-2 overflow-x-auto pb-1">
    ${filters.map(filter => `
      <button
        type="button"
        data-fixture-filter="${escapeHtml(filter.key)}"
        class="fixture-filter-btn shrink-0 rounded-full px-4 py-2 text-xs font-black shadow-sm transition ${
          state.fixtureFilter === filter.key
            ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-slate-950"
            : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
        }"
      >
        ${escapeHtml(filter.label)}
      </button>
    `).join("")}
  </div>

  <div class="mt-3 hide-scrollbar flex gap-2 overflow-x-auto pb-1">

    <button
      type="button"
      data-fixture-date="all"
      class="fixture-date-btn shrink-0 rounded-full px-4 py-2 text-xs font-black shadow-sm transition ${
        state.fixtureDateKey === "all"
          ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
          : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
      }"
    >
      Todas las fechas
    </button>

    ${dates.map(dateKey => `
      <button
        type="button"
        data-fixture-date="${escapeHtml(dateKey)}"
        class="fixture-date-btn shrink-0 rounded-full px-4 py-2 text-xs font-black shadow-sm transition ${
          state.fixtureDateKey === dateKey
            ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
            : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
        }"
      >
        ${escapeHtml(formatDateShort(dateKey))}
      </button>
    `).join("")}

  </div>

</section>
  `;
}

function buildPagination(totalPages) {
  if (totalPages <= 1) return "";

  return `
<div class="flex items-center justify-center gap-2 pt-1">

  <button
    type="button"
    data-fixture-page="${state.fixturePage - 1}"
    class="fixture-page-btn flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-lg font-black text-slate-800 shadow-sm disabled:opacity-40"
    ${state.fixturePage <= 1 ? "disabled" : ""}
  >
    ‹
  </button>

  ${Array.from({ length: totalPages }).map((_, index) => {
    const page = index + 1;

    return `
      <button
        type="button"
        data-fixture-page="${page}"
        class="fixture-page-btn flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black shadow-sm ${
          state.fixturePage === page
            ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-slate-950"
            : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
        }"
      >
        ${page}
      </button>
    `;
  }).join("")}

  <button
    type="button"
    data-fixture-page="${state.fixturePage + 1}"
    class="fixture-page-btn flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-lg font-black text-slate-800 shadow-sm disabled:opacity-40"
    ${state.fixturePage >= totalPages ? "disabled" : ""}
  >
    ›
  </button>

</div>
  `;
}

export function buildFixtureTab() {
  if (!state.fixture.length) {
    return buildEmptyCard("Todavía no hay partidos para mostrar.");
  }

  const filteredItems = getFilteredFixture();

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / state.fixturePageSize)
  );

  if (state.fixturePage > totalPages) {
    state.fixturePage = totalPages;
  }

  const start = (state.fixturePage - 1) * state.fixturePageSize;
  const visibleItems = filteredItems.slice(start, start + state.fixturePageSize);

  const grouped = visibleItems.reduce((acc, match) => {
    const key = getDateKey(match.matchDateUtc);

    if (!acc[key]) acc[key] = [];
    acc[key].push(match);

    return acc;
  }, {});

  const orderedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return `
<section class="space-y-5">

  ${buildFixtureControls(state.fixture, filteredItems)}

  ${
    !visibleItems.length
      ? buildEmptyCard("No hay partidos para este filtro.")
      : orderedKeys.map((dateKey, index) => `
        <section class="overflow-hidden rounded-[34px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">

          <div class="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-[12px] font-black uppercase tracking-[0.28em] text-emerald-600">
                  Jornada ${index + 1}
                </div>

                <h3 class="mt-1 text-lg font-black leading-tight tracking-tight text-slate-950 dark:text-white">
                  ${escapeHtml(formatJornadaDate(dateKey))}
                </h3>
              </div>

              <div class="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-lg">
                ${grouped[dateKey].length} partido${grouped[dateKey].length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <div class="space-y-4 p-5">
            ${grouped[dateKey]
              .sort((a, b) => new Date(a.matchDateUtc) - new Date(b.matchDateUtc))
              .map(buildFixtureRow)
              .join("")}
          </div>

        </section>
      `).join("")
  }

  ${buildPagination(totalPages)}

</section>
  `;
}

export function bindFixtureTab(buildActiveTab) {
  const renderFixture = () => {
    const content = document.querySelector("#tabContent");

    if (content) {
      content.innerHTML = buildActiveTab();
      bindFixtureTab(buildActiveTab);
    }
  };

let searchTimer = null;

document.querySelector("#fixtureSearchInput")?.addEventListener("input", event => {
  state.fixtureSearch = event.target.value;
  state.fixturePage = 1;

  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    renderFixture();

    const input = document.querySelector("#fixtureSearchInput");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, 350);
});

  document.querySelectorAll(".fixture-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.fixtureFilter = btn.dataset.fixtureFilter;
      state.fixturePage = 1;
      renderFixture();
    });
  });

  document.querySelectorAll(".fixture-date-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.fixtureDateKey = btn.dataset.fixtureDate;
      state.fixturePage = 1;
      renderFixture();
    });
  });

  document.querySelector("#fullFixtureBtn")?.addEventListener("click", () => {
    window.location.href =
      `/src/pages/student/tournaments/fixture/index.html?tournamentId=${encodeURIComponent(state.tournamentId)}`;
  });

  document.querySelectorAll(".fixture-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = Number(btn.dataset.fixturePage);

      if (!Number.isFinite(page) || page <= 0) return;

      state.fixturePage = page;
      renderFixture();
    });
  });

  document.querySelectorAll(".fixture-match-card").forEach(card => {
  card.addEventListener("click", () => {
    const matchId = card.dataset.matchId;

    if (!matchId) return;

    openMatchFrame(matchId);
  });
});
}