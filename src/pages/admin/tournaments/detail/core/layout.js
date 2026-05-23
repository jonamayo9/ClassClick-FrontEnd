import { renderAdminLayout } from "../../../../../shared/js/admin-layout.js";

const tabs = [
  { key: "summary", label: "Resumen" },
  { key: "participants", label: "Participantes" },
  { key: "teams", label: "Equipos" },
  { key: "fixture", label: "Fixture" },
  { key: "results", label: "Resultados" },
  { key: "standings", label: "Tabla" },
  { key: "stats", label: "Estadísticas" },
  { key: "players", label: "Jugadores" },
  { key: "photos", label: "Fotos" },
  { key: "settings", label: "Configuración" }
];

export function buildContent() {
  return `
    <section class="space-y-6">
      <div id="tournamentHero"></div>

      <section class="overflow-x-auto">
        <div class="inline-flex min-w-full gap-2 rounded-2xl border bg-white p-2">
          ${tabs.map(tab => `
            <button
              type="button"
              data-tab="${tab.key}"
              class="tournament-tab-btn rounded-xl px-4 py-2 text-sm font-medium transition"
            >
              ${tab.label}
            </button>
          `).join("")}
        </div>
      </section>

      <section id="tabContent"></section>
    </section>
  `;
}

export function renderPageLayout() {
  return renderAdminLayout({
    activeKey: "tournaments",
    pageTitle: "Detalle torneo",
    contentHtml: buildContent()
  });
}