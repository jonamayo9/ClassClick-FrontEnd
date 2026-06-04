import { get, put, post, postForm } from "../../../shared/js/api.js";
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
import { initNotificationsBell } from "../../../shared/js/notifications-bell.js";
import {
    buildStudentCarnetModal,
    bindStudentCarnetEvents
} from "../../../shared/js/student-carnet.js";
import {
    getMe,
    setMe,
    getStudentProfile,
    setStudentProfile,
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

let session = null;
let companySlug = null;
let company = null;
let profileEditMode = false;
let profile = null;
let mobileMenuOpen = false;
let loading = true;
let pageError = "";

let selectedPhotoFile = null;
let selectedPhotoPreviewUrl = "";
let isUploadingPhoto = false;
let isSavingProfile = false;
let isChangingPassword = false;
let passwordModalOpen = false;
let isRefreshingProfileImage = false;
let carnetOpen = false;
let guardians = [];
let guardianModalOpen = false;
let editingGuardianId = null;
let isSavingGuardian = false;
let isDeletingGuardian = false;
let deleteGuardianId = null;
let deleteGuardianLoading = false;

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

function readonlyAttr() {
    return profileEditMode ? "" : "disabled";
}

function readonlyClass() {
    return profileEditMode
        ? "bg-white text-slate-900 dark:bg-slate-950 dark:text-white dark:border-slate-600"
        : "bg-slate-100 text-slate-600 cursor-not-allowed dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
}

function formatDateInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getCompanyName() {
    return company?.companyName?.trim() || "";
}

function getCompanyLogoUrl() {
    return (company?.logoUrl || company?.LogoUrl || "").trim();
}

function getProfileImageUrl() {
    if (selectedPhotoPreviewUrl) return selectedPhotoPreviewUrl;
    return profile?.profileImageUrl?.trim() || "";
}

function getFullName() {
    const composed = [profile?.firstName, profile?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    return composed || "";
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

function showMessage(message, type = "success") {
    const el = qs("pageMessage");
    if (!el) return;

    el.className = "rounded-2xl border px-4 py-3 text-sm";
    if (type === "error") {
        el.classList.add("border-rose-200", "bg-rose-50", "text-rose-700");
    } else {
        el.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-700");
    }

    el.textContent = message;
    el.classList.remove("hidden");
}

function hideMessage() {
    const el = qs("pageMessage");
    if (!el) return;

    el.className = "hidden rounded-2xl border px-4 py-3 text-sm";
    el.textContent = "";
}

function showFieldError(id, message) {
    const el = qs(id);
    if (!el) return;

    el.textContent = message;
    el.classList.remove("hidden");
}

function clearFieldError(id) {
    const el = qs(id);
    if (!el) return;

    el.textContent = "";
    el.classList.add("hidden");
}

function clearAllErrors() {
    clearFieldError("profileError");
    clearFieldError("photoError");
    clearFieldError("passwordError");
}

async function refreshProfilePhotoUrl(options = {}) {
    if (!profile || isRefreshingProfileImage) return;

    try {
        isRefreshingProfileImage = true;

        const photoView = await get("/api/profile/photo/view");

        if (photoView?.url) {
            profile.profileImageUrl = photoView.url;
            setStudentMe(companySlug, profile);
            if (options.render !== false) {
                render();
            }
        }
    } catch {
        // Si no tiene foto cargada, el backend puede devolver 404 y no queremos romper la pantalla
    } finally {
        isRefreshingProfileImage = false;
    }
}

async function handleProfileImageError() {
    if (selectedPhotoPreviewUrl) return;
    await refreshProfilePhotoUrl();
}

function buildCompanyLogo(size = "h-14 w-14", rounded = "rounded-2xl") {
    const logoUrl = getCompanyLogoUrl();
    const initials = getInitials(getCompanyName());

    if (!logoUrl) {
        return `
            <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm">
                ${escapeHtml(initials)}
            </div>
        `;
    }

    return `
        <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white dark:bg-slate-900 shadow-sm">
            <img
                src="${escapeHtml(logoUrl)}"
                alt="Logo empresa"
                class="block h-full w-full object-cover"
                onerror="const p=this.parentElement; this.remove(); if(p){ p.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200&quot;>${escapeHtml(initials)}</div>'; }"
            />
        </div>
    `;
}

function buildProfileAvatar(size = "h-28 w-28") {
    const imageUrl = getProfileImageUrl();
    const initials = getInitials(getFullName());

    if (!imageUrl) {
        return `
            <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:bg-slate-950 text-2xl font-bold text-slate-600 shadow-sm">
                ${escapeHtml(initials)}
            </div>
        `;
    }

    return `
        <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:bg-slate-950 shadow-sm">
            <img
                id="profileAvatarImage"
                src="${escapeHtml(imageUrl)}"
                alt="Foto de perfil"
                class="block h-full w-full object-cover"
                onerror="window.__studentProfileImageError && window.__studentProfileImageError()"
            />
        </div>
    `;
}

function buildMobileHeader() {
    return `
        <header class="sticky top-0 z-30 border-b border-slate-200 bg-white dark:bg-slate-900 md:hidden">
            <div class="flex items-center justify-between px-4 py-3">

                <div class="flex min-w-0 items-center gap-3">
                    
                    ${buildCompanyLogo("h-11 w-11", "rounded-2xl")}

                    <div class="min-w-0">
                        <div class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            ${escapeHtml(getCompanyName() || "Mi club")}
                        </div>

                        <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                            ${escapeHtml(getFullName() || "Alumno")}
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
        studentFullName: getFullName(),
        studentEmail: profile?.email || "",
        activeItem: "profile",
        modules: company?.modules || {}
    });
}
function buildMobileBottomNav() {
    return buildStudentMobileBottomNav({
        activeItem: "profile",
        homeHref: "/src/pages/student/home/index.html",
        profileHref: "/src/pages/student/profile/index.html",
        carnetHref: "javascript:void(0)",
        paymentsHref: "/src/pages/student/payments/index.html",
        modules: company?.modules || {}
    });
}

function buildTopBar() {
    return `
        <section class="hidden rounded-[28px] border border-slate-200 bg-white dark:bg-slate-900 p-4 shadow-sm md:block">
            <div class="flex items-center justify-between gap-4">
                <div class="flex min-w-0 items-center gap-3">
                    ${buildCompanyLogo("h-14 w-14")}

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

function buildProfileHeader() {
    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                    <div class="relative">
                        ${buildProfileAvatar("h-28 w-28")}

                        <input id="profilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" />

                        <button
                            id="changePhotoButton"
                            type="button"
                            class="absolute -bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                            Cambiar foto
                        </button>
                    </div>

                    <div class="min-w-0 text-center sm:text-left">
                        <div class="truncate text-2xl font-bold text-slate-900 dark:text-white">
                            ${escapeHtml(getFullName() || "Mi perfil")}
                        </div>

                        ${
                            profile?.email
                                ? `<div class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">${escapeHtml(profile.email)}</div>`
                                : ""
                        }

                        ${
                            profile?.systemRole
                                ? `<div class="mt-2 inline-flex rounded-full bg-slate-100 dark:bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">${escapeHtml(translateRole(profile.systemRole))}</div>`
                                : ""
                        }
                    </div>
                </div>

                <div class="min-w-0 lg:max-w-[360px]">
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800 p-4">
                        <div class="text-sm font-semibold text-slate-900 dark:text-white">Foto de perfil</div>
                        <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Podés subir JPG, PNG o WEBP. La imagen se actualiza apenas se guarda.
                        </div>

                        ${
                            selectedPhotoFile
                                ? `
                                    <div class="mt-3 text-xs font-medium text-slate-600">
                                        Archivo seleccionado: ${escapeHtml(selectedPhotoFile.name)}
                                    </div>
                                `
                                : ""
                        }

                        <p id="photoError" class="mt-3 hidden text-sm text-rose-600"></p>

                        <div class="mt-4 flex flex-wrap gap-3">
                            <button
                                id="savePhotoButton"
                                type="button"
                                class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                ${selectedPhotoFile ? "" : "disabled"}
                            >
                                ${isUploadingPhoto ? "Guardando foto..." : "Guardar foto"}
                            </button>

                            ${
                                selectedPhotoFile
                                    ? `
                                        <button
                                            id="cancelPhotoButton"
                                            type="button"
                                            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                                        >
                                            Cancelar
                                        </button>
                                    `
                                    : ""
                            }
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function getThemePreference() {
    return profile?.themePreference || localStorage.getItem("themePreference") || "system";
}

function buildThemeSelector() {
    const selected = getThemePreference();

    const option = (key, icon, title, description) => `
        <button
            type="button"
            data-theme="${key}"
            class="theme-option rounded-[22px] border p-4 text-left transition ${
                selected === key
                    ? "border-slate-900 bg-slate-900 text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            }"
        >
            <div class="flex items-center justify-between gap-3">
                <div class="text-2xl">${icon}</div>

                <span class="h-4 w-4 rounded-full border ${
                selected === key
                    ? "border-emerald-400 bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.18)]"
                    : "border-slate-300 bg-white dark:bg-slate-900"
                }"></span>
            </div>

            <div class="mt-3 text-sm font-bold">${title}</div>
            <div class="mt-1 text-xs opacity-70">${description}</div>
        </button>
    `;

    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Apariencia</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Elegí cómo querés ver ClassClick.
            </p>

            <div class="mt-4 grid grid-cols-1 gap-3">
                ${option("light", "☀️", "Claro", "Fondo claro y limpio")}
                ${option("dark", "🌙", "Oscuro", "Ideal para la noche")}
                ${option("system", "💻", "Sistema", "Usa el tema del dispositivo")}
            </div>
        </section>
    `;
}

function relationshipLabel(value) {
    const map = {
        1: "Madre",
        2: "Padre",
        3: "Tutor",
        4: "Otro"
    };

    return map[Number(value)] || "Tutor";
}

function buildGuardiansSection() {
    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                        Tutores / Responsables de pago
                    </h2>
                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Agregá las personas autorizadas para pagar o vincularse con tus cuotas.
                    </p>
                </div>

                <button
                    id="addGuardianButton"
                    type="button"
                    class="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                    Agregar
                </button>
            </div>

            <div class="mt-4 space-y-3">
                ${
                    guardians.length
                        ? guardians.map(g => `
                            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="min-w-0">
                                        <div class="font-semibold text-slate-900 dark:text-white">
                                            ${escapeHtml(`${g.firstName || ""} ${g.lastName || ""}`.trim())}
                                        </div>

                                        <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            ${relationshipLabel(g.relationshipType)}
                                        </div>

                                        <div class="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                                            ${g.email ? `<div>Email: ${escapeHtml(g.email)}</div>` : ""}
                                            ${g.phone ? `<div>Teléfono: ${escapeHtml(g.phone)}</div>` : ""}
                                            ${g.documentNumber ? `<div>Documento: ${escapeHtml(g.documentNumber)}</div>` : ""}
                                        </div>

                                        <div class="mt-3 flex flex-wrap gap-2">
                                            ${g.canPayCharges ? `<span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Responsable de pago</span>` : ""}
                                            ${g.isPrimary ? `<span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Principal</span>` : ""}
                                        </div>
                                    </div>

                                    <div class="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            data-edit-guardian="${g.id}"
                                            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            data-delete-guardian="${g.id}"
                                            class="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            </article>
                        `).join("")
                        : `
                            <div class="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                Todavía no agregaste tutores o responsables de pago.
                            </div>
                        `
                }
            </div>
        </section>
    `;
}

function buildGuardianModal() {
    if (!guardianModalOpen) return "";

    const current = editingGuardianId
        ? guardians.find(x => x.id === editingGuardianId)
        : null;

    return `
        <div class="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/95 backdrop-blur-sm">
            <div class="mx-auto flex min-h-screen w-full items-start justify-center px-4 py-6">
                <div class="mb-32 w-full max-w-2xl rounded-[28px] border border-slate-700 bg-white p-5 shadow-2xl dark:bg-slate-900 sm:p-6">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                            ${current ? "Editar tutor" : "Agregar tutor"}
                        </h3>
                        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Estos datos ayudarán a identificar responsables de pago.
                        </p>
                    </div>

                    <button
                        id="closeGuardianModalButton"
                        type="button"
                        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        ✕
                    </button>
                </div>

                <form id="guardianForm" class="mt-5 space-y-4">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Nombre</label>
                            <input id="guardianFirstName" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white" value="${escapeHtml(current?.firstName || "")}" />
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Apellido</label>
                            <input id="guardianLastName" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white" value="${escapeHtml(current?.lastName || "")}" />
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Relación</label>
                            <select id="guardianRelationshipType" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                                <option value="1" ${Number(current?.relationshipType) === 1 ? "selected" : ""}>Madre</option>
                                <option value="2" ${Number(current?.relationshipType) === 2 ? "selected" : ""}>Padre</option>
                                <option value="3" ${!current || Number(current?.relationshipType) === 3 ? "selected" : ""}>Tutor</option>
                                <option value="4" ${Number(current?.relationshipType) === 4 ? "selected" : ""}>Otro</option>
                            </select>
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Documento</label>
                            <input id="guardianDocumentNumber" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white" value="${escapeHtml(current?.documentNumber || "")}" />
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
                            <input id="guardianEmail" type="email" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white" value="${escapeHtml(current?.email || "")}" />
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Teléfono</label>
                            <input id="guardianPhone" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white" value="${escapeHtml(current?.phone || "")}" />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label class="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                            <input id="guardianCanPayCharges" type="checkbox" ${current?.canPayCharges ? "checked" : ""} />
                            Responsable de pago
                        </label>

                        <label class="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                            <input id="guardianIsPrimary" type="checkbox" ${current?.isPrimary ? "checked" : ""} />
                            Tutor principal
                        </label>
                    </div>

                    <p id="guardianError" class="hidden text-sm text-rose-600"></p>

                    <div class="flex justify-end gap-3 pt-2">
                        <button id="cancelGuardianModalButton" type="button" class="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                            Cancelar
                        </button>

                        <button type="submit" class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800" ${isSavingGuardian ? "disabled" : ""}>
                            ${isSavingGuardian ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
            </div>
        </div>
    `;
}

function buildDeleteGuardianModal() {
    if (!deleteGuardianId) return "";

    return `
        <div class="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-sm">
            <div class="flex min-h-screen items-center justify-center px-4 py-6">
                <div class="w-full max-w-md rounded-[28px] border border-slate-700 bg-white p-6 shadow-2xl dark:bg-slate-900">
                    
                    <div class="flex items-start gap-4">
                        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-xl dark:bg-rose-900/30">
                            🗑️
                        </div>

                        <div>
                            <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                                Eliminar tutor
                            </h3>

                            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                Esta acción eliminará el tutor permanentemente.
                            </p>
                        </div>
                    </div>

                    <div class="mt-6 flex justify-end gap-3">
                        <button
                            id="cancelDeleteGuardianButton"
                            type="button"
                            class="rounded-2xl border border-slate-700 bg-transparent px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                        >
                            Cancelar
                        </button>

                        <button
                            id="confirmDeleteGuardianButton"
                            type="button"
                            class="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-60"
                            ${deleteGuardianLoading ? "disabled" : ""}
                        >
                            ${deleteGuardianLoading ? "Eliminando..." : "Eliminar"}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    `;
}

function buildProfileForm() {
    return `
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div class="xl:col-span-2 space-y-6">
                <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Datos personales</h2>
                            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Actualizá tu información principal y contactos.
                            </p>
                        </div>

                        ${
                            !profileEditMode
                                ? `
                                    <button
                                        id="editProfileButton"
                                        type="button"
                                        class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                                    >
                                        Editar perfil
                                    </button>
                                `
                                : ""
                        }
                    </div>

                    <form id="profileForm" class="space-y-4">
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label for="firstName" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Nombre</label>
                                <input id="firstName" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.firstName || "")}" />
                            </div>

                            <div>
                                <label for="lastName" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Apellido</label>
                                <input id="lastName" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.lastName || "")}" />
                            </div>

                            <div>
                                <label for="dni" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">DNI</label>
                                <input id="dni" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.dni || "")}" />
                            </div>

                            <div>
                                <label for="dateOfBirth" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Fecha de nacimiento</label>
                                <input id="dateOfBirth" type="date" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${formatDateInput(profile?.dateOfBirth)}" />
                            </div>

                            <div>
                                <label for="phone" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Teléfono</label>
                                <input id="phone" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.phone || "")}" />
                            </div>

                            <div class="md:col-span-2">
                                <label for="address" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Dirección</label>
                                <input id="address" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.address || "")}" />
                            </div>
                        </div>

                        <div class="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800 p-4">
                            <label class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                <input
                                    id="hasHealthInsurance"
                                    type="checkbox"
                                    ${profile?.hasHealthInsurance ? "checked" : ""}
                                    ${readonlyAttr()}
                                    class="rounded border-slate-300"
                                />
                                Tengo obra social
                            </label>

                            <div id="healthInsuranceFields" class="${profile?.hasHealthInsurance ? "" : "hidden"} mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label for="healthInsuranceName" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                        Nombre de obra social
                                    </label>
                                    <input
                                        id="healthInsuranceName"
                                        type="text"
                                        ${readonlyAttr()}
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}"
                                        value="${escapeHtml(profile?.healthInsuranceName || "")}"
                                    />
                                </div>

                                <div>
                                    <label for="healthInsuranceMemberNumber" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                        Nro. afiliado / socio
                                    </label>
                                    <input
                                        id="healthInsuranceMemberNumber"
                                        type="text"
                                        ${readonlyAttr()}
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}"
                                        value="${escapeHtml(profile?.healthInsuranceMemberNumber || "")}"
                                    />
                                </div>

                                <div class="md:col-span-2">
                                    <label for="healthInsurancePlan" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                        Plan
                                    </label>
                                    <input
                                        id="healthInsurancePlan"
                                        type="text"
                                        ${readonlyAttr()}
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}"
                                        value="${escapeHtml(profile?.healthInsurancePlan || "")}"
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label for="emergencyContactName" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Contacto de emergencia</label>
                                <input id="emergencyContactName" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.emergencyContactName || "")}" />
                            </div>

                            <div>
                                <label for="emergencyContactPhone" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Teléfono de emergencia</label>
                                <input id="emergencyContactPhone" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.emergencyContactPhone || "")}" />
                            </div>

                            <div class="md:col-span-2">
                                <label for="notes" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Notas</label>
                                <textarea id="notes" rows="4" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}">${escapeHtml(profile?.notes || "")}</textarea>
                            </div>
                        </div>

                        <p id="profileError" class="hidden text-sm text-rose-600"></p>

                        ${
                            profileEditMode
                                ? `
                                    <div class="flex flex-wrap justify-end gap-3 pt-2">
                                        <button
                                            id="cancelProfileEditButton"
                                            type="button"
                                            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            id="saveProfileButton"
                                            type="submit"
                                            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            ${isSavingProfile ? "Guardando..." : "Guardar cambios"}
                                        </button>
                                    </div>
                                `
                                : ""
                        }
                    </form>
                </section>
            </div>

            <div class="space-y-6">
            ${buildThemeSelector()}
            ${buildGuardiansSection()}
                <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="mb-5">
                        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Seguridad</h2>
                        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Cambiá tu contraseña para mantener tu cuenta segura.
                        </p>
                    </div>

                    <button
                        id="openPasswordModalButton"
                        type="button"
                        class="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                    >
                        Cambiar contraseña
                    </button>
                </section>

                <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Resumen</h2>

                    <div class="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        <div>
                            <span class="font-semibold text-slate-900 dark:text-white">Email:</span>
                            ${escapeHtml(profile?.email || "-")}
                        </div>

                        <div>
                            <span class="font-semibold text-slate-900 dark:text-white">Teléfono:</span>
                            ${escapeHtml(profile?.phone || "-")}
                        </div>

                        <div>
                            <span class="font-semibold text-slate-900 dark:text-white">Dirección:</span>
                            ${escapeHtml(profile?.address || "-")}
                        </div>

                        <div>
                            <span class="font-semibold text-slate-900 dark:text-white">Obra social:</span>
                            ${profile?.hasHealthInsurance ? "Sí" : "No"}
                        </div>

                        ${
                            profile?.hasHealthInsurance
                                ? `
                                    <div>
                                        <span class="font-semibold text-slate-900 dark:text-white">Nombre:</span>
                                        ${escapeHtml(profile?.healthInsuranceName || "-")}
                                    </div>

                                    <div>
                                        <span class="font-semibold text-slate-900 dark:text-white">Nro. afiliado/socio:</span>
                                        ${escapeHtml(profile?.healthInsuranceMemberNumber || "-")}
                                    </div>

                                    <div>
                                        <span class="font-semibold text-slate-900 dark:text-white">Plan:</span>
                                        ${escapeHtml(profile?.healthInsurancePlan || "-")}
                                    </div>
                                `
                                : ""
                        }
                    </div>
                </section>
            </div>
        </section>
    `;
}

function buildPasswordModal() {
    if (!passwordModalOpen) return "";

    return `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div class="w-full max-w-md rounded-[28px] bg-white dark:bg-slate-900 p-6 shadow-2xl">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Cambiar contraseña</h3>
                        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Ingresá tu contraseña actual y definí una nueva.
                        </p>
                    </div>

                    <button
                        id="closePasswordModalButton"
                        type="button"
                        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        ✕
                    </button>
                </div>

                <form id="passwordForm" class="mt-5 space-y-4">
                    <div>
                        <label for="currentPassword" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Contraseña actual</label>
                        <input
                            id="currentPassword"
                            type="password"
                            class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                    </div>

                    <div>
                        <label for="newPassword" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Nueva contraseña</label>
                        <input
                            id="newPassword"
                            type="password"
                            class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                    </div>

                    <div>
                        <label for="confirmNewPassword" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Confirmar nueva contraseña</label>
                        <input
                            id="confirmNewPassword"
                            type="password"
                            class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                    </div>

                    <p id="passwordError" class="hidden text-sm text-rose-600"></p>

                    <div class="flex flex-wrap justify-end gap-3 pt-2">
                        <button
                            id="cancelPasswordModalButton"
                            type="button"
                            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Cancelar
                        </button>

                        <button
                            id="changePasswordButton"
                            type="submit"
                            class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            ${isChangingPassword ? "Guardando..." : "Guardar contraseña"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function buildLoading() {
    return `
        <div class="min-h-screen bg-slate-100 dark:bg-slate-950">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
                            <div class="text-sm text-slate-500 dark:text-slate-400">Cargando perfil...</div>
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
                            <div class="text-base font-semibold text-slate-900 dark:text-white">No se pudo cargar el perfil.</div>
                            <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">${escapeHtml(pageError || "Ocurrió un error inesperado.")}</div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    `;
}

function buildPage() {
    return `
        <div class="min-h-screen bg-slate-100 dark:bg-slate-950">
            ${buildMobileHeader()}
            ${buildMobileMenu()}

            <div class="flex min-h-screen">
                ${buildStudentSidebar({
                    company,
                    student: profile,
                    activeItem: "profile"
                })}

                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 pb-[190px] sm:px-6 lg:px-8 md:pb-6">
                        <div class="space-y-6">
                            ${buildTopBar()}

                            <div id="pageMessage" class="hidden rounded-2xl border px-4 py-3 text-sm"></div>

                            ${buildProfileHeader()}
                            ${buildProfileForm()}
                        </div>

                        ${buildPasswordModal()}
                        ${buildGuardianModal()}
                        ${buildDeleteGuardianModal()}
                    </div>
                </main>
            </div>

            ${passwordModalOpen || guardianModalOpen || carnetOpen ? "" : buildMobileBottomNav()}

${buildStudentCarnetModal({
    open: carnetOpen,
    profile,
    company
})}
        </div>
    `;
}

function rerender() {
    render();
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
    extraLocked: passwordModalOpen || carnetOpen || guardianModalOpen
});
    bindEvents();
}

async function uploadProfilePhoto(file) {
    const formData = new FormData();
    formData.append("file", file);

    return await postForm("/api/profile/upload-photo", formData);
}

function translateRole(role) {
    if (!role) return "";

    switch (role.toLowerCase()) {
        case "student":
            return "Alumno";
        case "admin":
            return "Administrador";
        case "superadmin":
            return "Super Admin";
        default:
            return role;
    }
}

function handlePhotoSelected(file) {
    clearFieldError("photoError");

    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(file.type)) {
        showFieldError("photoError", "Formato inválido. Solo se permiten JPG, PNG o WEBP.");
        return;
    }

    selectedPhotoFile = file;

    if (selectedPhotoPreviewUrl) {
        URL.revokeObjectURL(selectedPhotoPreviewUrl);
    }

    selectedPhotoPreviewUrl = URL.createObjectURL(file);
    render();
}

async function savePhoto() {
    if (!selectedPhotoFile || isUploadingPhoto) return;

    hideMessage();
    clearFieldError("photoError");

    try {
        isUploadingPhoto = true;
        render();

        await uploadProfilePhoto(selectedPhotoFile);

        selectedPhotoFile = null;

        if (selectedPhotoPreviewUrl) {
            URL.revokeObjectURL(selectedPhotoPreviewUrl);
            selectedPhotoPreviewUrl = "";
        }

        const input = qs("profilePhotoInput");
        if (input) {
            input.value = "";
        }

        await refreshProfilePhotoUrl({ render: false });

        showMessage("La foto de perfil se guardó correctamente.");
    } catch (error) {
        showFieldError("photoError", error?.message || "No se pudo subir la foto.");
    } finally {
        isUploadingPhoto = false;
        render();
    }
}

function cancelPhotoSelection() {
    selectedPhotoFile = null;

    if (selectedPhotoPreviewUrl) {
        URL.revokeObjectURL(selectedPhotoPreviewUrl);
        selectedPhotoPreviewUrl = "";
    }

    const input = qs("profilePhotoInput");
    if (input) {
        input.value = "";
    }

    clearFieldError("photoError");
    render();
}

function validateProfileForm() {
    clearFieldError("profileError");

    const firstName = qs("firstName")?.value?.trim() || "";
    const lastName = qs("lastName")?.value?.trim() || "";

    if (!firstName) {
        showFieldError("profileError", "El nombre es obligatorio.");
        return false;
    }

    if (!lastName) {
        showFieldError("profileError", "El apellido es obligatorio.");
        return false;
    }

    const hasHealthInsurance = qs("hasHealthInsurance")?.checked || false;
const healthInsuranceName = qs("healthInsuranceName")?.value?.trim() || "";
const healthInsuranceMemberNumber = qs("healthInsuranceMemberNumber")?.value?.trim() || "";

if (hasHealthInsurance && !healthInsuranceName) {
    showFieldError("profileError", "El nombre de la obra social es obligatorio.");
    return false;
}

if (hasHealthInsurance && !healthInsuranceMemberNumber) {
    showFieldError("profileError", "El número de afiliado / socio es obligatorio.");
    return false;
}

    return true;
}

async function saveProfile(event) {
    event.preventDefault();

    if (isSavingProfile) return;
    hideMessage();

    if (!validateProfileForm()) return;

const payload = {
    firstName: qs("firstName").value.trim(),
    lastName: qs("lastName").value.trim(),
    dni: qs("dni").value.trim() || null,
    dateOfBirth: qs("dateOfBirth").value ? new Date(`${qs("dateOfBirth").value}T00:00:00`).toISOString() : null,
    phone: qs("phone").value.trim() || null,
    address: qs("address").value.trim() || null,
    emergencyContactName: qs("emergencyContactName").value.trim() || null,
    emergencyContactPhone: qs("emergencyContactPhone").value.trim() || null,
    notes: qs("notes").value.trim() || null,
    themePreference: getThemePreference(),
    hasHealthInsurance: qs("hasHealthInsurance")?.checked || false,
    healthInsuranceName: qs("hasHealthInsurance")?.checked
        ? qs("healthInsuranceName").value.trim()
        : null,
    healthInsuranceMemberNumber: qs("hasHealthInsurance")?.checked
        ? qs("healthInsuranceMemberNumber").value.trim()
        : null,
    healthInsurancePlan: qs("hasHealthInsurance")?.checked
        ? qs("healthInsurancePlan").value.trim() || null
        : null
};

    try {
        isSavingProfile = true;
        render();

profile = await put("/api/profile/me", payload);

setStudentProfile(profile);
setStudentMe(companySlug, profile);

await refreshProfilePhotoUrl({ render: false });
        showMessage("Tu perfil se actualizó correctamente.");
        profileEditMode = false;
    } catch (error) {
        showFieldError("profileError", error?.message || "No se pudo guardar el perfil.");
    } finally {
        isSavingProfile = false;
        render();
    }
}

function validatePasswordForm() {
    clearFieldError("passwordError");

    const currentPassword = qs("currentPassword")?.value || "";
    const newPassword = qs("newPassword")?.value || "";
    const confirmNewPassword = qs("confirmNewPassword")?.value || "";

    if (!currentPassword) {
        showFieldError("passwordError", "Debés indicar tu contraseña actual.");
        return false;
    }

    if (!newPassword) {
        showFieldError("passwordError", "Debés indicar la nueva contraseña.");
        return false;
    }

    if (newPassword.length < 6) {
        showFieldError("passwordError", "La nueva contraseña debe tener al menos 6 caracteres.");
        return false;
    }

    if (newPassword !== confirmNewPassword) {
        showFieldError("passwordError", "La confirmación de contraseña no coincide.");
        return false;
    }

    return true;
}

async function changePassword(event) {
    event.preventDefault();

    if (isChangingPassword) return;
    hideMessage();

    if (!validatePasswordForm()) return;

    const payload = {
        currentPassword: qs("currentPassword").value,
        newPassword: qs("newPassword").value,
        confirmNewPassword: qs("confirmNewPassword").value
    };

    try {
        isChangingPassword = true;
        render();

        await post("/api/profile/change-password", payload);

        passwordModalOpen = false;

        showMessage("La contraseña se actualizó correctamente.");
    } catch (error) {
        showFieldError("passwordError", error?.message || "No se pudo cambiar la contraseña.");
    } finally {
        isChangingPassword = false;
        render();
    }
}

async function loadGuardians() {
    guardians = await get(`/api/student/${companySlug}/guardians`);
}

function openCreateGuardianModal() {
    editingGuardianId = null;
    guardianModalOpen = true;
    render();
}

function openEditGuardianModal(id) {
    editingGuardianId = id;
    guardianModalOpen = true;
    render();
}

function closeGuardianModal() {
    guardianModalOpen = false;
    editingGuardianId = null;
    isSavingGuardian = false;
    render();
}

function validateGuardianForm() {
    clearFieldError("guardianError");

    const firstName = qs("guardianFirstName")?.value?.trim() || "";
    const lastName = qs("guardianLastName")?.value?.trim() || "";

    if (!firstName) {
        showFieldError("guardianError", "El nombre es obligatorio.");
        return false;
    }

    if (!lastName) {
        showFieldError("guardianError", "El apellido es obligatorio.");
        return false;
    }

    return true;
}

async function saveGuardian(event) {
    event.preventDefault();

    if (isSavingGuardian) return;
    hideMessage();

    if (!validateGuardianForm()) return;

    const payload = {
        firstName: qs("guardianFirstName").value.trim(),
        lastName: qs("guardianLastName").value.trim(),
        email: qs("guardianEmail").value.trim() || null,
        phone: qs("guardianPhone").value.trim() || null,
        documentNumber: qs("guardianDocumentNumber").value.trim() || null,
        relationshipType: Number(qs("guardianRelationshipType").value),
        canPayCharges: qs("guardianCanPayCharges")?.checked || false,
        isPrimary: qs("guardianIsPrimary")?.checked || false
    };

    try {
        isSavingGuardian = true;
        render();

        if (editingGuardianId) {
            await put(`/api/student/${companySlug}/guardians/${editingGuardianId}`, payload);
        } else {
            await post(`/api/student/${companySlug}/guardians`, payload);
        }

        await loadGuardians();

        guardianModalOpen = false;
        editingGuardianId = null;

        showMessage("Tutor guardado correctamente.");
    } catch (error) {
        showFieldError("guardianError", error?.message || "No se pudo guardar el tutor.");
    } finally {
        isSavingGuardian = false;
        render();
    }
}

function openDeleteGuardianModal(id) {
    deleteGuardianId = id;
    render();
}

function closeDeleteGuardianModal() {
    deleteGuardianId = null;
    deleteGuardianLoading = false;
    render();
}

async function confirmDeleteGuardian() {
    if (!deleteGuardianId || deleteGuardianLoading) return;

    try {
        deleteGuardianLoading = true;
        render();

        const response = await fetch(`${getApiBaseUrl()}/api/student/${companySlug}/guardians/${deleteGuardianId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${session.token}`
            }
        });

        if (!response.ok) {
            throw new Error("No se pudo eliminar el tutor.");
        }

        await loadGuardians();

        deleteGuardianId = null;

        showMessage("Tutor eliminado correctamente.");
    } catch (error) {
        showMessage(error?.message || "No se pudo eliminar el tutor.", "error");
    } finally {
        deleteGuardianLoading = false;
        render();
    }
}

function bindEvents() {
    bindStudentLayoutEvents();
    window.__studentProfileImageError = () => {
        handleProfileImageError();
    };

bindStudentMobileShellEvents({
    setMobileMenuOpen: (value) => {
        mobileMenuOpen = !!value;
        rerender();
    },
    onLogout: () => logoutAndRedirect(),

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
qs("hasHealthInsurance")?.addEventListener("change", () => {
    const checked = qs("hasHealthInsurance").checked;
    const box = qs("healthInsuranceFields");

    box?.classList.toggle("hidden", !checked);

    if (!checked) {
        qs("healthInsuranceName").value = "";
        qs("healthInsuranceMemberNumber").value = "";
        qs("healthInsurancePlan").value = "";
    }
});
qs("editProfileButton")?.addEventListener("click", () => {
    profileEditMode = true;
    render();
});

qs("cancelProfileEditButton")?.addEventListener("click", () => {
    profileEditMode = false;
    render();
});

    qs("profileForm")?.addEventListener("submit", saveProfile);

    qs("openPasswordModalButton")?.addEventListener("click", () => {
        clearFieldError("passwordError");
        passwordModalOpen = true;
        render();
    });

    qs("closePasswordModalButton")?.addEventListener("click", () => {
        passwordModalOpen = false;
        render();
    });

    qs("cancelPasswordModalButton")?.addEventListener("click", () => {
        passwordModalOpen = false;
        render();
    });

    qs("passwordForm")?.addEventListener("submit", changePassword);

    qs("changePhotoButton")?.addEventListener("click", () => {
        qs("profilePhotoInput")?.click();
    });

    qs("profilePhotoInput")?.addEventListener("change", (event) => {
        const file = event.target.files?.[0] || null;
        handlePhotoSelected(file);
    });

    initNotificationsBell({
    rootId: "studentNotificationsBellMobile"
});

initNotificationsBell({
    rootId: "studentNotificationsBellDesktop"
});

    qs("savePhotoButton")?.addEventListener("click", savePhoto);
    qs("cancelPhotoButton")?.addEventListener("click", cancelPhotoSelection);

    document.querySelectorAll("#logoutBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        logoutAndRedirect();
    });    
});

document.querySelectorAll(".theme-option").forEach(btn => {
    btn.addEventListener("click", async () => {
        const theme = btn.dataset.theme || "system";

        profile.themePreference = theme;
        applyThemePreference(theme);
        render();

        try {
            profile = await put("/api/profile/me", {
                ...profile,
                themePreference: theme
            });

            setStudentProfile(profile);
            setStudentMe(companySlug, profile);
        } catch (error) {
            showMessage(error?.message || "No se pudo guardar el tema.", "error");
        }
    });
});

qs("addGuardianButton")?.addEventListener("click", openCreateGuardianModal);

qs("closeGuardianModalButton")?.addEventListener("click", closeGuardianModal);
qs("cancelGuardianModalButton")?.addEventListener("click", closeGuardianModal);

qs("guardianForm")?.addEventListener("submit", saveGuardian);

document.querySelectorAll("[data-edit-guardian]").forEach(btn => {
    btn.addEventListener("click", () => {
        openEditGuardianModal(btn.dataset.editGuardian);
    });
});

document.querySelectorAll("[data-delete-guardian]").forEach(btn => {
    btn.addEventListener("click", () => {
        openDeleteGuardianModal(btn.dataset.deleteGuardian);
    });
});

qs("cancelDeleteGuardianButton")?.addEventListener("click", closeDeleteGuardianModal);

qs("confirmDeleteGuardianButton")?.addEventListener("click", confirmDeleteGuardian);

}

async function init() {
    initTheme();
    try {
        await loadConfig();
        session = requireAuth();
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

const cachedProfile = getStudentMe(companySlug);

if (cachedProfile && !isSasUrlExpired(cachedProfile.profileImageUrl)) {
    profile = cachedProfile;
} else {
    profile = await get("/api/profile/me");
    setStudentMe(companySlug, profile);
}

        if (!profile) {
            throw new Error("No se pudo obtener el perfil del alumno.");
        }

        applyThemePreference(profile.themePreference || "system");

        await refreshProfilePhotoUrl({ render: false });
        await loadGuardians();
    } catch (error) {
        pageError = error?.message || "No se pudo cargar la información del perfil.";
    } finally {
        loading = false;
        render();
    }
}

init();