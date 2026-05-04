import { get, post } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth } from "../../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../../shared/js/admin-layout.js";

let company = null;
let proofs = [];
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

function formatDate(v) {
    return v ? new Date(v).toLocaleString("es-AR") : "-";
}

function money(v) {
    return `$${Number(v || 0).toLocaleString("es-AR")}`;
}

function statusBadge(status) {
    if (status === 1) return `<span class="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">Pendiente</span>`;
    if (status === 2) return `<span class="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">Aprobado</span>`;
    if (status === 3) return `<span class="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold">Rechazado</span>`;
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
                        <h1 class="mt-2 text-3xl font-bold">Comprobantes</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Validá comprobantes enviados por alumnos.
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
                <input id="searchInput" placeholder="Buscar alumno o DNI..."
                    class="w-full border rounded-xl px-4 py-3 text-sm mb-4" />

                <table class="w-full text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-slate-400">
                            <th class="py-2">Alumno</th>
                            <th>Pedido</th>
                            <th>Importe</th>
                            <th>Estado</th>
                            <th class="text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody id="rows"></tbody>
                </table>
            </section>

            <div id="modal"></div>
        </section>
    `;
}

function goBackToClothing() {
    window.location.href = "/src/pages/admin/Clothing/index.html";
}

function renderRows() {
    const filtered = proofs.filter(p =>
        !searchText ||
        p.studentName.toLowerCase().includes(searchText) ||
        (p.studentDni || "").includes(searchText)
    );

    qs("rows").innerHTML = filtered.map(p => `
        <tr class="border-t">
            <td class="py-3">
                <div class="font-bold">${escapeHtml(p.studentName)}</div>
                <div class="text-xs text-slate-400">${escapeHtml(p.studentDni || "-")}</div>
            </td>

            <td>#${p.orderId}</td>

            <td>
                <div>${money(p.orderTotalAmount)}</div>
                <div class="text-xs text-slate-400">Pend: ${money(p.orderPendingAmount)}</div>
            </td>

            <td>${statusBadge(p.status)}</td>

            <td class="text-right">
                <button data-view="${p.id}" class="text-xs font-bold text-slate-700">Ver</button>
            </td>
        </tr>
    `).join("");

    document.querySelectorAll("[data-view]").forEach(b => {
        b.onclick = () => openModal(b.dataset.view);
    });
}

function openModal(id) {
    const p = proofs.find(x => x.id === id);

    qs("modal").innerHTML = `
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl p-6 max-w-lg w-full">
                <h3 class="font-bold text-lg">Comprobante</h3>

                <img src="${p.fileUrl}" class="mt-4 rounded-xl max-h-96 w-full object-contain" />

                <div class="mt-4 text-sm">
                    <p><b>Alumno:</b> ${escapeHtml(p.studentName)}</p>
                    <p><b>Tipo:</b> ${p.type === 1 ? "Seña" : "Pago total"}</p>
                </div>

                <textarea id="note" placeholder="Nota..."
                    class="mt-4 w-full border rounded-xl px-3 py-2 text-sm"></textarea>

                <div class="flex gap-2 mt-4">
                    <button id="approve" class="flex-1 bg-emerald-600 text-white py-2 rounded-xl">Aprobar</button>
                    <button id="reject" class="flex-1 bg-rose-600 text-white py-2 rounded-xl">Rechazar</button>
                </div>

                <button id="close" class="mt-3 w-full border py-2 rounded-xl">Cerrar</button>
            </div>
        </div>
    `;

    qs("close").onclick = () => qs("modal").innerHTML = "";

    qs("approve").onclick = async () => {
        await post(`/api/admin/${company.slug}/clothing/payment-proofs/${id}/approve`, {
            reviewNote: qs("note").value
        });
        await load();
    };

    qs("reject").onclick = async () => {
        await post(`/api/admin/${company.slug}/clothing/payment-proofs/${id}/reject`, {
            reviewNote: qs("note").value
        });
        await load();
    };
}

async function load() {
    proofs = await get(`/api/admin/${company.slug}/clothing/payment-proofs`);
    renderRows();
}

async function init() {
    await loadConfig();
    requireAuth();

    qs("app").innerHTML = renderAdminLayout({
        activeKey: "clothing",
        pageTitle: "Comprobantes",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async c => {
            company = c;
            await load();
        }
    });

    qs("backToClothingBtn").addEventListener("click", goBackToClothing);

    company = layout.activeCompany;

    qs("searchInput").oninput = e => {
        searchText = e.target.value.toLowerCase();
        renderRows();
    };

    await load();
}

init();