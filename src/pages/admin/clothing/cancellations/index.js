import { get, post } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth } from "../../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../../shared/js/admin-layout.js";

let company = null;
let cancellations = [];
let searchText = "";

function qs(id) {
    return document.getElementById(id);
}

function escapeHtml(v) {
    return String(v ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function statusBadge(s) {
    if (s === 1) return `<span class="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">Pendiente</span>`;
    if (s === 2) return `<span class="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">Aprobada</span>`;
    if (s === 3) return `<span class="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold">Rechazada</span>`;
    return "-";
}

function buildContent() {
    return `
        <section class="space-y-6">

            <!-- HEADER -->
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Indumentaria</p>
                        <h1 class="mt-2 text-3xl font-bold">Cancelaciones</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Gestioná solicitudes de cancelación de pedidos.
                        </p>
                    </div>

                    <button
                        id="backToClothingBtn"
                        type="button"
                        class="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                        ← Volver
                    </button>

                </div>
            </section>

            <!-- CONTENIDO -->
            <section class="bg-white rounded-3xl border p-5">

                <input id="search" placeholder="Buscar alumno..."
                    class="w-full border border-slate-300 rounded-2xl px-4 py-3 text-sm mb-4 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />

                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-xs uppercase text-slate-400">
                                <th class="text-left py-2">Alumno</th>
                                <th class="text-left">Pedido</th>
                                <th class="text-left">Motivo</th>
                                <th class="text-left">Estado</th>
                                <th class="text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody id="rows"></tbody>
                    </table>
                </div>

            </section>

            <div id="modal"></div>
        </section>
    `;
}

function goBackToClothing() {
    window.location.href = "/src/pages/admin/Clothing/index.html";
}

function renderRows() {
    const filtered = cancellations.filter(c =>
        !searchText ||
        c.studentName.toLowerCase().includes(searchText)
    );

    qs("rows").innerHTML = filtered.map(c => `
        <tr class="border-t">
            <td class="py-3 font-bold">${escapeHtml(c.studentName)}</td>
            <td>#${c.orderId}</td>
            <td class="text-slate-600">${escapeHtml(c.reason)}</td>
            <td>${statusBadge(c.status)}</td>

            <td class="text-right">
                <button data-view="${c.id}" class="text-xs font-bold">Ver</button>
            </td>
        </tr>
    `).join("");

    document.querySelectorAll("[data-view]").forEach(b => {
        b.onclick = () => openModal(b.dataset.view);
    });
}

function openModal(id) {
    const c = cancellations.find(x => x.id === id);

    qs("modal").innerHTML = `
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl p-6 max-w-md w-full">
                <h3 class="font-bold text-lg">Solicitud</h3>

                <p class="mt-3"><b>Alumno:</b> ${escapeHtml(c.studentName)}</p>
                <p><b>Motivo:</b> ${escapeHtml(c.reason)}</p>

                <textarea id="note" placeholder="Nota admin..."
                    class="mt-4 w-full border rounded-xl px-3 py-2"></textarea>

                <div class="flex gap-2 mt-4">
                    <button id="approve" class="flex-1 bg-emerald-600 text-white py-2 rounded-xl">
                        Aprobar
                    </button>

                    <button id="reject" class="flex-1 bg-rose-600 text-white py-2 rounded-xl">
                        Rechazar
                    </button>
                </div>

                <button id="close" class="mt-3 w-full border py-2 rounded-xl">Cerrar</button>
            </div>
        </div>
    `;

    qs("close").onclick = () => qs("modal").innerHTML = "";

    qs("approve").onclick = async () => {
        await post(`/api/admin/${company.slug}/clothing/cancellation-requests/${id}/approve`, {
            note: qs("note").value
        });
        await load();
    };

    qs("reject").onclick = async () => {
        await post(`/api/admin/${company.slug}/clothing/cancellation-requests/${id}/reject`, {
            note: qs("note").value
        });
        await load();
    };
}

async function load() {
    cancellations = await get(`/api/admin/${company.slug}/clothing/cancellation-requests`);
    renderRows();
}

async function init() {
    await loadConfig();
    requireAuth();

    qs("app").innerHTML = renderAdminLayout({
        activeKey: "clothing",
        pageTitle: "Cancelaciones",
        contentHtml: buildContent()
    });

    qs("backToClothingBtn").addEventListener("click", goBackToClothing);

    const layout = await setupAdminLayout({
        onCompanyChanged: async c => {
            company = c;
            await load();
        }
    });

    company = layout.activeCompany;

    qs("search").oninput = e => {
        searchText = e.target.value.toLowerCase();
        renderRows();
    };

    await load();
}

init();