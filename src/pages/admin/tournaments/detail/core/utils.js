export function getInitials(name) {
  if (!name) return "TR";

  const parts = name.trim().split(" ");

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function getSportText(value) {
  if (!value) return "Otro";

  const normalized = String(value).toLowerCase();

  if (normalized.includes("football")) return "Fútbol";
  if (normalized.includes("futsal")) return "Futsal";
  if (normalized.includes("basket")) return "Básquet";
  if (normalized.includes("volley")) return "Vóley";

  return value;
}

export function getStatusText(value) {
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

export function getScopeText(value) {
  const map = {
    InternalCompany: "Interno",
    Shared: "Compartido",
    Mixed: "Mixto",
    ExternalOnly: "Solo externos"
  };

  return map[value] || value || "-";
}

export function getVisibilityText(value) {
  const map = {
    Private: "Privado",
    CompanyOnly: "Solo empresa",
    ParticipantsOnly: "Participantes"
  };

  return map[value] || value || "-";
}

export function getCompetitionFormatText(value) {
  const map = {
    League: "Liga",
    Knockout: "Eliminatoria",
    GroupsAndPlayoffs: "Grupos + Playoffs",
    Friendly: "Amistoso",
    Custom: "Personalizado"
  };

  return map[value] || value || "-";
}

export function getFixtureModeText(value) {
  const map = {
    Manual: "Manual",
    Automatic: "Automático",
    Mixed: "Mixto"
  };

  return map[value] || value || "-";
}

export function getRoundModeText(value) {
  const map = {
    SingleRound: "Solo ida",
    HomeAndAway: "Ida y Vuelta",
    CustomRounds: "Rondas personalizadas"
  };

  return map[value] || value || "-";
}

export function infoRow(label, value) {
  return `
    <div class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <span class="text-slate-500">${label}</span>
      <span class="font-medium text-slate-900">${value}</span>
    </div>
  `;
}