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
import { hasModule } from "../../../shared/js/modules.js";
import {
    buildStudentSidebar,
    bindStudentLayoutEvents
} from "../../../shared/js/student-layout.js";
import { initTheme, applyThemePreference } from "../../../shared/js/theme.js";


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
let selectedMatchLineup = null;
let tournamentHighlights = [];

function getShortPosition(label) {
    if (!label) return "";

    const map = {
        "Arquero": "ARQ",
        "Defensor": "DF",
        "Central": "DF",
        "Lateral": "LAT",
        "Mediocampo": "MC",
        "Volante": "MC",
        "Delantero": "DEL",
        "Atacante": "AC"
    };

    return map[label] || label.substring(0, 2).toUpperCase();
}

function isCurrentHomePage() {
    return window.location.pathname.includes("/src/pages/student/home");
}

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

function canUse(moduleCode) {
    return hasModule(company, moduleCode);
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

function getShortPlayerName(fullName) {
    const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";

    if (parts.length === 1) return parts[0];

    return `${parts[0].charAt(0).toUpperCase()}. ${parts.slice(1).join(" ")}`;
}

function getStarterPlayers(data) {
    return (data.players || []).filter(p => p.xPercent !== null && p.yPercent !== null);
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
            <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-400 shadow-sm">
                —
            </div>
        `;
    }

    if (!logoUrl) {
        return `
            <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm">
                ${escapeHtml(initials)}
            </div>
        `;
    }

    return `
        <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <img
                src="${escapeHtml(logoUrl)}"
                alt="Logo empresa"
                class="block h-full w-full object-cover"
                onerror="this.remove(); this.parentElement.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200&quot;>${escapeHtml(initials || "—")}</div>';"
            />
        </div>
    `;
}

function buildStudentAvatar(size = "h-16 w-16") {
    const imageUrl = getStudentProfileImageUrl();
    const initials = getInitials(getStudentFullName());

    if (!imageUrl && !initials) {
        return `
            <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-sm font-bold text-slate-400 shadow-sm">
                —
            </div>
        `;
    }

    if (!imageUrl) {
        return `
            <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-sm font-bold text-slate-600 shadow-sm">
                ${escapeHtml(initials)}
            </div>
        `;
    }

    return `
        <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-sm">
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

function quickAccessCard(icon, title, href) {
    return `
        <a
            href="${href}"
            class="group flex flex-col items-center rounded-[22px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-950 text-lg">
                ${icon}
            </div>

            <div class="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
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
            class="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
            Cerrar sesión
        </button>
    `;
}

function buildMobileHeader() {
    return `
        <header class="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:hidden">
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

    <div class="flex items-center gap-2">
        <!-- 🔔 campanita -->
        <div id="studentNotificationsBellMobile"></div>

        <!-- 📲 botón instalar -->
<button
    id="installAppButton"
    class="hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white dark:bg-slate-900 text-base text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
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
        activeItem: "home",
        modules: company?.modules || {}
    });
}

function buildMobileBottomNav() {
    return buildStudentMobileBottomNav({
        activeItem: "home",
        homeHref: "/src/pages/student/home/index.html",
        profileHref: "/src/pages/student/profile/index.html",
        paymentsHref: "/src/pages/student/payments/index.html",
        modules: company?.modules || {}
    });
}

function buildTopBar() {
    return `
        <section class="hidden md:block rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div class="flex items-center justify-between gap-4">
                <div class="flex min-w-0 items-center gap-3">
                    ${buildCompanyLogo("h-14 w-14")}

                    <div class="min-w-0">
                        <h1 class="truncate text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
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
        <section class="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 items-center gap-4">
                    ${buildStudentAvatar("h-20 w-20")}

                    <div class="min-w-0">
                        <div class="truncate text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                            ${escapeHtml(getStudentFullName() || "—")}
                        </div>

                        <div class="mt-2 flex flex-wrap items-center gap-2">
                            ${
                                memberNumber
                                    ? `<span class="inline-flex rounded-full bg-slate-900 dark:bg-slate-100 px-3 py-1 text-sm font-semibold text-white dark:text-slate-950 shadow-sm">
                                        Socio #${escapeHtml(memberNumber)}
                                    </span>`
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
                                ? `<div class="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">${escapeHtml(getStudentEmail())}</div>`
                                : ""
                        }
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-2 text-sm text-slate-600 sm:text-right">
                    ${
                        getStudentDni()
                            ? `<div><span class="font-semibold text-slate-900 dark:text-white">DNI:</span> ${escapeHtml(getStudentDni())}</div>`
                            : ""
                    }

                    ${
                        getStudentPhone()
                            ? `<div><span class="font-semibold text-slate-900 dark:text-white">Contacto:</span> ${escapeHtml(getStudentPhone())}</div>`
                            : ""
                    }
                </div>
            </div>
        </section>
    `;
}

function buildQuickAccess() {
    const cards = [
        quickAccessCard("📚", "Cursos", "/src/pages/student/courses/index.html"),
        canUse("payments") ? quickAccessCard("💳", "Pagos", "/src/pages/student/payments/index.html") : "",
        quickAccessCard("👤", "Perfil", "/src/pages/student/profile/index.html"),
        canUse("payments") ? quickAccessCard("👨‍👩‍👧", "Hermanos", "/src/pages/student/siblings/index.html") : "",
        canUse("documents") ? quickAccessCard("📄", "Documentos", "/src/pages/student/documents/index.html") : "",
        canUse("clothing") ? quickAccessCard("👕", "Indumentaria", "/src/pages/student/clothing/catalog/index.html") : ""
    ].filter(Boolean);

    return `
        <section class="hidden md:block space-y-4">
            <div>
                <h2 class="text-xl font-bold text-slate-900 dark:text-white">Accesos rápidos</h2>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Entrá rápido a tus secciones principales.</p>
            </div>

            <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
                ${cards.join("")}
            </div>
        </section>
    `;
}

function buildSectionHeader(title, actionText = "") {
    return `
        <div class="flex items-center justify-between gap-3">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">${escapeHtml(title)}</h2>
            ${
                actionText
                    ? `<button type="button" class="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white">${escapeHtml(actionText)}</button>`
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
        <div class="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-2xl shadow-sm">
            ⚽
        </div>
    `;
}

function buildCompanyMatchLogoImage(url, alt) {
    if (!url) {
        return buildLogoPlaceholder(alt);
    }

    return `
        <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
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
        <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
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
            class="match-card w-full rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
            <div class="flex items-start justify-center gap-5 sm:gap-8">
                <div class="flex min-w-0 flex-1 flex-col items-center text-center">
                    ${buildCompanyMatchLogoImage(companyLogo, companyName)}
                    <div class="mt-2 text-sm font-semibold leading-5 text-slate-900 dark:text-white">
                        ${escapeHtml(companyName)}
                    </div>
                </div>

                <div class="flex shrink-0 items-center justify-center pt-5 text-sm font-bold tracking-wide text-slate-400">
                    VS
                </div>

                <div class="flex min-w-0 flex-1 flex-col items-center text-center">
                    ${buildOpponentMatchLogoImage(match.opponentLogoUrl, match.opponentName || "Rival")}
                    <div class="mt-2 text-sm font-semibold leading-5 text-slate-900 dark:text-white">
                        ${escapeHtml(match.opponentName || "Rival")}
                    </div>
                </div>
            </div>

            <div class="mt-4 text-sm">
                <div class="font-medium text-slate-700 dark:text-slate-200">
                    ${escapeHtml(formatMatchDate(match.matchDateUtc))}
                </div>

                ${
                    match.locationName
                        ? `
                            <div class="text-slate-500 dark:text-slate-400">
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
                <div class="w-full rounded-[28px] bg-white dark:bg-slate-900 p-5 shadow-2xl">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Partido
                            </div>
                            <h3 class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                                ${escapeHtml(companyName)} vs ${escapeHtml(selectedMatch.opponentName || "Rival")}
                            </h3>
                        </div>

                        <button
                            id="closeMatchDetailBtn"
                            type="button"
                            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            ✕
                        </button>
                    </div>

                    <div class="mt-5 flex items-start justify-center gap-5 sm:gap-8">
                        <div class="flex min-w-0 flex-1 flex-col items-center text-center">
                            ${buildCompanyMatchLogoImage(companyLogo, companyName)}
                            <div class="mt-2 text-sm font-semibold leading-5 text-slate-900 dark:text-white">
                                ${escapeHtml(companyName)}
                            </div>
                        </div>

                        <div class="flex shrink-0 items-center justify-center pt-5 text-sm font-bold tracking-wide text-slate-400">
                            VS
                        </div>

                        <div class="flex min-w-0 flex-1 flex-col items-center text-center">
                            ${buildOpponentMatchLogoImage(selectedMatch.opponentLogoUrl, selectedMatch.opponentName || "Rival")}
                            <div class="mt-2 text-sm font-semibold leading-5 text-slate-900 dark:text-white">
                                ${escapeHtml(selectedMatch.opponentName || "Rival")}
                            </div>
                        </div>
                    </div>

                    <div class="mt-5 space-y-3">
                        <div class="rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
                            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Fecha y lugar
                            </div>
                            <div class="mt-2 text-sm text-slate-600">
                                ${escapeHtml(formatMatchDate(selectedMatch.matchDateUtc))}
                            </div>
                            ${
                                selectedMatch.locationName
                                    ? `<div class="mt-1 text-base font-semibold text-slate-900 dark:text-white">${escapeHtml(selectedMatch.locationName)}</div>`
                                    : ""
                            }
                            ${
                                selectedMatch.address
                                    ? `<div class="mt-1 text-sm text-slate-500 dark:text-slate-400">${escapeHtml(selectedMatch.address)}</div>`
                                    : ""
                            }
                        </div>
                        ${buildMatchLineupBox()}

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

                        <div class="rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
                            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Alcance
                            </div>
                            <div class="mt-1 text-base font-bold text-slate-700 dark:text-slate-200">
                                ${selectedMatch.isGlobal ? "Global" : escapeHtml((selectedMatch.courseNames || []).join(", ") || "Por curso")}
                            </div>
                        </div>

                        ${
                            selectedMatch.ticketInfo
                                ? `
                                <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
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
                                <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
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
                                    class="inline-flex items-center justify-center rounded-2xl bg-slate-900 dark:bg-white px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                                >
                                    Abrir Maps
                                </a>
                                `
                                : ""
                        }

                        <button
                            id="closeMatchDetailSecondaryBtn"
                            type="button"
                            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function buildMatchLineupBox() {
    if (company?.isMatchOrganizationEnabled !== true) return "";
    if (!selectedMatchLineup?.hasLineup) return "";

    const data = selectedMatchLineup;

    return `
        <div id="matchLineupBox" class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
            <div class="text-xs font-semibold uppercase text-slate-400">
                Organización del partido
            </div>

            <div class="mt-2 text-sm font-semibold text-slate-800">
                ${
                    data.isStarter
                        ? `Titular ${data.positionLabel ? "· " + data.positionLabel : ""}`
                        : "Suplente"
                }
            </div>

            <button
                id="openLineupBtn"
                type="button"
                class="mt-3 w-full rounded-xl bg-slate-900 dark:bg-white px-3 py-2 text-sm text-white"
            >
                Ver formación
            </button>
        </div>
    `;
}

async function loadMatchLineup(matchId) {
    try {
        const data = await get(`/api/student/${companySlug}/matches/${matchId}/lineup`);

        selectedMatchLineup = data?.hasLineup ? data : null;

        rerender();

    } catch {
        selectedMatchLineup = null;
    }
}

function openLineupModal(data) {
    const modal = document.createElement("div");

    modal.className = "fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4";

    modal.innerHTML = `
        <div class="lineup-modal-in max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-2xl">
            <div class="mb-3 flex items-center justify-between">
                <h2 class="text-base font-bold text-slate-900 dark:text-white">
                    Formación ${data.formationName ? `· ${escapeHtml(data.formationName)}` : ""}
                </h2>
                <button id="closeLineupModal" class="rounded-xl border px-3 py-1 text-sm text-slate-600">
                    Cerrar
                </button>
            </div>

            <div class="relative h-[540px] sm:h-[600px] overflow-hidden rounded-[24px] border-4 border-emerald-900 bg-emerald-700">
<div class="absolute inset-4 rounded-[20px] border-2 border-white/70"></div>

<div class="absolute left-4 right-4 top-1/2 border-t-2 border-white/60"></div>

<div class="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60"></div>

<div class="absolute left-1/2 top-4 h-20 w-32 -translate-x-1/2 rounded-b-2xl border-x-2 border-b-2 border-white/70"></div>

<div class="absolute left-1/2 bottom-4 h-20 w-32 -translate-x-1/2 rounded-t-2xl border-x-2 border-t-2 border-white/70"></div>

                ${data.players
                    .filter(p => p.xPercent !== null && p.yPercent !== null)
                    .map((p, index) => {
                    const isMe = String(p.studentId) === String(student?.id || student?.studentId || student?.userId);

                    return `
                    <div
                        class="lineup-player-in absolute -translate-x-1/2 -translate-y-1/2 text-center"
                        style="left:${Number(p.xPercent)}%; top:${Number(p.yPercent)}%; animation-delay:${index * 90}ms;"
                    >
<div class="relative flex flex-col items-center">
<div class="absolute -bottom-1 right-0 z-10 rounded-full bg-black/80 px-1.5 py-[2px] text-[9px] font-bold text-white">
    ${escapeHtml(getShortPosition(p.positionLabel))}
</div>
    ${p.isCaptain
        ? `<div class="absolute -left-1 -top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950 shadow">C</div>`
        : ""
    }

    ${p.profileImageUrl
        ? `<img src="${escapeHtml(p.profileImageUrl)}" class="h-9 w-9 rounded-full border-2 ${isMe ? "border-yellow-300 ring-2 ring-yellow-300/70 shadow-[0_0_10px_rgba(253,224,71,0.7)]" : "border-white"} object-cover shadow" />`
        : `<div class="flex h-9 w-9 items-center justify-center rounded-full border-2 ${isMe ? "border-yellow-300 ring-2 ring-yellow-300/70 shadow-[0_0_10px_rgba(253,224,71,0.7)]" : "border-white bg-slate-900 dark:bg-white"} text-[10px] font-bold text-white shadow">
            ${escapeHtml(getInitials(p.fullName))}
        </div>`
    }
</div>

<div class="mt-1 max-w-[82px] rounded-lg bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold leading-tight text-slate-900 dark:text-white shadow">
    ${escapeHtml(getShortPlayerName(p.fullName))}
</div>

                        </div>
                    `;
                }).join("")}
            </div>

            ${buildStartersPreview(data)}
${buildSubstitutesPreview(data)}
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("closeLineupModal")?.addEventListener("click", () => {
        modal.remove();
    });

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.remove();
        }
    });

    document.getElementById("toggleSubsBtn")?.addEventListener("click", () => {
    const list = document.getElementById("extraSubsList");
    const btn = document.getElementById("toggleSubsBtn");

    const isHidden = list.classList.contains("hidden");

    list.classList.toggle("hidden", !isHidden);
    btn.textContent = isHidden ? "Ver menos" : "Ver todos";
});

document.getElementById("toggleStartersBtn")?.addEventListener("click", () => {
    const list = document.getElementById("extraStartersList");
    const btn = document.getElementById("toggleStartersBtn");

    const isHidden = list.classList.contains("hidden");

    list.classList.toggle("hidden", !isHidden);
    btn.textContent = isHidden ? "Ver menos" : "Ver todos";
});
}

function buildStartersPreview(data) {
    const starters = getStarterPlayers(data);

    if (!starters.length) return "";

    return `
        <div class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div class="flex items-center justify-between">
                <div class="text-sm font-bold text-slate-900 dark:text-white">
                    Titulares (${starters.length})
                </div>

                <button id="toggleStartersBtn" type="button" class="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Ver todos
                </button>
            </div>

            <div id="extraStartersList" class="mt-3 hidden max-h-64 space-y-2 overflow-y-auto pr-1">
                ${starters.map(p => `
                    <div class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
${p.profileImageUrl
    ? `<img src="${escapeHtml(p.profileImageUrl)}" class="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-800" />`
    : `<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-xs font-bold text-white">
        ${escapeHtml(getInitials(p.fullName))}
    </div>`
}

                        <div class="min-w-0 flex-1">
                            <div class="truncate text-sm font-bold text-slate-900 dark:text-white">
                                ${escapeHtml(p.fullName)}
                            </div>
                            <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                                ${escapeHtml(p.positionLabel || "Titular")}
                            </div>
                        </div>

                        ${p.isCaptain
                            ? `<span class="ml-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-900 dark:text-white">C</span>`
                            : ""
                        }
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

function buildSubstitutesPreview(data) {
    const substitutes = data.players.filter(p => p.xPercent === null || p.yPercent === null);

    if (!substitutes.length) {
        return `
            <div class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-400">
                Sin suplentes
            </div>
        `;
    }

    return `
        <div class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div class="flex items-center justify-between">
                <div class="text-sm font-bold text-slate-900 dark:text-white">
                    Suplentes (${substitutes.length})
                </div>

                <button id="toggleSubsBtn" type="button" class="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Ver todos
                </button>
            </div>

            <div id="extraSubsList" class="mt-3 hidden max-h-64 space-y-2 overflow-y-auto pr-1">
                ${substitutes.map(p => substituteRowHtml(p)).join("")}
            </div>
        </div>
    `;
}

function substituteRowHtml(player) {
    return `
        <div class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
            ${player.profileImageUrl
                ? `<img src="${escapeHtml(player.profileImageUrl)}" class="h-8 w-8 rounded-full object-cover" />`
                : `<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                    ${escapeHtml(getInitials(player.fullName))}
                   </div>`
            }

            <div class="text-sm font-semibold text-slate-800">
                ${escapeHtml(player.fullName)}
            </div>

            ${player.isCaptain
                ? `<span class="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">C</span>`
                : ""
            }
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
                <div class="w-full rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Partidos
                            </div>
                        </div>

                        <button
                            id="closeMatchesModalBtn"
                            type="button"
                            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            ✕
                        </button>
                    </div>

                    <div class="mt-6 space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                        <section class="space-y-3">
                            <h4 class="text-base font-bold text-slate-900 dark:text-white">Próximos</h4>

                            ${
                                upcoming.length
                                    ? upcoming.map(x => buildMatchCard(x, true)).join("")
                                    : `<div class="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">No hay próximos partidos.</div>`
                            }
                        </section>

                        <section class="space-y-3">
                            <h4 class="text-base font-bold text-slate-900 dark:text-white">Historial</h4>

                            ${
                                history.length
                                    ? history.map(x => buildMatchCard(x, true)).join("")
                                    : `<div class="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">No hay partidos anteriores.</div>`
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
                <div class="w-full rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Novedades
                            </div>
                            <h3 class="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                                Historial de novedades
                            </h3>
                        </div>

                        <button
                            id="closeAnnouncementsModalBtn"
                            type="button"
                            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            ✕
                        </button>
                    </div>

                    <div class="mt-6 max-h-[75vh] space-y-4 overflow-y-auto pr-1">
                        ${
                            items.length
                                ? items.map(x => buildNewsCard(x, true)).join("")
                                : `<div class="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">No hay novedades.</div>`
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
                <div class="max-h-[88vh] w-full overflow-y-auto rounded-[28px] bg-white dark:bg-slate-900 shadow-2xl">
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

                                <h3 class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                                    ${escapeHtml(selectedAnnouncement.title || "Novedad")}
                                </h3>
                            </div>

                            <button
                                id="closeAnnouncementDetailBtn"
                                type="button"
                                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
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
                                class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
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
                    <h2 class="text-xl font-bold text-slate-900 dark:text-white">Partidos</h2>
                    <button
                        id="openMatchesModalBtn"
                        type="button"
                        class="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                    >
                        Ver todos
                    </button>
                </div>

                <div class="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <div class="text-sm text-slate-500 dark:text-slate-400">
                        Todavía no hay partidos próximos para mostrar.
                    </div>
                </div>
            </section>
        `;
    }

    return `
        <section class="space-y-4">
            <div class="flex items-center justify-between gap-3">
                <h2 class="text-xl font-bold text-slate-900 dark:text-white">Partidos</h2>
                <button
                    id="openMatchesModalBtn"
                    type="button"
                    class="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                    >
                    Ver todos
                </button>
            </div>

            ${buildMatchCard(match)}
        </section>
    `;
}

function buildTournamentHighlights() {
    if (!tournamentHighlights.length) {
        return "";
    }

    return `
        <section class="space-y-4">
            <div class="flex items-center justify-between gap-3">
                <h2 class="text-xl font-bold text-slate-900 dark:text-white">
                    Torneos y Ligas
                </h2>

                <button
                    type="button"
                    class="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                >
                    Ver todos
                </button>
            </div>

            <div class="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
                ${tournamentHighlights.map(buildTournamentCard).join("")}
            </div>
        </section>
    `;
}

function buildTournamentCard(item) {
    const tournament = item.tournament || {};
    const highlight = item.highlight || {};
    const match = item.match || null;

    const type = highlight.type || "Active";
    const countdown = getTournamentCountdown(match?.dateUtc);

    const homeTeam = match?.homeTeam || null;
    const awayTeam = match?.awayTeam || null;

    const statusStyles = {
        Today: {
            badge: "bg-red-500 text-white"
        },
        Finished: {
            badge: "bg-emerald-500 text-white"
        },
        Upcoming: {
            badge: "bg-blue-500 text-white"
        },
        Active: {
            badge: "bg-amber-400 text-slate-950"
        }
    };

    const style = statusStyles[type] || statusStyles.Active;

    const tournamentId =
        tournament.id ||
        tournament.tournamentId ||
        item.tournamentId ||
        item.id ||
        "";

    return `
<button
    type="button"
    onclick="sessionStorage.setItem('selectedTournamentId', '${escapeHtml(tournamentId)}')"
    data-tournament-id="${escapeHtml(tournamentId)}"
    data-match-id="${escapeHtml(match?.id || "")}"
    class="tournament-card group relative w-full min-w-full snap-center overflow-hidden rounded-[26px] bg-slate-950 text-left text-white shadow-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
>
${
    tournament.useBannerAsHomeBackground && tournament.bannerUrl
        ? `
            <img
                src="${escapeHtml(tournament.bannerUrl)}"
                alt="${escapeHtml(tournament.name || "Torneo")}"
                class="absolute inset-0 h-full w-full object-cover opacity-30 transition duration-500 group-hover:scale-105"
            />
        `
        : `
<div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.28),transparent_32%),radial-gradient(circle_at_85%_25%,rgba(251,191,36,0.20),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(14,165,233,0.18),transparent_36%),linear-gradient(135deg,#020617_0%,#07111f_45%,#020617_100%)]"></div>

<div class="absolute inset-0 opacity-[0.16] bg-[linear-gradient(120deg,transparent_0%,transparent_46%,rgba(255,255,255,0.55)_47%,transparent_49%,transparent_100%)]"></div>

<div class="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"></div>
            <div class="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"></div>
            <div class="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl"></div>
            <div class="absolute -right-16 -bottom-24 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl"></div>
            <div class="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        `
}

<div class="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/35 to-slate-950/85"></div>
<div class="absolute inset-0 bg-gradient-to-r from-slate-950/45 via-transparent to-slate-950/30"></div>
<div class="hero-shine absolute inset-0 opacity-35"></div>
    <div class="relative p-4">
        <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
                <div class="flex items-center gap-2">
                    ${
                        tournament.logoUrl
                            ? `
                                <img
                                    src="${escapeHtml(tournament.logoUrl)}"
                                    alt="${escapeHtml(tournament.name || "Torneo")}"
                                    class="h-5 w-5 rounded-md border border-white/20 object-cover"
                                />
                            `
                            : ""
                    }

                    <div class="min-w-0">
                        <div class="truncate text-[10px] font-black uppercase tracking-[0.18em] text-white/65">
                            ${escapeHtml(tournament.name || "Torneo")}
                        </div>
                    </div>
                </div>
            </div>

            ${
                match?.roundNumber
                    ? `
                        <div class="rounded-full border border-white/15 bg-white dark:bg-slate-900/15 px-2.5 py-0.5 text-[10px] font-black text-white backdrop-blur">
                            Jornada ${match.roundNumber}
                        </div>
                    `
                    : ""
            }
        </div>

        ${
            match
                ? `
                    <div class="mt-5 mx-auto grid max-w-[340px] grid-cols-[1fr_74px_1fr] items-center gap-2">
                        <div class="min-w-0 text-center">
                            <div class="mx-auto w-fit">
                                ${buildTournamentTeamLogo(homeTeam?.logoUrl, homeTeam?.name)}
                            </div>

                            <div class="mt-2 truncate text-xs font-black leading-4">
                                ${escapeHtml(homeTeam?.shortName || homeTeam?.name || "Equipo")}
                            </div>
                        </div>

                        <div class="flex items-center justify-center">
                            ${
                                highlight.hasResult && match.score
                                    ? `
                                <div class="rounded-xl bg-white dark:bg-slate-900 px-2.5 py-1.5 text-center text-slate-950 dark:text-white shadow-lg transition duration-300 group-hover:scale-[1.02]">
                                    <div class="flex items-center justify-center text-xl font-black leading-none tracking-tight">
                                        ${match.score.home}
                                        <span class="mx-1 text-slate-300">-</span>
                                        ${match.score.away}
                                    </div>
                                </div>
                                    `
                                    : `
                                        <div class="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white dark:bg-slate-900 text-[9px] font-black tracking-[0.18em] text-white/80 backdrop-blur-md shadow-[0_0_22px_rgba(255,255,255,0.08)]">
                                            VS
                                        </div>
                                    `
                            }
                        </div>

                        <div class="min-w-0 text-center">
                            <div class="mx-auto w-fit">
                                ${buildTournamentTeamLogo(awayTeam?.logoUrl, awayTeam?.name)}
                            </div>

                            <div class="mt-2 truncate text-xs font-black leading-4">
                                ${escapeHtml(awayTeam?.shortName || awayTeam?.name || "Equipo")}
                            </div>
                        </div>
                    </div>

                    <div class="mt-4 mx-auto max-w-[340px] rounded-2xl border border-white/10 bg-white/12 px-3 py-3 backdrop-blur-md">
                        <div class="text-[13px] font-black leading-5 text-white/90">
                            ${escapeHtml(formatTournamentMatchDate(match.dateUtc))}
                        </div>

                        ${
                            match.venue
                                ? `
                                    <div class="mt-1 text-xs font-semibold text-white/75">
                                        📍 ${escapeHtml(match.venue)}
                                    </div>
                                `
                                : ""
                        }

                        ${
                            countdown && !highlight.isFinished
                                ? `
                                    <div class="mt-2 inline-flex rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-black text-slate-950">
                                        ${escapeHtml(countdown)}
                                    </div>
                                `
                                : ""
                        }
                    </div>
                `
                : `
                    <div class="mt-5 rounded-2xl border border-white/10 bg-white dark:bg-slate-900 p-3 text-xs font-bold text-white/85 backdrop-blur-md">
                        Competencia activa
                    </div>
                `
        }

        <div class="mt-4 mx-auto flex max-w-[340px] items-center justify-between gap-3">
            <span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black shadow-md ${style.badge}">
                ${
                    tournament.competitionFormat === "League"
                        ? "🏆 Liga en curso"
                        : "🏆 Torneo en curso"
                }
            </span>

            <div class="inline-flex items-center rounded-xl bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-black text-slate-950 dark:text-white shadow-md">
                ${escapeHtml(highlight.ctaText || "Ver torneo")}
            </div>
        </div>
    </div>
</button>
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

function formatTournamentMatchDate(value) {
    if (!value) return "Sin fecha";

    return new Intl.DateTimeFormat("es-AR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
}

function getTournamentCountdown(value) {
    if (!value) return "";

    const diff = new Date(value).getTime() - Date.now();

    if (diff <= 0) return "";

    const totalMinutes = Math.floor(diff / 60000);

    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
        return `Empieza en ${days}d ${hours}h`;
    }

    if (hours > 0) {
        return `Empieza en ${hours}h ${minutes}m`;
    }

    return `Empieza en ${minutes}m`;
}

function buildTournamentTeamLogo(url, alt) {
    const initials = getInitials(alt);

    if (!url) {
        return `
            <div class="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white dark:bg-slate-900 text-xl font-black text-white shadow-lg ring-4 ring-white/5">
                ${escapeHtml(initials || "EQ")}
            </div>
        `;
    }

    return `
        <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white dark:bg-slate-900 shadow-lg ring-4 ring-white/10">
            <img
                src="${escapeHtml(url)}"
                alt="${escapeHtml(alt || "Equipo")}"
                class="h-full w-full object-cover"
                onerror="this.remove(); this.parentElement.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center bg-white dark:bg-slate-900 text-xl font-black text-slate-900 dark:text-white&quot;>${escapeHtml(initials || "EQ")}</div>';"
            />
        </div>
    `;
}

function buildNewsCard(item, compact = false) {
    return `
        <button
            type="button"
            data-announcement-id="${escapeHtml(item.id)}"
            data-from-history="${compact ? "true" : "false"}"
            class="announcement-card w-full overflow-hidden rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
                            <div class="h-24 w-24 shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-xs text-slate-400">
                                Sin imagen
                            </div>
                        `
                }

                <div class="flex-1 min-w-0">
                    <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        ${formatDate(item.createdAtUtc)}
                    </div>

                    <h3 class="mt-1 text-base font-bold text-slate-900 dark:text-white truncate">
                        ${escapeHtml(item.title || "Novedad")}
                    </h3>

                    ${
                        item.text
                            ? `
                                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                    ${escapeHtml(item.text)}
                                </p>
                            `
                            : ""
                    }

                    <div class="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
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
                <h2 class="text-xl font-bold text-slate-900 dark:text-white">Novedades</h2>

                <button
                    id="openAnnouncementsModalBtn"
                    type="button"
                    class="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                >
                    Ver todas
                </button>
            </div>

            ${
                !latest
                    ? `
                        <div class="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                            <div class="text-sm text-slate-500 dark:text-slate-400">
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
                <h2 class="text-xl font-bold text-slate-900 dark:text-white">Sponsors</h2>

                ${
                    items.length > 1
                        ? `<span class="text-sm font-semibold text-slate-500 dark:text-slate-400">${items.length} sponsors</span>`
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
                            class="sponsor-card relative h-32 min-w-full snap-center overflow-hidden rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:h-36"
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
                                        <div class="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-950 text-sm text-slate-400">
                                            Sin imagen
                                        </div>
                                    `
                            }

                            <div class="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-950/20 to-transparent"></div>

                            <div class="absolute left-4 top-4 max-w-[75%]">
                                ${
                                    sponsor.overlayText
                                        ? `
                                            <span class="inline-flex rounded-full bg-white dark:bg-slate-900/95 px-3 py-1 text-xs font-bold text-slate-900 dark:text-white shadow-sm">
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
                                class="hidden md:inline-flex absolute left-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white dark:bg-slate-900/95 text-slate-900 dark:text-white shadow-md bg-white dark:bg-slate-900 dark:hover:bg-slate-800"
                                aria-label="Sponsor anterior"
                            >
                                ‹
                            </button>

                            <button
                                id="nextSponsorBtn"
                                type="button"
                                class="hidden md:inline-flex absolute right-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white dark:bg-slate-900/95 text-slate-900 dark:text-white shadow-md bg-white dark:bg-slate-900 dark:hover:bg-slate-800"
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
                                            ? "w-6 bg-slate-900 dark:bg-white"
                                            : "w-2.5 bg-slate-300 dark:bg-slate-700"
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
                <div class="max-h-[88vh] w-full overflow-y-auto rounded-[28px] bg-white dark:bg-slate-900 shadow-2xl">
                    <div class="relative bg-slate-100 dark:bg-slate-950">
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
                                    <div class="absolute left-4 top-4 rounded-full bg-white dark:bg-slate-900/95 px-3 py-1 text-xs font-bold text-slate-900 dark:text-white shadow-sm">
                                        ${escapeHtml(selectedSponsor.overlayText)}
                                    </div>
                                `
                                : ""
                        }

                        <button
                            id="closeSponsorDetailBtn"
                            type="button"
                            class="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 shadow-sm"
                        >
                            ✕
                        </button>
                    </div>

                    <div class="p-5">
                        <h3 class="text-2xl font-bold text-slate-900 dark:text-white">
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
                                class="ml-auto rounded-2xl border border-slate-300 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200"
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
            ${canUse("matches") ? buildFeaturedMatch() : ""}
            ${canUse("tournaments") ? buildTournamentHighlights() : ""}
            ${canUse("news") ? buildNews() : ""}
            ${canUse("sponsors") ? buildSponsors() : ""}
        </div>
    `;
}

function buildLoading() {
    return `
        <div class="min-h-screen bg-slate-100 dark:bg-slate-950">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                            <div class="text-sm text-slate-500 dark:text-slate-400">Cargando panel del alumno...</div>
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
        <div class="min-h-screen bg-slate-100 dark:bg-slate-950">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-rose-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
                            <div class="text-base font-semibold text-slate-900 dark:text-white">No se pudo cargar el panel.</div>
                            <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">${escapeHtml(pageError || "Ocurrió un error inesperado.")}</div>
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
        <div class="min-h-screen bg-slate-100 dark:bg-slate-950">
            ${buildMobileHeader()}
            ${buildMobileMenu()}

            <div class="flex min-h-screen">
                ${buildStudentSidebar({
                    company,
                    student,
                    activeItem: "home"
                })}

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
    if (!isCurrentHomePage()) return;

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
    bindStudentLayoutEvents();
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

document.querySelectorAll(".tournament-card").forEach(card => {
    card.addEventListener("click", () => {
        const tournamentId = card.dataset.tournamentId;

        console.log("CLICK TORNEO HOME", {
            tournamentId,
            dataset: { ...card.dataset }
        });

        if (!tournamentId) {
            console.error("No llegó tournamentId");
            return;
        }

sessionStorage.setItem("selectedTournamentId", tournamentId);

window.location.href =
    `/src/pages/student/tournaments/detail/?tournamentId=${encodeURIComponent(tournamentId)}`;
    });
});

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

    document.getElementById("openLineupBtn")?.addEventListener("click", () => {
    if (selectedMatchLineup) {
        openLineupModal(selectedMatchLineup);
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
                ? "w-6 bg-slate-900 dark:bg-white"
                : "w-2.5 bg-slate-300 dark:bg-slate-700"
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
                    ? "w-6 bg-slate-900 dark:bg-white"
                    : "w-2.5 bg-slate-300 dark:bg-slate-700"
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

loadMatchLineup(found.id);
        });
    });

    document.getElementById("closeMatchDetailBtn")?.addEventListener("click", () => {
matchDetailModalOpen = false;
selectedMatch = null;
selectedMatchLineup = null;
rerender();
    });

    initPwaInstall({
    buttonId: "installAppButton"
});

    document.getElementById("closeMatchDetailSecondaryBtn")?.addEventListener("click", () => {
matchDetailModalOpen = false;
selectedMatch = null;
selectedMatchLineup = null;
rerender();
    });

    document.getElementById("matchDetailOverlay")?.addEventListener("click", (event) => {
        if (event.target.id === "matchDetailOverlay") {
matchDetailModalOpen = false;
selectedMatch = null;
selectedMatchLineup = null;
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


// document.addEventListener("visibilitychange", async () => {
//     if (document.visibilityState === "visible") {
//         await refreshHomeDynamicData();
//     }
// });

// window.addEventListener("pageshow", async () => {
//     await refreshHomeDynamicData();
// });

async function refreshHomeDynamicData() {
    if (!isCurrentHomePage()) return;
    if (!companySlug) return;

    try {
await Promise.all([
    canUse("matches") ? loadMatches() : Promise.resolve(),
    canUse("news") ? loadAnnouncements() : Promise.resolve(),
    canUse("sponsors") ? loadSponsors() : Promise.resolve(),
    canUse("tournaments") ? loadTournamentHighlights() : Promise.resolve(),
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

async function loadTournamentHighlights() {
    const result = await get(`/api/student/${companySlug}/tournaments/home`);

    tournamentHighlights = Array.isArray(result?.items)
        ? result.items
        : [];
}

function injectLineupAnimationsCss() {
    if (document.getElementById("lineupAnimationsCss")) return;

    const style = document.createElement("style");
    style.id = "lineupAnimationsCss";
    style.textContent = `
        @keyframes lineupModalIn {
            from {
                opacity: 0;
                transform: scale(0.96);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        @keyframes lineupPlayerIn {
            from {
                opacity: 0;
                transform: translate(-50%, -35%) scale(0.72);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }

        @keyframes tournamentCardIn {
            from {
                opacity: 0;
                transform: translateY(14px) scale(0.98);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .tournament-card {
            animation: tournamentCardIn 360ms ease-out both;
        }

        .lineup-modal-in {
            animation: lineupModalIn 260ms ease-out forwards;
        }

        .lineup-player-in {
            opacity: 0;
            animation: lineupPlayerIn 420ms ease-out forwards;
        }
    `;

    document.head.appendChild(style);
}

async function init() {
    initTheme();

    try {
        if (!localStorage.getItem("cache_cleaned_v1")) {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(reg => reg.unregister());
        });

        caches.keys().then(keys => {
            keys.forEach(key => caches.delete(key));
        });
    }

    localStorage.setItem("cache_cleaned_v1", "true");
}
        await loadConfig();
        injectLineupAnimationsCss();
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
    canUse("matches") ? loadMatches() : Promise.resolve(),
    canUse("tournaments") ? loadTournamentHighlights() : Promise.resolve(),
    canUse("news") ? loadAnnouncements() : Promise.resolve(),
    canUse("sponsors") ? loadSponsors() : Promise.resolve()
]);

        student = profile;
        applyThemePreference(student.themePreference || "system");

        if (!student) {
            throw new Error("No se pudo obtener el perfil del alumno.");
        }

        if (!student.isRegistrationCompleted) {
            window.location.href = "/src/pages/student/registration/index.html";
            return;
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