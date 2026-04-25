import { get, postForm } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth, logoutAndRedirect } from "../../../../shared/js/session.js";
import {
    buildStudentMobileMenu,
    buildStudentMobileBottomNav,
    bindStudentMobileShellEvents,
    syncStudentMobileShellScrollLock,
    enableStudentSoftNavigation
} from "../../../../shared/js/student-mobile-shell.js";
import {
    buildStudentCarnetModal,
    bindStudentCarnetEvents
} from "../../../../shared/js/student-carnet.js";
import {
    getMe,
    setMe,
    getStudentMe,
    setStudentMe,
    getActiveCompany,
    setActiveCompany
} from "../../../../shared/js/storage.js";

let session = null;
let companySlug = null;
let company = null;
let student = null;
let carnetOpen = false;

let requestId = null;
let requestDetail = null;
let documents = [];

let loading = true;
let pageError = "";
let mobileMenuOpen = false;

let isUploadingDocument = false;
let isRefreshingRequest = false;

let documentViewerOpen = false;
let documentViewerLoading = false;
let documentViewerError = "";
let currentDocumentView = null;

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

function formatDate(value) {
    if (!value) return "-";

    try {
        return new Date(value).toLocaleString("es-AR");
    } catch {
        return "-";
    }
}

function getCompanyName() {
    return company?.companyName?.trim() || company?.name?.trim() || "";
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

function getStudentProfileImageUrl() {
    return student?.profileImageUrl?.trim() || "";
}

function getInitials(text) {
    const parts = String(text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (!parts.length) return "—";
    return parts.map(x => x.charAt(0).toUpperCase()).join("");
}

function getRequestStatusLabel(status) {
    switch (Number(status)) {
        case 1:
            return "Pendiente";
        case 2:
            return "Documentación solicitada";
        case 3:
            return "En revisión";
        case 4:
            return "Aprobada";
        case 5:
            return "Rechazada";
        case 6:
            return "Cancelada";
        default:
            return "Desconocido";
    }
}

function getRequestStatusClasses(status) {
    switch (Number(status)) {
        case 1:
            return "bg-amber-50 text-amber-700";
        case 2:
            return "bg-orange-50 text-orange-700";
        case 3:
            return "bg-sky-50 text-sky-700";
        case 4:
            return "bg-emerald-50 text-emerald-700";
        case 5:
            return "bg-rose-50 text-rose-700";
        case 6:
            return "bg-slate-100 text-slate-700";
        default:
            return "bg-slate-100 text-slate-700";
    }
}

function canDeleteDocuments() {
    if (!requestDetail) return false;
    if (requestDetail.documentsLocked) return false;
    if (Number(requestDetail.status) === 4) return false;
    return true;
}

function buildCompanyLogo(size = "h-14 w-14", rounded = "rounded-2xl") {
    const logoUrl = getCompanyLogoUrl();
    const initials = getInitials(getCompanyName());

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
                onerror="const p=this.parentElement; this.remove(); if(p){ p.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center text-xs font-bold text-slate-700&quot;>${escapeHtml(initials)}</div>'; }"
            />
        </div>
    `;
}

function buildStudentAvatar(size = "h-16 w-16", imageUrlOverride = null) {
    const imageUrl = imageUrlOverride || getStudentProfileImageUrl();
    const initials = getInitials(getStudentFullName());

    if (!imageUrl) {
        return `
            <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-base font-bold text-slate-600 shadow-sm">
                ${escapeHtml(initials)}
            </div>
        `;
    }

    return `
        <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm">
            <img
                src="${escapeHtml(imageUrl)}"
                alt="Foto de perfil"
                class="block h-full w-full object-cover"
                onerror="const p=this.parentElement; this.remove(); if(p){ p.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center bg-slate-100 text-base font-bold text-slate-600&quot;>${escapeHtml(initials)}</div>'; }"
            />
        </div>
    `;
}

function closeDocumentViewer() {
    documentViewerOpen = false;
    documentViewerLoading = false;
    documentViewerError = "";
    currentDocumentView = null;
    render();
}

function downloadCurrentDocument() {
    if (!currentDocumentView?.url) return;

    const link = document.createElement("a");
    link.href = currentDocumentView.url;
    link.download = currentDocumentView.fileName || "archivo";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function buildDocumentViewerModal() {
    if (!documentViewerOpen) return "";

    return `
        <div
            id="documentViewerOverlay"
            class="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-[2px]"
        >
            <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div class="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                    <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
                        <div class="min-w-0">
                            <div class="truncate text-base font-semibold text-slate-900">
                                ${escapeHtml(currentDocumentView?.fileName || "Visor de documento")}
                            </div>
                            <div class="mt-1 text-xs text-slate-500">
                                ${escapeHtml(currentDocumentView?.contentType || "")}
                            </div>
                        </div>

                        <div class="flex shrink-0 items-center gap-2">
                            ${
                                currentDocumentView?.url
                                    ? `
                                        <button
                                            id="downloadDocumentBtn"
                                            type="button"
                                            class="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                        >
                                            Descargar
                                        </button>
                                    `
                                    : ""
                            }

                            <button
                                id="closeDocumentViewerBtn"
                                type="button"
                                class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                                aria-label="Cerrar visor"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <div class="max-h-[80vh] overflow-auto bg-slate-100 p-4 sm:p-6">
                        ${
                            documentViewerLoading
                                ? `
                                    <div class="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
                                        Cargando documento...
                                    </div>
                                `
                                : documentViewerError
                                    ? `
                                        <div class="flex min-h-[420px] items-center justify-center rounded-2xl border border-rose-200 bg-white px-6 text-center text-sm text-rose-600">
                                            ${escapeHtml(documentViewerError)}
                                        </div>
                                    `
                                    : currentDocumentView?.isImage
                                        ? `
                                            <div class="rounded-2xl border border-slate-200 bg-white p-3">
                                                <img
                                                    src="${escapeHtml(currentDocumentView.url)}"
                                                    alt="${escapeHtml(currentDocumentView.fileName || "Documento")}"
                                                    class="mx-auto block max-h-[68vh] w-auto max-w-full rounded-xl object-contain"
                                                />
                                            </div>
                                        `
                                        : currentDocumentView?.isPdf
                                            ? `
                                                <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                                    <iframe
                                                        src="${escapeHtml(currentDocumentView.url)}"
                                                        class="block h-[70vh] w-full"
                                                        title="${escapeHtml(currentDocumentView.fileName || "PDF")}"
                                                    ></iframe>
                                                </div>
                                            `
                                            : `
                                                <div class="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
                                                    <div class="text-base font-semibold text-slate-900">
                                                        No se puede previsualizar este archivo.
                                                    </div>
                                                    <div class="mt-2 text-sm text-slate-500">
                                                        Podés descargarlo para verlo en tu dispositivo.
                                                    </div>
                                                </div>
                                            `
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
}

function buildPersonAvatar(name, imageUrl, size = "h-12 w-12") {
    const initials = getInitials(name);

    if (!imageUrl) {
        return `
            <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-600 shadow-sm">
                ${escapeHtml(initials)}
            </div>
        `;
    }

    return `
        <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm">
            <img
                src="${escapeHtml(imageUrl)}"
                alt="Foto de perfil"
                class="block h-full w-full object-cover"
                onerror="const p=this.parentElement; this.remove(); if(p){ p.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center bg-slate-100 text-sm font-bold text-slate-600&quot;>${escapeHtml(initials)}</div>'; }"
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

            <nav class="space-y-2 px-4 py-4">
                ${navLink("Inicio", "/src/pages/student/home/index.html")}
                ${navLink("Cursos", "/src/pages/student/courses/index.html")}
                ${navLink("Pagos", "/src/pages/student/payments/index.html")}
                ${navLink("Documentos", "/src/pages/student/documents/index.html")}
                ${navLink("Perfil", "/src/pages/student/profile/index.html")}
                ${navLink("Hermanos", "/src/pages/student/siblings/index.html", true)}
            </nav>
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

                <div class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-700 shadow-sm">
                    📄
                </div>
            </div>
        </header>
    `;
}

function buildMobileMenu() {
    return buildStudentMobileMenu({
        mobileMenuOpen,
        studentFullName: getStudentFullName(),
        studentEmail: getStudentEmail(),
        activeItem: "siblings"
    });
}

function buildMobileBottomNav() {
    return buildStudentMobileBottomNav({
        activeItem: "siblings",
        homeHref: "/src/pages/student/home/index.html",
        profileHref: "/src/pages/student/profile/index.html",
        carnetHref: "javascript:void(0)",
        paymentsHref: "/src/pages/student/payments/index.html"
    });
}

function buildTopBar() {
    return `
        <section class="hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:block">
            <div class="flex items-center justify-between gap-4">
                <div class="flex min-w-0 items-center gap-3">
                    ${buildCompanyLogo("h-14 w-14")}

                    <div class="min-w-0">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Empresa
                        </div>

                        <h1 class="mt-1 truncate text-lg font-bold text-slate-900 sm:text-xl">
                            ${escapeHtml(getCompanyName() || "—")}
                        </h1>
                    </div>
                </div>

                <a
                    href="/src/pages/student/siblings/index.html"
                    class="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:inline-flex"
                >
                    Volver
                </a>
            </div>
        </section>
    `;
}

function getRequestHeaderProfileImageUrl() {
    if (!requestDetail) return getStudentProfileImageUrl();

    if (String(requestDetail.requestedByStudentId || "") === String(student?.id || "")) {
        return requestDetail.requestedByStudentProfileImageUrl || getStudentProfileImageUrl();
    }

    if (String(requestDetail.targetStudentId || "") === String(student?.id || "")) {
        return requestDetail.targetStudentProfileImageUrl || getStudentProfileImageUrl();
    }

    return getStudentProfileImageUrl();
}

function buildHeroCard() {
    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div class="flex items-center gap-4">
                    ${buildStudentAvatar("h-16 w-16", getRequestHeaderProfileImageUrl())}

                    <div class="min-w-0">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Solicitud
                        </div>

                        <h2 class="mt-1 truncate text-2xl font-bold text-slate-900">
                            Detalle de solicitud
                        </h2>

                        <p class="mt-2 text-sm text-slate-500">
                            Revisá el estado, la documentación y las observaciones de la gestión.
                        </p>
                    </div>
                </div>

                ${
                    requestDetail
                        ? `
                            <div class="flex flex-wrap items-center gap-3">
                                <span class="inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getRequestStatusClasses(requestDetail.status)}">
                                    ${escapeHtml(getRequestStatusLabel(requestDetail.status))}
                                </span>

                                <span class="text-sm text-slate-500">
                                    ${escapeHtml(formatDate(requestDetail.createdAtUtc))}
                                </span>
                            </div>
                        `
                        : ""
                }
            </div>
        </section>
    `;
}

function buildRequestParticipants() {
    if (!requestDetail) return "";

    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="mb-5">
                <h2 class="text-lg font-semibold text-slate-900">Participantes</h2>
                <p class="mt-1 text-sm text-slate-500">
                    Alumnos involucrados en la solicitud.
                </p>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
                <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Solicita
                    </div>

                    <div class="flex items-center gap-3">
                        ${buildPersonAvatar(
                                requestDetail.requestedByStudentFullName,
                                requestDetail.requestedByStudentProfileImageUrl
                            )}
                        <div class="min-w-0">
                            <div class="truncate text-sm font-semibold text-slate-900">
                                ${escapeHtml(requestDetail.requestedByStudentFullName || "-")}
                            </div>
                            <div class="truncate text-xs text-slate-500">
                                DNI: ${escapeHtml(requestDetail.requestedByDni || "-")}
                            </div>
                        </div>
                    </div>
                </article>

                <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Destino
                    </div>

                    <div class="flex items-center gap-3">
                        ${buildPersonAvatar(
                            requestDetail.targetStudentFullName,
                            requestDetail.targetStudentProfileImageUrl
                        )}
                        <div class="min-w-0">
                            <div class="truncate text-sm font-semibold text-slate-900">
                                ${escapeHtml(requestDetail.targetStudentFullName || "-")}
                            </div>
                            <div class="truncate text-xs text-slate-500">
                                DNI: ${escapeHtml(requestDetail.targetDni || "-")}
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        </section>
    `;
}

function buildNotesSection() {
    if (!requestDetail) return "";

    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="mb-5">
                <h2 class="text-lg font-semibold text-slate-900">Seguimiento</h2>
                <p class="mt-1 text-sm text-slate-500">
                    Estado actual, notas y observaciones de la solicitud.
                </p>
            </div>

            <div class="space-y-4">
                ${
                    requestDetail.note
                        ? `
                            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    Nota original
                                </div>
                                <div class="mt-2 text-sm leading-6 text-slate-700">
                                    ${escapeHtml(requestDetail.note)}
                                </div>
                            </div>
                        `
                        : ""
                }

                ${
                    requestDetail.documentsRequestNote
                        ? `
                            <div class="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                                <div class="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                                    Documentación solicitada
                                </div>
                                <div class="mt-2 text-sm leading-6 text-orange-800">
                                    ${escapeHtml(requestDetail.documentsRequestNote)}
                                </div>
                            </div>
                        `
                        : ""
                }

                ${
                    requestDetail.adminReviewNote
                        ? `
                            <div class="rounded-2xl border border-slate-200 bg-white p-4">
                                <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    Nota del administrador
                                </div>
                                <div class="mt-2 text-sm leading-6 text-slate-700">
                                    ${escapeHtml(requestDetail.adminReviewNote)}
                                </div>
                            </div>
                        `
                        : ""
                }

                <div class="grid gap-4 md:grid-cols-3">
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Estado
                        </div>
                        <div class="mt-2 text-sm font-semibold text-slate-900">
                            ${escapeHtml(getRequestStatusLabel(requestDetail.status))}
                        </div>
                    </div>

                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Creada
                        </div>
                        <div class="mt-2 text-sm font-semibold text-slate-900">
                            ${escapeHtml(formatDate(requestDetail.createdAtUtc))}
                        </div>
                    </div>

                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Revisada
                        </div>
                        <div class="mt-2 text-sm font-semibold text-slate-900">
                            ${escapeHtml(formatDate(requestDetail.reviewedAtUtc))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function buildUploadSection() {
    if (!requestDetail) return "";

    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="mb-5">
                <h2 class="text-lg font-semibold text-slate-900">Documentación</h2>
                <p class="mt-1 text-sm text-slate-500">
                    Subí archivos de respaldo como foto de DNI o documentación solicitada por administración.
                </p>
            </div>

            ${
                canDeleteDocuments()
                    ? `
                        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div class="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                                <div>
                                    <label for="documentFile" class="mb-1 block text-sm font-medium text-slate-700">
                                        Archivo
                                    </label>

                                    <input
                                        id="documentFile"
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                                        class="block w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
                                    />

                                    <p class="mt-1 text-xs text-slate-500">
                                        Formatos permitidos: JPG, PNG, WEBP o PDF. Máximo 10 MB.
                                    </p>
                                </div>

                                <button
                                    id="uploadDocumentBtn"
                                    type="button"
                                    class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    ${isUploadingDocument ? "Subiendo..." : "Subir documento"}
                                </button>
                            </div>

                            <p id="documentError" class="mt-3 hidden text-sm text-rose-600"></p>
                        </div>
                    `
                    : `
                        <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                            Esta solicitud ya fue cerrada o aprobada. Los documentos quedan disponibles para consulta, pero ya no se pueden modificar.
                        </div>
                    `
            }
        </section>
    `;
}

function buildDocumentsList() {
    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="mb-5">
                <h2 class="text-lg font-semibold text-slate-900">Archivos subidos</h2>
                <p class="mt-1 text-sm text-slate-500">
                    Documentos adjuntos en esta gestión.
                </p>
            </div>

            ${
                !documents.length
                    ? `
                        <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            Todavía no hay documentos cargados.
                        </div>
                    `
                    : `
                        <div class="space-y-4">
                            ${documents.map(item => `
                                <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div class="min-w-0">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span class="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                                                    ${item.isPdf ? "PDF" : item.isImage ? "Imagen" : "Archivo"}
                                                </span>

                                                <span class="text-xs text-slate-500">
                                                    ${escapeHtml(formatDate(item.uploadedAtUtc))}
                                                </span>
                                            </div>

                                            <div class="mt-3 truncate text-sm font-semibold text-slate-900">
                                                ${escapeHtml(item.fileName || "-")}
                                            </div>
                                        </div>

                                        <div class="flex shrink-0 flex-wrap gap-2">
                                            <button
                                                type="button"
                                                class="viewDocumentBtn inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                                data-id="${item.id}"
                                            >
                                                Ver
                                            </button>

                                            ${
                                                canDeleteDocuments()
                                                    ? `
                                                        <button
                                                            type="button"
                                                            class="deleteDocumentBtn inline-flex items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                                                            data-id="${item.id}"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    `
                                                    : ""
                                            }
                                        </div>
                                    </div>
                                </article>
                            `).join("")}
                        </div>
                    `
            }
        </section>
    `;
}

function buildLoading() {
    return `
        <div class="min-h-screen bg-slate-100">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <div class="text-sm text-slate-500">Cargando detalle de solicitud...</div>
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
                        <div class="space-y-4">
                            <div class="rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm">
                                <div class="text-base font-semibold text-slate-900">No se pudo cargar la solicitud.</div>
                                <div class="mt-2 text-sm text-slate-500">${escapeHtml(pageError || "Ocurrió un error inesperado.")}</div>
                            </div>

                            <a
                                href="/src/pages/student/siblings/index.html"
                                class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                                Volver a hermanos
                            </a>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    `;
}

function buildPage() {
    return `
        <div class="min-h-screen bg-slate-100">
            ${buildMobileHeader()}
            ${buildMobileMenu()}

            <div class="flex min-h-screen">
                ${buildSidebar()}

                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 pb-[190px] sm:px-6 lg:px-8 md:pb-6">
                        <div class="space-y-6">
                            ${buildTopBar()}
                            ${buildHeroCard()}
                            ${buildRequestParticipants()}
                            ${buildNotesSection()}
                            ${buildUploadSection()}
                            ${buildDocumentsList()}
                        </div>
                    </div>
                </main>
            </div>

            ${buildMobileBottomNav()}
            ${buildDocumentViewerModal()}

            ${buildStudentCarnetModal({
                open: carnetOpen,
                student,
                company
            })}
        </div>
    `;
}

function render() {
    const app = qs("app");
    if (!app) return;

    if (loading) {
        app.innerHTML = buildLoading();
        return;
    }

    if (pageError) {
        app.innerHTML = buildError();
        return;
    }

    app.innerHTML = buildPage();
syncStudentMobileShellScrollLock({
    mobileMenuOpen,
    extraLocked: documentViewerOpen || carnetOpen
});
    bindEvents();
}

function showDocumentError(message) {
    const el = qs("documentError");
    if (!el) return;

    el.textContent = message;
    el.classList.remove("hidden");
}

function clearDocumentError() {
    const el = qs("documentError");
    if (!el) return;

    el.textContent = "";
    el.classList.add("hidden");
}

function handleDocumentViewerEscape(event) {
    if (event.key === "Escape" && documentViewerOpen) {
        closeDocumentViewer();
    }
}

function getRequestIdFromUrl() {
    const url = new URL(window.location.href);

    const fromQuery =
        url.searchParams.get("id") ||
        url.searchParams.get("requestId");

    if (fromQuery) {
        sessionStorage.setItem("studentSiblingRequestId", fromQuery);
        return fromQuery;
    }

    const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : url.hash;
    const hashParams = new URLSearchParams(hash || "");
    const fromHash =
        hashParams.get("id") ||
        hashParams.get("requestId");

    if (fromHash) {
        sessionStorage.setItem("studentSiblingRequestId", fromHash);
        return fromHash;
    }

    return sessionStorage.getItem("studentSiblingRequestId") || "";
}

async function loadMe() {
    const cached = getStudentMe(companySlug);

    if (cached && !isSasUrlExpired(cached.profileImageUrl)) {
        student = cached;
        return;
    }
}

async function loadRequestDetail() {
    requestDetail = await get(`/api/student/${companySlug}/siblings/requests/${requestId}`);
}

async function loadDocuments() {
    documents = await get(`/api/student/${companySlug}/siblings/requests/${requestId}/documents`);
}

async function refreshAll() {
    if (isRefreshingRequest) return;

    try {
        isRefreshingRequest = true;
        await Promise.all([
            loadRequestDetail(),
            loadDocuments()
        ]);
    } finally {
        isRefreshingRequest = false;
    }
}

async function uploadDocument() {
    if (isUploadingDocument) return;

    clearDocumentError();

    const input = qs("documentFile");
    const file = input?.files?.[0];

    if (!file) {
        showDocumentError("Debes seleccionar un archivo.");
        return;
    }

    const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ];

    if (!allowed.includes(file.type)) {
        showDocumentError("Formato inválido. Solo se permiten JPG, PNG, WEBP o PDF.");
        return;
    }

    if (file.size > 10_000_000) {
        showDocumentError("El archivo supera el tamaño máximo permitido.");
        return;
    }

    try {
        isUploadingDocument = true;
        render();

        const formData = new FormData();
        formData.append("file", file);

        await postForm(`/api/student/${companySlug}/siblings/requests/${requestId}/documents`, formData);

        if (input) {
            input.value = "";
        }

        await refreshAll();
    } catch (error) {
        showDocumentError(error?.message || "No se pudo subir el documento.");
    } finally {
        isUploadingDocument = false;
        render();
    }
}

async function viewDocument(documentId) {
    try {
        documentViewerOpen = true;
        documentViewerLoading = true;
        documentViewerError = "";
        currentDocumentView = null;
        render();

        const result = await get(`/api/student/${companySlug}/siblings/requests/${requestId}/documents/${documentId}/view`);

        if (!result?.url) {
            throw new Error("No se pudo obtener el archivo.");
        }

        currentDocumentView = {
            url: result.url,
            fileName: result.fileName || "archivo",
            contentType: result.contentType || "application/octet-stream",
            isImage: !!result.isImage,
            isPdf: !!result.isPdf
        };
    } catch (error) {
        documentViewerError = error?.message || "No se pudo abrir el documento.";
    } finally {
        documentViewerLoading = false;
        render();
    }
}

async function deleteDocument(documentId) {
if (!confirm("¿Querés eliminar este documento?")) return;

    try {
        const token =
            session?.token ||
            session?.accessToken ||
            session?.jwt ||
            localStorage.getItem("token") ||
            localStorage.getItem("auth_token") ||
            localStorage.getItem("classclick_token") ||
            "";

        const response = await fetch(`/api/student/${companySlug}/siblings/requests/${requestId}/documents/${documentId}`, {
            method: "DELETE",
            headers: token
                ? { Authorization: `Bearer ${token}` }
                : {}
        });

        if (!response.ok) {
            let message = "No se pudo eliminar el documento.";

            try {
                const data = await response.json();
                message = data?.message || data?.title || data || message;
            } catch {
                // ignore
            }

            throw new Error(message);
        }

        await refreshAll();
        render();
    } catch (error) {
        showDocumentError(error?.message || "No se pudo eliminar el documento.");
    }
}

function bindEvents() {
bindStudentMobileShellEvents({
    setMobileMenuOpen: (value) => {
        mobileMenuOpen = !!value;
        render();
    },
    onLogout: () => {
        logoutAndRedirect();
    },
    onOpenCarnet: () => {
        carnetOpen = true;
        render();
    }
});

bindStudentCarnetEvents({
    setCarnetOpen: (value) => {
        carnetOpen = !!value;
        render();
    }
});

    qs("uploadDocumentBtn")?.addEventListener("click", uploadDocument);

    document.querySelectorAll(".viewDocumentBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            viewDocument(btn.dataset.id);
        });
    });

    document.querySelectorAll(".deleteDocumentBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            deleteDocument(btn.dataset.id);
        });
    });

    qs("closeDocumentViewerBtn")?.addEventListener("click", closeDocumentViewer);

    qs("documentViewerOverlay")?.addEventListener("click", (event) => {
        if (event.target?.id === "documentViewerOverlay") {
            closeDocumentViewer();
        }
    });

    document.querySelectorAll("#logoutBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        logoutAndRedirect();
    });
});

    qs("downloadDocumentBtn")?.addEventListener("click", downloadCurrentDocument);

    document.addEventListener("keydown", handleDocumentViewerEscape);
}

async function init() {
    try {
        await loadConfig();
        enableStudentSoftNavigation();
        session = requireAuth();
        if (!session) return;

        companySlug = session.activeCompanySlug;
        requestId = getRequestIdFromUrl();

        if (!requestId) {
            throw new Error("No se indicó la solicitud.");
        }

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

        await Promise.all([
            loadMe(),
            loadRequestDetail(),
            loadDocuments()
        ]);
    } catch (error) {
        pageError = error?.message || "No se pudo cargar la información.";
    } finally {
        loading = false;
        render();
    }
}

init();