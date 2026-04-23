import { get } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth, logoutAndRedirect } from "../../../shared/js/session.js";
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
                ${navLink("Cursos", "/src/pages/student/courses/index.html", true)}
                ${navLink("Pagos", "/src/pages/student/payments/index.html")}
                ${navLink("Legajo", "/src/pages/student/documents/index.html")}
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
        activeItem: "courses"
    });
}

function buildMobileBottomNav() {
    return buildStudentMobileBottomNav({
        activeItem: "courses",
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

function buildPageHeader() {
    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Panel alumno
                    </div>
                    <h2 class="mt-1 text-2xl font-bold text-slate-900">Mis cursos</h2>
                    <p class="mt-2 text-sm text-slate-500">
                        Acá vas a poder ver los cursos en los que estás inscripto.
                    </p>
                </div>

                <div class="inline-flex w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
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
        <article class="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <h3 class="text-lg font-bold text-slate-900">
                        ${escapeHtml(course?.name || "Curso")}
                    </h3>

                    ${
                        teacherName
                            ? `<div class="mt-2 text-sm text-slate-500">Profesor: <span class="font-medium text-slate-700">${escapeHtml(teacherName)}</span></div>`
                            : ""
                    }
                </div>

                <span class="inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                }">
                    ${isActive ? "Activo" : "Inactivo"}
                </span>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Clases por semana
                    </div>
                    <div class="mt-1 text-base font-semibold text-slate-900">
                        ${classesPerWeek > 0 ? escapeHtml(String(classesPerWeek)) : "—"}
                    </div>
                </div>

                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Precio
                    </div>
                    <div class="mt-1 text-base font-semibold text-slate-900">
                        ${finalPrice != null ? formatMoney(finalPrice) : basePrice != null ? formatMoney(basePrice) : "—"}
                    </div>
                </div>

                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Precio base
                    </div>
                    <div class="mt-1 text-base font-semibold text-slate-900">
                        ${basePrice != null ? formatMoney(basePrice) : "—"}
                    </div>
                </div>

                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Descuento hermanos
                    </div>
                    <div class="mt-1 text-base font-semibold text-slate-900">
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
                        <div class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Horarios
                            </div>
                            <div class="mt-2 space-y-2">
                                ${schedules.map(item => `
                                    <div class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                                        <span class="font-medium text-slate-800">${escapeHtml(getDayName(item.dayOfWeek))}</span>
                                        <span class="text-slate-600">${escapeHtml(formatTime(item.startTime))} a ${escapeHtml(formatTime(item.endTime))}</span>
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
                        <div class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Descripción
                            </div>
                            <p class="mt-2 text-sm leading-6 text-slate-600">
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
            <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div class="text-lg font-semibold text-slate-900">Todavía no tenés cursos asignados.</div>
                <p class="mt-2 text-sm text-slate-500">
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
        <div class="min-h-screen bg-slate-100">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <div class="text-sm text-slate-500">Cargando cursos...</div>
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
                            <div class="text-base font-semibold text-slate-900">No se pudieron cargar los cursos.</div>
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

document.querySelectorAll("#logoutBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        logoutAndRedirect();
    });
});
}

async function loadStudentProfile() {
    return await get(`/api/admin/${companySlug}/students/me`);
}

async function loadCourses() {
    return await get(`/api/student/${companySlug}/courses`);
}

async function init() {
    try {            
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

        courses = await loadCourses();

        if (!Array.isArray(courses)) {
            courses = [];
        }
    } catch (error) {
        pageError = error?.message || "No se pudo cargar la información de cursos.";
    } finally {
        loading = false;
        rerender();
    }
}

init();