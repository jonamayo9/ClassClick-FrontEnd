import { get, post, postForm } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { logoutAndRedirect } from "../../../shared/js/session.js";
import {
    buildStudentMobileMenu,
    buildStudentMobileBottomNav,
    bindStudentMobileShellEvents,
    syncStudentMobileShellScrollLock
} from "../../../shared/js/student-mobile-shell.js";
import {
    buildStudentCarnetModal,
    bindStudentCarnetEvents
} from "../../../shared/js/student-carnet.js";
import { initNotificationsBell } from "../../../shared/js/notifications-bell.js";

let companySlug = null;
let company = null;
let student = null;
let payments = [];
let transferInfo = null;
let mobileMenuOpen = false;
let loading = true;
let pageError = "";
let selectedPaymentId = null;
let uploadingProof = false;
let uiMessage = {
    type: "",
    text: ""
};
let carnetOpen = false;

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

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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
                : "border-slate-200 bg-slate-50 text-slate-700";

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
    return company?.logoUrl?.trim() || "";
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
            <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm">
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
                onerror="this.remove(); this.parentElement.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center text-xs font-bold text-slate-700&quot;>${escapeHtml(initials || "—")}</div>';"
            />
        </div>
    `;
}

function navLink(label, href, active = false) {
    return `
        <a
            href="${href}"
            class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
            }"
        >
            ${escapeHtml(label)}
        </a>
    `;
}

function buildSidebarLink(label, href, active = false) {
    return `
        <a
            href="${href}"
            class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
            }"
        >
            ${escapeHtml(label)}
        </a>
    `;
}

function buildSidebar() {
    return `
        <aside class="hidden md:flex md:w-[220px] md:flex-col md:border-r md:border-slate-200 md:bg-white">
            <div class="border-b border-slate-200 px-5 py-5">
                <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Alumno
                </div>

                <div class="mt-2 truncate text-base font-semibold text-slate-900">
                    ${escapeHtml(getStudentFullName() || "—")}
                </div>

                ${
                    getStudentEmail()
                        ? `<div class="mt-1 truncate text-xs text-slate-500">${escapeHtml(getStudentEmail())}</div>`
                        : ""
                }
            </div>

            <div class="flex min-h-0 flex-1 flex-col">
                <nav class="space-y-2 px-4 py-4">
                    ${buildSidebarLink("Inicio", "/src/pages/student/home/index.html")}
                    ${buildSidebarLink("Cursos", "/src/pages/student/courses/index.html")}
                    ${buildSidebarLink("Pagos", "/src/pages/student/payments/index.html", true)}
                    ${buildSidebarLink("Perfil", "/src/pages/student/profile/index.html")}
                    ${buildSidebarLink("Hermanos", "/src/pages/student/siblings/index.html")}
                </nav>

                <div class="mt-auto border-t border-slate-200 p-4">
                    <button
                        id="logoutBtn"
                        type="button"
                        class="flex w-full items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </aside>
    `;
}

function buildMobileHeader() {
    return `
        <header class="sticky top-0 z-30 border-b border-slate-200 bg-white md:hidden">
            <div class="flex items-center justify-between px-4 py-3">

                <div class="flex min-w-0 items-center gap-3">

                    ${buildCompanyLogo("h-11 w-11", "rounded-2xl")}

                    <div class="min-w-0">
                        <div class="truncate text-sm font-semibold text-slate-900">
                            ${escapeHtml(getCompanyName() || "Mi club")}
                        </div>

                        <div class="truncate text-xs text-slate-500">
                            ${escapeHtml(getStudentFullName() || "Alumno")}
                        </div>
                    </div>

                </div>

                <div id="studentNotificationsBellMobile"></div>

            </div>
        </header>
    `;
}

function buildMobileMenu() {
    return `
        <div
            id="mobileMenuOverlay"
            class="${mobileMenuOpen ? "fixed" : "hidden"} inset-0 z-40 bg-slate-950/40 md:hidden"
        ></div>

        <aside
            class="fixed left-0 top-0 z-50 flex h-full w-72 flex-col transform border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 md:hidden ${
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }"
        >
            <div class="border-b border-slate-200 px-4 py-4">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Alumno
                        </div>

                        <div class="mt-1 truncate text-sm font-semibold text-slate-900">
                            ${escapeHtml(getStudentFullName() || "—")}
                        </div>

                        ${
                            getStudentEmail()
                                ? `<div class="truncate text-xs text-slate-500">${escapeHtml(getStudentEmail())}</div>`
                                : ""
                        }
                    </div>

                    <button
                        id="closeMobileMenuBtn"
                        type="button"
                        class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div class="flex min-h-0 flex-1 flex-col">
                <nav class="space-y-2 px-4 py-4">
                    ${navLink("Inicio", "/src/pages/student/home/index.html")}
                    ${navLink("Cursos", "/src/pages/student/courses/index.html")}
                    ${navLink("Pagos", "/src/pages/student/payments/index.html", true)}
                    ${navLink("Perfil", "/src/pages/student/profile/index.html")}
                    ${navLink("Hermanos", "/src/pages/student/siblings/index.html")}
                </nav>

                <div class="mt-auto border-t border-slate-200 p-4">
                    <button
                        id="mobileLogoutBtn"
                        type="button"
                        class="flex w-full items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </aside>
    `;
}

function buildTopBar() {
    return `
        <section class="hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:block">
            <div class="flex items-center justify-between gap-4">
                <div class="flex min-w-0 items-center gap-3">
                    ${buildCompanyLogo("h-16 w-16")}

                    <div class="min-w-0">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Empresa
                        </div>

                        <h1 class="mt-1 truncate text-lg font-bold text-slate-900 sm:text-xl">
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
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Panel alumno
                    </div>
                    <h2 class="mt-1 text-2xl font-bold text-slate-900">Mis pagos</h2>
                    <p class="mt-2 text-sm text-slate-500">
                        Acá vas a poder ver tus facturas, elegir transferencia y subir comprobantes.
                    </p>
                </div>

                <div class="flex flex-wrap gap-2">
                    <div class="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
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
        classes: "bg-slate-100 text-slate-600"
    };
}

function buildPaymentCard(item) {
    const status = getBillingStatusLabel(item);
    const paymentStatus = normalizePaymentStatus(item?.paymentStatus);
    const chargeStatus = normalizeChargeStatus(item?.chargeStatus);
    const hasProof = !!item?.transferProofImageUrl;
    const rejectionNote = String(item?.reviewNote ?? "").trim();

    const showPayButton = paymentStatus !== "approved";
    const disablePayButton = paymentStatus === "inreview";

    const amountClass =
        chargeStatus === "overdue" && paymentStatus !== "approved"
            ? "text-rose-600"
            : "text-slate-900";

    const payButtonLabel =
        paymentStatus === "rejected"
            ? "Volver a subir comprobante"
            : "Pagar por transferencia";

    return `
        <article class="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div class="min-w-0">
                    <h3 class="text-xl font-bold text-slate-900 sm:text-lg">
                        ${escapeHtml(item?.courseName || "Cuota")}
                    </h3>

                    <div class="mt-2 flex flex-wrap gap-2">
                        <span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 sm:text-xs">
                            ${escapeHtml(formatMonthYear(item?.month, item?.year))}
                        </span>

                        <span class="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${status.classes} sm:text-xs">
                            ${escapeHtml(status.text)}
                        </span>

                        <span class="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 sm:text-xs">
                            ${escapeHtml(getPaymentMethodLabel(item))}
                        </span>
                    </div>
                </div>

                <div class="text-left lg:text-right">
                    <div class="text-sm text-slate-500">Importe</div>
                    <div class="text-2xl font-bold ${amountClass} sm:text-xl">
                        ${escapeHtml(money(item?.finalAmount))}
                    </div>
                </div>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                    <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Vencimiento
                    </div>
                    <div class="mt-1 text-sm font-semibold text-slate-900 sm:text-base">
                        ${escapeHtml(formatDate(item?.dueDateUtc))}
                    </div>
                </div>

                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                    <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Pago registrado
                    </div>
                    <div class="mt-1 text-sm font-semibold text-slate-900 sm:text-base">
                        ${escapeHtml(formatDate(item?.paidAtUtc))}
                    </div>
                </div>

                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                    <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Comprobante
                    </div>
                    <div class="mt-1 text-sm font-semibold text-slate-900 sm:text-base">
                        ${hasProof ? "Cargado" : "Sin subir"}
                    </div>
                </div>

                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                    <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Estado cuota
                    </div>
                    <div class="mt-1 text-sm font-semibold text-slate-900 sm:text-base">
                        ${
                            paymentStatus === "inreview"
                                ? "Esperando aprobación del administrador"
                                : escapeHtml(status.text)
                        }
                    </div>
                </div>
            </div>

            ${
                paymentStatus === "rejected" && rejectionNote
                    ? `
                        <div class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                            <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-500">
                                Motivo de rechazo
                            </div>
                            <div class="mt-1 text-sm font-medium text-rose-700">
                                ${escapeHtml(rejectionNote)}
                            </div>
                        </div>
                    `
                    : ""
            }

            <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                ${
                    showPayButton
                        ? `
                            <button
                                type="button"
                                data-action="open-transfer"
                                data-charge-id="${escapeHtml(item.chargeId)}"
                                class="inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition sm:w-auto sm:py-2 ${
                                    disablePayButton
                                        ? "cursor-not-allowed bg-slate-200 text-slate-500"
                                        : "bg-slate-900 text-white hover:bg-slate-800"
                                }"
                                ${disablePayButton ? "disabled" : ""}
                            >
                                ${disablePayButton ? "Esperando revisión" : escapeHtml(payButtonLabel)}
                            </button>
                        `
                        : ""
                }

                ${
                    hasProof
                        ? `
                            <button
                                type="button"
                                data-action="view-proof"
                                data-payment-id="${escapeHtml(item.paymentId || item.id || "")}"
                                class="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:py-2"
                            >
                                Ver comprobante
                            </button>
                        `
                        : ""
                }
            </div>
        </article>
    `;
}

function buildPaymentsSection() {
    if (!payments.length) {
        return `
            <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div class="text-lg font-semibold text-slate-900">Todavía no tenés facturas generadas.</div>
                <p class="mt-2 text-sm text-slate-500">
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

    const payment = payments.find(x => x.paymentId === selectedPaymentId || x.id === selectedPaymentId);
    const alias = transferInfo?.alias?.trim() || "";
    const cbu = transferInfo?.cbu?.trim() || "";
    const holder = transferInfo?.accountHolder?.trim() || "";
    const bank = transferInfo?.bankName?.trim() || "";

    return `
        <div id="transferModalOverlay" class="fixed inset-0 z-50 bg-slate-950/40 p-4 backdrop-blur-[1px]">
            <div class="mx-auto mt-8 w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Pago por transferencia
                        </div>
                        <h3 class="mt-1 text-xl font-bold text-slate-900">
                            ${escapeHtml(payment?.courseName || "Pago")}
                        </h3>
                        <div class="mt-2 text-sm text-slate-500">
                            ${escapeHtml(formatMonthYear(payment?.month, payment?.year))} · ${escapeHtml(money(payment?.amount ?? payment?.finalAmount))}
                        </div>
                    </div>

                    <button
                        type="button"
                        id="closeTransferModalBtn"
                        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                    >
                        ✕
                    </button>
                </div>

                <div class="mt-5 grid gap-3 sm:grid-cols-2">
                    <div class="rounded-2xl bg-slate-50 px-4 py-3 sm:col-span-2">
                        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Alias
                        </div>
                        <div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div class="break-all text-base font-semibold text-slate-900">
                                ${escapeHtml(alias || "No configurado")}
                            </div>

                            ${
                                alias
                                    ? `
                                        <button
                                            type="button"
                                            id="copyAliasBtn"
                                            class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                        >
                                            Copiar alias
                                        </button>
                                    `
                                    : ""
                            }
                        </div>
                    </div>

                    ${
                        cbu
                            ? `
                                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">CBU</div>
                                    <div class="mt-1 text-sm font-semibold text-slate-900 break-all">${escapeHtml(cbu)}</div>
                                </div>
                            `
                            : ""
                    }

                    ${
                        holder
                            ? `
                                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Titular</div>
                                    <div class="mt-1 text-sm font-semibold text-slate-900">${escapeHtml(holder)}</div>
                                </div>
                            `
                            : ""
                    }

                    ${
                        bank
                            ? `
                                <div class="rounded-2xl bg-slate-50 px-4 py-3 sm:col-span-2">
                                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Banco / billetera</div>
                                    <div class="mt-1 text-sm font-semibold text-slate-900">${escapeHtml(bank)}</div>
                                </div>
                            `
                            : ""
                    }
                </div>

                <div class="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div class="text-sm font-semibold text-slate-900">Subir comprobante</div>
                    <p class="mt-1 text-sm text-slate-500">
                        Podés subir una imagen o PDF de hasta 5MB.
                    </p>

                    <input
                        id="paymentProofFileInput"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        class="mt-4 block w-full text-sm text-slate-700"
                    />
                </div>

                <div class="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        id="cancelTransferBtn"
                        class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        id="submitProofBtn"
                        class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 ${uploadingProof ? "opacity-60" : ""}"
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
        <div class="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
            No se pudo visualizar el comprobante.
        </div>
    `;

    if (proofViewer.loading) {
        bodyHtml = `
            <div class="flex h-full items-center justify-center rounded-2xl bg-white text-sm font-medium text-slate-500">
                Cargando comprobante...
            </div>
        `;
    } else if (proofViewer.isImage) {
        bodyHtml = `
            <div class="flex h-full items-center justify-center overflow-auto rounded-2xl bg-white p-3">
                <img
                    src="${escapeHtml(proofViewer.url)}"
                    alt="Comprobante"
                    class="block max-h-[72vh] w-auto max-w-full rounded-xl object-contain shadow-sm"
                />
            </div>
        `;
    } else if (proofViewer.isPdf) {
        bodyHtml = `
            <div class="h-full overflow-hidden rounded-2xl bg-white">
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
            <div class="mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                    <div class="min-w-0">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Comprobante
                        </div>
                        <div class="mt-1 truncate text-base font-semibold text-slate-900">
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
                            class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 ${proofViewer.loading || !proofViewer.url ? "pointer-events-none opacity-50" : ""}"
                        >
                            Descargar
                        </a>

                        <button
                            id="closeProofViewerBtn"
                            type="button"
                            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div class="bg-slate-100 p-4">
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

function buildLoading() {
    return `
        <div class="min-h-screen bg-slate-100">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <div class="text-sm text-slate-500">Cargando pagos...</div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    `;
}

function buildError() {
    return `
        <div class="min-h-screen bg-slate-100">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm">
                            <div class="text-base font-semibold text-slate-900">No se pudieron cargar los pagos.</div>
                            <div class="mt-2 text-sm text-slate-500">${escapeHtml(pageError || "Ocurrió un error inesperado.")}</div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    `;
}

function render() {
    if (loading) return buildLoading();
    if (pageError) return buildError();

    return `
        <div class="min-h-screen bg-slate-100">
            ${buildMobileCompanyHeader()}

            ${buildStudentMobileMenu({
                mobileMenuOpen,
                activeItem: "payments",
                studentName: getStudentFullName() || "Alumno",
                studentEmail: getStudentEmail() || "",
                activeItem: "payments"
            })}

            <div class="flex min-h-screen">
                ${buildSidebar()}

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
                paymentsHref: "/src/pages/student/payments/index.html"
            })}

            ${buildTransferModal()}
            ${buildProofViewerModal()}
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
        <header class="sticky top-0 z-30 border-b border-slate-200 bg-white md:hidden">
            <div class="flex items-center justify-between gap-3 px-4 py-3">

                <div class="flex min-w-0 items-center gap-3">

                    ${buildCompanyLogo("h-11 w-11", "rounded-2xl")}

                    <div class="min-w-0">
                        <div class="truncate text-sm font-semibold text-slate-900">
                            ${escapeHtml(getCompanyName() || "Empresa")}
                        </div>

                        <div class="truncate text-xs text-slate-500">
                            ${escapeHtml(getStudentFullName() || "Alumno")}
                        </div>
                    </div>

                </div>

                <div id="studentNotificationsBellMobile"></div>

            </div>
        </header>
    `;
}

function bindEvents() {
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

    document.querySelectorAll("[data-action='open-transfer']").forEach(btn => {
        btn.addEventListener("click", async () => {
            const chargeId = btn.getAttribute("data-charge-id");
            await openTransferModal(chargeId);
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
        const alias = transferInfo?.alias?.trim();
        if (!alias) return;

        try {
            await navigator.clipboard.writeText(alias);
            setUiMessage("success", "Alias copiado.");
            rerender();
        } catch {
            setUiMessage("error", "No se pudo copiar el alias.");
            rerender();
        }
    });

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        logoutAndRedirect();
    });

    document.getElementById("submitProofBtn")?.addEventListener("click", submitProof);

    document.getElementById("closeProofViewerBtn")?.addEventListener("click", closeProofViewer);

    document.getElementById("proofViewerOverlay")?.addEventListener("click", (e) => {
        if (e.target.id === "proofViewerOverlay") {
            closeProofViewer();
        }
    });

    initNotificationsBell({
    rootId: "studentNotificationsBellMobile"
});

initNotificationsBell({
    rootId: "studentNotificationsBellDesktop"
});
}

async function loadStudentProfile() {
    return await get(`/api/admin/${companySlug}/students/me`);
}

async function loadPayments() {
    const result = await get(`/api/student/${companySlug}/billing`);
    return Array.isArray(result) ? result : [];
}

async function loadTransferInfo() {
    return await get(`/api/student/${companySlug}/payment-transfer-info`);
}

async function openTransferModal(chargeId) {
    if (!chargeId) return;

    clearUiMessage();

    try {
        const ensured = await post(`/api/student/${companySlug}/charges/${chargeId}/ensure-payment`, {});

        const paymentId = ensured?.paymentId;
        if (!paymentId) {
            throw new Error("No se pudo crear o recuperar el pago.");
        }

        await post(`/api/student/${companySlug}/${paymentId}/select-method`, {
            paymentMethod: 2
        });

        selectedPaymentId = paymentId;
        rerender();
    } catch (error) {
        setUiMessage("error", error?.message || "No se pudo iniciar el pago.");
        rerender();
    }
}

function closeTransferModal() {
    selectedPaymentId = null;
    uploadingProof = false;
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
    const fileInput = document.getElementById("paymentProofFileInput");
    const file = fileInput?.files?.[0];

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

    clearUiMessage();
    uploadingProof = true;
    rerender();

    try {
        const formData = new FormData();
        formData.append("file", file);

        await postForm(`/api/student/payments/${selectedPaymentId}/proof`, formData);

        payments = await loadPayments();
        setUiMessage("success", "Comprobante enviado correctamente.");
        closeTransferModal();
    } catch (err) {
        uploadingProof = false;
        setUiMessage("error", err?.message || "No se pudo subir el comprobante.");
        rerender();
    }
}

async function init() {
    try {
        clearUiMessage();
        await loadConfig();

        const session = requireAuth();
        if (!session) return;

        companySlug = session.activeCompanySlug;

        const me = await get("/api/admin/me");
        company = (me.companies || []).find(x => x.companySlug === companySlug) || null;

        if (!company) {
            throw new Error("No se encontró la empresa activa del alumno.");
        }

        student = await loadStudentProfile();

        if (!student) {
            throw new Error("No se pudo obtener el perfil del alumno.");
        }

        payments = await loadPayments();
        transferInfo = await loadTransferInfo();
    } catch (error) {
        pageError = error?.message || "No se pudo cargar la información de pagos.";
    } finally {
        loading = false;
        rerender();
    }
}

init();