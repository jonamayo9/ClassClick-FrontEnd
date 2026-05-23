export function qs(selector) {
  return document.querySelector(selector);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getTournamentIdFromUrl() {
  const url = new URL(window.location.href);

  const fromQuery =
    url.searchParams.get("tournamentId") ||
    url.searchParams.get("id");

  if (fromQuery) {
    return fromQuery;
  }

  return sessionStorage.getItem("selectedTournamentId") || "";
}

export function formatFixtureDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function getTeamInitials(name) {
  return String(name || "EQ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(x => x.charAt(0).toUpperCase())
    .join("") || "EQ";
}