import { state } from "../core/state.js";
import {
  loadMatchPhotos,
  uploadMatchPhotos,
  updateMatchPhoto,
  deleteMatchPhoto
} from "../core/api.js";
import { formatDate, formatDateTime } from "../core/utils.js";

export function renderPhotosTab({
  isOwner = false,
  myCompanyTeamIds = []
} = {}) {
  const matchOptions = state.matches.map(match => `
    <option value="${match.id}" ${state.ui.selectedPhotosMatchId === match.id ? "selected" : ""}>
      Fecha ${match.roundNumber || 1} · ${match.homeTeamName || "Local"} vs ${match.awayTeamName || "Visitante"} · ${formatDateTime(match.matchDateUtc)}
    </option>
  `).join("");

  const selectedMatch = state.matches.find(x => x.id === state.ui.selectedPhotosMatchId);

const canManageSelectedMatchPhotos =
  isOwner ||
  (
    selectedMatch &&
    (
      (myCompanyTeamIds || []).includes(selectedMatch.homeTeamId) ||
      (myCompanyTeamIds || []).includes(selectedMatch.awayTeamId)
    )
  );

  return `
    <section class="space-y-4">
      <div class="rounded-2xl border bg-white p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">
              Fotos del partido
            </h2>

            <p class="mt-1 text-sm text-slate-500">
              ${canManageSelectedMatchPhotos
                ? "Subí fotos, publicalas y elegí una portada."
                : "Podés ver las fotos de este partido. Solo podés cargar o administrar fotos de tus propios partidos."
              }
            </p>
          </div>
        </div>

        ${state.ui.photosMessage ? `<div class="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">${state.ui.photosMessage}</div>` : ""}
        ${state.ui.photosError ? `<div class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">${state.ui.photosError}</div>` : ""}

        <div class="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-500">
              Partido
            </label>

            <select
              id="photosMatchSelect"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar partido</option>
              ${matchOptions}
            </select>
          </div>
        </div>

        ${
          state.ui.selectedPhotosMatchId && canManageSelectedMatchPhotos
            ? `
              <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-500">
                      Foto
                    </label>

                    <input
                      id="matchPhotoInput"
                      type="file"
                      accept="image/*"
                      multiple
                      class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-500">
                      Descripción
                    </label>

                    <input
                      id="matchPhotoCaptionInput"
                      type="text"
                      placeholder="Ej: festejo del gol"
                      class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>

                  <div class="flex flex-wrap gap-4">
                    <label class="flex items-center gap-2 text-sm">
                      <input
                        id="matchPhotoIsPublishedInput"
                        type="checkbox"
                        checked
                        class="rounded border-slate-300"
                      />

                      <span class="text-slate-700">
                        Publicada
                      </span>
                    </label>

                    <label class="flex items-center gap-2 text-sm">
                      <input
                        id="matchPhotoIsCoverInput"
                        type="checkbox"
                        class="rounded border-slate-300"
                      />

                      <span class="text-slate-700">
                        Portada
                      </span>
                    </label>
                  </div>

                  <button
                    id="uploadMatchPhotoBtn"
                    type="button"
                    class="self-end rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                    ${state.ui.uploadingPhoto ? "disabled" : ""}
                  >
                    ${state.ui.uploadingPhoto ? "Subiendo..." : "Subir foto"}
                  </button>
                </div>
              </div>
            `
            : ""
        }

        <div class="mt-6">
          ${renderMatchPhotosGrid(canManageSelectedMatchPhotos)}
        </div>
      </div>
    </section>
  `;
}

function renderMatchPhotosGrid(canManagePhotos = false) {
  if (!state.ui.selectedPhotosMatchId) {
    return `
      <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Seleccioná un partido para ver sus fotos.
      </div>
    `;
  }

  if (!state.matchPhotos.length) {
    return `
      <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Todavía no hay fotos cargadas para este partido.
      </div>
    `;
  }

  return `
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      ${state.matchPhotos.map(photo => `
        <article class="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div class="relative aspect-video bg-slate-100">
            ${
              photo.fileUrl
                ? `
                  <img
                    src="${photo.fileUrl}"
                    alt="${photo.caption || "Foto del partido"}"
                    class="h-full w-full object-cover"
                  />
                `
                : `
                  <div class="flex h-full items-center justify-center text-sm text-slate-400">
                    Sin imagen
                  </div>
                `
            }

            ${
              photo.isCover
                ? `
                  <span class="absolute left-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                    Portada
                  </span>
                `
                : ""
            }

            ${
              photo.isPublished
                ? `
                  <span class="absolute right-3 top-3 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    Publicada
                  </span>
                `
                : `
                  <span class="absolute right-3 top-3 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                    Oculta
                  </span>
                `
            }
          </div>

          <div class="space-y-3 p-4">
            <div>
              <div class="text-sm font-semibold text-slate-900">
                ${photo.caption || "Sin descripción"}
              </div>

              <div class="mt-1 text-xs text-slate-500">
                ${formatDate(photo.createdAtUtc)}
              </div>
            </div>

            ${canManagePhotos ? `
  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      data-toggle-photo-published="${photo.id}"
      class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      ${photo.isPublished ? "Ocultar" : "Publicar"}
    </button>

    <button
      type="button"
      data-set-photo-cover="${photo.id}"
      class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      Portada
    </button>

    <button
      type="button"
      data-delete-photo-id="${photo.id}"
      class="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
    >
      Eliminar
    </button>
  </div>
` : ""}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

export function bindPhotosTabEvents(renderActiveTab) {
  document.getElementById("photosMatchSelect")?.addEventListener("change", async e => {
    state.ui.selectedPhotosMatchId = e.target.value;
    state.ui.photosMessage = "";
    state.ui.photosError = "";

    try {
      await loadMatchPhotos(state.ui.selectedPhotosMatchId);
    } catch (error) {
      state.ui.photosError = error?.message || "No se pudieron cargar las fotos.";
    }

    renderActiveTab();
  });

  document.getElementById("uploadMatchPhotoBtn")?.addEventListener("click", async () => {
    if (state.ui.uploadingPhoto) return;

    try {
      state.ui.uploadingPhoto = true;
      await uploadMatchPhotos();
    } catch (error) {
      state.ui.photosError = error?.message || "No se pudo subir la foto.";
    } finally {
      state.ui.uploadingPhoto = false;
      renderActiveTab();
    }
  });

  document.querySelectorAll("[data-toggle-photo-published]").forEach(button => {
    button.addEventListener("click", async () => {
      const photo = state.matchPhotos.find(x => x.id === button.dataset.togglePhotoPublished);
      if (!photo) return;

      try {
        await updateMatchPhoto(photo.id, {
          caption: photo.caption || null,
          isCover: photo.isCover === true,
          isPublished: photo.isPublished !== true
        });

        renderActiveTab();
      } catch (error) {
        state.ui.photosError = error?.message || "No se pudo actualizar la foto.";
        renderActiveTab();
      }
    });
  });

  document.querySelectorAll("[data-set-photo-cover]").forEach(button => {
    button.addEventListener("click", async () => {
      const photo = state.matchPhotos.find(x => x.id === button.dataset.setPhotoCover);
      if (!photo) return;

      try {
        await updateMatchPhoto(photo.id, {
          caption: photo.caption || null,
          isCover: true,
          isPublished: photo.isPublished === true
        });

        renderActiveTab();
      } catch (error) {
        state.ui.photosError = error?.message || "No se pudo marcar como portada.";
        renderActiveTab();
      }
    });
  });

  document.querySelectorAll("[data-delete-photo-id]").forEach(button => {
    button.addEventListener("click", async () => {
      try {
        await deleteMatchPhoto(button.dataset.deletePhotoId);
        renderActiveTab();
      } catch (error) {
        state.ui.photosError = error?.message || "No se pudo eliminar la foto.";
        renderActiveTab();
      }
    });
  });
}