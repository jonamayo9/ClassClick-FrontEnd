export function renderEventModal({
  isOwner,
  myCompanyTeamIds,
  matches,
  teams,
  selectedEventMatchId,
  eventForm,
  eventPlayers,
  matchEvents,
  eventMessage,
  eventError
}) {
  const match = matches.find(x => x.id === selectedEventMatchId);

const matchTeams = (
  isOwner
    ? [
        teams.find(x => x.id === match?.homeTeamId),
        teams.find(x => x.id === match?.awayTeamId)
      ]
    : [
        teams.find(x => x.id === match?.homeTeamId),
        teams.find(x => x.id === match?.awayTeamId)
      ].filter(
        x => x && (myCompanyTeamIds || []).includes(x.id)
      )
).filter(Boolean);

  const teamOptions = matchTeams.map(team => `
    <option value="${team.id}" ${eventForm.teamId === team.id ? "selected" : ""}>
      ${team.name}
    </option>
  `).join("");

  return `
    <div class="fixed inset-0 z-50 p-4">
      <div class="absolute inset-0 bg-slate-950/60" data-close-event-modal="true"></div>

      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">
                Eventos del partido
              </h3>
              <p class="text-sm text-slate-500">
                Goles, tarjetas, faltas y estadísticas.
              </p>
            </div>

            <button
              id="closeEventModalBtn"
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>

          <div class="space-y-5 p-5">
            ${eventMessage ? `<div class="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">${eventMessage}</div>` : ""}
            ${eventError ? `<div class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">${eventError}</div>` : ""}

            <div class="rounded-2xl border border-slate-200 p-4">
              <h4 class="font-semibold text-slate-900">Nuevo evento</h4>

              <div class="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-500">Equipo</label>
                  <select id="eventTeamInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    ${teamOptions}
                  </select>
                </div>

                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-500">Tipo</label>
                  <select id="eventTypeInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    ${eventTypeOption("Goal", "Gol", eventForm)}
                    ${eventTypeOption("Assist", "Asistencia", eventForm)}
                    ${eventTypeOption("YellowCard", "Amarilla", eventForm)}
                    ${eventTypeOption("RedCard", "Roja", eventForm)}
                    ${eventTypeOption("Foul", "Falta", eventForm)}
                    ${eventTypeOption("Penalty", "Penal", eventForm)}
                    ${eventTypeOption("OwnGoal", "Gol en contra", eventForm)}
                    ${eventTypeOption("Save", "Atajada", eventForm)}
                    ${eventTypeOption("Custom", "Otro", eventForm)}
                  </select>
                </div>

                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-500">
                    Alumno / jugador
                  </label>

                  <select
                    id="eventPlayerInput"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Sin jugador</option>

                    ${eventPlayers.map(player => `
                      <option
                        value="${player.id}"
                        ${String(eventForm.playerId || "") === String(player.id) ? "selected" : ""}
                      >
                        ${player.displayName}${player.number ? ` #${player.number}` : ""}
                      </option>
                    `).join("")}
                  </select>
                </div>

                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-500">Minuto</label>
                  <input id="eventMinuteInput" type="number" min="0" value="${eventForm.minute}" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-500">Valor</label>
                  <input id="eventValueInput" type="number" min="0" value="${eventForm.value}" placeholder="Opcional" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>

              <div class="mt-4">
                <label class="mb-1 block text-xs font-medium text-slate-500">Notas / jugador</label>
                <input id="eventNotesInput" value="${eventForm.notes}" placeholder="Ej: Juan Pérez" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>

              <button
                id="saveEventBtn"
                type="button"
                class="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-black"
              >
                Guardar evento
              </button>
            </div>

            <div>
              <h4 class="font-semibold text-slate-900">Timeline</h4>

              <div class="mt-3 space-y-2">
                ${renderMatchEventsList(matchEvents)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function eventTypeOption(value, label, eventForm) {
  return `
    <option value="${value}" ${eventForm.eventType === value ? "selected" : ""}>
      ${label}
    </option>
  `;
}

function renderMatchEventsList(matchEvents) {
  if (!matchEvents.length) {
    return `
      <div class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        Todavía no hay eventos cargados.
      </div>
    `;
  }

  return matchEvents
    .sort((a, b) => (a.minute || 0) - (b.minute || 0))
    .map(event => `
      <article class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
        <div>
          <div class="text-sm font-semibold text-slate-900">
            ${event.minute ?? "-"}' · ${getEventTypeText(event.eventType)}
          </div>

          <div class="mt-1 flex items-center gap-2 text-xs text-slate-500">
            ${
              event.playerPhotoUrl
                ? `
                  <img
                    src="${event.playerPhotoUrl}"
                    class="h-6 w-6 rounded-full object-cover"
                  />
                `
                : ""
            }

            <span>
              ${event.teamName || "-"}
              ${event.playerName ? `· ${event.playerName}` : ""}
              ${event.notes ? `· ${event.notes}` : ""}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-delete-event-id="${event.id}"
          class="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
        >
          Eliminar
        </button>
      </article>
    `).join("");
}

function getEventTypeText(type) {
  const map = {
    Goal: "Gol",
    Assist: "Asistencia",
    YellowCard: "Amarilla",
    RedCard: "Roja",
    Foul: "Falta",
    Penalty: "Penal",
    OwnGoal: "Gol en contra",
    Save: "Atajada",
    Custom: "Otro"
  };

  return map[type] || type || "-";
}