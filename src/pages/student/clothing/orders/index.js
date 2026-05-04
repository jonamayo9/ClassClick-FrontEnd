import { get, postForm } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth } from "../../../../shared/js/session.js";
import {
    getMe,
    setMe,
    getActiveCompany,
    setActiveCompany
} from "../../../../shared/js/storage.js";

let companySlug = null;
let sessionData = null;
let orders = [];
let loading = true;
let error = "";

let selectedOrder = null;
let selectedOrderProofs = [];
let proofViewerUrl = "";
let proofViewerTitle = "";
let proofFile = null;
let uploadingProof = false;
let uiMessage = "";
let company = null;

function qs(id) {
    return document.getElementById(id);
}

function money(value) {
    return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-AR");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function getOrderStatusLabel(status) {
    switch (Number(status)) {
        case 1: return "Pendiente";
        case 2: return "Aprobado";
        case 3: return "Rechazado";
        case 4: return "Entregado";
        case 5: return "Cancelado";
        default: return "Sin estado";
    }
}

function getOrderStatusClass(status) {
    switch (Number(status)) {
        case 1: return "bg-amber-50 text-amber-700";
        case 2: return "bg-emerald-50 text-emerald-700";
        case 3: return "bg-rose-50 text-rose-700";
        case 4: return "bg-blue-50 text-blue-700";
        case 5: return "bg-slate-100 text-slate-600";
        default: return "bg-slate-100 text-slate-600";
    }
}

function getPaymentOptionLabel(order) {
    return Number(order.paymentOption) === 1 ? "Seña" : "Total";
}

function getPaymentStatusLabel(status) {
    switch (Number(status)) {
        case 0: return "Sin pago";
        case 1: return "Seña pendiente";
        case 2: return "Seña pagada";
        case 3: return "Pago total pendiente";
        case 4: return "Pago total aprobado";
        case 5: return "Pago rechazado";
        default: return "Pago pendiente";
    }
}

function getPaymentStatusClass(status) {
    switch (Number(status)) {
        case 1:
        case 3:
            return "bg-orange-50 text-orange-700";
        case 2:
        case 4:
            return "bg-emerald-50 text-emerald-700";
        case 5:
            return "bg-rose-50 text-rose-700";
        default:
            return "bg-slate-100 text-slate-600";
    }
}

function getCompanyName() {
    return company?.companyName?.trim() || companySlug || "";
}

function isSasUrlExpired(url) {
    if (!url) return true;

    try {
        const parsedUrl = new URL(url);
        const expires = parsedUrl.searchParams.get("se");

        if (!expires) return false;

        const expiresAt = new Date(expires).getTime();

        return Date.now() > expiresAt - 5 * 60 * 1000;
    } catch {
        return true;
    }
}

function getAmountToPay(order) {
    const paymentStatus = Number(order.paymentStatus);

    if (paymentStatus === 2) {
        return Number(order.pendingAmount || 0);
    }

    if (Number(order.paymentOption) === 1) {
        return Number(order.depositAmount || 0);
    }

    return Number(order.pendingAmount || order.totalAmount || 0);
}

function getProofPaymentText(order) {
    const paymentStatus = Number(order.paymentStatus);

    if (paymentStatus === 2) {
        return "restante";
    }

    return Number(order.paymentOption) === 1 ? "seña" : "total";
}

function canUploadProof(order) {
    if (order.hasPendingPaymentProof) return false;

    const paymentStatus = Number(order.paymentStatus);
    const orderStatus = Number(order.status);

    return orderStatus === 1 && (
        paymentStatus === 1 ||
        paymentStatus === 2 ||
        paymentStatus === 3 ||
        paymentStatus === 5
    );
}
function buildLoading() {
    return `
        <div class="min-h-screen bg-slate-100 p-5">
            <div class="rounded-3xl bg-white p-5 shadow-sm">Cargando pedidos...</div>
        </div>
    `;
}

function buildError() {
    return `
        <div class="min-h-screen bg-slate-100 p-5">
            <div class="rounded-3xl bg-white p-5 text-red-600 shadow-sm">${escapeHtml(error)}</div>
        </div>
    `;
}

function buildEmpty() {
    return `
        <div class="min-h-screen bg-slate-100 p-5">
            <div class="mx-auto max-w-xl space-y-4">
                <section class="rounded-[28px] bg-slate-950 p-5 text-white">
                    <p class="text-xs uppercase tracking-[0.25em] text-slate-300">
                        ${escapeHtml(getCompanyName())}
                    </p>
                    <p class="text-xs uppercase tracking-[0.25em] text-slate-400">
                        Indumentaria
                    </p>
                    <h1 class="mt-2 text-2xl font-black">Mis pedidos</h1>
                </section>

                <div class="rounded-3xl bg-white p-8 text-center shadow-sm">
                    <p class="text-sm font-bold text-slate-500">Todavía no tenés pedidos.</p>
                    <button id="backBtn" class="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
                        Ir al catálogo
                    </button>
                </div>
            </div>
        </div>
    `;
}

function buildOrderCard(order) {
    const statusLabel = getOrderStatusLabel(order.status);
    const paymentLabel = getPaymentStatusLabel(order.paymentStatus);
    const amountToPay = getAmountToPay(order);

    return `
        <article class="rounded-[26px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        Pedido
                    </p>
                    <h2 class="mt-1 text-lg font-black text-slate-900">
                        ${formatDate(order.createdAtUtc)}
                    </h2>
                </div>

                <span class="rounded-full px-3 py-1 text-xs font-black ${getOrderStatusClass(order.status)}">
                    ${statusLabel}
                </span>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3">
                <div class="rounded-2xl bg-slate-50 p-3">
                    <p class="text-xs font-bold text-slate-400">Forma elegida</p>
                    <p class="mt-1 font-black text-slate-900">${getPaymentOptionLabel(order)}</p>
                </div>

                <div class="rounded-2xl bg-slate-50 p-3">
                    <p class="text-xs font-bold text-slate-400">Pago</p>
                    <p class="mt-1 text-sm font-black ${getPaymentStatusClass(order.paymentStatus)} rounded-full px-2 py-1 inline-block">
                        ${paymentLabel}
                    </p>
                </div>
            </div>

            <div class="mt-4 space-y-2 rounded-2xl border border-slate-200 p-4">
                <div class="flex justify-between text-sm">
                    <span class="font-bold text-slate-500">Total pedido</span>
                    <span class="font-black text-slate-900">${money(order.totalAmount)}</span>
                </div>

                ${
                    Number(order.paymentOption) === 1
                        ? `
                        <div class="flex justify-between text-sm text-orange-600">
                            <span class="font-bold">${Number(order.paymentStatus) === 2 ? "Restante a cargar" : "Seña a cargar"}</span>
                            <span class="font-black">${money(amountToPay)}</span>
                        </div>
                        <div class="flex justify-between text-sm text-slate-500">
                            <span class="font-bold">Restante</span>
                            <span class="font-black">${money(order.pendingAmount)}</span>
                        </div>
                        `
                        : `
                        <div class="flex justify-between text-sm text-slate-900">
                            <span class="font-bold">Total a cargar</span>
                            <span class="font-black">${money(amountToPay)}</span>
                        </div>
                        `
                }
            </div>

            <button
                data-open-order="${order.id}"
                type="button"
                class="mt-4 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white"
            >
                ${
    canUploadProof(order)
        ? `Cargar comprobante de ${getProofPaymentText(order)}`
        : "Ver detalle"
}
            </button>
        </article>
    `;
}

function getProofTypeLabel(type) {
    switch (Number(type)) {
        case 1: return "Seña";
        case 2: return "Pago total / restante";
        default: return "Comprobante";
    }
}

function getProofStatusLabel(status) {
    switch (Number(status)) {
        case 1: return "Pendiente";
        case 2: return "Aprobado";
        case 3: return "Rechazado";
        default: return "Sin estado";
    }
}

function getProofStatusClass(status) {
    switch (Number(status)) {
        case 1: return "bg-amber-50 text-amber-700";
        case 2: return "bg-emerald-50 text-emerald-700";
        case 3: return "bg-rose-50 text-rose-700";
        default: return "bg-slate-100 text-slate-600";
    }
}

function getSelectedViewerProof() {
    return selectedOrderProofs.find(x => x.fileUrl === proofViewerUrl) || null;
}

function buildProofViewer() {
    if (!proofViewerUrl) return "";

    const proof = getSelectedViewerProof();
    const isImage = proof?.isImage === true;
    const isPdf = proof?.isPdf === true;

    const viewerContent = isImage
        ? `
            <div class="flex h-[72vh] w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                <img
                    src="${escapeHtml(proofViewerUrl)}"
                    alt="Comprobante"
                    class="max-h-full max-w-full object-contain"
                />
            </div>
        `
        : `
            <iframe
                src="${escapeHtml(proofViewerUrl)}"
                class="h-[72vh] w-full rounded-2xl border border-slate-200 bg-white"
            ></iframe>
        `;

    return `
        <div class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div class="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-[28px] bg-white shadow-2xl">
                <div class="flex items-center justify-between border-b border-slate-200 p-4">
                    <div>
                        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Comprobante</p>
                        <h3 class="text-lg font-black text-slate-900">${escapeHtml(proofViewerTitle || "Visualización")}</h3>
                    </div>

                    <button id="closeProofViewerBtn" type="button" class="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold">
                        Cerrar
                    </button>
                </div>

                <div class="min-h-[70vh] flex-1 bg-slate-100 p-3">
                    ${viewerContent}
                </div>
            </div>
        </div>
    `;
}

function buildModal() {
    if (!selectedOrder) return "";

    const order = selectedOrder;
    const canUpload = canUploadProof(order);
    const amountToPay = getAmountToPay(order);
    const payText = getProofPaymentText(order);

    return `
        <div class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div class="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-[30px] bg-white shadow-2xl">
                <div class="sticky top-0 z-10 border-b border-slate-200 bg-white p-5">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Detalle</p>
                            <h2 class="mt-1 text-2xl font-black text-slate-900">Pedido</h2>
                        </div>

                        <button id="closeOrderModalBtn" type="button" class="rounded-full bg-slate-100 px-3 py-2 text-sm font-black">
                            ×
                        </button>
                    </div>
                </div>

                <div class="space-y-4 p-5">
                    ${uiMessage ? `
                        <div class="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                            ${escapeHtml(uiMessage)}
                        </div>
                    ` : ""}

                    <div class="grid grid-cols-2 gap-3">
                        <div class="rounded-2xl bg-slate-50 p-4">
                            <p class="text-xs font-bold text-slate-400">Estado</p>
                            <p class="mt-1 inline-block rounded-full px-3 py-1 text-xs font-black ${getOrderStatusClass(order.status)}">
                                ${getOrderStatusLabel(order.status)}
                            </p>
                        </div>

                        <div class="rounded-2xl bg-slate-50 p-4">
                            <p class="text-xs font-bold text-slate-400">Pago</p>
                            <p class="mt-1 inline-block rounded-full px-3 py-1 text-xs font-black ${getPaymentStatusClass(order.paymentStatus)}">
                                ${getPaymentStatusLabel(order.paymentStatus)}
                            </p>
                        </div>
                    </div>

                    <section class="rounded-2xl border border-slate-200 p-4">
                        <h3 class="font-black text-slate-900">Importes</h3>

                        <div class="mt-3 space-y-2">
                            <div class="flex justify-between text-sm">
                                <span class="font-bold text-slate-500">Total pedido</span>
                                <span class="font-black">${money(order.totalAmount)}</span>
                            </div>

                            ${
                                Number(order.paymentOption) === 1
                                    ? `
                                    <div class="flex justify-between text-sm text-orange-600">
                                        <span class="font-bold">Seña</span>
                                        <span class="font-black">${money(order.depositAmount)}</span>
                                    </div>
                                    <div class="flex justify-between text-sm text-slate-500">
                                        <span class="font-bold">Restante</span>
                                        <span class="font-black">${money(order.pendingAmount)}</span>
                                    </div>
                                    `
                                    : `
                                    <div class="flex justify-between text-sm text-slate-900">
                                        <span class="font-bold">Total a pagar</span>
                                        <span class="font-black">${money(amountToPay)}</span>
                                    </div>
                                    `
                            }
                        </div>
                    </section>

                    <section>
                        <h3 class="mb-3 font-black text-slate-900">Productos</h3>

                        <div class="space-y-3">
                            ${(order.items || []).map(item => `
                                <div class="rounded-2xl border border-slate-200 p-4">
                                    <div class="flex justify-between gap-3">
                                        <div>
                                            <p class="font-black text-slate-900">${escapeHtml(item.productName)}</p>
                                            ${item.variantName ? `<p class="text-xs font-bold text-slate-400">Variante: ${escapeHtml(item.variantName)}</p>` : ""}
                                            ${
    item.personalizationText
        ? `<p class="text-xs font-bold text-sky-700">
            ${escapeHtml(item.personalizationLabel || "Personalización")}: ${escapeHtml(item.personalizationText)}
           </p>`
        : ""
}
                                            <p class="mt-1 text-sm text-slate-500">${item.quantity} × ${money(item.unitPrice)}</p>
                                        </div>

                                        <p class="font-black text-slate-900">${money(item.subtotal)}</p>
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </section>
<section class="rounded-2xl border border-slate-200 p-4">
    <h3 class="font-black text-slate-900">Comprobantes</h3>

    <div class="mt-3 space-y-3">
        ${
            selectedOrderProofs.length
                ? selectedOrderProofs.map(proof => `
                    <div class="rounded-2xl bg-slate-50 p-3">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <p class="font-black text-slate-900">${getProofTypeLabel(proof.type)}</p>
                                <p class="mt-1 text-xs font-bold text-slate-400">
                                    ${formatDate(proof.uploadedAtUtc)}
                                </p>
                                ${
                                    proof.reviewNote
                                        ? `<p class="mt-2 text-xs font-bold text-slate-500">${escapeHtml(proof.reviewNote)}</p>`
                                        : ""
                                }
                            </div>

                            <span class="rounded-full px-3 py-1 text-xs font-black ${getProofStatusClass(proof.status)}">
                                ${getProofStatusLabel(proof.status)}
                            </span>
                        </div>

                        <button
                            type="button"
                            data-view-proof="${proof.id}"
                            class="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700"
                        >
                            Ver comprobante
                        </button>
                    </div>
                `).join("")
                : `<p class="text-sm font-bold text-slate-500">Todavía no cargaste comprobantes.</p>`
        }
    </div>
</section>
                    ${
                        canUpload
                            ? `
                            <section class="rounded-2xl bg-orange-50 p-4">
                                <h3 class="font-black text-orange-900">Cargar comprobante</h3>
                                <p class="mt-1 text-sm text-orange-700">
                                    Subí el comprobante del pago de la ${payText}: <b>${money(amountToPay)}</b>
                                </p>

                                <input
                                    id="proofInput"
                                    type="file"
                                    accept="image/*,.pdf"
                                    class="mt-4 w-full rounded-2xl border border-orange-200 bg-white p-3 text-sm"
                                />

                                <button
                                    id="uploadProofBtn"
                                    type="button"
                                    ${uploadingProof ? "disabled" : ""}
                                    class="mt-3 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:opacity-50"
                                >
                                    ${uploadingProof ? "Subiendo..." : "Subir comprobante"}
                                </button>
                            </section>
                            `
                            : `
                            <section class="rounded-2xl bg-slate-50 p-4">
                                <p class="text-sm font-bold text-slate-500">
${
    order.hasPendingPaymentProof
        ? "Comprobante enviado. Está pendiente de revisión del club."
        : "No hay acciones pendientes para este pedido."
}
                                </p>
                            </section>
                            `
                    }
                </div>
            </div>
        </div>
    `;
}

function buildContent() {
    if (!orders.length) return buildEmpty();

const pendingOrders = orders.filter(o => {
    return canUploadProof(o) || o.hasPendingPaymentProof;
});

const completedOrders = orders.filter(o => {
    return !canUploadProof(o) && !o.hasPendingPaymentProof;
});

    return `
        <div class="min-h-screen bg-slate-100 p-5 pb-[180px]">
            <div class="mx-auto max-w-xl space-y-4">
                <section class="rounded-[28px] bg-slate-950 p-5 text-white shadow-sm">
    <div class="flex items-center justify-between">

        <button id="backBtnHeader"
            class="rounded-xl bg-white/10 px-3 py-2 text-sm font-black">
            ←
        </button>

        <div class="text-right">
            <p class="text-xs uppercase tracking-[0.25em] text-slate-300">
                ${escapeHtml(getCompanyName())}
            </p>
            <p class="text-xs uppercase tracking-[0.25em] text-slate-400">
                Indumentaria
            </p>
            <h1 class="mt-1 text-2xl font-black">Mis pedidos</h1>
        </div>

    </div>

    <p class="mt-3 text-sm text-slate-300">
        Revisá tus pedidos y cargá el comprobante cuando corresponda.
    </p>
</section>

                <section>
    <h2 class="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
        Pendientes
    </h2>

    <div class="mt-3 space-y-4">
        ${pendingOrders.length
            ? pendingOrders.map(buildOrderCard).join("")
            : `<p class="text-sm text-slate-400 font-bold">No tenés pedidos pendientes.</p>`
        }
    </div>
</section>

<section class="pt-4">
    <button id="toggleHistoryBtn"
        class="w-full rounded-2xl border border-slate-300 bg-white py-3 font-black text-slate-700">
        Ver pedidos anteriores
    </button>

    <div id="historyContainer" class="mt-4 space-y-4 hidden">
        ${completedOrders.map(buildOrderCard).join("")}
    </div>
</section>
            </div>

            ${buildModal()}
            ${buildProofViewer()}
        </div>
    `;
}


function render() {
    if (loading) return buildLoading();
    if (error) return buildError();
    return buildContent();
}

function rerender() {
    const app = qs("app");
    if (!app) return;

    app.innerHTML = render();
    bindEvents();
}

function bindEvents() {
    document.querySelectorAll("[data-open-order]").forEach(btn => {
btn.addEventListener("click", async () => {
    selectedOrder = orders.find(x => x.id === btn.dataset.openOrder) || null;
    selectedOrderProofs = [];
    proofFile = null;
    uiMessage = "";

    if (selectedOrder) {
        try {
            const result = await get(`/api/student/${companySlug}/clothing/orders/${selectedOrder.id}/payment-proofs`);
            selectedOrderProofs = Array.isArray(result) ? result : [];
        } catch {
            selectedOrderProofs = [];
        }
    }

    rerender();
});
    });

    qs("closeOrderModalBtn")?.addEventListener("click", () => {
        selectedOrder = null;
        proofFile = null;
        uiMessage = "";
        rerender();
    });

    qs("backBtnHeader")?.addEventListener("click", () => {
    window.location.href = "/src/pages/student/clothing/catalog/index.html";
});

    qs("proofInput")?.addEventListener("change", event => {
        proofFile = event.target.files?.[0] || null;
    });

    qs("uploadProofBtn")?.addEventListener("click", uploadProof);

    document.querySelectorAll("[data-view-proof]").forEach(btn => {
    btn.addEventListener("click", () => {
        const proof = selectedOrderProofs.find(x => x.id === btn.dataset.viewProof);
        if (!proof?.fileUrl) return;

        proofViewerUrl = proof.fileUrl;
        proofViewerTitle = `${getProofTypeLabel(proof.type)} · ${getProofStatusLabel(proof.status)}`;
        rerender();
    });
});

qs("closeProofViewerBtn")?.addEventListener("click", () => {
    proofViewerUrl = "";
    proofViewerTitle = "";
    rerender();
});

    qs("backBtn")?.addEventListener("click", () => {
        window.location.href = "/src/pages/student/clothing/catalog/index.html";
    });
    qs("toggleHistoryBtn")?.addEventListener("click", () => {
    const container = qs("historyContainer");
    container.classList.toggle("hidden");
});
}

async function uploadProof() {
    if (!selectedOrder) return;

    if (!proofFile) {
        alert("Seleccioná un comprobante.");
        return;
    }

    try {
        uploadingProof = true;
        rerender();

        const formData = new FormData();
        formData.append("file", proofFile);

        await postForm(`/api/student/${companySlug}/clothing/orders/${selectedOrder.id}/payment-proof`, formData);

        orders = await loadOrders();
        selectedOrder = orders.find(x => x.id === selectedOrder.id) || selectedOrder;

        const proofs = await get(`/api/student/${companySlug}/clothing/orders/${selectedOrder.id}/payment-proofs`);
        selectedOrderProofs = Array.isArray(proofs) ? proofs : [];

        proofFile = null;
        uiMessage = "Comprobante subido correctamente. El club revisará el pago.";
    } catch (err) {
        alert(err?.message || "No se pudo subir el comprobante.");
    } finally {
        uploadingProof = false;
        rerender();
    }
}

async function loadOrders() {
    return await get(`/api/student/${companySlug}/clothing/orders`);
}

async function init() {
    try {
        await loadConfig();

        sessionData = requireAuth();
        if (!sessionData) return;

        companySlug = sessionData.activeCompanySlug;

        let cachedCompany = getActiveCompany(companySlug);

let me = getMe();

const companyFromMe = me?.companies?.find(x => x.companySlug === companySlug);
const logoUrl = companyFromMe?.logoUrl || companyFromMe?.LogoUrl;

if (!me || isSasUrlExpired(logoUrl)) {
    me = await get("/api/admin/me");
    setMe(me);
}

company = (me.companies || []).find(x => x.companySlug === companySlug) || cachedCompany || null;

if (company) {
    setActiveCompany(companySlug, company);
}

        orders = await loadOrders();

        if (!Array.isArray(orders)) {
            orders = [];
        }
    } catch (err) {
        error = err?.message || "Error cargando pedidos";
    } finally {
        loading = false;
        rerender();
    }
}

init();