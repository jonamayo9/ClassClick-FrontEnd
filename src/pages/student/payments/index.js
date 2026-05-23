import { get, post, postForm, ensureFreshAccessToken } from "../../../shared/js/api.js";
import { loadConfig, getApiBaseUrl } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { logoutAndRedirect } from "../../../shared/js/session.js";
import {
    buildStudentMobileMenu,
    buildStudentMobileBottomNav,
    bindStudentMobileShellEvents,
    syncStudentMobileShellScrollLock,
    enableStudentSoftNavigation
} from "../../../shared/js/student-mobile-shell.js";
import {
    buildStudentCarnetModal,
    bindStudentCarnetEvents
} from "../../../shared/js/student-carnet.js";
import { initNotificationsBell } from "../../../shared/js/notifications-bell.js";
import {
    getMe,
    setMe,
    getStudentMe,
    setStudentMe,
    getActiveCompany,
    setActiveCompany,
    getPayments,
    setPayments
} from "../../../shared/js/storage.js";
import {
    buildStudentSidebar,
    bindStudentLayoutEvents
} from "../../../shared/js/student-layout.js";
import { initTheme, applyThemePreference } from "../../../shared/js/theme.js";

let companySlug = null;
let company = null;
let student = null;
let payments = [];
let transferInfo = null;
let paymentMethods = [];
let selectedPayChargeId = null;
let selectedPayMethod = null;
let selectedTransferPaymentMethod = null;
let selectedPayPreview = null;
let mobileMenuOpen = false;
let loading = true;
let pageError = "";
let selectedPaymentId = null;
let selectedTransferItem = null;
let aliasCopied = false;
let uploadingProof = false;
let uiMessage = {
    type: "",
    text: ""
};
let carnetOpen = false;
let isUploadingProof = false;
let selectedProofFile = null;
let chargeDetailModal = {
    open: false,
    item: null
};
let proofViewer = {
    open: false,
    loading: false,
    paymentId: null,
    url: "",
    fileName: "",
    contentType: "",
    isImage: false,
    isPdf: false
};

const REQUEST_TIMEOUT_MS = 45000;

function openChargeDetailModal(chargeId) {
    const item = payments.find(x =>
        String(x.chargeId || "") === String(chargeId)
    );

    if (!item) return;

    chargeDetailModal = {
        open: true,
        item
    };

    rerender();
}

function closeChargeDetailModal() {
    chargeDetailModal = {
        open: false,
        item: null
    };

    rerender();
}

function withTimeout(promise, message = "La solicitud tardó demasiado. Cerrá y volvé a abrir la pantalla.") {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(message)), REQUEST_TIMEOUT_MS)
        )
    ]);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function isSasUrlExpired(url) {
    if (!url) return true;

    try {
        const parsedUrl = new URL(url);
        const expires = parsedUrl.searchParams.get("se");

        if (!expires) return true;

        const expiresAt = new Date(expires).getTime();

        return Date.now() > expiresAt - 5 * 60 * 1000;
    } catch {
        return true;
    }
}

function setUiMessage(type, text) {
    uiMessage = {
        type: type || "",
        text: text || ""
    };
}

function clearUiMessage() {
    uiMessage = {
        type: "",
        text: ""
    };
}

function buildUiMessage() {
    if (!uiMessage?.text) return "";

    const classes =
        uiMessage.type === "error"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : uiMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200";

    return `
        <section class="rounded-2xl border px-4 py-3 text-sm font-medium ${classes}">
            ${escapeHtml(uiMessage.text)}
        </section>
    `;
}

function getCompanyName() {
    return company?.companyName?.trim() || "";
}

function getCompanyLogoUrl() {
    return (company?.logoUrl || company?.LogoUrl || "").trim();
}

function getStudentFullName() {
    const fullName = student?.fullName?.trim();
    if (fullName) return fullName;

    const composed = [student?.firstName, student?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    return composed || "";
}

function getStudentEmail() {
    return student?.email?.trim() || "";
}

function getInitials(text) {
    const parts = String(text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (!parts.length) return "";
    return parts.map(x => x.charAt(0).toUpperCase()).join("");
}

function buildCompanyLogo(size = "h-16 w-16", rounded = "rounded-2xl") {
    const logoUrl = getCompanyLogoUrl();
    const initials = getInitials(getCompanyName());

    if (!logoUrl && !initials) {
        return `
            <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white text-xs font-bold text-slate-400 shadow-sm">
                —
            </div>
        `;
    }

    if (!logoUrl) {
        return `
            <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm">
                ${escapeHtml(initials)}
            </div>
        `;
    }

    return `
        <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white shadow-sm">
            <img
                src="${escapeHtml(logoUrl)}"
                alt="Logo empresa"
                class="block h-full w-full object-cover"
                onerror="this.remove(); this.parentElement.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200&quot;>${escapeHtml(initials || "—")}</div>';"
            />
        </div>
    `;
}

function buildSidebarLink(label, href, active = false) {
    return `
        <a
            href="${href}"
            class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }"
        >
            ${escapeHtml(label)}
        </a>
    `;
}

function buildMobileHeader() {
    return `
        <header class="sticky top-0 z-30 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
            <div class="flex items-center justify-between px-4 py-3">

                <div class="flex min-w-0 items-center gap-3">

                    ${buildCompanyLogo("h-11 w-11", "rounded-2xl")}

                    <div class="min-w-0">
                        <div class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            ${escapeHtml(getCompanyName() || "Mi club")}
                        </div>

                        <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                            ${escapeHtml(getStudentFullName() || "Alumno")}
                        </div>
                    </div>

                </div>

                <div id="studentNotificationsBellMobile"></div>

            </div>
        </header>
    `;
}


function buildTopBar() {
    return `
        <section class="hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
            <div class="flex items-center justify-between gap-4">
                <div class="flex min-w-0 items-center gap-3">
                    ${buildCompanyLogo("h-16 w-16")}

                    <div class="min-w-0">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Empresa
                        </div>

                        <h1 class="mt-1 truncate text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                            ${escapeHtml(getCompanyName() || "—")}
                        </h1>
                    </div>
                </div>

                <div id="studentNotificationsBellDesktop"></div>
            </div>
        </section>
    `;
}

function money(value) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
    }).format(Number(value || 0));
}

function formatMonthYear(month, year) {
    if (!month || !year) return "Período";
    return `${String(month).padStart(2, "0")}/${year}`;
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function getPaymentMethodLabel(payment) {
    const method = String(payment?.paymentMethod ?? "");

    switch (method) {
        case "Transfer":
        case "transfer":
        case "2":
            return "Transferencia";
        case "Cash":
        case "cash":
        case "1":
            return "Efectivo";
        default:
            return "Sin seleccionar";
    }
}

function normalizePaymentStatus(value) {
    const raw = String(value ?? "").trim().toLowerCase();

    if (raw === "1" || raw === "pending") return "pending";
    if (raw === "2" || raw === "inreview") return "inreview";
    if (raw === "3" || raw === "approved") return "approved";
    if (raw === "4" || raw === "rejected") return "rejected";

    return "";
}

function normalizeChargeStatus(value) {
    const raw = String(value ?? "").trim().toLowerCase();

    if (raw === "1" || raw === "pending") return "pending";
    if (raw === "2" || raw === "paid") return "paid";
    if (raw === "3" || raw === "overdue") return "overdue";
    if (raw === "4" || raw === "cancelled") return "cancelled";

    return "";
}

function buildPageHeader() {
    const total = payments.length;
const pending = payments.filter(x => {
    const s = String(x?.paymentStatus ?? "").toLowerCase();
    return s === "pending" || s === "rejected";
}).length;

    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Panel alumno
                    </div>
                    <h2 class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Mis pagos</h2>
                    <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Acá vas a poder ver tus facturas, elegir transferencia y subir comprobantes.
                    </p>
                </div>

                <div class="flex flex-wrap gap-2">
                    <div class="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        ${total} ${total === 1 ? "factura" : "facturas"}
                    </div>
                    <div class="inline-flex rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                        ${pending} pendientes
                    </div>
                </div>
            </div>
        </section>
    `;
}

function getBillingStatusLabel(item) {
    const paymentStatus = normalizePaymentStatus(item?.paymentStatus);
    const chargeStatus = normalizeChargeStatus(item?.chargeStatus);

    if (paymentStatus === "approved") {
        return {
            text: "Aprobado",
            classes: "bg-emerald-50 text-emerald-700"
        };
    }

    if (paymentStatus === "rejected") {
        return {
            text: "Rechazado",
            classes: "bg-rose-50 text-rose-700"
        };
    }

    if (paymentStatus === "inreview") {
        return {
            text: "Esperando aprobación",
            classes: "bg-amber-50 text-amber-700"
        };
    }

    if (chargeStatus === "paid") {
        return {
            text: "Pagado",
            classes: "bg-emerald-50 text-emerald-700"
        };
    }

    if (chargeStatus === "overdue") {
        return {
            text: "Vencida",
            classes: "bg-rose-50 text-rose-700"
        };
    }

    return {
        text: "Pendiente",
        classes: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200"
    };
}

function hasScholarship(item) {
    return !!item?.hasScholarship && Number(item?.scholarshipDiscountAmount || 0) > 0;
}

function scholarshipValueText(item) {
    const type = String(item?.scholarshipDiscountType ?? "").toLowerCase();

    if (type === "percentage" || Number(item?.scholarshipDiscountType) === 1) {
        return `${Number(item?.scholarshipDiscountValue || 0)}%`;
    }

    return money(item?.scholarshipDiscountValue || 0);
}

function buildPaymentBadges(item) {
    const badges = [];

    if (Number(item?.lateChargeAmount || 0) > 0) {
        badges.push(`
            <span class="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">
                <span>⏰</span> Mora ${money(item.lateChargeAmount)}
            </span>
        `);
    }

    if (Number(item?.siblingDiscountAmount || 0) > 0) {
        badges.push(`
            <span class="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">
                <span>👥</span> Hermanos ${Number(item.siblingDiscountPercent || 0)}%
            </span>
        `);
    }

    if (hasScholarship(item)) {
        badges.push(`
            <span class="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-2 py-1 text-[11px] font-bold text-violet-800">
                <span>🎓</span> Beca ${scholarshipValueText(item)}
            </span>
        `);
    }

    return badges.length
        ? `<div class="flex flex-wrap gap-1.5">${badges.join("")}</div>`
        : "";
}

function getPaymentCardClasses(item) {
    const paymentStatus = normalizePaymentStatus(item?.paymentStatus);
    const chargeStatus = normalizeChargeStatus(item?.chargeStatus);

    if (paymentStatus === "approved" || chargeStatus === "paid") {
        return "rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900";
    }

    if (paymentStatus === "inreview") {
        return "rounded-3xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-900/60 dark:bg-slate-900";
    }

    if (chargeStatus === "overdue") {
        return "rounded-3xl border border-rose-200 bg-white p-4 shadow-sm dark:border-rose-900/60 dark:bg-slate-900";
    }

    return "rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900";
}

function buildPaymentCard(item) {
    const status = getBillingStatusLabel(item);
    const paymentStatus = normalizePaymentStatus(item?.paymentStatus);
    const chargeStatus = normalizeChargeStatus(item?.chargeStatus);
    const hasProof = !!item?.transferProofImageUrl;
    const rejectionNote = String(item?.reviewNote ?? "").trim();

    const showPayButton = paymentStatus !== "approved";
    const disablePayButton = paymentStatus === "inreview";

    const isOverdue = chargeStatus === "overdue" && paymentStatus !== "approved";

    const payButtonLabel =
        paymentStatus === "rejected"
            ? "Volver a subir comprobante"
            : "Pagar";

    return `
        <article class="${getPaymentCardClasses(item)}">
            <div class="flex flex-col gap-4">

                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <h3 class="truncate text-xl font-black text-slate-950 dark:text-white">
                            ${escapeHtml(item?.courseName || "Cuota")}
                        </h3>

                        <div class="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                            Período ${escapeHtml(formatMonthYear(item?.month, item?.year))}
                        </div>
                    </div>

                    <span class="shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${status.classes}">
                        ${escapeHtml(status.text)}
                    </span>
                </div>

                ${buildPaymentBadges(item)}

                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/70 dark:border dark:border-slate-700">
                    <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Total cuota
                    </div>

                    <div class="mt-1 text-4xl font-black leading-none ${isOverdue ? "text-rose-600" : "text-slate-950 dark:text-white"}">
                        ${escapeHtml(money(item?.finalAmountPaid || item?.finalAmount))}
                    </div>

                    <div class="mt-3 flex items-center gap-1.5 text-sm font-black ${isOverdue ? "text-rose-600" : "text-slate-600 dark:text-slate-300"}">
                        <span>📅</span>
                        VTO: ${escapeHtml(formatDate(item?.dueDateUtc))}
                    </div>
                </div>

                ${
                    paymentStatus === "rejected" && rejectionNote
                        ? `
                            <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/60 dark:bg-rose-950/20">
                                <div class="text-[11px] font-bold uppercase tracking-wide text-rose-500">
                                    Motivo de rechazo
                                </div>
                                <div class="mt-1 text-sm font-medium text-rose-700 dark:text-rose-300">
                                    ${escapeHtml(rejectionNote)}
                                </div>
                            </div>
                        `
                        : ""
                }

                <div class="flex flex-wrap items-center gap-2 pt-1">
                    ${
    showPayButton
        ? `
            <button
                type="button"
                data-action="open-pay-methods"
                data-charge-id="${escapeHtml(item.chargeId)}"
                class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-sm transition hover:bg-black dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                ${disablePayButton ? "disabled" : ""}
            >
                ${disablePayButton ? "Esperando revisión" : escapeHtml(payButtonLabel)}
            </button>
        `
        : ""
}

<button
    type="button"
    data-action="view-detail"
    data-charge-id="${escapeHtml(item.chargeId)}"
    class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
>
    Ver detalle
</button>

${
    hasProof
        ? `
            <button
                type="button"
                data-action="view-proof"
                data-payment-id="${escapeHtml(item.paymentId || item.id || "")}"
                class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
                Ver comprobante
            </button>
        `
        : ""
}
                </div>
            </div>
        </article>
    `;
}

function buildPaymentsSection() {
    if (!payments.length) {
        return `
            <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div class="text-lg font-semibold text-slate-900 dark:text-white">Todavía no tenés facturas generadas.</div>
                <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Cuando el sistema genere tus cuotas o pagos, los vas a ver acá.
                </p>
            </section>
        `;
    }

    return `
        <section class="grid gap-4">
            ${payments.map(buildPaymentCard).join("")}
        </section>
    `;
}

function buildTransferModal() {
    if (!selectedPaymentId) return "";

const payment = selectedTransferItem || payments.find(x =>
    String(x.paymentId || x.id || "") === String(selectedPaymentId) ||
    String(x.chargeId || "") === String(selectedPaymentId)
);

const paymentMethodInfo = selectedTransferPaymentMethod || {};

const alias =
    paymentMethodInfo?.alias?.trim() ||
    transferInfo?.alias?.trim() ||
    "";

const cbu =
    paymentMethodInfo?.cbu?.trim() ||
    transferInfo?.cbu?.trim() ||
    "";

const holder =
    paymentMethodInfo?.holderName?.trim() ||
    transferInfo?.accountHolder?.trim() ||
    "";

const bank =
    transferInfo?.bankName?.trim() ||
    "";

    const notes =
    paymentMethodInfo?.notes?.trim() ||
    paymentMethodInfo?.note?.trim() ||
    transferInfo?.notes?.trim() ||
    transferInfo?.note?.trim() ||
    "";

    return `
        <div id="transferModalOverlay" class="fixed inset-0 z-[140] overflow-y-auto bg-slate-950/40 p-4 pb-32 backdrop-blur-[1px]">
            <div class="mx-auto my-6 w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Pago por transferencia
                        </div>
                        <h3 class="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                            ${escapeHtml(payment?.courseName || "Pago")}
                        </h3>
                        <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Período: ${escapeHtml(formatMonthYear(payment?.month, payment?.year))}
                            · Importe: ${escapeHtml(money(
                                selectedTransferPaymentMethod
                                    ? calculatePaymentMethodPreview(payment, selectedTransferPaymentMethod).total
                                    : (payment?.finalAmount ?? payment?.amount)
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        id="closeTransferModalBtn"
                        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        ✕
                    </button>
                </div>

                <div class="mt-5 grid gap-3 sm:grid-cols-2">
                    <div class="rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3 sm:col-span-2">
                        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Alias
                        </div>
                        <div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            ${aliasCopied ? `
                                <div class="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                    Alias copiado correctamente.
                                </div>
                            ` : ""}
                            <div class="break-all text-base font-semibold text-slate-900 dark:text-white">
                                ${escapeHtml(alias || "No configurado")}
                            </div>

                            ${
                                alias
                                    ? `
                                        <button
                                            type="button"
                                            id="copyAliasBtn"
                                            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            Copiar alias
                                        </button>
                                    `
                                    : ""
                            }
                        </div>
                    </div>

                    ${cbu ? `
                        <div class="rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
                            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                CBU / CVU
                            </div>

                            <div class="mt-1 text-sm font-semibold text-slate-900 dark:text-white break-all">
                                ${escapeHtml(cbu)}
                            </div>
                        </div>
                    ` : ""}

                    ${
                        holder
                            ? `
                                <div class="rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
                                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Titular</div>
                                    <div class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">${escapeHtml(holder)}</div>
                                </div>
                            `
                            : ""
                    }

                    ${
                        bank
                            ? `
                                <div class="rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3 sm:col-span-2">
                                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Banco / billetera</div>
                                    <div class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">${escapeHtml(bank)}</div>
                                </div>
                            `
                            : ""
                    }

                    ${
                        notes
                            ? `
                                <div class="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 sm:col-span-2 dark:border-blue-900/60 dark:bg-blue-950/20">
                                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                                        Notas
                                    </div>
                                    <div class="mt-1 whitespace-pre-line text-sm font-semibold text-blue-800 dark:text-blue-200">
                                        ${escapeHtml(notes)}
                                    </div>
                                </div>
                            `
                            : ""
                    }
                </div>

                <div class="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                    <div class="text-sm font-semibold text-slate-900 dark:text-white">Subir comprobante</div>
                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Podés subir una imagen o PDF de hasta 5MB.
                    </p>

                    <input
                        id="paymentProofFileInput"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        class="mt-4 block w-full text-sm text-slate-700 dark:text-slate-200"
                    />
                </div>

                <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        id="cancelTransferBtn"
                        class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        Cancelar
                    </button>

                        <button
                            type="button"
                            id="submitProofBtn"
                            class="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400 ${uploadingProof ? "opacity-60" : ""}"
                            ${uploadingProof ? "disabled" : ""}
                        >
                        ${uploadingProof ? "Subiendo..." : "Enviar comprobante"}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function buildProofViewerModal() {
    if (!proofViewer.open) return "";

    let bodyHtml = `
        <div class="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500 dark:text-slate-400">
            No se pudo visualizar el comprobante.
        </div>
    `;

    if (proofViewer.loading) {
        bodyHtml = `
            <div class="flex h-full items-center justify-center rounded-2xl bg-white dark:bg-slate-900 text-sm font-medium text-slate-500 dark:text-slate-400">
                Cargando comprobante...
            </div>
        `;
    } else if (proofViewer.isImage) {
        bodyHtml = `
            <div class="flex h-full items-center justify-center overflow-auto rounded-2xl bg-white dark:bg-slate-900 p-3">
                <img
                    src="${escapeHtml(proofViewer.url)}"
                    alt="Comprobante"
                    class="block max-h-[72vh] w-auto max-w-full rounded-xl object-contain shadow-sm"
                />
            </div>
        `;
    } else if (proofViewer.isPdf) {
        bodyHtml = `
            <div class="h-full overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
                <iframe
                    src="${escapeHtml(proofViewer.url)}"
                    title="Comprobante PDF"
                    class="h-[72vh] w-full border-0"
                ></iframe>
            </div>
        `;
    }

    return `
        <div id="proofViewerOverlay" class="fixed inset-0 z-[120] bg-slate-950/60 p-4 backdrop-blur-[1px]">
            <div class="mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                    <div class="min-w-0">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Comprobante
                        </div>
                        <div class="mt-1 truncate text-base font-semibold text-slate-900 dark:text-white">
                            ${escapeHtml(proofViewer.fileName || "Visualización")}
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <a
                            id="proofDownloadBtn"
                            href="${escapeHtml(proofViewer.url || "#")}"
                            download="${escapeHtml(proofViewer.fileName || "comprobante")}"
                            target="_blank"
                            rel="noreferrer"
                            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${proofViewer.loading || !proofViewer.url ? "pointer-events-none opacity-50" : ""}"
                        >
                            Descargar
                        </a>

                        <button
                            id="closeProofViewerBtn"
                            type="button"
                            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div class="bg-slate-100 p-4 dark:bg-slate-800">
                    ${bodyHtml}
                </div>
            </div>
        </div>
    `;
}

function buildContent() {
    return `
        <div class="space-y-5 pb-[190px] md:space-y-6 md:pb-0">
            ${buildUiMessage()}
            ${buildTopBar()}
            ${buildPageHeader()}
            ${buildPaymentsSection()}
        </div>
    `;
}

function buildChargeDetailModal() {
    if (!chargeDetailModal.open || !chargeDetailModal.item) return "";

    const item = chargeDetailModal.item;

    return `
        <div id="chargeDetailOverlay" class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div class="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">

                <div class="flex items-start justify-between gap-4">
                    <div>
                        <div class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                            Detalle de cuota
                        </div>

                        <h3 class="mt-1 text-xl font-black text-slate-900 dark:text-white">
                            ${escapeHtml(item.courseName || "Cuota")}
                        </h3>

                        <div class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                            Período ${escapeHtml(formatMonthYear(item.month, item.year))}
                        </div>
                    </div>

                    <button
                        id="closeChargeDetailBtn"
                        type="button"
                        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        ✕
                    </button>
                </div>

                <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
${detailRow("Precio base", money(item.basePrice))}
${detailRow("Descuento hermanos", `- ${money(item.siblingDiscountAmount || 0)}`)}
${detailRow("Beca", `- ${money(item.scholarshipDiscountAmount || 0)}`)}
${detailRow("Mora", `+ ${money(item.lateChargeAmount || 0)}`)}
${Number(item.paymentMethodSurchargeAmount || 0) > 0
    ? detailRow(`Recargo por ${item.paymentMethodNameSnapshot || getPaymentMethodLabel(item)}`, `+ ${money(item.paymentMethodSurchargeAmount)}`)
    : ""}
                </div>

<div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
    <div class="flex items-center justify-between gap-3">
        <div class="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Total final
        </div>

        <div class="text-2xl font-black text-slate-900 dark:text-white">
            ${money(item.finalAmountPaid || item.finalAmount)}
        </div>
    </div>
</div>
            </div>
        </div>
    `;
}

function detailRow(label, value) {
    return `
        <div class="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 last:border-b-0 dark:border-slate-700 dark:bg-slate-900">
            <span class="text-sm font-semibold text-slate-500 dark:text-slate-400">
                ${escapeHtml(label)}
            </span>

            <span class="text-sm font-black text-slate-900 dark:text-white">
                ${escapeHtml(value)}
            </span>
        </div>
    `;
}

function buildLoading() {
    return `
        <div class="min-h-screen bg-slate-100 dark:bg-slate-950">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div class="text-sm text-slate-500 dark:text-slate-400">Cargando pagos...</div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    `;
}

function buildError() {
    return `
        <div class="min-h-screen bg-slate-100 dark:bg-slate-950">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm">
                            <div class="text-base font-semibold text-slate-900 dark:text-white">No se pudieron cargar los pagos.</div>
                            <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">${escapeHtml(pageError || "Ocurrió un error inesperado.")}</div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    `;
}

function buildMobileMenu() {
    return buildStudentMobileMenu({
        mobileMenuOpen,
        activeItem: "payments",
        studentFullName: getStudentFullName(),
        studentEmail: getStudentEmail(),
        modules: company?.modules || {}
    });
}

function render() {
    if (loading) return buildLoading();
    if (pageError) return buildError();

    return `
        <div class="min-h-screen bg-slate-100 dark:bg-slate-950">
            ${buildMobileCompanyHeader()}
            ${buildMobileMenu()}

            <div class="flex min-h-screen">
                ${buildStudentSidebar({
                    company,
                    student,
                    activeItem: "payments"
                })}

                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        ${buildContent()}
                    </div>
                </main>
            </div>

            ${buildStudentMobileBottomNav({
                activeItem: "payments",
                homeHref: "/src/pages/student/home/index.html",
                profileHref: "/src/pages/student/profile/index.html",
                paymentsHref: "/src/pages/student/payments/index.html",
                modules: company?.modules || {}
            })}

            ${buildPayMethodsModal()}
            ${buildTransferModal()}
            ${buildProofViewerModal()}
            ${buildChargeDetailModal()}
            ${buildStudentCarnetModal({
                open: carnetOpen,
                student,
                company
            })}
        </div>
    `;
}

function rerender() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = render();
    syncStudentMobileShellScrollLock({
    mobileMenuOpen,
    extraLocked: !!selectedPaymentId || proofViewer.open || carnetOpen
});
    bindEvents();
}

function buildMobileCompanyHeader() {
    return `
        <header class="sticky top-0 z-30 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
            <div class="flex items-center justify-between gap-3 px-4 py-3">

                <div class="flex min-w-0 items-center gap-3">

                    ${buildCompanyLogo("h-11 w-11", "rounded-2xl")}

                    <div class="min-w-0">
                        <div class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            ${escapeHtml(getCompanyName() || "Empresa")}
                        </div>

                        <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                            ${escapeHtml(getStudentFullName() || "Alumno")}
                        </div>
                    </div>

                </div>

                <div id="studentNotificationsBellMobile"></div>

            </div>
        </header>
    `;
}

function openPayMethodsModal(chargeId) {
    selectedPayChargeId = chargeId;
    selectedPayMethod = null;
    selectedPayPreview = null;
    rerender();
}

function closePayMethodsModal() {
    selectedPayChargeId = null;
    selectedPayMethod = null;
    selectedPayPreview = null;
    selectedTransferPaymentMethod = null;
    rerender();
}

function calculatePaymentMethodPreview(item, method) {
    const base = Number(item?.finalAmount || item?.amount || 0);
    const type = String(method?.surchargeType || "").toLowerCase();
    const value = Number(method?.surchargeValue || 0);

    let surcharge = 0;

    if (value > 0 && type === "percentage") {
        surcharge = Math.round((base * value / 100) * 100) / 100;
    }

    if (value > 0 && type === "fixedamount") {
        surcharge = value;
    }

    return {
        base,
        surcharge,
        total: base + surcharge
    };
}

function buildPayMethodsModal() {
    if (!selectedPayChargeId) return "";

    const item = payments.find(x =>
        String(x.chargeId || "") === String(selectedPayChargeId)
    );

    const enabledMethods = paymentMethods;

    return `
        <div id="payMethodsOverlay" class="fixed inset-0 z-[140] overflow-y-auto bg-slate-950/50 p-4 pb-32 backdrop-blur-[1px]">
            <div class="mx-auto my-6 w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Pagar cuota
                        </div>
                        <h3 class="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                            ${escapeHtml(item?.courseName || "Cuota")}
                        </h3>
                        <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Período ${escapeHtml(formatMonthYear(item?.month, item?.year))}
                        </div>
                    </div>

                    <button
                        type="button"
                        id="closePayMethodsBtn"
                        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        ✕
                    </button>
                </div>

                <div class="mt-5 space-y-3">
                    ${enabledMethods.length ? enabledMethods.map(method => {
                        const preview = calculatePaymentMethodPreview(item, method);
                        const selected = selectedPayMethod && String(selectedPayMethod.paymentMethod) === String(method.paymentMethod);

                        return `
                            <button
                                type="button"
                                data-action="select-pay-method"
                                data-method="${escapeHtml(method.paymentMethod)}"
                                class="w-full rounded-2xl border px-4 py-3 text-left transition ${
                                    selected
                                        ? "border-slate-900 bg-slate-100 dark:border-white dark:bg-slate-800"
                                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                                }"
                            >
                                <div class="flex items-center justify-between gap-3">
                                    <div>
                                        <div class="text-sm font-black text-slate-900 dark:text-white">
                                            ${escapeHtml(method.paymentMethodName || method.name || method.displayName || "-")}
                                        </div>
                                        <div class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            ${preview.surcharge > 0 ? `Recargo ${money(preview.surcharge)}` : "Sin recargo"}
                                        </div>
                                    </div>

                                    <div class="text-right">
                                        <div class="text-xs font-bold uppercase text-slate-400">Total</div>
                                        <div class="text-base font-black text-slate-900 dark:text-white">
                                            ${money(preview.total)}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        `;
                    }).join("") : `
                        <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">
                            No hay medios de pago habilitados.
                        </div>
                    `}
                </div>

                ${selectedPayMethod ? buildSelectedPaymentPreview(item, selectedPayMethod) : ""}

                <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        id="cancelPayMethodsBtn"
                        class="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
}

function buildSelectedPaymentPreview(item, method) {
    const preview = calculatePaymentMethodPreview(item, method);
    const methodName = method.paymentMethodName || method.name || method.displayName || "-";

    return `
        <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <div class="text-sm font-black text-slate-900 dark:text-white">Detalle</div>

            <div class="mt-3 space-y-2 text-sm">
                <div class="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Cuota</span>
                    <span class="font-bold">${money(preview.base)}</span>
                </div>

                ${preview.surcharge > 0 ? `
                    <div class="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Recargo por ${escapeHtml(methodName)}</span>
                        <span class="font-bold">+${money(preview.surcharge)}</span>
                    </div>
                ` : ""}

                <div class="flex justify-between rounded-xl bg-white px-3 py-2 text-slate-900 dark:bg-slate-900 dark:text-white">
                    <span class="font-black">Total a pagar</span>
                    <span class="font-black">${money(preview.total)}</span>
                </div>
            </div>

            <button
                type="button"
                id="continuePayMethodBtn"
                class="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400"
            >
                Continuar
            </button>
        </div>
    `;
}

function bindEvents() {
    bindStudentLayoutEvents();
bindStudentMobileShellEvents({
    setMobileMenuOpen: (value) => {
        mobileMenuOpen = !!value;
        rerender();
    },
    onLogout: () => {
        logoutAndRedirect();
    },
    onOpenCarnet: () => {
        carnetOpen = true;
        rerender();
    }
});

bindStudentCarnetEvents({
    setCarnetOpen: (value) => {
        carnetOpen = !!value;
        rerender();
    }
});

    document.querySelectorAll("[data-action='open-pay-methods']").forEach(btn => {
        btn.addEventListener("click", () => {
            const chargeId = btn.getAttribute("data-charge-id");
            openPayMethodsModal(chargeId);
        });
    });

    document.querySelectorAll("[data-action='view-proof']").forEach(btn => {
        btn.addEventListener("click", async () => {
            const paymentId = btn.getAttribute("data-payment-id");
            await openProofViewer(paymentId);
        });
    });

    document.getElementById("closeTransferModalBtn")?.addEventListener("click", closeTransferModal);
    document.getElementById("cancelTransferBtn")?.addEventListener("click", closeTransferModal);

    document.getElementById("transferModalOverlay")?.addEventListener("click", (e) => {
        if (e.target.id === "transferModalOverlay") {
            closeTransferModal();
        }
    });

document.getElementById("copyAliasBtn")?.addEventListener("click", async () => {
    const alias =
        selectedTransferPaymentMethod?.alias?.trim() ||
        transferInfo?.alias?.trim() ||
        "";

    if (!alias) return;

    try {
        await navigator.clipboard.writeText(alias);
        aliasCopied = true;
        rerender();
    } catch {
        setUiMessage("error", "No se pudo copiar el alias.");
        rerender();
    }
});

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        logoutAndRedirect();
    });

    document.getElementById("paymentProofFileInput")?.addEventListener("change", (e) => {
    selectedProofFile = e.target.files?.[0] || null;
});

    document.getElementById("submitProofBtn")?.addEventListener("click", submitProof);

    document.getElementById("closeProofViewerBtn")?.addEventListener("click", closeProofViewer);

    document.getElementById("proofViewerOverlay")?.addEventListener("click", (e) => {
        if (e.target.id === "proofViewerOverlay") {
            closeProofViewer();
        }
    });

    document.querySelectorAll("[data-action='view-detail']").forEach(btn => {
    btn.addEventListener("click", () => {
        const chargeId = btn.getAttribute("data-charge-id");

        if (!chargeId) return;

        openChargeDetailModal(chargeId);
    });
});

document.getElementById("closeChargeDetailBtn")?.addEventListener("click", () => {
    closeChargeDetailModal();
});

document.getElementById("chargeDetailOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "chargeDetailOverlay") {
        closeChargeDetailModal();
    }
});
document.getElementById("closePayMethodsBtn")?.addEventListener("click", closePayMethodsModal);
document.getElementById("cancelPayMethodsBtn")?.addEventListener("click", closePayMethodsModal);

document.getElementById("payMethodsOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "payMethodsOverlay") {
        closePayMethodsModal();
    }
});

document.querySelectorAll("[data-action='select-pay-method']").forEach(btn => {
    btn.addEventListener("click", () => {
        const method = btn.getAttribute("data-method");
        selectedPayMethod = paymentMethods.find(x => String(x.paymentMethod) === String(method)) || null;
        selectedPayPreview = selectedPayMethod
            ? calculatePaymentMethodPreview(
                payments.find(x => String(x.chargeId || "") === String(selectedPayChargeId)),
                selectedPayMethod
            )
            : null;

        rerender();
    });
});

document.getElementById("continuePayMethodBtn")?.addEventListener("click", () => {
    if (!selectedPayChargeId || !selectedPayMethod) return;

    const selectedMethod = String(selectedPayMethod.paymentMethod).toLowerCase();

    if (selectedMethod !== "transfer") {
        setUiMessage("error", "Este medio de pago todavía no está implementado para alumnos.");
        closePayMethodsModal();
        return;
    }

    selectedTransferItem = payments.find(x =>
        String(x.chargeId || "") === String(selectedPayChargeId)
    ) || null;

    selectedPaymentId = String(selectedPayChargeId);
    selectedTransferPaymentMethod = selectedPayMethod;
    aliasCopied = false;
    selectedPayChargeId = null;

    rerender();
});

    initNotificationsBell({rootId: "studentNotificationsBellMobile"});
    initNotificationsBell({rootId: "studentNotificationsBellDesktop"});
}

async function loadStudentProfile() {
    const cached = getStudentMe(companySlug);

    if (cached && !isSasUrlExpired(cached.profileImageUrl)) {
        return cached;
    }

    const result = await get(`/api/student/${companySlug}/me`);
    setStudentMe(companySlug, result);

    return result;
}

async function loadPayments(force = false) {
    const cached = getPayments(companySlug);

    if (cached && !force) {
        return cached;
    }

    const result = await withTimeout(
        get(`/api/student/${companySlug}/billing?_=${Date.now()}`),
        "No se pudieron cargar los pagos. Probá refrescar la pantalla."
    );

    const data = Array.isArray(result) ? result : [];

    setPayments(companySlug, data);
    return data;
}

async function loadPaymentMethods() {
    return await withTimeout(
        get(`/api/student/${companySlug}/payment-methods?_=${Date.now()}`),
        "No se pudieron cargar los medios de pago."
    );
}

async function loadTransferInfo() {
    return await withTimeout(
        get(`/api/student/${companySlug}/payment-transfer-info?_=${Date.now()}`),
        "No se pudo cargar la información de transferencia."
    );
}

async function openTransferModal(chargeId, companyPaymentMethodId = null) {
    if (!chargeId) return;

    clearUiMessage();
    aliasCopied = false;

    selectedTransferItem = payments.find(x =>
        String(x.chargeId || "") === String(chargeId)
    ) || null;

    selectedPaymentId = String(chargeId);
    rerender();

    try {
        if (!transferInfo) {
            transferInfo = await loadTransferInfo();

            if (String(selectedPaymentId) !== String(chargeId)) return;
            rerender();
        }
        selectedPaymentId = String(chargeId);
        rerender();
    } catch (error) {
        if (String(selectedPaymentId) !== String(chargeId)) return;

        closeTransferModal();
        setUiMessage("error", error?.message || "No se pudo iniciar el pago.");
        rerender();
    }
}

function closeTransferModal() {
    selectedPaymentId = null;
    selectedTransferItem = null;
    aliasCopied = false;
    uploadingProof = false;
    isUploadingProof = false;
    selectedProofFile = null;
    selectedTransferPaymentMethod = null;
    rerender();
}

function closeProofViewer() {
    proofViewer = {
        open: false,
        loading: false,
        paymentId: null,
        url: "",
        fileName: "",
        contentType: "",
        isImage: false,
        isPdf: false
    };
    rerender();
}

async function openProofViewer(paymentId) {
    if (!paymentId) return;

    clearUiMessage();

    proofViewer = {
        open: true,
        loading: true,
        paymentId,
        url: "",
        fileName: "",
        contentType: "",
        isImage: false,
        isPdf: false
    };
    rerender();

    try {
        const result = await get(`/api/student/${companySlug}/payments/${paymentId}/proof/view`);

        if (!result?.url) {
            throw new Error("No se pudo obtener el comprobante.");
        }

        proofViewer = {
            open: true,
            loading: false,
            paymentId,
            url: result.url,
            fileName: result.fileName || "comprobante",
            contentType: result.contentType || "",
            isImage: !!result.isImage,
            isPdf: !!result.isPdf
        };

        rerender();
    } catch (error) {
        closeProofViewer();
        setUiMessage("error", error?.message || "No se pudo visualizar el comprobante.");
        rerender();
    }
}

async function submitProof() {
    if (isUploadingProof) return;

    const fileInput = document.getElementById("paymentProofFileInput");
    const file = selectedProofFile || fileInput?.files?.[0];

    if (!selectedPaymentId) {
        setUiMessage("error", "No se encontró el pago seleccionado.");
        rerender();
        return;
    }

    if (!file) {
        setUiMessage("error", "Seleccioná un archivo.");
        rerender();
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ];

    const maxSizeMb = 5;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
        setUiMessage("error", "El comprobante debe ser una imagen JPG, PNG, WEBP o un PDF.");
        rerender();
        return;
    }

    if (file.size > maxSizeBytes) {
        setUiMessage("error", `El comprobante no puede superar los ${maxSizeMb}MB.`);
        rerender();
        return;
    }

    isUploadingProof = true;
    uploadingProof = true;
    clearUiMessage();
    rerender();

    try {
    const methodId =
        selectedTransferPaymentMethod?.companyPaymentMethodId ||
        selectedTransferPaymentMethod?.id;

    if (!methodId) {
        setUiMessage("error", "No se encontró el medio de pago seleccionado.");
        rerender();
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("companyPaymentMethodId", methodId);

        await withTimeout(
            postForm(`/api/student/${companySlug}/charges/${selectedPaymentId}/proof`, formData),
            "La subida tardó demasiado. Probá nuevamente."
        );

        payments = await loadPayments(true);

        selectedProofFile = null;
        selectedPaymentId = null;
        selectedTransferItem = null;
        aliasCopied = false;
        uploadingProof = false;
        isUploadingProof = false;

        setUiMessage("success", "Comprobante enviado correctamente.");
        rerender();
    } catch (err) {
        uploadingProof = false;
        isUploadingProof = false;

        setUiMessage("error", err?.message || "No se pudo subir el comprobante.");
        rerender();
    }
}

async function init() {
    initTheme();
    try {
        clearUiMessage();
        await loadConfig();

        const session = requireAuth();
        if (!session) return;

        await ensureFreshAccessToken();

        companySlug = session.activeCompanySlug;

        let me = getMe();

        const companyFromMe = me?.companies?.find(x => x.companySlug === companySlug);
        const logoUrl = companyFromMe?.logoUrl || companyFromMe?.LogoUrl;

        if (!me || isSasUrlExpired(logoUrl)) {
            me = await get("/api/admin/me");
            setMe(me);
        }

        company = (me.companies || []).find(x => x.companySlug === companySlug) || null;

        if (company) {
            setActiveCompany(companySlug, company);
        }

        if (!company) {
            throw new Error("No se encontró la empresa activa del alumno.");
        }

        student = await loadStudentProfile();
        applyThemePreference(student.themePreference || "system");

        if (!student) {
            throw new Error("No se pudo obtener el perfil del alumno.");
        }

        paymentMethods = await loadPaymentMethods();
        payments = await loadPayments(true);

    } catch (error) {
        pageError = error?.message || "No se pudo cargar la información de pagos.";
    } finally {
        loading = false;
        rerender();
    }
}
init();