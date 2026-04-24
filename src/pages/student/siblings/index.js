import { get, post } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth, logoutAndRedirect } from "../../../shared/js/session.js";
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
import {
    getMe,
    setMe,
    getStudentMe,
    setStudentMe,
    getActiveCompany,
    setActiveCompany
} from "../../../shared/js/storage.js";


let session = null;
let companySlug = null;
let company = null;
let student = null;

let loading = true;
let pageError = "";
let mobileMenuOpen = false;

let siblings = [];
let requests = [];
let searchResults = [];

let searchTimeout = null;
let selectedStudent = null;
let isCreatingRequest = false;
let carnetOpen = false;

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
    if (!url) return false;

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

function buildStudentAvatar(size = "h-20 w-20") {
    const imageUrl = getStudentProfileImageUrl();
    const initials = getInitials(getStudentFullName());

    if (!imageUrl) {
        return `
            <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-lg font-bold text-slate-600 shadow-sm">
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
                onerror="const p=this.parentElement; this.remove(); if(p){ p.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center bg-slate-100 text-lg font-bold text-slate-600&quot;>${escapeHtml(initials)}</div>'; }"
            />
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

            <nav class="flex-1 space-y-2 px-4 py-4">
                ${navLink("Inicio", "/src/pages/student/home/index.html")}
                ${navLink("Cursos", "/src/pages/student/courses/index.html")}
                ${navLink("Pagos", "/src/pages/student/payments/index.html")}
                ${navLink("Documentos", "/src/pages/student/documents/index.html")}
                ${navLink("Perfil", "/src/pages/student/profile/index.html")}
                ${navLink("Hermanos", "/src/pages/student/siblings/index.html", true)}
            </nav>
            <div class="mt-auto border-t border-slate-200 px-4 py-4">
                <button
                    id="logoutBtn"
                    type="button"
                    class="flex w-full items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                    Cerrar sesión
                </button>
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

                <div class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-700 shadow-sm">
                    👨‍👩‍👧
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

                <div class="hidden rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 md:inline-flex">
                    Hermanos
                </div>
            </div>
        </section>
    `;
}

function buildHeroCard() {
    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div class="min-w-0">
                    <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Gestión familiar
                    </div>

                    <h2 class="mt-1 truncate text-2xl font-bold text-slate-900">
                        Hermanos vinculados
                    </h2>

                    <p class="mt-2 text-sm text-slate-500">
                        Buscá alumnos, enviá solicitudes de vinculación y seguí el estado de cada gestión.
                    </p>
                </div>

                <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Hermanos
                        </div>
                        <div class="mt-2 text-xl font-bold text-slate-900">
                            ${siblings.length}
                        </div>
                    </div>

                    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Solicitudes
                        </div>
                        <div class="mt-2 text-xl font-bold text-slate-900">
                            ${requests.length}
                        </div>
                    </div>

                    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 col-span-2 sm:col-span-1">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Pendientes
                        </div>
                        <div class="mt-2 text-xl font-bold text-slate-900">
                            ${requests.filter(x => Number(x.status) === 1 || Number(x.status) === 2 || Number(x.status) === 3).length}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function buildSearchResults() {
    if (!searchResults.length) {
        return `
            <div id="searchResults" class="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white"></div>
        `;
    }

    return `
        <div id="searchResults" class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            ${searchResults.map(item => `
                <button
                    type="button"
                    class="search-result-item flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 last:border-b-0"
                    data-id="${item.studentId}"
                >
                    <div class="flex min-w-0 items-center gap-3">
                        ${buildPersonAvatar(item.fullName, item.profileImageUrl, "h-11 w-11")}
                        <div class="min-w-0">
                            <div class="truncate text-sm font-semibold text-slate-900">
                                ${escapeHtml(item.fullName)}
                            </div>
                            <div class="truncate text-xs text-slate-500">
                                ${escapeHtml(item.dni || "-")}
                                ${item.memberNumber ? ` · Socio #${escapeHtml(item.memberNumber)}` : ""}
                            </div>
                        </div>
                    </div>

                    <div class="shrink-0">
                        ${
                            item.alreadySibling
                                ? `<span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Ya vinculado</span>`
                                : item.hasPendingRequest
                                    ? `<span class="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Solicitud abierta</span>`
                                    : `<span class="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Seleccionar</span>`
                        }
                    </div>
                </button>
            `).join("")}
        </div>
    `;
}

function buildSelectedStudentBox() {
    if (!selectedStudent) {
        return `
            <div id="selectedStudentBox" class="hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"></div>
        `;
    }

    return `
        <div id="selectedStudentBox" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 items-center gap-3">
                    ${buildPersonAvatar(selectedStudent.fullName, selectedStudent.profileImageUrl, "h-12 w-12")}
                    <div class="min-w-0">
                        <div class="truncate text-sm font-semibold text-slate-900">
                            ${escapeHtml(selectedStudent.fullName)}
                        </div>
                        <div class="truncate text-xs text-slate-500">
                            ${escapeHtml(selectedStudent.dni || "-")}
                            ${selectedStudent.memberNumber ? ` · Socio #${escapeHtml(selectedStudent.memberNumber)}` : ""}
                        </div>
                    </div>
                </div>

                <button
                    id="clearSelectedStudentBtn"
                    type="button"
                    class="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                >
                    Quitar
                </button>
            </div>
        </div>
    `;
}

function buildCreateRequestSection() {
    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="mb-5">
                <h2 class="text-lg font-semibold text-slate-900">Solicitar vínculo</h2>
                <p class="mt-1 text-sm text-slate-500">
                    Buscá otro alumno por nombre, apellido o DNI para enviar una solicitud de vinculación de hermanos.
                </p>
            </div>

            <div class="space-y-4">
                <div>
                    <label for="searchStudentInput" class="mb-1 block text-sm font-medium text-slate-700">
                        Buscar alumno
                    </label>

                    <input
                        id="searchStudentInput"
                        type="text"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                        placeholder="Ej: Juan Pérez o 40111222"
                    />
                </div>

                ${buildSearchResults()}
                ${buildSelectedStudentBox()}

                <div>
                    <label for="requestNote" class="mb-1 block text-sm font-medium text-slate-700">
                        Nota para la solicitud
                    </label>

                    <textarea
                        id="requestNote"
                        rows="4"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                        placeholder="Podés agregar una aclaración para el administrador."
                    ></textarea>
                </div>

                <p id="requestError" class="hidden text-sm text-rose-600"></p>

                <div class="flex flex-wrap gap-3">
                    <button
                        id="createRequestBtn"
                        type="button"
                        class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        ${selectedStudent && !selectedStudent.alreadySibling && !selectedStudent.hasPendingRequest ? "" : "disabled"}
                    >
                        ${isCreatingRequest ? "Enviando..." : "Enviar solicitud"}
                    </button>

                    <button
                        id="clearSearchBtn"
                        type="button"
                        class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        Limpiar
                    </button>
                </div>
            </div>
        </section>
    `;
}

function buildSiblingsSection() {
    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="mb-5">
                <h2 class="text-lg font-semibold text-slate-900">Mis hermanos</h2>
                <p class="mt-1 text-sm text-slate-500">
                    Alumnos que ya están vinculados dentro de tu grupo familiar.
                </p>
            </div>

            ${
                !siblings.length
                    ? `
                        <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            Todavía no tenés hermanos vinculados.
                        </div>
                    `
                    : `
                        <div class="grid gap-4 md:grid-cols-2">
                            ${siblings.map(item => `
                                <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div class="flex items-center gap-3">
                                        ${buildPersonAvatar(item.fullName, item.profileImageUrl)}
                                        <div class="min-w-0">
                                            <div class="truncate text-sm font-semibold text-slate-900">
                                                ${escapeHtml(item.fullName)}
                                            </div>
                                            <div class="truncate text-xs text-slate-500">
                                                DNI: ${escapeHtml(item.dni || "-")}
                                            </div>
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

function buildRequestsSection() {
    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="mb-5">
                <h2 class="text-lg font-semibold text-slate-900">Mis solicitudes</h2>
                <p class="mt-1 text-sm text-slate-500">
                    Seguimiento de solicitudes enviadas o recibidas.
                </p>
            </div>

            ${
                !requests.length
                    ? `
                        <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            Todavía no hay solicitudes registradas.
                        </div>
                    `
                    : `
                        <div class="space-y-4">
                            ${requests.map(item => `
                                <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div class="space-y-3">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRequestStatusClasses(item.status)}">
                                                    ${escapeHtml(getRequestStatusLabel(item.status))}
                                                </span>

                                                <span class="text-xs text-slate-500">
                                                    ${escapeHtml(formatDate(item.createdAtUtc))}
                                                </span>
                                            </div>

                                            <div class="text-sm text-slate-700">
                                                <span class="font-semibold text-slate-900">Solicita:</span>
                                                ${escapeHtml(item.requestedByStudentFullName || "-")}
                                                <span class="text-slate-500">(${escapeHtml(item.requestedByDni || "-")})</span>
                                            </div>

                                            <div class="text-sm text-slate-700">
                                                <span class="font-semibold text-slate-900">Destino:</span>
                                                ${escapeHtml(item.targetStudentFullName || "-")}
                                                <span class="text-slate-500">(${escapeHtml(item.targetDni || "-")})</span>
                                            </div>

                                            ${
                                                item.note
                                                    ? `
                                                        <div class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                                                            ${escapeHtml(item.note)}
                                                        </div>
                                                    `
                                                    : ""
                                            }
                                        </div>

                                        <div class="flex shrink-0 flex-wrap gap-2">
                                        <button
                                            type="button"
                                            class="openRequestDetailBtn inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                                            data-id="${escapeHtml(item.id)}"
                                        >
                                            Ver detalle
                                        </button>
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

function openRequestDetail(requestId) {
    if (!requestId) return;

    sessionStorage.setItem("studentSiblingRequestId", requestId);
    window.location.href = `/src/pages/student/siblings/request-detail/index.html?id=${encodeURIComponent(requestId)}`;
}

function buildLoading() {
    return `
        <div class="min-h-screen bg-slate-100">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <div class="text-sm text-slate-500">Cargando sección de hermanos...</div>
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
                            <div class="text-base font-semibold text-slate-900">No se pudo cargar la sección.</div>
                            <div class="mt-2 text-sm text-slate-500">${escapeHtml(pageError || "Ocurrió un error inesperado.")}</div>
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
                            ${buildCreateRequestSection()}
                            ${buildSiblingsSection()}
                            ${buildRequestsSection()}
                        </div>
                    </div>
                </main>
            </div>

            ${buildMobileBottomNav()}

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
    extraLocked: carnetOpen
});
    bindEvents();
}

function showRequestError(message) {
    const el = qs("requestError");
    if (!el) return;

    el.textContent = message;
    el.classList.remove("hidden");
}

function clearRequestError() {
    const el = qs("requestError");
    if (!el) return;

    el.textContent = "";
    el.classList.add("hidden");
}

async function loadMe() {
    let cached = getStudentMe(companySlug);

if (cached && !isSasUrlExpired(cached.profileImageUrl)) {
    student = cached;
    return;
}

    const result = await get(`/api/student/${companySlug}/me`);
    setStudentMe(companySlug, result);
    student = result;
}

async function loadSiblings() {
    siblings = await get(`/api/student/${companySlug}/siblings`);
}

async function loadRequests() {
    requests = await get(`/api/student/${companySlug}/sibling-link-requests`);
}

async function searchStudents(term) {
    const value = String(term || "").trim();

    if (value.length < 2) {
        searchResults = [];
        render();
        return;
    }

    try {
        searchResults = await get(`/api/student/${companySlug}/siblings/search?term=${encodeURIComponent(value)}`);
    } catch {
        searchResults = [];
    }

    render();
}

async function createRequest() {
    if (isCreatingRequest) return;

    clearRequestError();

    if (!selectedStudent?.studentId) {
        showRequestError("Debes seleccionar un alumno.");
        return;
    }

    if (selectedStudent.alreadySibling) {
        showRequestError("Ese alumno ya está vinculado como hermano.");
        return;
    }

    if (selectedStudent.hasPendingRequest) {
        showRequestError("Ya existe una solicitud abierta con ese alumno.");
        return;
    }

    const note = qs("requestNote")?.value?.trim() || null;

    try {
        isCreatingRequest = true;
        render();

        await post(`/api/student/${companySlug}/siblings/requests`, {
            targetStudentId: selectedStudent.studentId,
            note
        });

        selectedStudent = null;
        searchResults = [];

        const input = qs("searchStudentInput");
        if (input) {
            input.value = "";
        }

        const noteInput = qs("requestNote");
        if (noteInput) {
            noteInput.value = "";
        }

        await loadRequests();
        await loadSiblings();
    } catch (error) {
        showRequestError(error?.message || "No se pudo enviar la solicitud.");
    } finally {
        isCreatingRequest = false;
        render();
    }
}

function clearSearchState() {
    selectedStudent = null;
    searchResults = [];
    clearRequestError();

    const input = qs("searchStudentInput");
    if (input) {
        input.value = "";
    }

    const noteInput = qs("requestNote");
    if (noteInput) {
        noteInput.value = "";
    }

    render();
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

    qs("searchStudentInput")?.addEventListener("input", (event) => {
        clearTimeout(searchTimeout);
        clearRequestError();

        const value = event.target.value;

        searchTimeout = setTimeout(() => {
            searchStudents(value);
        }, 300);
    });

    qs("createRequestBtn")?.addEventListener("click", createRequest);
    qs("clearSearchBtn")?.addEventListener("click", clearSearchState);
    qs("clearSelectedStudentBtn")?.addEventListener("click", () => {
        selectedStudent = null;
        clearRequestError();
        render();
    });

document.querySelectorAll(".openRequestDetailBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        openRequestDetail(btn.dataset.id);
    });
});

document.querySelectorAll("#logoutBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        logoutAndRedirect();
    });
});

    document.querySelectorAll(".search-result-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const studentId = btn.dataset.id;
            const item = searchResults.find(x => String(x.studentId) === String(studentId));

            if (!item) return;

            if (item.alreadySibling || item.hasPendingRequest) {
                selectedStudent = item;
                clearRequestError();
                render();
                return;
            }

            selectedStudent = item;
            searchResults = [];

            const input = qs("searchStudentInput");
            if (input) {
                input.value = item.fullName || "";
            }

            clearRequestError();
            render();
        });
    });
}

async function init() {
    try {
        await loadConfig();
        enableStudentSoftNavigation();
        session = requireAuth();
        if (!session) return;

companySlug = session.activeCompanySlug;

let cachedCompany = getActiveCompany(companySlug);

if (cachedCompany && !isSasUrlExpired(cachedCompany.logoUrl)) {
    company = cachedCompany;
} else {
    let me = getMe();

    if (!me) {
        me = await get("/api/admin/me");
        setMe(me);
    }

    company = (me.companies || []).find(x => x.companySlug === companySlug) || null;

    if (company) {
        setActiveCompany(companySlug, company);
    }
}
if (!company) {
    throw new Error("No se encontró la empresa activa del alumno.");
}

        await Promise.all([
            loadMe(),
            loadSiblings(),
            loadRequests()
        ]);
    } catch (error) {
        pageError = error?.message || "No se pudo cargar la información.";
    } finally {
        loading = false;
        render();
    }
}

init();