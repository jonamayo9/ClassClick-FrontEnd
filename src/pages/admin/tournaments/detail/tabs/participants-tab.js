export function renderParticipantsTab({
  participants,
  participantMessage,
  participantError,
  companyParticipantModalOpen,
  externalParticipantModalOpen,
  externalParticipantName,
  availableCompanies,
  companyParticipantPermissions,
  isOwner
}) {
  return `
    <section class="space-y-4">
      <div class="rounded-2xl border bg-white p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Participantes</h2>
            <p class="text-sm text-slate-500">Empresas y equipos externos del torneo.</p>
          </div>

        ${isOwner ? `
          <div class="flex flex-wrap gap-2">
            <button id="openCompanyParticipantModalBtn" type="button" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">
              Agregar empresa ClassClick
            </button>

            <button id="openExternalParticipantModalBtn" type="button" class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Agregar externo
            </button>
          </div>
        ` : ""}
        </div>

        ${participantMessage ? `<div class="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">${participantMessage}</div>` : ""}
        ${participantError ? `<div class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">${participantError}</div>` : ""}

        <div class="mt-6 grid gap-3">
          ${renderParticipantsList(participants, isOwner)}
        </div>
      </div>

      ${companyParticipantModalOpen ? renderCompanyParticipantModal(participants, availableCompanies, companyParticipantPermissions) : ""}
      ${externalParticipantModalOpen ? renderExternalParticipantModal(externalParticipantName) : ""}
    </section>
  `;
}

function renderParticipantLogo(p) {
  const logoUrl =
    p.logoUrl ||
    p.companyLogoUrl ||
    p.externalLogoUrl ||
    p.company?.logoUrl ||
    null;

  if (logoUrl) {
    return `
      <img
        src="${logoUrl}"
        alt="${p.displayName || "Participante"}"
        class="h-12 w-12 rounded-xl border bg-white object-cover"
      />
    `;
  }

  return `
    <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
      ${getInitials(p.displayName || p.companyName || p.externalName)}
    </div>
  `;
}

function renderParticipantsList(participants, isOwner) {
  if (!participants.length) {
    return `
      <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Todavía no hay participantes cargados.
      </div>
    `;
  }

  return participants.map(p => `
    <article class="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
      <div class="flex min-w-0 items-center gap-3">
        ${renderParticipantLogo(p)}

        <div class="min-w-0">
          <div class="font-semibold text-slate-900">${p.displayName || p.companyName || p.externalName || "Participante"}</div>
          <div class="mt-1 flex flex-wrap gap-2 text-xs">
            ${participantTypeBadge(p)}
            ${participantStatusBadge(p.authorizationStatus)}
            ${participantRoleBadge(p.participantRole)}
          </div>
        </div>
      </div>

      ${
        !isOwner || p.participantRole === "Owner"
          ? ""
          : `<button type="button" data-delete-participant-id="${p.id}" class="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Eliminar</button>`
      }
    </article>
  `).join("");
}

function renderExternalParticipantModal(externalParticipantName) {
  return `
    <div class="fixed inset-0 z-50 p-4">
      <div class="absolute inset-0 bg-slate-950/60" data-close-external-modal="true"></div>

      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">Agregar externo</h3>
              <p class="text-sm text-slate-500">Equipo o club que no usa ClassClick.</p>
            </div>

            <button id="closeExternalParticipantModalBtn" type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cerrar
            </button>
          </div>

          <div class="space-y-4 p-5">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-500">Nombre</label>
              <input id="externalParticipantNameInput" value="${externalParticipantName}" type="text" placeholder="Ej: Los Pibes FC" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>

            <button id="saveExternalParticipantBtn" type="button" class="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-black">
              Guardar externo
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCompanyParticipantModal(participants, availableCompanies, companyParticipantPermissions) {
  const alreadyParticipantIds = participants
    .filter(x => x.companyId)
    .map(x => String(x.companyId));

  const options = availableCompanies
    .filter(x => !alreadyParticipantIds.includes(String(x.companyId)))
    .map(x => `
      <option value="${x.companyId}">
        ${x.companyName || x.companySlug || "Empresa"}
      </option>
    `)
    .join("");

  return `
    <div class="fixed inset-0 z-50 p-4">
      <div class="absolute inset-0 bg-slate-950/60" data-close-company-modal="true"></div>

      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">Agregar empresa ClassClick</h3>
              <p class="text-sm text-slate-500">Invitá una empresa existente al torneo.</p>
            </div>

            <button id="closeCompanyParticipantModalBtn" type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cerrar
            </button>
          </div>

          <div class="space-y-4 p-5">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-500">Empresa</label>
              <select id="companyParticipantSelect" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Seleccionar empresa</option>
                ${options}
              </select>
            </div>

            <div class="rounded-2xl border border-slate-200 p-4">
              <h4 class="text-sm font-semibold text-slate-900">Permisos</h4>

              <div class="mt-3 space-y-3 text-sm">
                ${permissionCheckbox("canManageOwnTeam", "Puede administrar su equipo", companyParticipantPermissions)}
                ${permissionCheckbox("canUploadResults", "Puede cargar resultados", companyParticipantPermissions)}
                ${permissionCheckbox("canUploadPhotos", "Puede subir fotos", companyParticipantPermissions)}
                ${permissionCheckbox("canManagePlayers", "Puede administrar jugadores", companyParticipantPermissions)}
              </div>
            </div>

            <button id="saveCompanyParticipantBtn" type="button" class="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-black">
              Guardar empresa participante
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function permissionCheckbox(key, label, companyParticipantPermissions) {
  return `
    <label class="flex items-center gap-2">
      <input 
        type="checkbox" 
        data-company-permission="${key}"
        ${companyParticipantPermissions[key] ? "checked" : ""}
        class="rounded border-slate-300"
      />
      <span class="text-slate-700">${label}</span>
    </label>
  `;
}

function participantTypeBadge(p) {
  return p.isExternal
    ? `<span class="rounded-full bg-orange-50 px-2 py-1 text-orange-700">Externo</span>`
    : `<span class="rounded-full bg-sky-50 px-2 py-1 text-sky-700">Empresa ClassClick</span>`;
}

function participantStatusBadge(status) {
  const map = {
    PendingAuthorization: ["Pendiente", "bg-amber-50 text-amber-700"],
    Accepted: ["Aceptado", "bg-emerald-50 text-emerald-700"],
    Rejected: ["Rechazado", "bg-red-50 text-red-700"],
    ExternalOnly: ["Externo", "bg-slate-100 text-slate-700"]
  };

  const item = map[status] || [status || "-", "bg-slate-100 text-slate-700"];

  return `<span class="rounded-full px-2 py-1 ${item[1]}">${item[0]}</span>`;
}

function participantRoleBadge(role) {
  const text = role === "Owner" ? "Organizador" : "Participante";
  return `<span class="rounded-full bg-slate-100 px-2 py-1 text-slate-700">${text}</span>`;
}

function getInitials(name) {
  if (!name)
    return "TR";

  const parts = name.trim().split(" ");

  if (parts.length === 1)
    return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}