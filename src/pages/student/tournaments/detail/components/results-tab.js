import { state } from "../core/state.js";
import { get } from "../../../../../shared/js/api.js";
import { escapeHtml } from "../core/utils.js";

function getMatches() {
  return Array.isArray(state.fixture) ? state.fixture : [];
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

function isFinished(match) {
  const status = normalizeStatus(match.status);

  return (
    status === "finalizado" ||
    status === "finished" ||
    match.homeScore !== null &&
    match.homeScore !== undefined &&
    match.awayScore !== null &&
    match.awayScore !== undefined
  );
}

function isLive(match) {
  const status = normalizeStatus(match.status);

  return status === "en vivo" || status === "inprogress";
}

function getScore(value) {
  if (value === null || value === undefined) return "-";
  return value;
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

function buildTeamLogo(url, name) {
  if (url) {
    return `
      <img
        src="${escapeHtml(url)}"
        alt="${escapeHtml(name)}"
        class="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-lg"
        loading="lazy"
      />
    `;
  }

  return `
    <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950 ring-2 ring-white shadow-lg">
      ${escapeHtml(getTeamInitials(name))}
    </div>
  `;
}

function formatDate(value) {
  if (!value) return "Fecha pendiente";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha pendiente";
  }

  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit"
  });
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getResultLabel(match) {
  if (isLive(match)) {
    return {
      text: "En vivo",
      className: "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,.45)]"
    };
  }

  if (isFinished(match)) {
    return {
      text: "Finalizado",
      className: "bg-white/10 text-white ring-1 ring-white/15"
    };
  }

  return {
    text: "Pendiente",
    className: "bg-yellow-300 text-slate-950"
  };
}

function buildEmpty() {
  return `
    <section class="rounded-[1.6rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white">
          ⚽
        </div>

        <div>
          <p class="text-xs font-black uppercase tracking-[0.28em] text-emerald-600">
            Resultados
          </p>
          <h3 class="text-lg font-black text-slate-950 dark:text-white">
            Todavía no hay resultados
          </h3>
          <p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Cuando finalicen partidos, los marcadores van a aparecer acá.
          </p>
        </div>
      </div>
    </section>
  `;
}

function buildResultCard(match) {
  const homeName = match.homeTeamName || "Local";
  const awayName = match.awayTeamName || "Visitante";

  const homeScore = getScore(match.homeScore);
  const awayScore = getScore(match.awayScore);

  const label = getResultLabel(match);

  const homeWon =
    isFinished(match) &&
    Number(match.homeScore) > Number(match.awayScore);

  const awayWon =
    isFinished(match) &&
    Number(match.awayScore) > Number(match.homeScore);

  return `
    <article
  data-result-match-id="${escapeHtml(match.id)}"
  class="result-match-card relative cursor-pointer overflow-hidden rounded-[26px] bg-slate-950 p-4 text-white shadow-[0_14px_40px_rgba(2,6,23,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(2,6,23,0.55)] active:scale-[0.99]"
>

      <img
        src="/public/icons/fondo-cancha.png"
        alt=""
        class="absolute inset-0 h-full w-full object-cover opacity-95"
      />

      <div class="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/10 to-slate-950/45"></div>
      <div class="hero-shine absolute inset-0 opacity-35"></div>

      <div class="relative">

        <div class="mb-3 flex items-center justify-between gap-3">
          <span class="inline-flex rounded-full border border-white/10 bg-white/12 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/70 backdrop-blur">
            ${escapeHtml(label.text)}
          </span>

          <div class="text-right">
            <div class="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
              Jornada ${escapeHtml(match.roundNumber || "-")}
            </div>

            <div class="text-sm font-black leading-tight text-white drop-shadow-lg">
              ${escapeHtml(formatDate(match.matchDateUtc))}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-[1fr_58px_1fr] items-center gap-3">

          <div class="min-w-0 text-center">
            <div class="mx-auto w-fit">
              ${buildTeamLogo(match.homeTeamLogoUrl, homeName)}
            </div>

            <div class="mt-3 truncate text-lg font-black leading-5 ${homeWon ? "text-yellow-300" : "text-white"} drop-shadow-lg">
              ${escapeHtml(homeName)}
            </div>
          </div>

          <div class="flex items-center justify-center">
            <div class="flex h-[56px] w-[54px] items-center justify-center rounded-xl bg-white text-center text-lg font-black leading-none text-slate-950 shadow-lg">
              <span class="${homeWon ? "text-emerald-600" : "text-slate-950"}">
                ${escapeHtml(homeScore)}
              </span>

              <span class="mx-1 text-slate-400">-</span>

              <span class="${awayWon ? "text-emerald-600" : "text-slate-950"}">
                ${escapeHtml(awayScore)}
              </span>
            </div>
          </div>

          <div class="min-w-0 text-center">
            <div class="mx-auto w-fit">
              ${buildTeamLogo(match.awayTeamLogoUrl, awayName)}
            </div>

            <div class="mt-3 truncate text-lg font-black leading-5 ${awayWon ? "text-yellow-300" : "text-white"} drop-shadow-lg">
              ${escapeHtml(awayName)}
            </div>
          </div>

        </div>

        <div class="mt-4 flex justify-center">
          <div class="inline-flex items-center rounded-full border border-white/10 bg-white/12 px-4 py-2 text-[12px] font-bold text-white/90 shadow-md backdrop-blur">
            🕘 ${escapeHtml(formatTime(match.matchDateUtc))}
            <span class="mx-2 text-white/40">·</span>
            📍 ${escapeHtml(match.venue || "Sede a confirmar")}
          </div>
        </div>

      </div>

    </article>
  `;
}

export function buildResultsTab() {
  const matches = getMatches();

  const results = matches
    .filter(isFinished)
    .sort((a, b) => new Date(b.matchDateUtc || 0) - new Date(a.matchDateUtc || 0));

  if (!results.length) {
    return buildEmpty();
  }

  return `
    <div class="space-y-5 fade-up">

      <section class="rounded-[1.6rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <p class="text-xs font-black uppercase tracking-[0.35em] text-emerald-600">
          Resultados
        </p>

        <div class="mt-1 flex items-end justify-between gap-3">
          <div>
            <h3 class="text-xl font-black text-slate-950 dark:text-white">
              Últimos marcadores
            </h3>
            <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">
              ${results.length} partidos con resultado cargado
            </p>
          </div>

          <div class="rounded-2xl bg-slate-950 dark:bg-slate-100 px-4 py-2 text-center text-white dark:text-slate-950 shadow-lg">
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Total
            </p>
            <p class="text-xl font-black leading-none">
              ${results.length}
            </p>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        ${results.map(buildResultCard).join("")}
      </section>

    </div>
  `;
}

export function bindResultsTab() {
  document.querySelectorAll(".result-match-card").forEach(card => {
    card.addEventListener("click", () => {
      const matchId = card.dataset.resultMatchId;

      if (!matchId) return;

      openResultMatchFrame(matchId);
    });
  });
}

async function openResultMatchFrame(matchId) {
  const match = getMatches().find(x => String(x.id) === String(matchId));

  if (!match) return;

  document.querySelector("#resultMatchFrameModal")?.remove();

  document.body.insertAdjacentHTML("beforeend", buildResultMatchFrameLoading(match));

  document.documentElement.classList.add("overflow-hidden");
  document.body.classList.add("overflow-hidden");

  bindResultMatchFrameClose();

  try {
    const detail = await get(
      `/api/student/${state.companySlug}/tournaments/${state.tournamentId}/matches/${matchId}/detail`
    );

    document.querySelector("#resultMatchFrameModal")?.remove();

    document.body.insertAdjacentHTML(
      "beforeend",
      buildResultMatchFrame(match, detail)
    );

    bindResultMatchFrameClose();
    bindResultMatchPhotoGalleries();

  } catch (error) {
    document.querySelector("#resultMatchFrameModal")?.remove();

    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div
        id="resultMatchFrameModal"
        class="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
      >
        <div class="w-full max-w-md rounded-[28px] bg-white dark:bg-slate-900 p-5 shadow-2xl">
          <div class="text-lg font-black text-slate-950 dark:text-white">
            No se pudo cargar el detalle.
          </div>

          <button
            id="closeResultMatchFrameBtn"
            type="button"
            class="mt-4 rounded-2xl bg-slate-950 dark:bg-slate-100 px-4 py-3 text-sm font-black text-white dark:text-slate-950"
          >
            Cerrar
          </button>
        </div>
      </div>
      `
    );

    bindResultMatchFrameClose();
  }
}

function buildResultMatchFrame(match, detail = null) {
  const homePlayers = detail?.homePlayers || detail?.HomePlayers || [];
  const awayPlayers = detail?.awayPlayers || detail?.AwayPlayers || [];
  const events = detail?.events || detail?.Events || [];
  const photos = detail?.photos || detail?.Photos || [];

  return `
<div
  id="resultMatchFrameModal"
  class="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
>
  <div class="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[32px] bg-white dark:bg-slate-900 shadow-2xl">

    <button
      id="closeResultMatchFrameBtn"
      type="button"
      class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/80 dark:bg-slate-100 text-white dark:text-slate-950 shadow-lg"
    >
      ✕
    </button>

    <div class="relative overflow-hidden rounded-t-[32px] bg-slate-950 p-5 text-white">
      <img
        src="/public/icons/fondo-cancha.png"
        alt=""
        class="absolute inset-0 h-full w-full object-cover opacity-80"
      />

      <div class="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/30 to-slate-950/85"></div>
      <div class="hero-shine absolute inset-0 opacity-35"></div>

      <div class="relative pt-8">
        <div class="mb-4 text-center">
          <span class="inline-flex rounded-full border border-white/10 bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/75 backdrop-blur">
            Finalizado
          </span>
        </div>

        <div class="grid grid-cols-[1fr_82px_1fr] items-center gap-3">
          <div class="min-w-0 text-center">
            <div class="mx-auto w-fit">
              ${buildTeamLogo(match.homeTeamLogoUrl, match.homeTeamName)}
            </div>
            <div class="mt-3 truncate text-base font-black text-white">
              ${escapeHtml(match.homeTeamName || "Local")}
            </div>
          </div>

          <div class="flex justify-center">
            <div class="rounded-2xl bg-white px-4 py-3 text-xl font-black text-slate-950 shadow-xl">
              ${escapeHtml(getScore(match.homeScore))} - ${escapeHtml(getScore(match.awayScore))}
            </div>
          </div>

          <div class="min-w-0 text-center">
            <div class="mx-auto w-fit">
              ${buildTeamLogo(match.awayTeamLogoUrl, match.awayTeamName)}
            </div>
            <div class="mt-3 truncate text-base font-black text-white">
              ${escapeHtml(match.awayTeamName || "Visitante")}
            </div>
          </div>
        </div>

        <div class="mt-5 flex justify-center">
          <div class="inline-flex items-center rounded-full border border-white/10 bg-white/12 px-4 py-2 text-xs font-bold text-white/90 backdrop-blur">
            🕘 ${escapeHtml(formatTime(match.matchDateUtc))}
            <span class="mx-2 text-white/40">·</span>
            📍 ${escapeHtml(match.venue || "Sede a confirmar")}
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-4 p-5">
      ${buildResultPlayersSection(match, homePlayers, awayPlayers)}
      ${buildResultNewsSection(match, events, photos)}
    </div>

  </div>
</div>
  `;
}

function buildResultPlayerCard(player) {
  const name = player.name || player.Name || "Jugador";
  const photoUrl = player.photoUrl || player.PhotoUrl || "";

  return `
    <div class="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-sm">
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
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-black text-slate-500 dark:text-slate-300">
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

function buildResultPlayersList(players) {
  if (!players.length) {
    return `
      <div class="rounded-2xl bg-white dark:bg-slate-800 p-3 text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm">
        Sin jugadores cargados.
      </div>
    `;
  }

  return players.map(buildResultPlayerCard).join("");
}

function buildResultPlayersSection(match, homePlayers, awayPlayers) {
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
            ${buildResultPlayersList(homePlayers)}
          </div>
        </div>

        <div>
          <div class="mb-2 text-sm font-black text-slate-950 dark:text-white">
            ${escapeHtml(match.awayTeamName || "Visitante")}
          </div>
          <div class="space-y-2">
            ${buildResultPlayersList(awayPlayers)}
          </div>
        </div>
      </div>
    </section>
  `;
}

function getResultEventIcon(eventType) {
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

function buildResultNewsSection(match, events, photos) {
  return `
    <section class="overflow-hidden rounded-[26px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div class="bg-slate-950 px-4 py-4 text-white">
        <div class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-400">
          Resultado y novedades
        </div>

        <div class="mt-2 flex items-center justify-between gap-3">
          <div class="min-w-0 text-sm font-black">
            ${escapeHtml(match.homeTeamName || "Local")}
          </div>

          <div class="rounded-2xl bg-white px-4 py-2 text-xl font-black text-slate-950 shadow-lg">
            ${escapeHtml(getScore(match.homeScore))} - ${escapeHtml(getScore(match.awayScore))}
          </div>

          <div class="min-w-0 text-right text-sm font-black">
            ${escapeHtml(match.awayTeamName || "Visitante")}
          </div>
        </div>
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
                        ${getResultEventIcon(type)}
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

        ${buildResultPhotosGallery(photos)}
      </div>
    </section>
  `;
}

function buildResultMatchFrameLoading(match) {
  return `
<div
  id="resultMatchFrameModal"
  class="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
>
  <div class="w-full max-w-md rounded-[32px] bg-white dark:bg-slate-900 p-5 shadow-2xl">
    <div class="flex items-center justify-between">
      <div>
        <div class="text-[11px] font-black uppercase tracking-[0.20em] text-emerald-600">
          Cargando resultado
        </div>
        <div class="mt-1 text-lg font-black text-slate-950 dark:text-white">
          ${escapeHtml(match.homeTeamName)} vs ${escapeHtml(match.awayTeamName)}
        </div>
      </div>

      <button
        id="closeResultMatchFrameBtn"
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

function bindResultMatchFrameClose() {
  document.querySelector("#closeResultMatchFrameBtn")?.addEventListener("click", closeResultMatchFrame);

  document.querySelector("#resultMatchFrameModal")?.addEventListener("click", event => {
    if (event.target.id === "resultMatchFrameModal") {
      closeResultMatchFrame();
    }
  });
}

function closeResultMatchFrame() {
  document.querySelector("#resultMatchFrameModal")?.remove();

  document.documentElement.classList.remove("overflow-hidden");
  document.body.classList.remove("overflow-hidden");
}

function buildResultPhotosGallery(photos) {
  const validPhotos = photos
    .map(photo => photo.fileUrl || photo.FileUrl || "")
    .filter(Boolean)
    .slice(0, 8);

  if (!validPhotos.length) return "";

  const galleryId = `resultPhotosGallery-${Date.now()}`;

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
        id="${galleryId}"
        data-result-gallery="true"
        class="relative overflow-hidden rounded-[26px] bg-slate-100 dark:bg-slate-800 shadow-sm"
      >
        <div
          class="result-gallery-track flex transition-transform duration-700 ease-out"
          style="transform: translateX(0%);"
        >
          ${validPhotos.map(url => `
            <div class="h-52 min-w-full">
              <img
                src="${escapeHtml(url)}"
                alt="Foto del partido"
                class="h-full w-full object-cover"
              />
            </div>
          `).join("")}
        </div>

        ${
          validPhotos.length > 1
            ? `
              <div class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                ${validPhotos.map((_, index) => `
                  <span
                    class="result-gallery-dot h-1.5 rounded-full transition-all ${index === 0 ? "w-5 bg-white dark:bg-slate-100" : "w-1.5 bg-white/60 dark:bg-slate-400/40"}"
                  ></span>
                `).join("")}
              </div>
            `
            : ""
        }
      </div>
    </div>
  `;
}

function bindResultMatchPhotoGalleries() {
  document.querySelectorAll("[data-result-gallery='true']").forEach(gallery => {
    const track = gallery.querySelector(".result-gallery-track");
    const dots = gallery.querySelectorAll(".result-gallery-dot");
    const slides = track?.children || [];

    if (!track || slides.length <= 1) return;

    let currentIndex = 0;

    setInterval(() => {
      if (!document.body.contains(gallery)) return;

      currentIndex = (currentIndex + 1) % slides.length;
      track.style.transform = `translateX(-${currentIndex * 100}%)`;

      dots.forEach((dot, index) => {
        dot.className =
          index === currentIndex
            ? "result-gallery-dot h-1.5 w-5 rounded-full bg-white dark:bg-slate-100 transition-all"
            : "result-gallery-dot h-1.5 w-1.5 rounded-full bg-white/60 dark:bg-slate-400/40 transition-all";
      });
    }, 5000);
  });
}