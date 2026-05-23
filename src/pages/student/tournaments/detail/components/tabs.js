import { state } from "../core/state.js";
import { escapeHtml, qs } from "../core/utils.js";

const tabs = [
  { key: "fixture", label: "Fixture" },
  { key: "standings", label: "Tabla" },
  { key: "results", label: "Resultados" },
  { key: "teams", label: "Equipos" },
  { key: "photos", label: "Fotos" },
  { key: "stats", label: "Estadísticas" },
  { key: "players", label: "Jugadores" }
];

export function buildTabs() {
  return `
<section class="hide-scrollbar flex gap-2 overflow-x-auto pb-1">

${tabs.map(tab => `
    <button
        type="button"
        data-tab="${escapeHtml(tab.key)}"
        class="tab-btn shrink-0 rounded-full px-5 py-3 text-sm font-black transition ${
          state.activeTab === tab.key
            ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-slate-950 shadow-[0_10px_24px_rgba(34,197,94,0.35)]"
            : "border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm"
        }"
    >
        ${escapeHtml(tab.label)}
    </button>
`).join("")}

</section>
  `;
}

export function bindTabs(buildActiveTab, afterRender) {

  document.querySelectorAll(".tab-btn").forEach(btn => {

    btn.addEventListener("click", () => {

      state.activeTab = btn.dataset.tab;

      document.querySelectorAll(".tab-btn").forEach(x => {

        x.className =
  "tab-btn shrink-0 rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900 px-5 py-3 text-sm font-black text-slate-700 dark:text-slate-200 shadow-sm transition";
      });

      btn.className =
        "tab-btn shrink-0 rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_10px_24px_rgba(34,197,94,0.35)] transition";

      const content = qs("#tabContent");

    if (content) {
      content.innerHTML = buildActiveTab();
      afterRender?.();
    }
    });
  });
}