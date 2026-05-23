import { state } from "../core/state.js";

export function renderSummaryTab() {
  const tournament = state.tournament;

  return `
    <section class="grid gap-4 lg:grid-cols-3">
      <div class="rounded-2xl border bg-white p-5 lg:col-span-2">
        <h2 class="text-lg font-semibold text-slate-900">
          Descripción
        </h2>

        <p class="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
          ${tournament.description || "Sin descripción."}
        </p>
      </div>

      <div class="rounded-2xl border bg-white p-5">
        <h2 class="text-lg font-semibold text-slate-900">
          Información
        </h2>

        <div class="mt-4 space-y-4 text-sm">
          ${infoRow("Deporte", getSportText(tournament.sportType))}
          ${infoRow("Ámbito", getScopeText(tournament.scope))}
          ${infoRow("Visibilidad", getVisibilityText(tournament.visibility))}
          ${infoRow("Estado", getStatusText(tournament.status))}
          ${infoRow("Publicado", tournament.isPublished ? "Sí" : "No")}
        </div>
      </div>
    </section>
  `;
}

function infoRow(label, value) {
  return `
    <div class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <span class="text-slate-500">
        ${label}
      </span>

      <span class="font-medium text-slate-900">
        ${value}
      </span>
    </div>
  `;
}

function getSportText(value) {
  if (!value) return "Otro";

  const normalized = String(value).toLowerCase();

  if (normalized.includes("football")) return "Fútbol";
  if (normalized.includes("futsal")) return "Futsal";
  if (normalized.includes("basket")) return "Básquet";
  if (normalized.includes("volley")) return "Vóley";

  return value;
}

function getScopeText(value) {
  const map = {
    InternalCompany: "Interno",
    Shared: "Compartido",
    Mixed: "Mixto",
    ExternalOnly: "Solo externos"
  };

  return map[value] || value || "-";
}

function getVisibilityText(value) {
  const map = {
    Private: "Privado",
    CompanyOnly: "Solo empresa",
    ParticipantsOnly: "Participantes"
  };

  return map[value] || value || "-";
}

function getStatusText(value) {
  const map = {
    Draft: "Borrador",
    WaitingParticipantsAuthorization: "Esperando autorización",
    ReadyToPublish: "Listo para publicar",
    Published: "Publicado",
    InProgress: "En curso",
    Finished: "Finalizado",
    Cancelled: "Cancelado"
  };

  return map[value] || value || "-";
}