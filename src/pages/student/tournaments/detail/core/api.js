import { get } from "../../../../../shared/js/api.js";
import { state } from "./state.js";

export async function loadTournamentDetail() {
  const result = await get(
    `/api/student/${state.companySlug}/tournaments/${state.tournamentId}`
  );

  state.tournament = result;
}

export async function loadFixture() {
  const result = await get(
    `/api/student/${state.companySlug}/tournaments/${state.tournamentId}/fixture`
  );

  state.fixture = Array.isArray(result)
    ? result
    : [];
}

export async function loadStandings() {
  const result = await get(
    `/api/student/${state.companySlug}/tournaments/${state.tournamentId}/standings`
  );

  state.standings = Array.isArray(result)
    ? result
    : [];
}

export async function loadPhotos() {
  const result = await get(
    `/api/student/${state.companySlug}/tournaments/${state.tournamentId}/photos`
  );

  state.photos = Array.isArray(result)
    ? result
    : [];
}

export async function loadInitialData() {
  await Promise.all([
    loadTournamentDetail(),
    loadFixture(),
    loadStandings(),
    loadPhotos()
  ]);
}