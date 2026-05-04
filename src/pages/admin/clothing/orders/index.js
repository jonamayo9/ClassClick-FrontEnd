import { get, post } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth } from "../../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../../shared/js/admin-layout.js";

let company = null;
let orders = [];
let searchText = "";
let statusFilter = "";
let paymentFilter = "";
let periodFilter = getCurrentPeriod();
let fromDateFilter = "";
let toDateFilter = "";

function qs(id) {
    return document.getElementById(id);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function money(value) {
    return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("es-AR");
}

function getCurrentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toDateOnly(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSamePeriod(value, period) {
    if (!value || !period) return true;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    const yyyyMm = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return yyyyMm === period;
}

function goBackToClothing() {
    window.location.href = "/src/pages/admin/Clothing/index.html";
}

function normalize(value) {
    return String(value ?? "").toLowerCase();
}

function orderStatusText(value) {
    const key = normalize(value);

    if (value === 1 || key === "pending") return "Pendiente";
    if (value === 2 || key === "approved") return "Aprobado";
    if (value === 3 || key === "rejected") return "Rechazado";
    if (value === 4 || key === "delivered") return "Entregado";
    if (value === 5 || key === "cancelled") return "Cancelado";

    return String(value ?? "-");
}

function paymentStatusText(value) {
    const key = normalize(value);

    if (value === 0 || key === "none") return "Sin pago";
    if (value === 1 || key === "depositpending") return "Seña pendiente";
    if (value === 2 || key === "depositpaid") return "Seña pagada";
    if (value === 3 || key === "fullpending") return "Pago pendiente";
    if (value === 4 || key === "fullpaid") return "Pago completo";
    if (value === 5 || key === "rejected") return "Pago rechazado";

    return String(value ?? "-");
}

function paymentMethodText(value) {
    const key = normalize(value);

    if (value === 0 || key === "none") return "Sin método";
    if (value === 1 || key === "manualproof") return "Comprobante";
    if (value === 2 || key === "mercadopago") return "Mercado Pago";
    if (value === 3 || key === "cash") return "Efectivo";

    return String(value ?? "-");
}

function statusBadge(value) {
    const key = normalize(value);

    if (value === 1 || key === "pending") {
        return `<span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Pendiente</span>`;
    }

    if (value === 2 || key === "approved") {
        return `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Aprobado</span>`;
    }

    if (value === 3 || key === "rejected") {
        return `<span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Rechazado</span>`;
    }

    if (value === 4 || key === "delivered") {
        return `<span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Entregado</span>`;
    }

    if (value === 5 || key === "cancelled") {
        return `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Cancelado</span>`;
    }

    return `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">${escapeHtml(value)}</span>`;
}

function buildPeriodOptions() {
    const now = new Date();
    const options = [];

    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        const label = date.toLocaleDateString("es-AR", {
            month: "long",
            year: "numeric"
        });

        options.push({
            value,
            label: label.charAt(0).toUpperCase() + label.slice(1) // "Mayo 2026"
        });
    }

    return options;
}

function isPending(order) {
    return order.status === 1 || normalize(order.status) === "pending";
}

function isApproved(order) {
    return order.status === 2 || normalize(order.status) === "approved";
}

function buildContent() {
    return `
        <section class="space-y-6">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Indumentaria</p>
                        <h1 class="mt-2 text-3xl font-bold">Pedidos</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Revisá pedidos, aprobá reservas y marcá entregas.
                        </p>

                        <button id="backToClothingBtn" type="button"
                            class="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">
                            ← Volver a indumentaria
                        </button>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Pedidos</p>
                            <p id="statOrders" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Pendientes</p>
                            <p id="statPending" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Total</p>
                            <p id="statTotal" class="mt-2 text-2xl font-bold">$0</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div class="mb-5">
                    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 class="text-xl font-black text-slate-900">Listado de pedidos</h2>
                            <p class="text-sm text-slate-500">Filtrá y exportá los pedidos de indumentaria.</p>
                        </div>

                        <div class="flex overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
                            <select id="exportTypeFilter"
                                class="h-11 border-r border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none">
                                <option value="excel">Excel</option>
                                <option value="pdf">PDF</option>
                            </select>

                            <button id="exportOrdersBtn" type="button"
                                class="h-11 bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800">
                                Exportar
                            </button>
                        </div>
                    </div>

                    <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div class="grid gap-3 lg:grid-cols-12">
                            <div class="lg:col-span-4">
                                <label class="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Buscar</label>
                                <input id="orderSearchInput" type="text"
                                    class="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                                    placeholder="Alumno, DNI o producto..." />
                            </div>

                            <div class="lg:col-span-2">
                                <label class="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Período</label>
                                <select id="orderPeriodFilter"
                                    class="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold shadow-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100">
                                    ${buildPeriodOptions().map(opt => `
                                        <option value="${opt.value}" ${opt.value === periodFilter ? "selected" : ""}>
                                            ${opt.label}
                                        </option>
                                    `).join("")}
                                </select>
                            </div>

                            <div class="lg:col-span-2">
                                <label class="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Desde</label>
                                <input id="orderFromFilter" type="date"
                                    class="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
                            </div>

                            <div class="lg:col-span-2">
                                <label class="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Hasta</label>
                                <input id="orderToFilter" type="date"
                                    class="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
                            </div>

                            <div class="lg:col-span-2">
                                <label class="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Estado</label>
                                <select id="orderStatusFilter"
                                    class="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100">
                                    <option value="">Todos</option>
                                    <option value="pending">Pendiente</option>
                                    <option value="approved">Aprobado</option>
                                    <option value="rejected">Rechazado</option>
                                    <option value="cancelled">Cancelado</option>
                                    <option value="delivered">Entregado</option>
                                </select>
                            </div>

                            <div class="lg:col-span-3">
                                <label class="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Pago</label>
                                <select id="orderPaymentFilter"
                                    class="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100">
                                    <option value="">Todos</option>
                                    <option value="depositpending">Seña pendiente</option>
                                    <option value="depositpaid">Seña pagada</option>
                                    <option value="fullpending">Pago pendiente</option>
                                    <option value="fullpaid">Pago completo</option>
                                    <option value="rejected">Pago rechazado</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="overflow-hidden rounded-3xl border border-slate-200">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-slate-200 text-sm">
                            <thead class="bg-slate-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Alumno</th>
                                    <th class="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Pedido</th>
                                    <th class="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Pago</th>
                                    <th class="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Importes</th>
                                    <th class="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Estado</th>
                                    <th class="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.14em] text-slate-500">Acción</th>
                                </tr>
                            </thead>

                            <tbody id="ordersRows" class="divide-y divide-slate-100 bg-white"></tbody>
                        </table>
                    </div>
                </div>

                <div id="ordersEmptyState" class="hidden rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
                    <p class="text-sm font-medium text-slate-500">No hay pedidos para mostrar.</p>
                </div>
            </section>

            <div id="ordersModalRoot"></div>
        </section>
    `;
}

function paymentMatches(order) {
    if (!paymentFilter) return true;

    const value = Number(order.paymentStatus);

    if (paymentFilter === "depositpending") return value === 1 || normalize(order.paymentStatus) === "depositpending";
    if (paymentFilter === "depositpaid") return value === 2 || normalize(order.paymentStatus) === "depositpaid";
    if (paymentFilter === "fullpending") return value === 3 || normalize(order.paymentStatus) === "fullpending";
    if (paymentFilter === "fullpaid") return value === 4 || normalize(order.paymentStatus) === "fullpaid";
    if (paymentFilter === "rejected") return value === 5 || normalize(order.paymentStatus) === "rejected";

    return true;
}

function statusMatches(order) {
    if (!statusFilter) return true;

    const value = Number(order.status);

    if (statusFilter === "pending") return value === 1 || normalize(order.status) === "pending";
    if (statusFilter === "approved") return value === 2 || normalize(order.status) === "approved";
    if (statusFilter === "rejected") return value === 3 || normalize(order.status) === "rejected";
    if (statusFilter === "delivered") return value === 4 || normalize(order.status) === "delivered";
    if (statusFilter === "cancelled") return value === 5 || normalize(order.status) === "cancelled";

    return true;
}

function dateMatches(order) {
    const created = toDateOnly(order.createdAtUtc);
    if (!created) return false;

    if (fromDateFilter || toDateFilter) {
        const from = fromDateFilter ? toDateOnly(fromDateFilter) : null;
        const to = toDateFilter ? toDateOnly(toDateFilter) : null;

        if (from && created < from) return false;
        if (to && created > to) return false;

        return true;
    }

    return isSamePeriod(order.createdAtUtc, periodFilter);
}

function orderPriority(order) {
    const status = normalize(order.status);

    if (isPending(order) && order.hasPendingPaymentProof) return 1;
    if (isPending(order)) return 2;
    if (status === "cancelled" || order.status === 5) return 3;
    if (status === "rejected" || order.status === 3) return 4;
    if (status === "approved" || order.status === 2) return 5;
    if (status === "delivered" || order.status === 4) return 6;

    return 99;
}

function sortOrdersByPriority(list) {
    return [...list].sort((a, b) => {
        const pa = orderPriority(a);
        const pb = orderPriority(b);

        if (pa !== pb) return pa - pb;

        return new Date(b.createdAtUtc || 0) - new Date(a.createdAtUtc || 0);
    });
}

function getFilteredOrders() {
    const text = searchText.trim().toLowerCase();

    const filtered = orders.filter(order => {
        const matchesSearch =
            !text ||
            order.studentName?.toLowerCase().includes(text) ||
            order.studentDni?.toLowerCase().includes(text) ||
            order.items?.some(item =>
                item.productName?.toLowerCase().includes(text) ||
                item.variantName?.toLowerCase().includes(text) ||
                item.personalizationText?.toLowerCase().includes(text)
            );

        return matchesSearch &&
            statusMatches(order) &&
            paymentMatches(order) &&
            dateMatches(order);
    });

    return sortOrdersByPriority(filtered);
}

function renderStats() {
    const total = orders.reduce((acc, order) => acc + Number(order.totalAmount || 0), 0);

    qs("statOrders").textContent = String(orders.length);
    qs("statPending").textContent = String(orders.filter(isPending).length);
    qs("statTotal").textContent = money(total);
}

function renderOrdersRows() {
    const tbody = qs("ordersRows");
    const empty = qs("ordersEmptyState");
    const filtered = getFilteredOrders();

    if (!filtered.length) {
        tbody.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    tbody.innerHTML = filtered.map(order => `
        <tr class="hover:bg-slate-50">
            <td class="px-4 py-3">
                <div class="font-black text-slate-900">${escapeHtml(order.studentName || "-")}</div>
                <div class="text-xs text-slate-400">DNI: ${escapeHtml(order.studentDni || "-")}</div>
            </td>

            <td class="px-4 py-3">
                <div class="font-bold text-slate-900">${order.items?.length || 0} item(s)</div>
                <div class="text-xs text-slate-400">${formatDate(order.createdAtUtc)}</div>
            </td>

            <td class="px-4 py-3">
                <div class="font-bold text-slate-700">${paymentStatusText(order.paymentStatus)}</div>
                <div class="text-xs text-slate-400">${paymentMethodText(order.paymentMethod)}</div>
            </td>

            <td class="px-4 py-3">
                <div class="font-black text-slate-900">${money(order.totalAmount)}</div>
                <div class="text-xs text-slate-400">Seña: ${money(order.depositAmount)} · Pendiente: ${money(order.pendingAmount)}</div>
            </td>

            <td class="px-4 py-3">
                ${statusBadge(order.status)}
            </td>

            <td class="px-4 py-3 text-right">
                <button type="button" data-view-order="${order.id}"
                    class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                    Ver
                </button>
            </td>
        </tr>
    `).join("");

    document.querySelectorAll("[data-view-order]").forEach(button => {
        button.addEventListener("click", () => openOrderModal(button.dataset.viewOrder));
    });
}

function setModal(html) {
    qs("ordersModalRoot").innerHTML = html;
}

function proofTypeText(value) {
    const key = normalize(value);

    if (value === 1 || key === "deposit") return "Seña";
    if (value === 2 || key === "full") return "Pago total / restante";

    return "Comprobante";
}

function proofStatusText(value) {
    const key = normalize(value);

    if (value === 1 || key === "pending") return "Pendiente";
    if (value === 2 || key === "approved") return "Aprobado";
    if (value === 3 || key === "rejected") return "Rechazado";

    return String(value ?? "-");
}

function proofStatusBadge(value) {
    const key = normalize(value);

    if (value === 1 || key === "pending") {
        return `<span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Pendiente</span>`;
    }

    if (value === 2 || key === "approved") {
        return `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Aprobado</span>`;
    }

    if (value === 3 || key === "rejected") {
        return `<span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Rechazado</span>`;
    }

    return `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">${escapeHtml(value)}</span>`;
}

function canDeliver(order) {
    return isApproved(order) && Number(order.paymentStatus) === 4;
}

function closeModal() {
    setModal("");
}

function showErrorModal(message) {
    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-xl">⚠️</div>
                <h3 class="text-xl font-black text-slate-900">Algo salió mal</h3>
                <p class="mt-2 text-sm leading-6 text-slate-500">${escapeHtml(message || "No se pudo completar la acción.")}</p>
                <button id="errorCloseBtn" type="button" class="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                    Entendido
                </button>
            </div>
        </div>
    `);

    qs("errorCloseBtn").addEventListener("click", closeModal);
}

function personalizationText(item) {
    if (!item?.personalizationText) return "-";

    const label = item.personalizationLabel || "Personalización";
    return `${label}: ${item.personalizationText}`;
}

async function openOrderModal(orderId) {
    const order = orders.find(x => x.id === orderId);
    if (!order) return;

    let proofs = [];

    try {
        proofs = await get(`/api/admin/${company.slug}/clothing/payment-proofs/by-order/${order.id}`);
        if (!Array.isArray(proofs)) proofs = [];
    } catch (error) {
        proofs = [];
    }

    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div class="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div class="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h3 class="text-xl font-black text-slate-900">Detalle del pedido</h3>
                        <p class="mt-1 text-sm text-slate-500">
                            ${escapeHtml(order.studentName || "-")} · DNI ${escapeHtml(order.studentDni || "-")}
                        </p>
                    </div>

                    <button id="modalCloseBtn" type="button" class="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
                        Cerrar
                    </button>
                </div>

                <div class="grid gap-3 md:grid-cols-4">
                    <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Estado</p>
                        <div class="mt-2">${statusBadge(order.status)}</div>
                    </div>

                    <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Pago</p>
                        <p class="mt-2 text-sm font-black text-slate-900">${paymentStatusText(order.paymentStatus)}</p>
                    </div>

                    <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Método</p>
                        <p class="mt-2 text-sm font-black text-slate-900">${paymentMethodText(order.paymentMethod)}</p>
                    </div>

                    <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Total</p>
                        <p class="mt-2 text-sm font-black text-slate-900">${money(order.totalAmount)}</p>
                    </div>
                </div>

                <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <table class="min-w-full divide-y divide-slate-100 text-sm">
                        <thead class="bg-slate-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Producto</th>
                                <th class="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Variante</th>
                                <th class="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Personalización</th>
                                <th class="px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-500">Cantidad</th>
                                <th class="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.14em] text-slate-500">Subtotal</th>
                            </tr>
                        </thead>

                        <tbody class="divide-y divide-slate-100 bg-white">
                            ${(order.items || []).map(item => `
                                <tr>
                                    <td class="px-4 py-3 font-bold text-slate-900">${escapeHtml(item.productName || "-")}</td>
                                    <td class="px-4 py-3 text-slate-600">${escapeHtml(item.variantName || "-")}</td>
<td class="px-4 py-3">
    ${
        item.personalizationText
            ? `
                <div class="rounded-xl border border-indigo-100 bg-indigo-50 p-2">
                    <p class="text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                        ${escapeHtml(item.personalizationLabel || "Personalización")}
                    </p>
                    <p class="text-sm font-black text-indigo-900">
                        ${escapeHtml(item.personalizationText)}
                    </p>
                </div>
            `
            : `<span class="text-slate-400">-</span>`
    }
</td>
                                    <td class="px-4 py-3 text-center text-slate-600">${item.quantity}</td>
                                    <td class="px-4 py-3 text-right font-black text-slate-900">${money(item.subtotal)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>

                <section class="mt-6 rounded-3xl border border-slate-200 p-5">
                    <div class="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h4 class="text-lg font-black text-slate-900">Comprobantes</h4>
                            <p class="text-sm text-slate-500">Primero se aprueba el comprobante. El pedido se completa recién con pago total.</p>
                        </div>
                    </div>

                    ${
                        proofs.length
                            ? `
                                <div class="space-y-3">
                                    ${proofs.map(proof => `
                                        <div class="rounded-2xl border border-slate-200 p-4">
                                            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                                <div>
                                                    <p class="font-black text-slate-900">${proofTypeText(proof.type)}</p>
                                                    <p class="mt-1 text-xs text-slate-400">
                                                        Subido: ${formatDate(proof.uploadedAtUtc)}
                                                    </p>
                                                    <div class="mt-2">${proofStatusBadge(proof.status)}</div>
                                                    ${proof.reviewNote ? `<p class="mt-2 text-xs font-bold text-slate-500">Nota: ${escapeHtml(proof.reviewNote)}</p>` : ""}
                                                </div>

                                                <div class="flex flex-wrap gap-2">
                                                    <button type="button" data-view-proof="${proof.id}"
                                                        class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                                        Ver comprobante
                                                    </button>

                                                    ${
                                                        Number(proof.status) === 1
                                                            ? `
                                                                <button type="button" data-approve-proof="${proof.id}"
                                                                    class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">
                                                                    Aprobar comprobante
                                                                </button>

                                                                <button type="button" data-reject-proof="${proof.id}"
                                                                    class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700">
                                                                    Rechazar
                                                                </button>
                                                            `
                                                            : ""
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    `).join("")}
                                </div>
                            `
                            : `
                                <div class="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                                    Este pedido todavía no tiene comprobantes cargados.
                                </div>
                            `
                    }
                </section>

                <div class="mt-6 flex flex-wrap justify-end gap-3">
                    ${
                        canDeliver(order)
                            ? `
                                <button id="deliverOrderBtn" type="button" class="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
                                    Marcar entregado
                                </button>
                            `
                            : ""
                    }
                </div>
            </div>
        </div>
    `);

    qs("modalCloseBtn").addEventListener("click", closeModal);

    qs("deliverOrderBtn")?.addEventListener("click", async () => {
        await deliverOrder(order.id);
    });

    document.querySelectorAll("[data-view-proof]").forEach(button => {
        button.addEventListener("click", async () => {
            await openProofViewer(button.dataset.viewProof);
        });
    });

    document.querySelectorAll("[data-approve-proof]").forEach(button => {
        button.addEventListener("click", async () => {
            await approveProof(button.dataset.approveProof, order.id);
        });
    });

    document.querySelectorAll("[data-reject-proof]").forEach(button => {
        button.addEventListener("click", () => {
            openRejectProofModal(button.dataset.rejectProof, order.id);
        });
    });
}

function openRejectModal(orderId) {
    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <h3 class="text-xl font-black text-slate-900">Rechazar pedido</h3>
                <p class="mt-2 text-sm text-slate-500">Ingresá el motivo del rechazo.</p>

                <textarea id="rejectReason" rows="4"
                    class="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    placeholder="Ej: Sin stock real"></textarea>

                <div class="mt-6 flex gap-3">
                    <button id="rejectCancelBtn" type="button" class="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700">
                        Cancelar
                    </button>

                    <button id="rejectConfirmBtn" type="button" class="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white">
                        Rechazar
                    </button>
                </div>
            </div>
        </div>
    `);

    qs("rejectCancelBtn").addEventListener("click", closeModal);

    qs("rejectConfirmBtn").addEventListener("click", async () => {
        await rejectOrder(orderId, qs("rejectReason").value.trim());
    });
}

async function openProofViewer(proofId) {
    try {
        const proof = await get(`/api/admin/${company.slug}/clothing/payment-proofs/${proofId}`);

        setModal(`
            <div class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                <div class="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl">
                    <div class="flex items-center justify-between border-b border-slate-200 p-4">
                        <div>
                            <h3 class="text-lg font-black text-slate-900">Comprobante</h3>
                            <p class="text-xs text-slate-500">${proofTypeText(proof.type)} · ${proofStatusText(proof.status)}</p>
                        </div>

                        <button id="closeProofViewerBtn" type="button"
                            class="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
                            Cerrar
                        </button>
                    </div>

                    <div class="min-h-[70vh] flex-1 bg-slate-100 p-3">
                        <iframe
                            src="${proof.fileUrl}"
                            class="h-[72vh] w-full rounded-2xl border border-slate-200 bg-white"
                        ></iframe>
                    </div>
                </div>
            </div>
        `);

        qs("closeProofViewerBtn").addEventListener("click", closeModal);
    } catch (error) {
        showErrorModal(error?.message || "No se pudo abrir el comprobante.");
    }
}

async function approveProof(proofId, orderId) {
    try {
        await post(`/api/admin/${company.slug}/clothing/payment-proofs/${proofId}/approve`, {
            reviewNote: "Comprobante aprobado"
        });

        await loadOrders();
        await openOrderModal(orderId);
    } catch (error) {
        showErrorModal(error?.message || "No se pudo aprobar el comprobante.");
    }
}

function openRejectProofModal(proofId, orderId) {
    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <h3 class="text-xl font-black text-slate-900">Rechazar comprobante</h3>
                <p class="mt-2 text-sm text-slate-500">Ingresá el motivo del rechazo.</p>

                <textarea id="rejectProofReason" rows="4"
                    class="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    placeholder="Ej: El importe no corresponde"></textarea>

                <div class="mt-6 flex gap-3">
                    <button id="rejectProofCancelBtn" type="button" class="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700">
                        Cancelar
                    </button>

                    <button id="rejectProofConfirmBtn" type="button" class="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white">
                        Rechazar
                    </button>
                </div>
            </div>
        </div>
    `);

    qs("rejectProofCancelBtn").addEventListener("click", () => openOrderModal(orderId));

    qs("rejectProofConfirmBtn").addEventListener("click", async () => {
        await rejectProof(proofId, orderId, qs("rejectProofReason").value.trim());
    });
}

async function rejectProof(proofId, orderId, reason) {
    try {
        await post(`/api/admin/${company.slug}/clothing/payment-proofs/${proofId}/reject`, {
            reviewNote: reason || "Comprobante rechazado"
        });

        await loadOrders();
        await openOrderModal(orderId);
    } catch (error) {
        showErrorModal(error?.message || "No se pudo rechazar el comprobante.");
    }
}

async function rejectOrder(orderId, reason) {
    try {
        await post(`/api/admin/${company.slug}/clothing/orders/${orderId}/reject`, {
            reason: reason || "Pedido rechazado"
        });

        closeModal();
        await loadOrders();
    } catch (error) {
        showErrorModal(error?.message || "No se pudo rechazar el pedido.");
    }
}

async function deliverOrder(orderId) {
    try {
        await post(`/api/admin/${company.slug}/clothing/orders/${orderId}/deliver`, {});
        closeModal();
        await loadOrders();
    } catch (error) {
        showErrorModal(error?.message || "No se pudo marcar como entregado.");
    }
}

function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
}

async function getProofsForOrder(orderId) {
    try {
        const proofs = await get(`/api/admin/${company.slug}/clothing/payment-proofs/by-order/${orderId}`);
        return Array.isArray(proofs) ? proofs : [];
    } catch {
        return [];
    }
}

async function buildExportRows() {
    const filtered = getFilteredOrders();
    const rows = [];

    for (const order of filtered) {
        const proofs = await getProofsForOrder(order.id);
        const proofSummary = proofs.length ? proofs : [null];

        for (const item of order.items || []) {
            for (const proof of proofSummary) {
                rows.push({
                    "ID pedido": order.id,
                    "Fecha creación": formatDate(order.createdAtUtc),
                    "Alumno": order.studentName || "",
                    "DNI": order.studentDni || "",
                    "Estado pedido": orderStatusText(order.status),
                    "Estado pago": paymentStatusText(order.paymentStatus),
                    "Método pago": paymentMethodText(order.paymentMethod),
                    "Total": Number(order.totalAmount || 0),
                    "Seña": Number(order.depositAmount || 0),
                    "Pendiente": Number(order.pendingAmount || 0),
                    "Producto": item.productName || "",
                    "Variante": item.variantName || "",
                    "Cantidad": item.quantity || 0,
                    "Precio unitario": Number(item.unitPrice || 0),
                    "Subtotal": Number(item.subtotal || 0),
                    "Es personalizado": item.personalizationText ? "Sí" : "No",
                    "Campo personalizado": item.personalizationLabel || "",
                    "Valor personalizado": item.personalizationText || "",
                    "Tiene comprobantes": proofs.length ? "Sí" : "No",
                    "Tipo comprobante": proof ? proofTypeText(proof.type) : "",
                    "Estado comprobante": proof ? proofStatusText(proof.status) : "",
                    "Fecha subida comprobante": proof ? formatDate(proof.uploadedAtUtc) : "",
                    "Fecha revisión comprobante": proof ? formatDate(proof.reviewedAtUtc) : "",
                    "Nota revisión": proof?.reviewNote || "",
                    "Fecha aprobado pedido": formatDate(order.approvedAtUtc),
                    "Fecha rechazado pedido": formatDate(order.rejectedAtUtc),
                    "Fecha entregado pedido": formatDate(order.deliveredAtUtc)
                });
            }
        }
    }

    return rows;
}

function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    link.remove();
    URL.revokeObjectURL(url);
}

async function exportOrdersExcel() {
    const rows = await buildExportRows();

    if (!rows.length) {
        showErrorModal("No hay pedidos para exportar.");
        return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
        headers.map(csvEscape).join(";"),
        ...rows.map(row => headers.map(header => csvEscape(row[header])).join(";"))
    ].join("\n");

    downloadFile(`pedidos-indumentaria-${periodFilter || "rango"}.csv`, "\uFEFF" + csv, "text/csv;charset=utf-8;");
}

async function exportOrdersPdf() {
    const rows = await buildExportRows();

    if (!rows.length) {
        showErrorModal("No hay pedidos para exportar.");
        return;
    }

    const htmlRows = rows.map(row => `
        <tr>
            <td>${escapeHtml(row["Fecha creación"])}</td>
            <td>${escapeHtml(row["Alumno"])}</td>
            <td>${escapeHtml(row["DNI"])}</td>
            <td>${escapeHtml(row["Estado pedido"])}</td>
            <td>${escapeHtml(row["Estado pago"])}</td>
            <td>${escapeHtml(row["Producto"])}</td>
            <td>${escapeHtml(row["Variante"])}</td>
            <td>${escapeHtml(row["Valor personalizado"])}</td>
            <td>${escapeHtml(row["Cantidad"])}</td>
            <td>${escapeHtml(row["Subtotal"])}</td>
            <td>${escapeHtml(row["Tipo comprobante"])}</td>
            <td>${escapeHtml(row["Estado comprobante"])}</td>
        </tr>
    `).join("");

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
        <!doctype html>
        <html>
            <head>
                <title>Pedidos de indumentaria</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
                    h1 { margin-bottom: 4px; }
                    p { margin-top: 0; color: #64748b; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; }
                    th { background: #f1f5f9; }
                </style>
            </head>
            <body>
                <h1>Pedidos de indumentaria</h1>
                <p>Período: ${escapeHtml(periodFilter || "-")} · Desde: ${escapeHtml(fromDateFilter || "-")} · Hasta: ${escapeHtml(toDateFilter || "-")}</p>

                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Alumno</th>
                            <th>DNI</th>
                            <th>Estado pedido</th>
                            <th>Estado pago</th>
                            <th>Producto</th>
                            <th>Variante</th>
                            <th>Personalización</th>
                            <th>Cant.</th>
                            <th>Subtotal</th>
                            <th>Tipo comp.</th>
                            <th>Estado comp.</th>
                        </tr>
                    </thead>
                    <tbody>${htmlRows}</tbody>
                </table>

                <script>
                    window.onload = () => {
                        window.print();
                    };
                </script>
            </body>
        </html>
    `);

    printWindow.document.close();
}

async function exportOrders() {
    const type = qs("exportTypeFilter")?.value || "excel";

    if (type === "pdf") {
        await exportOrdersPdf();
        return;
    }

    await exportOrdersExcel();
}

async function loadOrders() {
    const params = new URLSearchParams();

    if (periodFilter) params.set("period", periodFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (paymentFilter) params.set("paymentStatus", paymentFilter);
    if (fromDateFilter) params.set("from", fromDateFilter);
    if (toDateFilter) params.set("to", toDateFilter);

    const query = params.toString();

    orders = await get(`/api/admin/${company.slug}/clothing/orders${query ? `?${query}` : ""}`);

    renderStats();
    renderOrdersRows();
}

async function init() {
    await loadConfig();
    requireAuth();

    qs("app").innerHTML = renderAdminLayout({
        activeKey: "clothing",
        pageTitle: "Pedidos de indumentaria",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;
            await loadOrders();
        }
    });

    company = layout.activeCompany;

    qs("backToClothingBtn").addEventListener("click", goBackToClothing);

    qs("orderSearchInput").addEventListener("input", event => {
        searchText = event.target.value || "";
        renderOrdersRows();
    });

    qs("orderStatusFilter").addEventListener("change", async event => {
        statusFilter = event.target.value || "";
        await loadOrders();
    });

    qs("orderPaymentFilter").addEventListener("change", async event => {
        paymentFilter = event.target.value || "";
        await loadOrders();
    });

    qs("orderPeriodFilter").addEventListener("change", async event => {
        periodFilter = event.target.value || "";
        fromDateFilter = "";
        toDateFilter = "";

        qs("orderFromFilter").value = "";
        qs("orderToFilter").value = "";

        await loadOrders();
    });

    qs("orderFromFilter").addEventListener("change", async event => {
        fromDateFilter = event.target.value || "";

        if (fromDateFilter || toDateFilter) {
            periodFilter = "";
            qs("orderPeriodFilter").value = "";
        }

        await loadOrders();
    });

    qs("orderToFilter").addEventListener("change", async event => {
        toDateFilter = event.target.value || "";

        if (fromDateFilter || toDateFilter) {
            periodFilter = "";
            qs("orderPeriodFilter").value = "";
        }

        await loadOrders();
    });

    qs("exportOrdersBtn").addEventListener("click", exportOrders);

    await loadOrders();
}

init();