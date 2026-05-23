export function renderTeamsTab({
  teams,
  teamMessage,
  teamError,
  teamModalOpen,
  selectedTeamId,
  teamForm,
  participants,
  companyTeams,
  company,
  tournament
}) {
  return `
    <section class="space-y-4">
      <div class="rounded-2xl border bg-white p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Equipos del torneo</h2>
            <p class="text-sm text-slate-500">Equipos participantes y planteles.</p>
          </div>

          <button
            id="openTeamModalBtn"
            type="button"
            class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Agregar equipo
          </button>
        </div>

        ${teamMessage
          ? `<div class="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">${teamMessage}</div>`
          : ""}

        ${teamError
          ? `<div class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">${teamError}</div>`
          : ""}

        <div class="mt-6 grid gap-3">
          ${renderTeamsList(teams)}
        </div>
      </div>
    </section>

    ${teamModalOpen ? renderTeamModal({
      selectedTeamId,
      teamForm,
      participants,
      companyTeams,
      company,
      tournament
    }) : ""}
  `;
}

function renderTeamsList(teams) {
  if (!teams.length) {
    return `
      <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Todavía no hay equipos cargados.
      </div>
    `;
  }

  return teams.map(team => `
    <article class="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
      <div class="flex min-w-0 items-center gap-3">
        ${renderTeamLogo(team, "h-12 w-12 rounded-xl")}

        <div class="min-w-0">
          <div class="font-semibold text-slate-900">${team.name}</div>
          <div class="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>${team.shortName || "Sin abreviatura"}</span>
            <span>·</span>
            <span>${team.category || "Sin categoría"}</span>
            <span>·</span>
            <span>${team.playersCount || 0} jugadores</span>
            ${
              team.isActive
                ? `<span class="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Activo</span>`
                : `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Inactivo</span>`
            }
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button type="button" data-edit-team-id="${team.id}" class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Editar
        </button>

        <button type="button" data-delete-team-id="${team.id}" class="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
          Eliminar
        </button>
      </div>
    </article>
  `).join("");
}

function renderTeamModal({
  selectedTeamId,
  teamForm,
  participants,
  companyTeams,
  company,
  tournament
}) {
  const participantId = tournament?.isOwner
  ? teamForm.participantId
  : tournament?.myParticipantId;

const participantOptions = participants
  .filter(p => {
    if (tournament?.isOwner)
      return true;

    return p.participantRole !== "Owner";
  })
    .map(p => `
      <option value="${p.id}" ${participantId === p.id ? "selected" : ""}>
        ${p.displayName || p.companyName || "Mi empresa"}
      </option>
    `)
    .join("");

  const companyTeamOptions = companyTeams
    .filter(t => t.isActive !== false)
    .map(t => `
      <option value="${t.id}" ${teamForm.companyTeamId === t.id ? "selected" : ""}>
        ${t.name}${t.category ? ` · ${t.category}` : ""}
      </option>
    `)
    .join("");

  return `
    <div class="fixed left-0 top-0 z-[2147483647] h-screen w-screen bg-slate-950/60">
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">
                ${selectedTeamId ? "Editar equipo" : "Agregar equipo"}
              </h3>
              <p class="text-sm text-slate-500">Equipo participante del torneo.</p>
            </div>

            <button id="closeTeamModalBtn" type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cerrar
            </button>
          </div>

          <div class="space-y-4 p-5">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-500">Participante</label>
              <select
                id="teamParticipantInput"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                ${tournament?.isOwner ? "" : "pointer-events-none bg-slate-100"}
              >
                <option value="">Seleccionar participante</option>
                ${participantOptions}
              </select>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-slate-500">Equipo deportivo</label>
              <select id="companyTeamInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Seleccionar equipo creado</option>
                ${companyTeamOptions}
              </select>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              ${teamInput("Nombre", "teamNameInput", teamForm.name, "Ej: Sub 15 Azul")}
              ${teamInput("Nombre corto", "teamShortNameInput", teamForm.shortName, "Ej: S15A")}
              ${teamInput("Categoría", "teamCategoryInput", teamForm.category, "Ej: 2010")}
              ${teamInput("Entrenador", "teamCoachInput", teamForm.coachName, "Ej: Juan Pérez")}
            </div>

            <label class="flex items-center gap-2 text-sm">
              <input id="teamIsActiveInput" type="checkbox" ${teamForm.isActive ? "checked" : ""} class="rounded border-slate-300" />
              <span class="text-slate-700">Equipo activo</span>
            </label>

            <button id="saveTeamBtn" type="button" class="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-black">
              Guardar equipo
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function teamInput(label, id, value, placeholder = "") {
  return `
    <div>
      <label class="mb-1 block text-xs font-medium text-slate-500">${label}</label>
      <input id="${id}" value="${value || ""}" type="text" placeholder="${placeholder}" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
    </div>
  `;
}

function renderTeamLogo(team, className = "h-12 w-12 rounded-xl") {
  const logoUrl =
    team.logoUrl ||
    team.companyTeamLogoUrl ||
    team.externalLogoUrl ||
    team.logoPathUrl ||
    null;

  if (logoUrl) {
    return `
      <img
        src="${logoUrl}"
        alt="${team.name || "Equipo"}"
        class="${className} shrink-0 border bg-white object-cover"
      />
    `;
  }

  return `
    <div class="${className} flex shrink-0 items-center justify-center bg-slate-900 text-sm font-bold text-white">
      ${getInitials(team.name)}
    </div>
  `;
}

function getInitials(name) {
  if (!name)
    return "TR";

  const parts = name.trim().split(" ");

  if (parts.length === 1)
    return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}