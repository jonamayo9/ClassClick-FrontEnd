import { get, put, postForm } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

let company = null;
let profile = null;

let isSavingProfile = false;
let isSavingPassword = false;
let isEditingProfile = false;
let isUploadingProfileImage = false;

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

function formatDateForInput(value) {
    if (!value) return "";

    try {
        const date = new Date(value);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    } catch {
        return "";
    }
}

function buildContent() {
    return `
        <section class="space-y-6">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Configuración</p>
                        <h1 class="mt-2 text-3xl font-bold">Mi perfil</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Administrá tus datos personales y la seguridad de tu cuenta.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Rol</p>
                            <p id="statRole" class="mt-2 text-lg font-bold">-</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Empresa activa</p>
                            <p id="statCompany" class="mt-2 text-lg font-bold">-</p>
                        </div>
                    </div>
                </div>
            </section>

            <div id="pageMessage" class="hidden rounded-2xl border px-4 py-3 text-sm"></div>

            <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div class="xl:col-span-2 space-y-6">
                    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <h2 class="text-lg font-semibold text-slate-900">Datos personales</h2>
                                <p class="mt-1 text-sm text-slate-500">
                                    Modificá la información principal de tu cuenta.
                                </p>
                            </div>

                            <div class="flex flex-wrap gap-2">
                                <button
                                    id="editProfileBtn"
                                    type="button"
                                    class="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Editar
                                </button>

                                <button
                                    id="cancelProfileEditBtn"
                                    type="button"
                                    class="hidden inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>

                        <form id="profileForm" class="space-y-4">
                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label for="firstName" class="mb-1 block text-sm font-medium text-slate-700">
                                        Nombre
                                    </label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    />
                                </div>

                                <div>
                                    <label for="lastName" class="mb-1 block text-sm font-medium text-slate-700">
                                        Apellido
                                    </label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    />
                                </div>

                                <div>
                                    <label for="email" class="mb-1 block text-sm font-medium text-slate-700">
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    />
                                </div>

                                <div>
                                    <label for="phone" class="mb-1 block text-sm font-medium text-slate-700">
                                        Teléfono
                                    </label>
                                    <input
                                        id="phone"
                                        type="text"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    />
                                </div>

                                <div>
                                    <label for="dateOfBirth" class="mb-1 block text-sm font-medium text-slate-700">
                                        Fecha de nacimiento
                                    </label>
                                    <input
                                        id="dateOfBirth"
                                        type="date"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    />
                                </div>

<div>
    <label for="profileImageFile" class="mb-1 block text-sm font-medium text-slate-700">
        Imagen de perfil
    </label>

    <input
        id="profileImageFile"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        class="block w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
    />

    <p class="mt-1 text-xs text-slate-500">
        Formatos permitidos: JPG, PNG o WEBP.
    </p>
</div>
                            </div>

                            <div>
                                <label for="address" class="mb-1 block text-sm font-medium text-slate-700">
                                    Dirección
                                </label>
                                <input
                                    id="address"
                                    type="text"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                />
                            </div>

                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label for="emergencyContactName" class="mb-1 block text-sm font-medium text-slate-700">
                                        Contacto de emergencia
                                    </label>
                                    <input
                                        id="emergencyContactName"
                                        type="text"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    />
                                </div>

                                <div>
                                    <label for="emergencyContactPhone" class="mb-1 block text-sm font-medium text-slate-700">
                                        Teléfono de emergencia
                                    </label>
                                    <input
                                        id="emergencyContactPhone"
                                        type="text"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label for="notes" class="mb-1 block text-sm font-medium text-slate-700">
                                    Notas
                                </label>
                                <textarea
                                    id="notes"
                                    rows="4"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                ></textarea>
                            </div>

                            <p id="profileError" class="hidden text-sm text-rose-600"></p>

                            <div class="hidden justify-end pt-2" id="profileActions">
                                <button
                                    id="saveProfileBtn"
                                    type="submit"
                                    class="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Guardar cambios
                                </button>
                            </div>
                        </form>
                    </section>

                    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="mb-5">
                            <h2 class="text-lg font-semibold text-slate-900">Seguridad</h2>
                            <p class="mt-1 text-sm text-slate-500">
                                Actualizá tu contraseña para mantener segura tu cuenta.
                            </p>
                        </div>

                        <form id="passwordForm" class="space-y-4">
                            <div>
                                <label for="currentPassword" class="mb-1 block text-sm font-medium text-slate-700">
                                    Contraseña actual
                                </label>
                                <input
                                    id="currentPassword"
                                    type="password"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                />
                            </div>

                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label for="newPassword" class="mb-1 block text-sm font-medium text-slate-700">
                                        Nueva contraseña
                                    </label>
                                    <input
                                        id="newPassword"
                                        type="password"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    />
                                </div>

                                <div>
                                    <label for="confirmNewPassword" class="mb-1 block text-sm font-medium text-slate-700">
                                        Confirmar nueva contraseña
                                    </label>
                                    <input
                                        id="confirmNewPassword"
                                        type="password"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    />
                                </div>
                            </div>

                            <p id="passwordError" class="hidden text-sm text-rose-600"></p>

                            <div class="flex justify-end pt-2">
                                <button
                                    id="savePasswordBtn"
                                    type="submit"
                                    class="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Cambiar contraseña
                                </button>
                            </div>
                        </form>
                    </section>
                </div>

                <div class="space-y-6">
                    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 class="text-lg font-semibold text-slate-900">Resumen</h3>

                        <div class="mt-5 flex flex-col items-center text-center">
                            <div class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                                <img
                                    id="profilePreviewImage"
                                    src=""
                                    alt="Perfil"
                                    class="hidden h-full w-full object-cover"
                                />
                                <span id="profilePreviewInitials" class="text-2xl font-bold text-slate-500">--</span>
                            </div>

                            <p id="summaryFullName" class="mt-4 text-lg font-semibold text-slate-900">-</p>
                            <p id="summaryEmail" class="mt-1 text-sm text-slate-500">-</p>
                        </div>

                        <div class="mt-6 space-y-4 text-sm">
                            <div>
                                <p class="text-slate-500">Rol</p>
                                <p id="summaryRole" class="mt-1 font-medium text-slate-900">-</p>
                            </div>

                            <div>
                                <p class="text-slate-500">Super admin</p>
                                <p id="summarySuperAdmin" class="mt-1 font-medium text-slate-900">-</p>
                            </div>

                            <div>
                                <p class="text-slate-500">Empresa activa</p>
                                <p id="summaryCompany" class="mt-1 font-medium text-slate-900">-</p>
                            </div>

                            <div>
                                <p class="text-slate-500">Teléfono</p>
                                <p id="summaryPhone" class="mt-1 font-medium text-slate-900">-</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </section>
    `;
}

function showPageMessage(message, type = "success") {
    const el = qs("pageMessage");
    if (!el) return;

    const baseClasses = "rounded-2xl border px-4 py-3 text-sm";
    const typeClasses = type === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

    el.className = `${baseClasses} ${typeClasses}`;
    el.textContent = message;
    el.classList.remove("hidden");
}

function hidePageMessage() {
    const el = qs("pageMessage");
    if (!el) return;

    el.classList.add("hidden");
    el.textContent = "";
}

function showError(id, message) {
    const el = qs(id);
    el.textContent = message;
    el.classList.remove("hidden");
}

function clearError(id) {
    const el = qs(id);
    el.textContent = "";
    el.classList.add("hidden");
}

function setProfileInputsDisabled(disabled) {
[
    "firstName",
    "lastName",
    "email",
    "phone",
    "dateOfBirth",
    "profileImageFile",
    "address",
    "emergencyContactName",
    "emergencyContactPhone",
    "notes"
].forEach(id => {
    const el = qs(id);
    if (el) {
        el.disabled = disabled;
    }
});
}

function renderProfile() {
    if (!profile) return;

    qs("firstName").value = profile.firstName || "";
    qs("lastName").value = profile.lastName || "";
    qs("email").value = profile.email || "";
    qs("phone").value = profile.phone || "";
    qs("dateOfBirth").value = formatDateForInput(profile.dateOfBirth);
if (qs("profileImageFile")) {
    qs("profileImageFile").value = "";
}
    qs("address").value = profile.address || "";
    qs("emergencyContactName").value = profile.emergencyContactName || "";
    qs("emergencyContactPhone").value = profile.emergencyContactPhone || "";
    qs("notes").value = profile.notes || "";

    const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "-";
    const initials = `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase() || "--";

    qs("summaryFullName").textContent = fullName;
    qs("summaryEmail").textContent = profile.email || "-";
    qs("summaryRole").textContent = profile.systemRole || "-";
    qs("summarySuperAdmin").textContent = profile.isSuperAdmin ? "Sí" : "No";
    qs("summaryCompany").textContent = company?.name || "-";
    qs("summaryPhone").textContent = profile.phone || "-";

    qs("statRole").textContent = profile.systemRole || "-";
    qs("statCompany").textContent = company?.name || "-";

    const previewImage = qs("profilePreviewImage");
    const previewInitials = qs("profilePreviewInitials");

    if (profile.profileImageUrl) {
        previewImage.src = profile.profileImageUrl;
        previewImage.classList.remove("hidden");
        previewInitials.classList.add("hidden");
    } else {
        previewImage.src = "";
        previewImage.classList.add("hidden");
        previewInitials.classList.remove("hidden");
        previewInitials.textContent = initials;
    }

    applyProfileEditState();
}

function applyProfileEditState() {
    const editBtn = qs("editProfileBtn");
    const cancelBtn = qs("cancelProfileEditBtn");
    const actions = qs("profileActions");

    if (isEditingProfile) {
        setProfileInputsDisabled(false);
        editBtn.classList.add("hidden");
        cancelBtn.classList.remove("hidden");
        actions.classList.remove("hidden");
        actions.classList.add("flex");
    } else {
        setProfileInputsDisabled(true);
        editBtn.classList.remove("hidden");
        cancelBtn.classList.add("hidden");
        actions.classList.add("hidden");
        actions.classList.remove("flex");
    }
}

function startProfileEdit() {
    isEditingProfile = true;
    clearError("profileError");
    applyProfileEditState();
}

function cancelProfileEdit() {
    isEditingProfile = false;
    clearError("profileError");
    renderProfile();
}

function setProfileLoading(loading) {
    isSavingProfile = loading;

    qs("saveProfileBtn").disabled = loading;
    qs("editProfileBtn").disabled = loading;
    qs("cancelProfileEditBtn").disabled = loading;

    if (loading) {
        setProfileInputsDisabled(true);
        qs("saveProfileBtn").textContent = "Guardando...";
        return;
    }

    qs("saveProfileBtn").textContent = "Guardar cambios";
    applyProfileEditState();
}

function setPasswordLoading(loading) {
    isSavingPassword = loading;

    qs("currentPassword").disabled = loading;
    qs("newPassword").disabled = loading;
    qs("confirmNewPassword").disabled = loading;
    qs("savePasswordBtn").disabled = loading;

    qs("savePasswordBtn").textContent = loading
        ? "Guardando..."
        : "Cambiar contraseña";
}

function validateProfileForm() {
    clearError("profileError");

    if (!qs("firstName").value.trim()) {
        showError("profileError", "El nombre es obligatorio.");
        return false;
    }

    if (!qs("lastName").value.trim()) {
        showError("profileError", "El apellido es obligatorio.");
        return false;
    }

    if (!qs("email").value.trim()) {
        showError("profileError", "El email es obligatorio.");
        return false;
    }

    return true;
}

function validatePasswordForm() {
    clearError("passwordError");

    const currentPassword = qs("currentPassword").value;
    const newPassword = qs("newPassword").value;
    const confirmNewPassword = qs("confirmNewPassword").value;

    if (!currentPassword) {
        showError("passwordError", "La contraseña actual es obligatoria.");
        return false;
    }

    if (!newPassword) {
        showError("passwordError", "La nueva contraseña es obligatoria.");
        return false;
    }

    if (newPassword.length < 6) {
        showError("passwordError", "La nueva contraseña debe tener al menos 6 caracteres.");
        return false;
    }

    if (newPassword !== confirmNewPassword) {
        showError("passwordError", "La confirmación de contraseña no coincide.");
        return false;
    }

    return true;
}

async function uploadProfileImageIfNeeded() {
    const input = qs("profileImageFile");

    if (!input || !input.files || !input.files.length) {
        return null;
    }

    const file = input.files[0];

    const formData = new FormData();
    formData.append("file", file);

    isUploadingProfileImage = true;

    try {
        const response = await postForm(`/api/admin/profile/upload-photo`, formData);
        return response?.imageUrl || null;
    } finally {
        isUploadingProfileImage = false;
    }
}

async function loadProfile() {
    profile = await get(`/api/admin/profile`);
    renderProfile();
}

async function saveProfile(event) {
    event.preventDefault();

    if (isSavingProfile || !isEditingProfile) return;
    hidePageMessage();

    if (!validateProfileForm()) return;

    const payload = {
        firstName: qs("firstName").value.trim(),
        lastName: qs("lastName").value.trim(),
        email: qs("email").value.trim(),
        phone: qs("phone").value.trim() || null,
        address: qs("address").value.trim() || null,
        dateOfBirth: qs("dateOfBirth").value || null,
        emergencyContactName: qs("emergencyContactName").value.trim() || null,
        emergencyContactPhone: qs("emergencyContactPhone").value.trim() || null,
        notes: qs("notes").value.trim() || null
    };

    try {
        setProfileLoading(true);

        await put(`/api/admin/profile`, payload);

        const uploadedImageUrl = await uploadProfileImageIfNeeded();

        await loadProfile();

        if (uploadedImageUrl) {
            profile.profileImageUrl = uploadedImageUrl;
        }

        isEditingProfile = false;
        renderProfile();

        showPageMessage("El perfil se actualizó correctamente.");
    } catch (error) {
        showError("profileError", error.message || "No se pudo guardar el perfil.");
    } finally {
        setProfileLoading(false);
    }
}

async function savePassword(event) {
    event.preventDefault();

    if (isSavingPassword) return;
    hidePageMessage();

    if (!validatePasswordForm()) return;

    const payload = {
        currentPassword: qs("currentPassword").value,
        newPassword: qs("newPassword").value,
        confirmNewPassword: qs("confirmNewPassword").value
    };

    try {
        setPasswordLoading(true);
        await put(`/api/admin/profile/password`, payload);
        qs("passwordForm").reset();
        clearError("passwordError");
        showPageMessage("La contraseña se cambió correctamente.");
    } catch (error) {
        showError("passwordError", error.message || "No se pudo cambiar la contraseña.");
    } finally {
        setPasswordLoading(false);
    }
}

async function init() {
    await loadConfig();
    requireAuth();

    const app = qs("app");

    app.innerHTML = renderAdminLayout({
        activeKey: "profile",
        pageTitle: "Mi perfil",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;
            hidePageMessage();
            clearError("profileError");
            clearError("passwordError");
            isEditingProfile = false;
            await loadProfile();
        }
    });

    company = layout.activeCompany;

    qs("profileForm").addEventListener("submit", saveProfile);
    qs("passwordForm").addEventListener("submit", savePassword);
    qs("editProfileBtn").addEventListener("click", startProfileEdit);
    qs("cancelProfileEditBtn").addEventListener("click", cancelProfileEdit);

    await loadProfile();
}

init();