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
        ? "bg-white"
        : "bg-slate-100 text-slate-500 cursor-not-allowed";
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

function buildProfileAvatar(size = "h-28 w-28") {
    const imageUrl = getProfileImageUrl();
    const initials = getInitials(getFullName());

    if (!imageUrl) {
        return `
            <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-2xl font-bold text-slate-600 shadow-sm">
                ${escapeHtml(initials)}
            </div>
        `;
    }

    return `
        <div class="${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm">
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
                    ${escapeHtml(getFullName() || "—")}
                </div>

                ${
                    profile?.email
                        ? `<div class="mt-1 truncate text-xs text-slate-500">${escapeHtml(profile.email)}</div>`
                        : ""
                }
            </div>

            <nav class="flex-1 space-y-2 px-4 py-4">
                ${navLink("Inicio", "/src/pages/student/home/index.html")}
                ${navLink("Cursos", "/src/pages/student/courses/index.html")}
                ${navLink("Pagos", "/src/pages/student/payments/index.html")}
                ${navLink("Documentos", "/src/pages/student/documents/index.html")}
                ${navLink("Perfil", "/src/pages/student/profile/index.html", true)}
                ${navLink("Hermanos", "/src/pages/student/siblings/index.html")}
                ${
                    company?.isClothingEnabled === true
                        ? navLink("Indumentaria", "/src/pages/student/clothing/catalog/index.html")
                        : ""
                }
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
        isClothingEnabled: company?.isClothingEnabled === true
    });
}

function buildMobileBottomNav() {
    return buildStudentMobileBottomNav({
        activeItem: "profile",
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

                <div id="studentNotificationsBellDesktop"></div>
            </div>
        </section>
    `;
}

function buildProfileHeader() {
    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
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
                        <div class="truncate text-2xl font-bold text-slate-900">
                            ${escapeHtml(getFullName() || "Mi perfil")}
                        </div>

                        ${
                            profile?.email
                                ? `<div class="mt-1 truncate text-sm text-slate-500">${escapeHtml(profile.email)}</div>`
                                : ""
                        }

                        ${
                            profile?.systemRole
                                ? `<div class="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">${escapeHtml(translateRole(profile.systemRole))}</div>`
                                : ""
                        }
                    </div>
                </div>

                <div class="min-w-0 lg:max-w-[360px]">
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div class="text-sm font-semibold text-slate-900">Foto de perfil</div>
                        <div class="mt-1 text-sm text-slate-500">
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
                                class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                                            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
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

function buildProfileForm() {
    return `
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div class="xl:col-span-2 space-y-6">
                <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-900">Datos personales</h2>
                            <p class="mt-1 text-sm text-slate-500">
                                Actualizá tu información principal y contactos.
                            </p>
                        </div>

                        ${
                            !profileEditMode
                                ? `
                                    <button
                                        id="editProfileButton"
                                        type="button"
                                        class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
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
                                <label for="firstName" class="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                                <input id="firstName" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.firstName || "")}" />
                            </div>

                            <div>
                                <label for="lastName" class="mb-1 block text-sm font-medium text-slate-700">Apellido</label>
                                <input id="lastName" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.lastName || "")}" />
                            </div>

                            <div>
                                <label for="dateOfBirth" class="mb-1 block text-sm font-medium text-slate-700">Fecha de nacimiento</label>
                                <input id="dateOfBirth" type="date" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${formatDateInput(profile?.dateOfBirth)}" />
                            </div>

                            <div>
                                <label for="phone" class="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
                                <input id="phone" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.phone || "")}" />
                            </div>

                            <div class="md:col-span-2">
                                <label for="address" class="mb-1 block text-sm font-medium text-slate-700">Dirección</label>
                                <input id="address" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.address || "")}" />
                            </div>
                        </div>

                        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <label class="flex items-center gap-2 text-sm font-semibold text-slate-800">
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
                                    <label for="healthInsuranceName" class="mb-1 block text-sm font-medium text-slate-700">
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
                                    <label for="healthInsuranceMemberNumber" class="mb-1 block text-sm font-medium text-slate-700">
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
                                    <label for="healthInsurancePlan" class="mb-1 block text-sm font-medium text-slate-700">
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
                                <label for="emergencyContactName" class="mb-1 block text-sm font-medium text-slate-700">Contacto de emergencia</label>
                                <input id="emergencyContactName" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.emergencyContactName || "")}" />
                            </div>

                            <div>
                                <label for="emergencyContactPhone" class="mb-1 block text-sm font-medium text-slate-700">Teléfono de emergencia</label>
                                <input id="emergencyContactPhone" type="text" ${readonlyAttr()} class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400 ${readonlyClass()}" value="${escapeHtml(profile?.emergencyContactPhone || "")}" />
                            </div>

                            <div class="md:col-span-2">
                                <label for="notes" class="mb-1 block text-sm font-medium text-slate-700">Notas</label>
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
                                            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            id="saveProfileButton"
                                            type="submit"
                                            class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="mb-5">
                        <h2 class="text-lg font-semibold text-slate-900">Seguridad</h2>
                        <p class="mt-1 text-sm text-slate-500">
                            Cambiá tu contraseña para mantener tu cuenta segura.
                        </p>
                    </div>

                    <button
                        id="openPasswordModalButton"
                        type="button"
                        class="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                        Cambiar contraseña
                    </button>
                </section>

                <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 class="text-lg font-semibold text-slate-900">Resumen</h2>

                    <div class="mt-4 space-y-3 text-sm text-slate-600">
                        <div>
                            <span class="font-semibold text-slate-900">Email:</span>
                            ${escapeHtml(profile?.email || "-")}
                        </div>

                        <div>
                            <span class="font-semibold text-slate-900">Teléfono:</span>
                            ${escapeHtml(profile?.phone || "-")}
                        </div>

                        <div>
                            <span class="font-semibold text-slate-900">Dirección:</span>
                            ${escapeHtml(profile?.address || "-")}
                        </div>

                        <div>
                            <span class="font-semibold text-slate-900">Obra social:</span>
                            ${profile?.hasHealthInsurance ? "Sí" : "No"}
                        </div>

                        ${
                            profile?.hasHealthInsurance
                                ? `
                                    <div>
                                        <span class="font-semibold text-slate-900">Nombre:</span>
                                        ${escapeHtml(profile?.healthInsuranceName || "-")}
                                    </div>

                                    <div>
                                        <span class="font-semibold text-slate-900">Nro. afiliado/socio:</span>
                                        ${escapeHtml(profile?.healthInsuranceMemberNumber || "-")}
                                    </div>

                                    <div>
                                        <span class="font-semibold text-slate-900">Plan:</span>
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
            <div class="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h3 class="text-lg font-semibold text-slate-900">Cambiar contraseña</h3>
                        <p class="mt-1 text-sm text-slate-500">
                            Ingresá tu contraseña actual y definí una nueva.
                        </p>
                    </div>

                    <button
                        id="closePasswordModalButton"
                        type="button"
                        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                    >
                        ✕
                    </button>
                </div>

                <form id="passwordForm" class="mt-5 space-y-4">
                    <div>
                        <label for="currentPassword" class="mb-1 block text-sm font-medium text-slate-700">Contraseña actual</label>
                        <input
                            id="currentPassword"
                            type="password"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                        />
                    </div>

                    <div>
                        <label for="newPassword" class="mb-1 block text-sm font-medium text-slate-700">Nueva contraseña</label>
                        <input
                            id="newPassword"
                            type="password"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                        />
                    </div>

                    <div>
                        <label for="confirmNewPassword" class="mb-1 block text-sm font-medium text-slate-700">Confirmar nueva contraseña</label>
                        <input
                            id="confirmNewPassword"
                            type="password"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                        />
                    </div>

                    <p id="passwordError" class="hidden text-sm text-rose-600"></p>

                    <div class="flex flex-wrap justify-end gap-3 pt-2">
                        <button
                            id="cancelPasswordModalButton"
                            type="button"
                            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
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
        <div class="min-h-screen bg-slate-100">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <div class="text-sm text-slate-500">Cargando perfil...</div>
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
                            <div class="text-base font-semibold text-slate-900">No se pudo cargar el perfil.</div>
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

                            <div id="pageMessage" class="hidden rounded-2xl border px-4 py-3 text-sm"></div>

                            ${buildProfileHeader()}
                            ${buildProfileForm()}
                            ${buildPasswordModal()}
                        </div>
                    </div>
                </main>
            </div>

            ${buildMobileBottomNav()}

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
    extraLocked: passwordModalOpen || carnetOpen
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
    dateOfBirth: qs("dateOfBirth").value ? new Date(`${qs("dateOfBirth").value}T00:00:00`).toISOString() : null,
    phone: qs("phone").value.trim() || null,
    address: qs("address").value.trim() || null,
    emergencyContactName: qs("emergencyContactName").value.trim() || null,
    emergencyContactPhone: qs("emergencyContactPhone").value.trim() || null,
    notes: qs("notes").value.trim() || null,

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

function bindEvents() {
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
}

async function init() {
    try {
        await loadConfig();
        enableStudentSoftNavigation();
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

        await refreshProfilePhotoUrl({ render: false });
    } catch (error) {
        pageError = error?.message || "No se pudo cargar la información del perfil.";
    } finally {
        loading = false;
        render();
    }
}

init();