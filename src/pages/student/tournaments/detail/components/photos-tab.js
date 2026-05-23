import { state } from "../core/state.js";
import { escapeHtml } from "../core/utils.js";

let photoSliderTimer = null;

function getPhotos() {
  return Array.isArray(state.photos) ? state.photos : [];
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

function groupPhotosByMatch(photos) {
  const map = new Map();

  photos.forEach((photo) => {
    const key = photo.matchId || photo.matchName || "sin-partido";

    if (!map.has(key)) {
      map.set(key, {
        matchId: photo.matchId,
        matchName: photo.matchName || "Partido",
        photos: [],
      });
    }

    map.get(key).photos.push(photo);
  });

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      photos: [...group.photos].sort((a, b) => {
        if (a.isCover && !b.isCover) return -1;
        if (!a.isCover && b.isCover) return 1;

        return new Date(b.createdAtUtc || 0) - new Date(a.createdAtUtc || 0);
      }),
    }))
    .sort((a, b) => {
      const aDate = a.photos[0]?.createdAtUtc || "";
      const bDate = b.photos[0]?.createdAtUtc || "";

      return new Date(bDate || 0) - new Date(aDate || 0);
    });
}

function buildEmpty() {
  return `
<section class="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
  <div class="flex items-center gap-3">
    <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white">
      📸
    </div>

    <div>
      <div class="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-600">
        Fotos
      </div>

      <h3 class="text-lg font-black text-slate-950">
        Todavía no hay fotos
      </h3>

      <p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
        Cuando se suban fotos de partidos, van a aparecer acá agrupadas por partido.
      </p>
    </div>
  </div>
</section>
  `;
}

function buildMatchPhotoCard(group, index) {
  const firstPhoto = group.photos[0] || {};
  const homeLogo = firstPhoto.homeTeamLogoUrl || "";
  const awayLogo = firstPhoto.awayTeamLogoUrl || "";
  const homeTeam = firstPhoto.homeTeamName || "Local";
  const awayTeam = firstPhoto.awayTeamName || "Visitante";
  const homeShort = firstPhoto.homeTeamShortName || homeTeam;
  const awayShort = firstPhoto.awayTeamShortName || awayTeam;
  const cover = group.photos[0];
  const date = formatDate(cover?.createdAtUtc);
  const total = group.photos.length;

  return `
<article
  class="photo-match-card group relative cursor-pointer overflow-hidden rounded-[30px] bg-slate-950 shadow-[0_14px_40px_rgba(2,6,23,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(2,6,23,0.5)]"
  data-photo-match-index="${index}"
>
  <div class="relative h-72 overflow-hidden bg-slate-950">

    ${group.photos
      .map(
        (photo, photoIndex) => `
      <img
        src="${escapeHtml(photo.fileUrl || photo.url || "")}"
        alt="${escapeHtml(photo.caption || group.matchName)}"
        class="photo-slide absolute inset-0 h-full w-full object-cover transition duration-700 ${
          photoIndex === 0 ? "opacity-100 scale-100" : "opacity-0 scale-105"
        }"
        data-photo-match-index="${index}"
        data-photo-index="${photoIndex}"
        loading="lazy"
      />
    `,
      )
      .join("")}

    <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
    <div class="hero-shine absolute inset-0 opacity-25"></div>

    <div class="absolute left-4 top-4 flex items-center gap-2">
      <span class="rounded-full bg-yellow-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 shadow-lg">
        Portada
      </span>

      <span class="rounded-full border border-white/10 bg-white/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/80 backdrop-blur">
        ${total} foto${total === 1 ? "" : "s"}
      </span>
    </div>

    <div class="absolute inset-x-0 bottom-5 z-30 flex justify-center gap-1.5 pointer-events-none">
      ${group.photos
        .map(
          (_, dotIndex) => `
        <span
          class="photo-card-dot h-1.5 rounded-full transition-all duration-300 ${
            dotIndex === 0 ? "w-5 bg-white" : "w-1.5 bg-white/45"
          }"
          data-photo-match-index="${index}"
          data-photo-index="${dotIndex}"
        ></span>
      `,
        )
        .join("")}
    </div>

    <div class="absolute bottom-0 left-0 right-0 p-4 pb-12">
      <div class="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-3 shadow-lg backdrop-blur">

        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center justify-center gap-4">

  <div class="flex min-w-0 flex-col items-center">

    ${
      homeLogo
        ? `
          <img
            src="${escapeHtml(homeLogo)}"
            alt="${escapeHtml(homeShort)}"
            class="h-8 w-8 rounded-full object-cover ring-2 ring-white/20 shadow-lg"
          />
        `
        : ""
    }

    <p class="mt-1 max-w-[82px] truncate text-[13px] font-black text-white">
      ${escapeHtml(homeShort)}
    </p>
  </div>

  <div class="flex flex-col items-center">
    <span class="text-[11px] font-black uppercase tracking-[0.35em] text-emerald-300">
      VS
    </span>
  </div>

  <div class="flex min-w-0 flex-col items-center">

    ${
      awayLogo
        ? `
          <img
            src="${escapeHtml(awayLogo)}"
            alt="${escapeHtml(awayShort)}"
            class="h-8 w-8 rounded-full object-cover ring-2 ring-white/20 shadow-lg"
          />
        `
        : ""
    }

    <p class="mt-1 max-w-[82px] truncate text-[13px] font-black text-white">
      ${escapeHtml(awayShort)}
    </p>

  </div>

</div>

          ${
            date
              ? `
                <span class="shrink-0 rounded-full bg-slate-950/70 px-3 py-1.5 text-[11px] font-black text-white">
                  ${escapeHtml(date)}
                </span>
              `
              : ""
          }
        </div>

      </div>
    </div>

  </div>
</article>
  `;
}

function buildModal() {
  return `
<div
  id="photosModal"
  class="fixed inset-0 z-[99999] hidden overflow-hidden bg-slate-950 text-white"
>
  <div class="flex h-[100dvh] flex-col px-4 py-5">

    <div class="mb-4 flex shrink-0 items-center justify-between gap-3 rounded-[24px] bg-slate-900 px-4 py-3 shadow-xl">
      <div class="min-w-0">
        <p id="photosModalTitle" class="truncate text-lg font-black text-white">
          Fotos
        </p>

        <p id="photosModalCounter" class="text-sm font-bold text-slate-400">
          1 de 1
        </p>
      </div>

      <button
        id="photosModalClose"
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-black text-white"
      >
        ×
      </button>
    </div>

    <div class="flex min-h-0 flex-1 items-center justify-center">

      <div
        id="photosModalFrame"
        class="relative flex max-h-[70vh] w-full items-center justify-center overflow-hidden rounded-[28px] bg-black shadow-2xl"
      >
        <img
          id="photosModalImage"
          src=""
          alt=""
          class="max-h-[70vh] max-w-full touch-pan-x object-contain transition-transform duration-200"
          style="transform: scale(1);"
        />

        <button
          id="photosModalPrev"
          type="button"
          class="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl font-black backdrop-blur sm:flex"
        >
          ‹
        </button>

        <button
          id="photosModalNext"
          type="button"
          class="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl font-black backdrop-blur sm:flex"
        >
          ›
        </button>
      </div>

    </div>

    <div id="photosModalDots" class="flex shrink-0 justify-center gap-1.5 px-4 py-5"></div>

  </div>
</div>
  `;
}

export function buildPhotosTab() {
  const photos = getPhotos();

  if (!photos.length) {
    return buildEmpty();
  }

  const groups = groupPhotosByMatch(photos);
  const totalPhotos = photos.length;

  return `
<section class="space-y-5 fade-up">

  <section class="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
    <p class="text-xs font-black uppercase tracking-[0.35em] text-emerald-600">
      Fotos
    </p>

    <div class="mt-1 flex items-end justify-between gap-3">
      <div>
        <h3 class="text-xl font-black text-slate-950 dark:text-white">
          Galería por partido
        </h3>

        <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">
          ${groups.length} partido${groups.length === 1 ? "" : "s"} con fotos
        </p>
      </div>

      <div class="rounded-2xl bg-slate-950 px-4 py-2 text-center text-white shadow-lg">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Fotos
        </p>

        <p class="text-xl font-black leading-none">
          ${totalPhotos}
        </p>
      </div>
    </div>
  </section>

  <section class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    ${groups.map(buildMatchPhotoCard).join("")}
  </section>

  ${buildModal()}

</section>
  `;
}

function getPhotoGroupsFromState() {
  return groupPhotosByMatch(getPhotos());
}

function setCardSlide(matchIndex, photoIndex) {
  const slides = document.querySelectorAll(
    `.photo-slide[data-photo-match-index="${matchIndex}"]`,
  );

  slides.forEach((slide) => {
    const currentIndex = Number(slide.dataset.photoIndex);
    const active = currentIndex === photoIndex;

    slide.classList.toggle("opacity-100", active);
    slide.classList.toggle("scale-100", active);
    slide.classList.toggle("opacity-0", !active);
    slide.classList.toggle("scale-105", !active);
  });

  document
    .querySelectorAll(`.photo-card-dot[data-photo-match-index="${matchIndex}"]`)
    .forEach((dot) => {
      const active = Number(dot.dataset.photoIndex) === photoIndex;

      dot.classList.toggle("w-5", active);
      dot.classList.toggle("w-1.5", !active);
      dot.classList.toggle("bg-white", active);
      dot.classList.toggle("dark:bg-slate-100", active);
      dot.classList.toggle("bg-white/45", !active);
      dot.classList.toggle("dark:bg-slate-400/40", !active);
    });
}

function startPhotoCardsSlider() {
  stopPhotoCardsSlider();

  photoSliderTimer = setInterval(() => {
    const groups = getPhotoGroupsFromState();

    groups.forEach((group, matchIndex) => {
      if (group.photos.length <= 1) return;

      const current = Number(
        document.querySelector(
          `.photo-slide.opacity-100[data-photo-match-index="${matchIndex}"]`,
        )?.dataset.photoIndex || 0,
      );

      const next = (current + 1) % group.photos.length;

      setCardSlide(matchIndex, next);
    });
  }, 4000);
}

function stopPhotoCardsSlider() {
  if (photoSliderTimer) {
    clearInterval(photoSliderTimer);
    photoSliderTimer = null;
  }
}

let modalMatchIndex = 0;
let modalPhotoIndex = 0;

function openPhotoModal(matchIndex, photoIndex = 0) {
  const groups = getPhotoGroupsFromState();
  const group = groups[matchIndex];

  if (!group) return;

  modalMatchIndex = matchIndex;
  modalPhotoIndex = photoIndex;

  updatePhotoModal();

  const modal = document.querySelector("#photosModal");

  modal?.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function closePhotoModal() {
  document.querySelector("#photosModal")?.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

let modalZoom = 1;
let modalTranslateX = 0;
let modalTranslateY = 0;

function updatePhotoModal() {
  const groups = getPhotoGroupsFromState();
  const group = groups[modalMatchIndex];

  if (!group) return;

  const photo = group.photos[modalPhotoIndex];

  const image = document.querySelector("#photosModalImage");
  const title = document.querySelector("#photosModalTitle");
  const counter = document.querySelector("#photosModalCounter");
  const dots = document.querySelector("#photosModalDots");

  modalZoom = 1;
  modalTranslateX = 0;
  modalTranslateY = 0;

  if (image) {
    image.src = photo?.fileUrl || photo?.url || "";
    image.alt = photo?.caption || group.matchName || "Foto";
    image.style.transform = "translate(0px, 0px) scale(1)";
  }

  if (title) {
    title.textContent = group.matchName || "Fotos";
  }

  if (counter) {
    counter.textContent = `${modalPhotoIndex + 1} de ${group.photos.length}`;
  }

  if (dots) {
    dots.innerHTML = group.photos
      .map(
        (_, index) => `
      <span class="h-2 rounded-full transition-all duration-300 ${
        index === modalPhotoIndex
        ? "w-6 bg-white dark:bg-slate-100"
        : "w-2 bg-white/35 dark:bg-slate-400/40"
      }"></span>
    `,
      )
      .join("");
  }
}

function moveModalPhoto(direction) {
  const groups = getPhotoGroupsFromState();
  const group = groups[modalMatchIndex];

  if (!group || !group.photos.length) return;

  modalPhotoIndex =
    (modalPhotoIndex + direction + group.photos.length) % group.photos.length;

  updatePhotoModal();
}

export function bindPhotosTab() {
  startPhotoCardsSlider();
  const modalFromTab = document.querySelector("#photosModal");

  if (modalFromTab && modalFromTab.parentElement !== document.body) {
    document.body.appendChild(modalFromTab);
  }

  document.querySelectorAll(".photo-match-card").forEach((card) => {
    card.onclick = () => {
      const matchIndex = Number(card.dataset.photoMatchIndex || 0);
      openPhotoModal(matchIndex, 0);
    };
  });

  const closeBtn = document.querySelector("#photosModalClose");
  const prevBtn = document.querySelector("#photosModalPrev");
  const nextBtn = document.querySelector("#photosModalNext");
  const modal = document.querySelector("#photosModal");
  const frame = document.querySelector("#photosModalFrame");
  const image = document.querySelector("#photosModalImage");

  if (closeBtn) {
    closeBtn.onclick = closePhotoModal;
  }

  if (prevBtn) {
    prevBtn.onclick = (event) => {
      event.stopPropagation();
      moveModalPhoto(-1);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = (event) => {
      event.stopPropagation();
      moveModalPhoto(1);
    };
  }

  if (modal) {
    modal.onclick = (event) => {
      if (modalZoom > 1) return;

      if (event.target.id === "photosModal") {
        closePhotoModal();
      }
    };
  }

  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;
  let lastTranslateX = 0;
  let lastTranslateY = 0;
  let isDraggingZoomed = false;

  function applyZoomTransform() {
    if (!image) return;

    image.style.transform = `translate(${modalTranslateX}px, ${modalTranslateY}px) scale(${modalZoom})`;
  }

  if (frame) {
    frame.ontouchstart = (event) => {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      endX = startX;
      endY = startY;

      lastTranslateX = modalTranslateX;
      lastTranslateY = modalTranslateY;

      isDraggingZoomed = modalZoom > 1;
    };

    frame.ontouchmove = (event) => {
      endX = event.touches[0].clientX;
      endY = event.touches[0].clientY;

      if (modalZoom > 1) {
        event.preventDefault();

        modalTranslateX = lastTranslateX + (endX - startX);
        modalTranslateY = lastTranslateY + (endY - startY);

        applyZoomTransform();
      }
    };

    frame.ontouchend = () => {
      if (isDraggingZoomed) return;

      const diffX = startX - endX;
      const diffY = startY - endY;

      if (Math.abs(diffX) < 45) return;
      if (Math.abs(diffY) > 80) return;

      if (diffX > 0) {
        moveModalPhoto(1);
      } else {
        moveModalPhoto(-1);
      }

      startX = 0;
      startY = 0;
      endX = 0;
      endY = 0;
    };
  }

  if (image) {
    image.ondblclick = (event) => {
      event.stopPropagation();

      if (modalZoom === 1) {
        modalZoom = 2;
      } else {
        modalZoom = 1;
        modalTranslateX = 0;
        modalTranslateY = 0;
      }

      applyZoomTransform();
    };

    image.onwheel = (event) => {
      event.preventDefault();

      modalZoom += event.deltaY < 0 ? 0.15 : -0.15;
      modalZoom = Math.min(Math.max(modalZoom, 1), 3);

      if (modalZoom === 1) {
        modalTranslateX = 0;
        modalTranslateY = 0;
      }

      applyZoomTransform();
    };
  }
}
