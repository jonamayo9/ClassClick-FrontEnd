import { get } from "../../../shared/js/api.js";
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
import { initPwaInstall } from "../../../shared/js/pwa-install.js";
import {
    getMe,
    setMe,
    getStudentMe,
    setStudentMe,
    getActiveCompany,
    setActiveCompany,
    getMatches,
    setMatches
} from "../../../shared/js/storage.js";
let isRefreshingOpponentLogos = false;
let companySlug = null;
let company = null;
let student = null;
let matches = [];
let selectedMatch = null;
let matchesModalOpen = false;
let matchDetailModalOpen = false;
let mobileMenuOpen = false;
let loading = true;
let pageError = "";
let isRefreshingStudentPhoto = false;
let carnetOpen = false;
let announcements = [];
let announcementsModalOpen = false;
let announcementDetailModalOpen = false;
let selectedAnnouncement = null;
let announcementDetailFromHistory = false;
let sponsors = [];
let selectedSponsor = null;
let sponsorDetailModalOpen = false;
let currentSponsorIndex = 0;
let isRestoringSponsorPosition = false;

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function qs(selector) {
    return document.querySelector(selector);
}

function hasCompany() {
    return !!company;
}

function hasStudent() {
    return !!student;
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

function getStudentPhone() {
    return student?.phone?.trim() || "";
}

function getStudentDni() {
    return student?.dni?.trim() || "";
}

function getStudentProfileImageUrl() {
    return student?.profileImageUrl?.trim() || "";
}

function getStudentMemberNumber() {
    return student?.memberNumber?.trim() || "";
}

function getStudentRegistrationLabel() {
    if (!student) return "";
    return student.isRegistrationCompleted ? "Registro completo" : "Registro pendiente";
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

function buildBottomNavIcon(type, extraClass = "") {
    const base = `class="h-full w-full ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"`;

    if (type === "home") {
        return `
            <svg ${base}>
                <path d="M3 10.5 12 3l9 7.5"></path>
                <path d="M5.5 9.5V20h13V9.5"></path>
                <path d="M9.5 20v-5h5v5"></path>
            </svg>
        `;
    }

    if (type === "ball") {
        return `
            <svg ${base}>
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M12 7.2 8.8 9.5 10 13.2h4l1.2-3.7L12 7.2Z"></path>
                <path d="M8.8 9.5 6.3 8.8 4.8 12l1.8 3"></path>
                <path d="M15.2 9.5l2.5-.7 1.5 3.2-1.8 3"></path>
                <path d="M10 13.2 8.2 16.2 12 18.8l3.8-2.6-1.8-3"></path>
            </svg>
        `;
    }

    if (type === "card") {
        return `
            <svg ${base}>
                <rect x="3" y="5" width="18" height="14" rx="2.5"></rect>
                <path d="M3 9h18"></path>
                <circle cx="8" cy="14" r="1"></circle>
                <path d="M11 14h5"></path>
            </svg>
        `;
    }

    if (type === "ticket") {
        return `
            <svg ${base}>
                <path d="M5 8.5A2.5 2.5 0 0 0 5 13.5V16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5a2.5 2.5 0 0 0 0-5V8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v.5Z"></path>
                <path d="M9 8.5v7"></path>
                <path d="M15 8.5v7"></path>
            </svg>
        `;
    }

    if (type === "menu") {
        return `
            <svg ${base}>
                <path d="M5 7h14"></path>
                <path d="M5 12h14"></path>
                <path d="M5 17h14"></path>
            </svg>
        `;
    }

    return "";
}

async function refreshStudentPhotoUrl(options = {}) {
    if (!student || isRefreshingStudentPhoto) return;

    try {
        isRefreshingStudentPhoto = true;

        const photoView = await get("/api/profile/photo/view");

        if (photoView?.url) {
            student.profileImageUrl = photoView.url;
            setStudentMe(companySlug, student);
            if (options.render !== false) {
                rerender();
            }
        }
    } catch {
            // Si no tiene foto, puede devolver 404 y no queremos romper la pantalla.
    } finally {
        isRefreshingStudentPhoto = false;
    }
}

async function handleStudentPhotoError() {
    await refreshStudentPhotoUrl();
}

function buildCompanyLogo(size = "h-12 w-12", rounded = "rounded-2xl") {
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

function buildStudentAvatar(size = "h-16 w-16") {
    const imageUrl = getStudentProfileImageUrl();
    const initials = getInitials(getStudentFullName());

    if (!imageUrl && !initials) {
        return `
            <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-400 shadow-sm">
                —
            </div>
        `;
    }

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
                id="studentAvatarImage"
                src="${escapeHtml(imageUrl)}"
                alt="Foto alumno"
                class="block h-full w-full object-cover"
                onerror="window.__studentHomePhotoError && window.__studentHomePhotoError()"
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

function quickAccessCard(icon, title, href) {
    return `
        <a
            href="${href}"
            class="group flex flex-col items-center rounded-[22px] border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg">
                ${icon}
            </div>

            <div class="mt-3 text-sm font-semibold text-slate-900">
                ${escapeHtml(title)}
            </div>
        </a>
    `;
}

function buildLogoutButton() {
    return `
        <button
            id="logoutBtn"
            type="button"
            class="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
            Cerrar sesión
        </button>
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
                ${navLink("Inicio", "/src/pages/student/home/index.html", true)}
                ${navLink("Cursos", "/src/pages/student/courses/index.html")}
                ${navLink("Pagos", "/src/pages/student/payments/index.html")}
                ${navLink("Documentos", "/src/pages/student/documents/index.html")}
                ${navLink("Perfil", "/src/pages/student/profile/index.html")}
                ${navLink("Hermanos", "/src/pages/student/siblings/index.html")}
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

    <div class="flex items-center gap-2">
        <!-- 🔔 campanita -->
        <div id="studentNotificationsBellMobile"></div>

        <!-- 📲 botón instalar -->
<button
    id="installAppButton"
    class="hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-base text-slate-700 shadow-sm hover:bg-slate-50"
    aria-label="Instalar app"
    title="Instalar app"
>
    ⬇️
</button>
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
        activeItem: "home"
    });
}

function buildMobileBottomNav() {
    return buildStudentMobileBottomNav({
        activeItem: "home",
        homeHref: "/src/pages/student/home/index.html",
        profileHref: "/src/pages/student/profile/index.html",
        paymentsHref: "/src/pages/student/payments/index.html"
    });
}

function buildTopBar() {
    return `
        <section class="hidden md:block rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex items-center justify-between gap-4">
                <div class="flex min-w-0 items-center gap-3">
                    ${buildCompanyLogo("h-14 w-14")}

                    <div class="min-w-0">
                        <h1 class="truncate text-lg font-bold text-slate-900 sm:text-xl">
                            ${escapeHtml(getCompanyName() || "—")}
                        </h1>
                    </div>
                </div>

                <div id="studentNotificationsBellDesktop"></div>
            </div>
        </section>
    `;
}

function buildStudentCard() {
    const memberNumber = getStudentMemberNumber();
    const registrationCompleted = !!student?.isRegistrationCompleted;

    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 items-center gap-4">
                    ${buildStudentAvatar("h-20 w-20")}

                    <div class="min-w-0">
                        <div class="truncate text-lg font-bold text-slate-900 sm:text-xl">
                            ${escapeHtml(getStudentFullName() || "—")}
                        </div>

                        <div class="mt-2 flex flex-wrap items-center gap-2">
                            ${
                                memberNumber
                                    ? `<span class="inline-flex rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">Socio #${escapeHtml(memberNumber)}</span>`
                                    : ""
                            }

                            <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                registrationCompleted
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                            }">
                                ${escapeHtml(getStudentRegistrationLabel())}
                            </span>
                        </div>

                        ${
                            getStudentEmail()
                                ? `<div class="mt-2 truncate text-sm text-slate-500">${escapeHtml(getStudentEmail())}</div>`
                                : ""
                        }
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-2 text-sm text-slate-600 sm:text-right">
                    ${
                        getStudentDni()
                            ? `<div><span class="font-semibold text-slate-900">DNI:</span> ${escapeHtml(getStudentDni())}</div>`
                            : ""
                    }

                    ${
                        getStudentPhone()
                            ? `<div><span class="font-semibold text-slate-900">Contacto:</span> ${escapeHtml(getStudentPhone())}</div>`
                            : ""
                    }
                </div>
            </div>
        </section>
    `;
}

function buildQuickAccess() {
    return `
        <section class="hidden md:block space-y-4">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Accesos rápidos</h2>
                <p class="mt-1 text-sm text-slate-500">Entrá rápido a tus secciones principales.</p>
            </div>

            <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
                ${quickAccessCard("📚", "Cursos", "/src/pages/student/courses/index.html")}
                ${quickAccessCard("💳", "Pagos", "/src/pages/student/payments/index.html")}
                ${quickAccessCard("👤", "Perfil", "/src/pages/student/profile/index.html")}
                ${quickAccessCard("👨‍👩‍👧", "Hermanos", "/src/pages/student/siblings/index.html")}
            </div>
        </section>
    `;
}

function buildSectionHeader(title, actionText = "") {
    return `
        <div class="flex items-center justify-between gap-3">
            <h2 class="text-xl font-bold text-slate-900">${escapeHtml(title)}</h2>
            ${
                actionText
                    ? `<button type="button" class="text-sm font-semibold text-slate-700 hover:text-slate-900">${escapeHtml(actionText)}</button>`
                    : ""
            }
        </div>
    `;
}

function formatMatchDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return new Intl.DateTimeFormat("es-AR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function getUpcomingMatches() {
    const now = new Date();

    return matches
        .filter(x => new Date(x.matchDateUtc) >= now)
        .sort((a, b) => new Date(a.matchDateUtc) - new Date(b.matchDateUtc));
}

function getPastMatches() {
    const now = new Date();

    return matches
        .filter(x => new Date(x.matchDateUtc) < now)
        .sort((a, b) => new Date(b.matchDateUtc) - new Date(a.matchDateUtc));
}

function getFeaturedMatch() {
    return getUpcomingMatches()[0] || null;
}

function buildLogoPlaceholder(alt) {
    return `
        <div class="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl shadow-sm">
            ⚽
        </div>
    `;
}

function buildCompanyMatchLogoImage(url, alt) {
    if (!url) {
        return buildLogoPlaceholder(alt);
    }

    return `
        <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
            <img
                src="${escapeHtml(url)}"
                alt="${escapeHtml(alt || "Logo empresa")}"
                class="h-full w-full object-cover"
                onerror="this.remove(); this.parentElement.innerHTML='⚽';"
            />
        </div>
    `;
}

function buildOpponentMatchLogoImage(url, alt) {
    if (!url) {
        return buildLogoPlaceholder(alt);
    }

    return `
        <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
            <img
                src="${escapeHtml(url)}"
                alt="${escapeHtml(alt || "Logo rival")}"
                class="h-full w-full object-cover"
                onerror="window.__studentHomeOpponentLogoError && window.__studentHomeOpponentLogoError(this)"
            />
        </div>
    `;
}

function buildMatchCard(match, compact = false) {
    const companyLogo = getCompanyLogoUrl();
    const companyName = getCompanyName() || "Mi equipo";

    return `
        <button
            type="button"
            data-match-id="${escapeHtml(match.id)}"
            class="match-card w-full rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
            <div class="flex items-start justify-center gap-5 sm:gap-8">
                <div class="flex min-w-0 flex-1 flex-col items-center text-center">
                    ${buildCompanyMatchLogoImage(companyLogo, companyName)}
                    <div class="mt-2 text-sm font-semibold leading-5 text-slate-900">
                        ${escapeHtml(companyName)}
                    </div>
                </div>

                <div class="flex shrink-0 items-center justify-center pt-5 text-sm font-bold tracking-wide text-slate-400">
                    VS
                </div>

                <div class="flex min-w-0 flex-1 flex-col items-center text-center">
                    ${buildOpponentMatchLogoImage(match.opponentLogoUrl, match.opponentName || "Rival")}
                    <div class="mt-2 text-sm font-semibold leading-5 text-slate-900">
                        ${escapeHtml(match.opponentName || "Rival")}
                    </div>
                </div>
            </div>

            <div class="mt-4 text-sm">
                <div class="font-medium text-slate-700">
                    ${escapeHtml(formatMatchDate(match.matchDateUtc))}
                </div>

                ${
                    match.locationName
                        ? `
                            <div class="text-slate-500">
                                ${escapeHtml(match.locationName)}
                            </div>
                        `
                        : ""
                }

                ${
                    match.hasTicketSale && match.ticketPrice
                        ? `
                            <div class="pt-1 font-semibold text-amber-700">
                                Entrada: $${Number(match.ticketPrice).toLocaleString("es-AR")}
                            </div>
                        `
                        : ""
                }
            </div>
        </button>
    `;
}

function buildMatchDetailModal() {
    if (!matchDetailModalOpen || !selectedMatch) return "";

    const companyLogo = getCompanyLogoUrl();
    const companyName = getCompanyName() || "Mi equipo";

    return `
        <div id="matchDetailOverlay" class="fixed inset-0 z-[70] bg-slate-950/60 p-4">
            <div class="mx-auto flex w-full max-w-2xl items-center justify-center">
                <div class="w-full rounded-[28px] bg-white p-5 shadow-2xl">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Partido
                            </div>
                            <h3 class="mt-1 text-2xl font-bold text-slate-900">
                                ${escapeHtml(companyName)} vs ${escapeHtml(selectedMatch.opponentName || "Rival")}
                            </h3>
                        </div>

                        <button
                            id="closeMatchDetailBtn"
                            type="button"
                            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                        >
                            ✕
                        </button>
                    </div>

                    <div class="mt-5 flex items-start justify-center gap-5 sm:gap-8">
                        <div class="flex min-w-0 flex-1 flex-col items-center text-center">
                            ${buildCompanyMatchLogoImage(companyLogo, companyName)}
                            <div class="mt-2 text-sm font-semibold leading-5 text-slate-900">
                                ${escapeHtml(companyName)}
                            </div>
                        </div>

                        <div class="flex shrink-0 items-center justify-center pt-5 text-sm font-bold tracking-wide text-slate-400">
                            VS
                        </div>

                        <div class="flex min-w-0 flex-1 flex-col items-center text-center">
                            ${buildOpponentMatchLogoImage(selectedMatch.opponentLogoUrl, selectedMatch.opponentName || "Rival")}
                            <div class="mt-2 text-sm font-semibold leading-5 text-slate-900">
                                ${escapeHtml(selectedMatch.opponentName || "Rival")}
                            </div>
                        </div>
                    </div>

                    <div class="mt-5 space-y-3">
                        <div class="rounded-2xl bg-slate-50 px-4 py-3">
                            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Fecha y lugar
                            </div>
                            <div class="mt-2 text-sm text-slate-600">
                                ${escapeHtml(formatMatchDate(selectedMatch.matchDateUtc))}
                            </div>
                            ${
                                selectedMatch.locationName
                                    ? `<div class="mt-1 text-base font-semibold text-slate-900">${escapeHtml(selectedMatch.locationName)}</div>`
                                    : ""
                            }
                            ${
                                selectedMatch.address
                                    ? `<div class="mt-1 text-sm text-slate-500">${escapeHtml(selectedMatch.address)}</div>`
                                    : ""
                            }
                        </div>

                        ${
                            selectedMatch.hasTicketSale
                                ? `
                                <div class="rounded-2xl bg-amber-50 px-4 py-3">
                                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                                        Entrada
                                    </div>
                                    <div class="mt-1 text-base font-bold text-amber-700">
                                        $${Number(selectedMatch.ticketPrice || 0).toLocaleString("es-AR")}
                                    </div>
                                </div>
                                `
                                : ""
                        }

                        <div class="rounded-2xl bg-slate-50 px-4 py-3">
                            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Alcance
                            </div>
                            <div class="mt-1 text-base font-bold text-slate-700">
                                ${selectedMatch.isGlobal ? "Global" : escapeHtml((selectedMatch.courseNames || []).join(", ") || "Por curso")}
                            </div>
                        </div>

                        ${
                            selectedMatch.ticketInfo
                                ? `
                                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Información de entrada
                                    </div>
                                    <p class="mt-2 text-sm leading-6 text-slate-600">
                                        ${escapeHtml(selectedMatch.ticketInfo)}
                                    </p>
                                </div>
                                `
                                : ""
                        }

                        ${
                            selectedMatch.notes
                                ? `
                                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Notas
                                    </div>
                                    <p class="mt-2 text-sm leading-6 text-slate-600">
                                        ${escapeHtml(selectedMatch.notes)}
                                    </p>
                                </div>
                                `
                                : ""
                        }
                    </div>

                    <div class="mt-5 flex flex-wrap gap-2">
                        ${
                            selectedMatch.googleMapsUrl
                                ? `
                                <a
                                    href="${escapeHtml(selectedMatch.googleMapsUrl)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                                >
                                    Abrir Maps
                                </a>
                                `
                                : ""
                        }

                        <button
                            id="closeMatchDetailSecondaryBtn"
                            type="button"
                            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function buildMatchesModal() {
    if (!matchesModalOpen) return "";

    const upcoming = getUpcomingMatches();
    const history = getPastMatches();

    return `
        <div id="matchesModalOverlay" class="fixed inset-0 z-[65] bg-slate-950/60 px-4 py-6">
            <div class="mx-auto flex w-full max-w-4xl items-center justify-center">
                <div class="w-full rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Partidos
                            </div>
                            <h3 class="mt-1 text-xl font-bold text-slate-900">
                                Historial y próximos partidos
                            </h3>
                        </div>

                        <button
                            id="closeMatchesModalBtn"
                            type="button"
                            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                        >
                            ✕
                        </button>
                    </div>

                    <div class="mt-6 space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                        <section class="space-y-3">
                            <h4 class="text-base font-bold text-slate-900">Próximos</h4>

                            ${
                                upcoming.length
                                    ? upcoming.map(x => buildMatchCard(x, true)).join("")
                                    : `<div class="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No hay próximos partidos.</div>`
                            }
                        </section>

                        <section class="space-y-3">
                            <h4 class="text-base font-bold text-slate-900">Historial</h4>

                            ${
                                history.length
                                    ? history.map(x => buildMatchCard(x, true)).join("")
                                    : `<div class="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No hay partidos anteriores.</div>`
                            }
                        </section>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function buildAnnouncementsModal() {
    if (!announcementsModalOpen) return "";

    const items = getNewsItems();

    return `
        <div id="announcementsModalOverlay" class="fixed inset-0 z-[65] bg-slate-950/60 px-4 py-6">
            <div class="mx-auto flex w-full max-w-4xl items-center justify-center">
                <div class="w-full rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Novedades
                            </div>
                            <h3 class="mt-1 text-xl font-bold text-slate-900">
                                Historial de novedades
                            </h3>
                        </div>

                        <button
                            id="closeAnnouncementsModalBtn"
                            type="button"
                            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                        >
                            ✕
                        </button>
                    </div>

                    <div class="mt-6 max-h-[75vh] space-y-4 overflow-y-auto pr-1">
                        ${
                            items.length
                                ? items.map(x => buildNewsCard(x, true)).join("")
                                : `<div class="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No hay novedades.</div>`
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
}

function buildAnnouncementDetailModal() {
    if (!announcementDetailModalOpen || !selectedAnnouncement) return "";

    return `
        <div id="announcementDetailOverlay" class="fixed inset-0 z-[70] bg-slate-950/60 px-4 py-6">
            <div class="mx-auto flex w-full max-w-2xl items-center justify-center">
                <div class="max-h-[88vh] w-full overflow-y-auto rounded-[28px] bg-white shadow-2xl">
                    ${
                        selectedAnnouncement.imageUrl
                            ? `
                                <img
                                    src="${escapeHtml(selectedAnnouncement.imageUrl)}"
                                    alt="${escapeHtml(selectedAnnouncement.imageFileName || "Novedad")}"
                                    class="max-h-[360px] w-full object-cover"
                                />
                            `
                            : ""
                    }

                    <div class="p-5">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                    ${formatDate(selectedAnnouncement.createdAtUtc)}
                                </div>

                                <h3 class="mt-2 text-2xl font-bold text-slate-900">
                                    ${escapeHtml(selectedAnnouncement.title || "Novedad")}
                                </h3>
                            </div>

                            <button
                                id="closeAnnouncementDetailBtn"
                                type="button"
                                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                            >
                                ✕
                            </button>
                        </div>

                        ${
                            selectedAnnouncement.text
                                ? `
                                    <p class="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600">
                                        ${escapeHtml(selectedAnnouncement.text)}
                                    </p>
                                `
                                : `
                                    <p class="mt-5 text-sm text-slate-400">
                                        Esta novedad no tiene texto.
                                    </p>
                                `
                        }

                        <div class="mt-6">
                            <button
                                id="closeAnnouncementDetailSecondaryBtn"
                                type="button"
                                class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function buildFeaturedMatch() {
    const match = getFeaturedMatch();

    if (!match) {
        return `
            <section class="space-y-4">
                <div class="flex items-center justify-between gap-3">
                    <h2 class="text-xl font-bold text-slate-900">Partidos</h2>
                    <button
                        id="openMatchesModalBtn"
                        type="button"
                        class="text-sm font-semibold text-slate-700 hover:text-slate-900"
                    >
                        Ver todos
                    </button>
                </div>

                <div class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="text-sm text-slate-500">
                        Todavía no hay partidos próximos para mostrar.
                    </div>
                </div>
            </section>
        `;
    }

    return `
        <section class="space-y-4">
            <div class="flex items-center justify-between gap-3">
                <h2 class="text-xl font-bold text-slate-900">Partidos</h2>
                <button
                    id="openMatchesModalBtn"
                    type="button"
                    class="text-sm font-semibold text-slate-700 hover:text-slate-900"
                    >
                    Ver todos
                </button>
            </div>

            ${buildMatchCard(match)}
        </section>
    `;
}

function getNewsItems() {
    return Array.isArray(announcements) ? announcements : [];
}

function getFeaturedAnnouncement() {
    return getNewsItems()[0] || null;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function buildNewsCard(item, compact = false) {
    return `
        <button
            type="button"
            data-announcement-id="${escapeHtml(item.id)}"
            data-from-history="${compact ? "true" : "false"}"
            class="announcement-card w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
            <div class="flex items-center gap-4 p-5">
                
                ${
                    item.imageUrl
                        ? `
                            <img
                                src="${escapeHtml(item.imageUrl)}"
                                alt="${escapeHtml(item.imageFileName || "Novedad")}"
                                class="h-24 w-24 shrink-0 rounded-2xl object-cover"
                            />
                        `
                        : `
                            <div class="h-24 w-24 shrink-0 rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                                Sin imagen
                            </div>
                        `
                }

                <div class="flex-1 min-w-0">
                    <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        ${formatDate(item.createdAtUtc)}
                    </div>

                    <h3 class="mt-1 text-base font-bold text-slate-900 truncate">
                        ${escapeHtml(item.title || "Novedad")}
                    </h3>

                    ${
                        item.text
                            ? `
                                <p class="mt-1 text-sm text-slate-500 line-clamp-2">
                                    ${escapeHtml(item.text)}
                                </p>
                            `
                            : ""
                    }

                    <div class="mt-2 text-sm font-semibold text-slate-700">
                        Ver detalle
                    </div>
                </div>
            </div>
        </button>
    `;
}

function buildNews() {
    const latest = getFeaturedAnnouncement();

    return `
        <section class="space-y-4">
            <div class="flex items-center justify-between gap-3">
                <h2 class="text-xl font-bold text-slate-900">Novedades</h2>

                <button
                    id="openAnnouncementsModalBtn"
                    type="button"
                    class="text-sm font-semibold text-slate-700 hover:text-slate-900"
                >
                    Ver todas
                </button>
            </div>

            ${
                !latest
                    ? `
                        <div class="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <div class="text-sm text-slate-500">
                                Todavía no hay novedades publicadas.
                            </div>
                        </div>
                    `
                    : buildNewsCard(latest)
            }
        </section>
    `;
}

function getSponsorItems() {
    return Array.isArray(sponsors)
        ? sponsors.sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0))
        : [];
}

function getCurrentSponsor() {
    const items = getSponsorItems();
    return items[currentSponsorIndex] || items[0] || null;
}

function buildSponsors() {
    const items = getSponsorItems();

    if (!items.length) return "";

    return `
        <section class="space-y-4">
            <div class="flex items-center justify-between gap-3">
                <h2 class="text-xl font-bold text-slate-900">Sponsors</h2>

                ${
                    items.length > 1
                        ? `<span class="text-sm font-semibold text-slate-500">${items.length} sponsors</span>`
                        : ""
                }
            </div>

            <div class="relative">
                <div
                    id="sponsorsCarousel"
                    class="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 md:overflow-hidden"
                    style="scrollbar-width: none;"
                >
                    ${items.map((sponsor, index) => `
                        <button
                            type="button"
                            data-sponsor-id="${escapeHtml(sponsor.id)}"
                            data-index="${index}"
                            class="sponsor-card relative h-32 min-w-full snap-center overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:h-36"
                        >
                            ${
                                sponsor.imageUrl
                                    ? `
                                        <img
                                            src="${escapeHtml(sponsor.imageUrl)}"
                                            alt="${escapeHtml(sponsor.name || "Sponsor")}"
                                            class="h-full w-full object-cover"
                                        />
                                    `
                                    : `
                                        <div class="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
                                            Sin imagen
                                        </div>
                                    `
                            }

                            <div class="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-950/20 to-transparent"></div>

                            <div class="absolute left-4 top-4 max-w-[75%]">
                                ${
                                    sponsor.overlayText
                                        ? `
                                            <span class="inline-flex rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">
                                                ${escapeHtml(sponsor.overlayText)}
                                            </span>
                                        `
                                        : ""
                                }

                                <div class="mt-2 text-lg font-bold text-white drop-shadow">
                                    ${escapeHtml(sponsor.name || "Sponsor")}
                                </div>

                                <div class="mt-1 text-sm font-semibold text-white/90">
                                    Ver detalle
                                </div>
                            </div>
                        </button>
                    `).join("")}
                </div>

                ${
                    items.length > 1
                        ? `
                            <button
                                id="prevSponsorBtn"
                                type="button"
                                class="hidden md:inline-flex absolute left-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-md hover:bg-white"
                                aria-label="Sponsor anterior"
                            >
                                ‹
                            </button>

                            <button
                                id="nextSponsorBtn"
                                type="button"
                                class="hidden md:inline-flex absolute right-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-md hover:bg-white"
                                aria-label="Sponsor siguiente"
                            >
                                ›
                            </button>
                        `
                        : ""
                }
            </div>

            ${
                items.length > 1
                    ? `
                        <div class="flex items-center justify-center gap-2 md:hidden">
                            ${items.map((_, index) => `
                                <button
                                    type="button"
                                    data-index="${index}"
                                    class="sponsor-dot h-2.5 rounded-full ${
                                        index === currentSponsorIndex
                                            ? "w-6 bg-slate-900"
                                            : "w-2.5 bg-slate-300"
                                    }"
                                ></button>
                            `).join("")}
                        </div>
                    `
                    : ""
            }
        </section>
    `;
}

function buildSponsorDetailModal() {
    if (!sponsorDetailModalOpen || !selectedSponsor) return "";

    const websiteUrl = (selectedSponsor.websiteUrl || "").trim();
    const instagramUrl = (selectedSponsor.instagramUrl || "").trim();
    const facebookUrl = (selectedSponsor.facebookUrl || "").trim();

    const whatsAppRaw =
        selectedSponsor.whatsApp ||
        selectedSponsor.whatsapp ||
        selectedSponsor.whatsAppNumber ||
        selectedSponsor.whatsappNumber ||
        "";

    const cleanWhatsApp = String(whatsAppRaw).replace(/\D/g, "");

    return `
        <div id="sponsorDetailOverlay" class="fixed inset-0 z-[70] bg-slate-950/60 px-4 py-6">
            <div class="mx-auto flex min-h-full w-full max-w-xl items-center justify-center">
                <div class="max-h-[88vh] w-full overflow-y-auto rounded-[28px] bg-white shadow-2xl">
                    <div class="relative bg-slate-100">
                        ${
                            selectedSponsor.imageUrl
                                ? `
                                    <img
                                        src="${escapeHtml(selectedSponsor.imageUrl)}"
                                        alt="${escapeHtml(selectedSponsor.name || "Sponsor")}"
                                        class="max-h-[360px] w-full object-contain"
                                    />
                                `
                                : `
                                    <div class="flex h-48 w-full items-center justify-center text-sm text-slate-400">
                                        Sin imagen
                                    </div>
                                `
                        }

                        ${
                            selectedSponsor.overlayText
                                ? `
                                    <div class="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">
                                        ${escapeHtml(selectedSponsor.overlayText)}
                                    </div>
                                `
                                : ""
                        }

                        <button
                            id="closeSponsorDetailBtn"
                            type="button"
                            class="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 text-slate-700 shadow-sm"
                        >
                            ✕
                        </button>
                    </div>

                    <div class="p-5">
                        <h3 class="text-2xl font-bold text-slate-900">
                            ${escapeHtml(selectedSponsor.name || "Sponsor")}
                        </h3>

                        ${
                            selectedSponsor.description
                                ? `<p class="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">${escapeHtml(selectedSponsor.description)}</p>`
                                : `<p class="mt-3 text-sm text-slate-400">Sin descripción adicional.</p>`
                        }

                        <div class="mt-6 flex items-center gap-3">
                            ${
                                cleanWhatsApp
                                    ? `
                                        <a
                                        href="https://wa.me/${escapeHtml(cleanWhatsApp)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="inline-flex h-12 w-12 items-center justify-center transition hover:scale-110 active:scale-95"
                                        aria-label="WhatsApp"
                                        title="WhatsApp"
                                        >
                                        <svg viewBox="0 0 32 32" class="h-10 w-10">
                                            <!-- Fondo -->
                                            <circle cx="16" cy="16" r="16" fill="#25D366"/>

                                            <!-- Globo -->
                                            <path
                                            fill="#FFFFFF"
                                            d="M16 7C11 7 7 11 7 16c0 1.6.4 3.1 1.2 4.5L7 25l4.7-1.2C13.1 24.6 14.5 25 16 25c5 0 9-4 9-9s-4-9-9-9Z"
                                            />

                                            <!-- Teléfono -->
                                            <path
                                            fill="#25D366"
                                            d="M21.5 18.7c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.6-.9-.8-1.4-1.8-1.6-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.6-.1-.2-.6-1.6-.8-2.2-.2-.6-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.2-1 1-1 2.5s1 3 1.2 3.2c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.8.6.8.2 1.4.2 2 .1.6-.1 1.7-.7 2-1.3.2-.6.2-1.1.2-1.3-.1-.2-.3-.3-.6-.4Z"
                                            />
                                        </svg>
                                        </a>
                                    `
                                    : ""
                            }

                            ${
                                instagramUrl
                                    ? `
                                        <a
                                            href="${escapeHtml(instagramUrl)}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="inline-flex h-12 w-12 items-center justify-center transition hover:scale-110"
                                            aria-label="Instagram"
                                            title="Instagram"
                                        >
                                            <svg class="h-9 w-9" viewBox="0 0 32 32" fill="none">
                                                <defs>
                                                    <linearGradient id="igGradient" x1="6" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
                                                        <stop stop-color="#FEDA75"/>
                                                        <stop offset="0.35" stop-color="#FA7E1E"/>
                                                        <stop offset="0.65" stop-color="#D62976"/>
                                                        <stop offset="1" stop-color="#4F5BD5"/>
                                                    </linearGradient>
                                                </defs>
                                                <rect width="32" height="32" rx="8" fill="url(#igGradient)"/>
                                                <rect x="9" y="9" width="14" height="14" rx="4" stroke="#fff" stroke-width="2"/>
                                                <circle cx="16" cy="16" r="4" stroke="#fff" stroke-width="2"/>
                                                <circle cx="21.2" cy="10.8" r="1.2" fill="#fff"/>
                                            </svg>
                                        </a>
                                    `
                                    : ""
                            }

                            ${
                                facebookUrl
                                    ? `
                                        <a
                                            href="${escapeHtml(facebookUrl)}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="inline-flex h-12 w-12 items-center justify-center transition hover:scale-110"
                                            aria-label="Facebook"
                                            title="Facebook"
                                        >
                                            <svg class="h-9 w-9" viewBox="0 0 32 32" fill="none">
                                                <circle cx="16" cy="16" r="16" fill="#1877F2"/>
                                                <path fill="#fff" d="M18.2 17.1h3l.5-3.7h-3.5v-2.3c0-1.1.3-1.8 1.9-1.8h1.8V6.1c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.6h-3.2v3.7h3.2V26h3.8v-8.9Z"/>
                                            </svg>
                                        </a>
                                    `
                                    : ""
                            }

                            ${
                                websiteUrl
                                    ? `
                                        <a
                                            href="${escapeHtml(websiteUrl)}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="inline-flex h-12 w-12 items-center justify-center transition hover:scale-110"
                                            aria-label="Sitio web"
                                            title="Sitio web"
                                        >
                                            <svg class="h-9 w-9" viewBox="0 0 32 32" fill="none">
                                                <circle cx="16" cy="16" r="16" fill="#0F172A"/>
                                                <path d="M7 16h18" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
                                                <path d="M16 7c2.7 2.6 4.2 5.6 4.2 9S18.7 22.4 16 25c-2.7-2.6-4.2-5.6-4.2-9S13.3 9.6 16 7Z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <circle cx="16" cy="16" r="9" stroke="#fff" stroke-width="2"/>
                                            </svg>
                                        </a>
                                    `
                                    : ""
                            }

                            <button
                                id="closeSponsorDetailSecondaryBtn"
                                type="button"
                                class="ml-auto rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function buildHomeContent() {
    return `
        <div class="space-y-6">
            ${buildTopBar()}
            ${buildStudentCard()}
            ${buildQuickAccess()}
            ${buildFeaturedMatch()}
            ${buildNews()}
            ${buildSponsors()}
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
                            <div class="text-sm text-slate-500">Cargando panel del alumno...</div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    `;
}

async function loadSponsors() {
    const result = await get(`/api/student/${companySlug}/sponsors`);
    sponsors = Array.isArray(result) ? result : [];
}

function buildError() {
    return `
        <div class="min-h-screen bg-slate-100">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm">
                            <div class="text-base font-semibold text-slate-900">No se pudo cargar el panel.</div>
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
            ${buildMobileHeader()}
            ${buildMobileMenu()}

            <div class="flex min-h-screen">
                ${buildSidebar()}

                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 pb-40 sm:px-6 lg:px-8 md:pb-6">
                        ${buildHomeContent()}
                    </div>
                </main>
            </div>

            ${buildMobileBottomNav()}

            ${buildMatchesModal()}
            ${buildMatchDetailModal()}
            ${buildAnnouncementsModal()}
            ${buildAnnouncementDetailModal()}
            ${buildSponsorDetailModal()}
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
    syncBodyScrollLock();
    bindEvents();
}

function closeAnnouncementDetail() {
    announcementDetailModalOpen = false;
    selectedAnnouncement = null;

    if (announcementDetailFromHistory) {
        announcementsModalOpen = true;
    }

    announcementDetailFromHistory = false;
    rerender();
}

function syncBodyScrollLock() {
    syncStudentMobileShellScrollLock({
        mobileMenuOpen,
        extraLocked: matchesModalOpen || matchDetailModalOpen || announcementsModalOpen || announcementDetailModalOpen || sponsorDetailModalOpen || carnetOpen
    });
}

function bindEvents() {
    window.__studentHomePhotoError = () => {
        handleStudentPhotoError();
    };

window.__studentHomeOpponentLogoError = async (img) => {
    img.onerror = null;
    img.parentElement.innerHTML = "⚽";

    if (isRefreshingOpponentLogos) return;

    try {
        isRefreshingOpponentLogos = true;

        const result = await get(`/api/student/${companySlug}/matches`);
        matches = Array.isArray(result) ? result : [];

        setMatches(companySlug, matches);
        rerender();
    } catch {
       
    } finally {
        isRefreshingOpponentLogos = false;
    }
};

bindStudentMobileShellEvents({
    setMobileMenuOpen: (value) => {
        mobileMenuOpen = value;
        rerender();
    },

    onLogout: logoutAndRedirect,

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

    document.getElementById("openMatchesModalBtn")?.addEventListener("click", () => {
        matchesModalOpen = true;
        rerender();
    });

    document.getElementById("openAnnouncementsModalBtn")?.addEventListener("click", () => {
    announcementsModalOpen = true;
    rerender();
});

document.getElementById("closeAnnouncementsModalBtn")?.addEventListener("click", () => {
    announcementsModalOpen = false;
    rerender();
});

function moveSponsorTo(index) {
    const items = getSponsorItems();
    if (!items.length) return;

    currentSponsorIndex = Math.max(0, Math.min(index, items.length - 1));

    const carousel = document.getElementById("sponsorsCarousel");
    const cards = carousel?.querySelectorAll(".sponsor-card");
    const card = cards?.[currentSponsorIndex];

    if (!carousel || !card) return;

    carousel.scrollTo({
        left: card.offsetLeft,
        behavior: "smooth"
    });

    document.querySelectorAll(".sponsor-dot").forEach(dot => {
        const dotIndex = Number(dot.dataset.index || 0);

        dot.className = `sponsor-dot h-2.5 rounded-full ${
            dotIndex === currentSponsorIndex
                ? "w-6 bg-slate-900"
                : "w-2.5 bg-slate-300"
        }`;
    });
}

function closeSponsorDetail() {
    const indexToKeep = currentSponsorIndex;

    isRestoringSponsorPosition = true;
    sponsorDetailModalOpen = false;
    selectedSponsor = null;

    rerender();

    requestAnimationFrame(() => {
        const carousel = document.getElementById("sponsorsCarousel");
        const card = carousel?.querySelectorAll(".sponsor-card")?.[indexToKeep];

        if (carousel && card) {
            carousel.scrollLeft = card.offsetLeft;
        }

        currentSponsorIndex = indexToKeep;
        isRestoringSponsorPosition = false;
    });
}

document.querySelectorAll(".sponsor-card").forEach(card => {
    card.addEventListener("click", () => {
        const sponsorId = card.dataset.sponsorId;
        const found = sponsors.find(x => String(x.id) === String(sponsorId));
        if (!found) return;

        currentSponsorIndex = Number(card.dataset.index || 0);

        selectedSponsor = found;
        sponsorDetailModalOpen = true;
        rerender();
    });
});

document.querySelectorAll(".sponsor-dot").forEach(dot => {
    dot.addEventListener("click", () => {
        moveSponsorTo(Number(dot.dataset.index || 0));
    });
});

document.getElementById("prevSponsorBtn")?.addEventListener("click", () => {
    moveSponsorTo(currentSponsorIndex - 1);
});

document.getElementById("nextSponsorBtn")?.addEventListener("click", () => {
    moveSponsorTo(currentSponsorIndex + 1);
});

const sponsorsCarousel = document.getElementById("sponsorsCarousel");

sponsorsCarousel?.addEventListener("scroll", () => {
    if (isRestoringSponsorPosition) return;

    const cards = [...sponsorsCarousel.querySelectorAll(".sponsor-card")];
    if (!cards.length) return;

    const carouselRect = sponsorsCarousel.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;

    let closestIndex = 0;
    let closestDistance = Number.MAX_VALUE;

    cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(carouselCenter - cardCenter);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
        }
    });

    if (closestIndex !== currentSponsorIndex) {
        currentSponsorIndex = closestIndex;

        document.querySelectorAll(".sponsor-dot").forEach(dot => {
            const index = Number(dot.dataset.index || 0);
            dot.className = `sponsor-dot h-2.5 rounded-full ${
                index === currentSponsorIndex
                    ? "w-6 bg-slate-900"
                    : "w-2.5 bg-slate-300"
            }`;
        });
    }
});

document.getElementById("closeSponsorDetailBtn")?.addEventListener("click", () => {
    closeSponsorDetail();
});

document.getElementById("closeSponsorDetailSecondaryBtn")?.addEventListener("click", () => {
    closeSponsorDetail();
});

document.getElementById("sponsorDetailOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "sponsorDetailOverlay") {
        closeSponsorDetail();
    }
});

document.querySelectorAll(".announcement-card").forEach(card => {
    card.addEventListener("click", () => {
        const announcementId = card.dataset.announcementId;
        const found = announcements.find(x => String(x.id) === String(announcementId));
        if (!found) return;

        announcementDetailFromHistory = card.dataset.fromHistory === "true";
        selectedAnnouncement = found;
        announcementsModalOpen = false;
        announcementDetailModalOpen = true;
        rerender();
    });
});

document.getElementById("closeAnnouncementDetailBtn")?.addEventListener("click", closeAnnouncementDetail);

document.getElementById("closeAnnouncementDetailSecondaryBtn")?.addEventListener("click", closeAnnouncementDetail);

document.getElementById("announcementDetailOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "announcementDetailOverlay") {
        closeAnnouncementDetail();
    }
});

    document.getElementById("matchesModalOverlay")?.addEventListener("click", (event) => {
        if (event.target.id === "matchesModalOverlay") {
            matchesModalOpen = false;
            rerender();
        }
    });

    document.querySelectorAll("#logoutBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        logoutAndRedirect();
    });
});

    document.querySelectorAll(".match-card").forEach(card => {
        card.addEventListener("click", () => {
            const matchId = card.dataset.matchId;
            const found = matches.find(x => String(x.id) === String(matchId));
            if (!found) return;

            selectedMatch = found;
            matchDetailModalOpen = true;
            rerender();
        });
    });

    document.getElementById("closeMatchDetailBtn")?.addEventListener("click", () => {
        matchDetailModalOpen = false;
        selectedMatch = null;
        rerender();
    });

    initPwaInstall({
    buttonId: "installAppButton"
});

    document.getElementById("closeMatchDetailSecondaryBtn")?.addEventListener("click", () => {
        matchDetailModalOpen = false;
        selectedMatch = null;
        rerender();
    });

    document.getElementById("matchDetailOverlay")?.addEventListener("click", (event) => {
        if (event.target.id === "matchDetailOverlay") {
            matchDetailModalOpen = false;
            selectedMatch = null;
            rerender();
        }
    });

    document.getElementById("closeMatchesModalBtn")?.addEventListener("click", () => {
        matchesModalOpen = false;
        rerender();
    });

initNotificationsBell({
    rootId: "studentNotificationsBellMobile"
});

initNotificationsBell({
    rootId: "studentNotificationsBellDesktop"
});

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

async function loadStudentProfile() {
    const cached = getStudentMe(companySlug);

    if (cached && !isSasUrlExpired(cached.profileImageUrl)) {
        return cached;
    }

    const result = await get(`/api/student/${companySlug}/me`);
    setStudentMe(companySlug, result);

    return result;
}

function hasExpiredMatchLogo(matchesList) {
    if (!Array.isArray(matchesList)) return true;

    return matchesList.some(match => {
        const url = match?.opponentLogoUrl;

        if (!url) return false;

        // Si es URL externa sin SAS, no la vencemos
        if (!url.includes("?")) return false;

        return isSasUrlExpired(url);
    });
}


document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
        await refreshHomeDynamicData();
    }
});

window.addEventListener("pageshow", async () => {
    await refreshHomeDynamicData();
});

async function refreshHomeDynamicData() {
    if (!companySlug) return;

    try {
        await Promise.all([
            loadMatches(),
            loadAnnouncements(),
            loadSponsors()
        ]);

        rerender();
    } catch (error) {
        console.warn("No se pudo refrescar home al volver a abrir:", error);
    }
}

async function loadMatches() {
    const result = await get(`/api/student/${companySlug}/matches`);
    matches = Array.isArray(result) ? result : [];

    setMatches(companySlug, matches);
}

async function loadAnnouncements() {
    const result = await get(`/api/student/${companySlug}/announcements`);
    announcements = Array.isArray(result) ? result : [];
}

async function init() {
    try {
        await loadConfig();
        enableStudentSoftNavigation();
        const session = requireAuth();
        if (!session) return;

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

const [profile] = await Promise.all([
    loadStudentProfile(),
    loadMatches(),
    loadAnnouncements(),
    loadSponsors()
]);

        student = profile;

        if (!student) {
            throw new Error("No se pudo obtener el perfil del alumno.");
        }

        await refreshStudentPhotoUrl({ render: false });

    } catch (error) {
        pageError = error?.message || "No se pudo cargar la información del alumno.";
    } finally {
        loading = false;
        rerender();
    }
}

init();