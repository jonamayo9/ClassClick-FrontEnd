import { get, post, put, del, postForm } from "../../../../../shared/js/api.js";
import { state } from "./state.js";

export async function loadTournament() {
  state.tournament = await get(
    `/api/admin/${state.company.slug}/tournaments/${state.tournamentId}`
  );
}

export async function loadParticipants() {
  state.participants = await get(
    `/api/admin/${state.company.slug}/tournaments/${state.tournamentId}/participants`
  );
}

export async function loadCompanyTeams() {
  const result = await get(`/api/admin/${state.company.slug}/teams`);

  state.companyTeams = Array.isArray(result)
    ? result
    : result?.items || result?.teams || [];
}

export async function loadTeams() {
  state.teams = await get(
    `/api/admin/${state.company.slug}/tournaments/${state.tournamentId}/teams`
  );
}

export async function loadMatches() {
  const result = await get(
    `/api/admin/${state.company.slug}/tournaments/${state.tournamentId}/matches`
  );

  state.matches = Array.isArray(result)
    ? result
    : result?.items || result?.matches || [];
}

export async function loadStandings() {
  const result = await get(
    `/api/admin/${state.company.slug}/tournaments/${state.tournamentId}/standings`
  );

  state.standings = Array.isArray(result)
    ? result
    : result?.items || result?.standings || [];
}

export async function loadTournamentStats() {
  try {
    const result = await get(
      `/api/admin/${state.company.slug}/tournaments/${state.tournamentId}/stats`
    );

    state.scorers = result?.scorers || [];
    state.playerStats = result?.players || [];
    state.teamStats = result?.teams || [];
  } catch {
    state.scorers = [];
    state.playerStats = [];
    state.teamStats = [];
  }
}

export async function loadMatchPhotos(matchId) {
  if (!matchId) {
    state.matchPhotos = [];
    return;
  }

  const result = await get(
    `/api/admin/${state.company.slug}/tournaments/${state.tournamentId}/matches/${matchId}/photos`
  );

  state.matchPhotos = Array.isArray(result)
    ? result
    : result?.items || result?.photos || [];
}

export async function uploadMatchPhotos() {
  state.ui.photosMessage = "";
  state.ui.photosError = "";

  const fileInput = document.getElementById("matchPhotoInput");

  const caption =
    document.getElementById("matchPhotoCaptionInput")?.value?.trim() || "";

  const isCover =
    document.getElementById("matchPhotoIsCoverInput")?.checked === true;

  const isPublished =
    document.getElementById("matchPhotoIsPublishedInput")?.checked === true;

  if (!state.ui.selectedPhotosMatchId) {
    state.ui.photosError = "Seleccioná un partido.";
    return;
  }

  if (!fileInput?.files?.length) {
    state.ui.photosError = "Seleccioná al menos una imagen.";
    return;
  }

  const files = Array.from(fileInput.files);

  for (let index = 0; index < files.length; index++) {
    const formData = new FormData();

    formData.append("file", files[index]);
    formData.append("caption", caption);
    formData.append("isCover", index === 0 ? isCover : false);
    formData.append("isPublished", isPublished);

    await postForm(
      `/api/admin/${state.company.slug}/tournaments/${state.tournamentId}/matches/${state.ui.selectedPhotosMatchId}/photos`,
      formData
    );
  }

  state.ui.photosMessage =
    files.length === 1
      ? "Foto subida correctamente."
      : `${files.length} fotos subidas correctamente.`;

  await loadMatchPhotos(state.ui.selectedPhotosMatchId);
}

export async function updateMatchPhoto(photoId, body) {
  await put(
    `/api/admin/${state.company.slug}/tournaments/${state.tournamentId}/matches/${state.ui.selectedPhotosMatchId}/photos/${photoId}`,
    body
  );

  state.ui.photosMessage = "Foto actualizada correctamente.";

  await loadMatchPhotos(state.ui.selectedPhotosMatchId);
}

export async function deleteMatchPhoto(photoId) {
  await del(
    `/api/admin/${state.company.slug}/tournaments/${state.tournamentId}/matches/${state.ui.selectedPhotosMatchId}/photos/${photoId}`
  );

  state.ui.photosMessage = "Foto eliminada correctamente.";

  await loadMatchPhotos(state.ui.selectedPhotosMatchId);
}

export async function loadAllTournamentData() {
  await loadTournament();
  await loadParticipants();
  await loadCompanyTeams();
  await loadTeams();
  await loadMatches();
  await loadStandings();
  await loadTournamentStats();
}