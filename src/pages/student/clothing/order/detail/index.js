import { get, postForm } from "../../../../../shared/js/api.js";
import { loadConfig } from "../../../../../shared/js/config.js";
import { requireAuth } from "../../../../../shared/js/session.js";

let companySlug = null;
let orderId = null;
let order = null;
let loading = true;
let error = "";
let proofFile = null;
let uploading = false;
let uiMessage = "";

function qs(id) {
    return document.getElementById(id);
}

function money(value) {
    return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getQueryParam(name) {
    return new URL(window.location.href).searchParams.get(name);
}

function paymentText() {
    const paymentStatus = Number(order?.paymentStatus);

    if (paymentStatus === 2) {
        return "restante";
    }

    return Number(order?.paymentOption) === 1 ? "seña" : "total";
}

function amountToPay() {
    const paymentStatus = Number(order?.paymentStatus);

    if (paymentStatus === 2) {
        return Number(order?.pendingAmount || 0);
    }

    return Number(order?.paymentOption) === 1
        ? Number(order?.depositAmount || 0)
        : Number(order?.pendingAmount || order?.totalAmount || 0);
}

function buildLoading() {
    return `
        <div class="min-h-screen bg-slate-100 p-5">
            <div class="rounded-3xl bg-white p-5 shadow-sm">Cargando pedido...</div>
        </div>
    `;
}

function buildError() {
    return `
        <div class="min-h-screen bg-slate-100 p-5">
            <div class="rounded-3xl bg-white p-5 text-red-600 shadow-sm">${error}</div>
        </div>
    `;
}

function buildContent() {
    const payText = paymentText();

    return `
        <div class="min-h-screen bg-slate-100 p-5">
            <div class="mx-auto max-w-xl space-y-5">

                <section class="rounded-[28px] bg-slate-950 p-5 text-white shadow-sm">
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-2xl">✓</div>
                    <h1 class="mt-4 text-2xl font-black">Pedido confirmado</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Podés cargar el comprobante de pago de la ${payText} cuando corresponda.
                        </p>
                </section>

                ${uiMessage ? `
                    <div class="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                        ${uiMessage}
                    </div>
                ` : ""}

                <section class="rounded-[24px] bg-white p-5 shadow-sm">
    <h2 class="text-lg font-black text-slate-900">Comprobante de pago</h2>

    ${
        order.hasPendingPaymentProof
            ? `
                <div class="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                    Comprobante enviado. Está pendiente de revisión del club.
                </div>
            `
            : canUploadProof()
                ? `
                    <p class="mt-1 text-sm text-slate-500">
                        Subí el comprobante correspondiente al pago de la ${payText}: <b>${money(amountToPay())}</b>
                    </p>

                    <input
                        id="proofInput"
                        type="file"
                        accept="image/*,.pdf"
                        class="mt-4 w-full rounded-2xl border border-slate-300 p-3 text-sm"
                    />

                    <button
                        id="uploadProofBtn"
                        type="button"
                        ${uploading ? "disabled" : ""}
                        class="mt-4 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:opacity-50"
                    >
                        ${uploading ? "Subiendo..." : "Subir comprobante"}
                    </button>
                `
                : `
                    <div class="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                        No hay acciones pendientes para este pedido.
                    </div>
                `
    }
</section>

                <section class="rounded-[24px] bg-white p-5 shadow-sm">
                    <h2 class="text-lg font-black text-slate-900">Productos</h2>

                    <div class="mt-4 space-y-3">
                        ${order.items.map(item => `
                            <div class="rounded-2xl border border-slate-200 p-4">
                                <p class="font-black text-slate-900">${item.productName}</p>
                                ${item.variantName ? `<p class="text-xs text-slate-500">Variante: ${item.variantName}</p>` : ""}
                                ${
    item.personalizationText
        ? `<p class="text-xs font-bold text-sky-700">
             ${escapeHtml(item.personalizationLabel || "Personalización")}: ${escapeHtml(item.personalizationText)}
           </p>`
        : ""
}
                                <div class="mt-2 flex justify-between text-sm">
                                    <span class="text-slate-500">${item.quantity} × ${money(item.unitPrice)}</span>
                                    <span class="font-black">${money(item.subtotal)}</span>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </section>

                <button
                    id="myOrdersBtn"
                    type="button"
                    class="w-full rounded-2xl border border-slate-300 bg-white py-4 font-black text-slate-800"
                >
                    Ir a mis pedidos
                </button>

                <button
                    id="backBtn"
                    type="button"
                    class="w-full rounded-2xl py-3 font-bold text-slate-500"
                >
                    Volver al catálogo
                </button>
            </div>
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
    qs("proofInput")?.addEventListener("change", event => {
        proofFile = event.target.files?.[0] || null;
    });

    qs("uploadProofBtn")?.addEventListener("click", uploadProof);

    qs("myOrdersBtn")?.addEventListener("click", () => {
        window.location.href = "/src/pages/student/clothing/orders/index.html";
    });

    qs("backBtn")?.addEventListener("click", () => {
        window.location.href = "/src/pages/student/clothing/catalog/index.html";
    });
}

async function uploadProof() {
    if (!proofFile) {
        alert("Seleccioná un comprobante.");
        return;
    }

    try {
        uploading = true;
        rerender();

        const formData = new FormData();
        formData.append("file", proofFile);

        await postForm(`/api/student/${companySlug}/clothing/orders/${orderId}/payment-proof`, formData);

        proofFile = null;
        order.hasPendingPaymentProof = true;
        uiMessage = "Comprobante subido correctamente. El club revisará el pago.";

    } catch (err) {
        alert(err?.message || "No se pudo subir el comprobante.");
    } finally {
        uploading = false;
        rerender();
    }
}

function canUploadProof() {
    if (order?.hasPendingPaymentProof) return false;

    const paymentStatus = Number(order?.paymentStatus);
    const orderStatus = Number(order?.status);

    return orderStatus === 1 && (
        paymentStatus === 1 ||
        paymentStatus === 2 ||
        paymentStatus === 3 ||
        paymentStatus === 5
    );
}

async function loadOrder() {
    return await get(`/api/student/${companySlug}/clothing/orders/${orderId}`);
}

async function init() {
    try {
        await loadConfig();

        const session = requireAuth();
        if (!session) return;

        companySlug = session.activeCompanySlug;
        orderId = getQueryParam("id") || sessionStorage.getItem("lastClothingOrderId");

        if (!orderId) {
            throw new Error("Pedido inválido");
        }

        order = await loadOrder();
        order.items = order.items || order.Items || [];
    } catch (err) {
        error = err?.message || "Error cargando pedido";
    } finally {
        loading = false;
        rerender();
    }
}

init();