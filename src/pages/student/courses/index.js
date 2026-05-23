import { get } from "../../../shared/js/api.js";
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
import { initNotificationsBell } from "../../../shared/js/notifications-bell.js";
import {
    getMe,
    setMe,
    getStudentMe,
    setStudentMe,
    getActiveCompany,
    setActiveCompany
} from "../../../shared/js/storage.js";
import {
  buildStudentSidebar,
  bindStudentLayoutEvents
} from "../../../shared/js/student-layout.js";
import { initTheme, applyThemePreference } from "../../../shared/js/theme.js";

let companySlug = null;
let company = null;
let student = null;
let courses = [];
let mobileMenuOpen = false;
let loading = true;
let pageError = "";
let carnetOpen = false;

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

        if (!expires) return false;

        const expiresAt = new Date(expires).getTime();

        return Date.now() > expiresAt - 5 * 60 * 1000;
    } catch {
        return true;
    }
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

function formatMoney(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "—";

    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
    }).format(amount);
}

function getDayName(dayOfWeek) {
    switch (Number(dayOfWeek)) {
        case 0: return "Domingo";
        case 1: return "Lunes";
        case 2: return "Martes";
        case 3: return "Miércoles";
        case 4: return "Jueves";
        case 5: return "Viernes";
        case 6: return "Sábado";
        default: return "—";
    }
}

function formatTime(value) {
    if (!value) return "—";
    return String(value).slice(0, 5);
}

function buildCompanyLogo(size = "h-16 w-16", rounded = "rounded-2xl") {
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
            <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 shadow-sm">
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
                onerror="this.remove(); this.parentElement.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center text-xs font-bold text-slate-700&quot;>${escapeHtml(initials || "—")}</div>';"
            />
        </div>
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

                <div id="studentNotificationsBellMobile"></div>
            </div>
        </header>
    `;
}

function buildMobileMenu() {
    return buildStudentMobileMenu({
        mobileMenuOpen,
        studentFullName: getStudentFullName(),
        studentEmail: getStudentEmail(),
        activeItem: "courses",
        modules: company?.modules || {}
    });
}

function buildMobileBottomNav() {
    return buildStudentMobileBottomNav({
        activeItem: "courses",
        homeHref: "/src/pages/student/home/index.html",
        profileHref: "/src/pages/student/profile/index.html",
        carnetHref: "javascript:void(0)",
        paymentsHref: "/src/pages/student/payments/index.html",
        modules: company?.modules || {}
    });
}

function buildTopBar() {
    return `
        <section class="hidden rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm md:block">
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

function buildPageHeader() {
    return `
        <section class="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Panel alumno
                    </div>
                    <h2 class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Mis cursos</h2>
                    <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Acá vas a poder ver los cursos en los que estás inscripto.
                    </p>
                </div>

                <div class="inline-flex w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    ${courses.length} ${courses.length === 1 ? "curso" : "cursos"}
                </div>
            </div>
        </section>
    `;
}

function buildCourseCard(course) {
    const description = course?.description?.trim() || "";
    const teacherName = course?.teacherFullName?.trim() || "";
    const classesPerWeek = Number(course?.classesPerWeek || 0);
    const isActive = !!course?.isActive;
    const basePrice = course?.basePrice;
    const finalPrice = course?.finalPrice;
    const siblingDiscountPercent = Number(course?.siblingDiscountPercent || 0);
    const siblingDiscountAmount = Number(course?.siblingDiscountAmount || 0);
    const schedules = Array.isArray(course?.schedules) ? course.schedules : [];

    return `
        <article class="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                        ${escapeHtml(course?.name || "Curso")}
                    </h3>

                    ${
                        teacherName
                            ? `<div class="mt-2 text-sm text-slate-500 dark:text-slate-400">Profesor: <span class="font-medium text-slate-700 dark:text-slate-200">${escapeHtml(teacherName)}</span></div>`
                            : ""
                    }
                </div>

                <span class="inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    isActive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }">
                    ${isActive ? "Activo" : "Inactivo"}
                </span>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Clases por semana
                    </div>
                    <div class="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                        ${classesPerWeek > 0 ? escapeHtml(String(classesPerWeek)) : "—"}
                    </div>
                </div>

                <div class="rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Precio
                    </div>
                    <div class="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                        ${finalPrice != null ? formatMoney(finalPrice) : basePrice != null ? formatMoney(basePrice) : "—"}
                    </div>
                </div>

                <div class="rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Precio base
                    </div>
                    <div class="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                        ${basePrice != null ? formatMoney(basePrice) : "—"}
                    </div>
                </div>

                <div class="rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Descuento hermanos
                    </div>
                    <div class="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                        ${
                            siblingDiscountAmount > 0
                                ? `${formatMoney(siblingDiscountAmount)}${siblingDiscountPercent > 0 ? ` · ${siblingDiscountPercent}%` : ""}`
                                : "—"
                        }
                    </div>
                </div>
            </div>

            ${
                schedules.length
                    ? `
                        <div class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Horarios
                            </div>
                            <div class="mt-2 space-y-2">
                                ${schedules.map(item => `
                                    <div class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm">
                                        <span class="font-medium text-slate-800 dark:text-slate-100">${escapeHtml(getDayName(item.dayOfWeek))}</span>
                                        <span class="text-slate-600 dark:text-slate-300">${escapeHtml(formatTime(item.startTime))} a ${escapeHtml(formatTime(item.endTime))}</span>
                                    </div>
                                `).join("")}
                            </div>
                        </div>
                    `
                    : ""
            }

            ${
                description
                    ? `
                        <div class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Descripción
                            </div>
                            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                ${escapeHtml(description)}
                            </p>
                        </div>
                    `
                    : ""
            }
        </article>
    `;
}

function buildCoursesSection() {
    if (!courses.length) {
        return `
            <section class="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div class="text-lg font-semibold text-slate-900 dark:text-white">Todavía no tenés cursos asignados.</div>
                <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Cuando el administrador te inscriba a un curso, lo vas a ver acá.
                </p>
            </section>
        `;
    }

    return `
        <section class="grid gap-4 xl:grid-cols-2">
            ${courses.map(buildCourseCard).join("")}
        </section>
    `;
}

function buildContent() {
    return `
        <div class="space-y-6 pb-[190px] md:pb-0">
            ${buildTopBar()}
            ${buildPageHeader()}
            ${buildCoursesSection()}
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
                            <div class="text-sm text-slate-500 dark:text-slate-400">Cargando cursos...</div>
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
                        <div class="rounded-[28px] border border-rose-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
                            <div class="text-base font-semibold text-slate-900 dark:text-white">No se pudieron cargar los cursos.</div>
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
                    activeItem: "courses"
                })}

                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        ${buildContent()}
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
function rerender() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = render();
syncStudentMobileShellScrollLock({
    mobileMenuOpen,
    extraLocked: carnetOpen
});
    bindEvents();
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

initNotificationsBell({
    rootId: "studentNotificationsBellMobile"
});

initNotificationsBell({
    rootId: "studentNotificationsBellDesktop"
});
}

async function loadStudentProfile() {
    let cachedStudent = getStudentMe(companySlug);

if (cachedStudent && !isSasUrlExpired(cachedStudent.profileImageUrl)) {
    return cachedStudent;
}

    const result = await get(`/api/student/${companySlug}/me`);
    setStudentMe(companySlug, result);

    return result;
}

async function loadCourses() {
    return await get(`/api/student/${companySlug}/courses`);
}

async function init() {
    initTheme();
    try {            
        await loadConfig();
        const session = requireAuth();
        if (!session) return;

        companySlug = session.activeCompanySlug;

        let cachedCompany = getActiveCompany(companySlug);


let me = getMe();

const companyFromMe = me?.companies?.find(x => x.companySlug === companySlug);
const logoUrl = companyFromMe?.logoUrl || companyFromMe?.LogoUrl;

// 🔥 SI NO HAY ME O LA SAS EXPIRÓ → REFETCH
if (!me || isSasUrlExpired(logoUrl)) {
    me = await get("/api/admin/me");
    setMe(me);
}

// 🔥 SIEMPRE REASIGNAR COMPANY DESPUÉS
company = (me.companies || []).find(x => x.companySlug === companySlug) || null;

if (company) {
    setActiveCompany(companySlug, company);
}
        if (!company) {
            throw new Error("No se encontró la empresa activa del alumno.");
        }

        student = await loadStudentProfile();

        if (!student) {
            throw new Error("No se pudo obtener el perfil del alumno.");
        }

        courses = await loadCourses();

        if (!Array.isArray(courses)) {
            courses = [];
        }
        applyThemePreference(student?.themePreference || "system");
    } catch (error) {
        pageError = error?.message || "No se pudo cargar la información de cursos.";
    } finally {
        loading = false;
        rerender();
    }
}

init();