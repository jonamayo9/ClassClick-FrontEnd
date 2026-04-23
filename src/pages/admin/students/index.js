import { get, post, put, del } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

let company = null;

let students = [];
let searchTerm = "";

let editingStudentId = null;
let togglingStudentId = null;
let resettingStudentId = null;
let deletingStudentId = null;

let isSavingStudent = false;
let isResettingPassword = false;
let searchTimeout = null;

let openActionsMenuStudentId = null;
let refreshingStudentPhotoIds = new Set();

function buildContent() {
    return `
        <section class="space-y-6">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-4 py-5 text-white shadow-sm sm:px-6 sm:py-6">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Configuración</p>
                        <h1 class="mt-2 text-2xl font-bold sm:text-3xl">Alumnos</h1>
                        <p class="mt-2 max-w-2xl text-sm text-slate-300">
                            El admin crea el acceso inicial y luego el alumno completa su registro.
                        </p>
                    </div>

                    <div class="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Alumnos</p>
                            <p id="statStudents" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Activos</p>
                            <p id="statActiveStudents" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Registrados</p>
                            <p id="statRegisteredStudents" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Pendientes</p>
                            <p id="statPendingStudents" class="mt-2 text-2xl font-bold">0</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="relative overflow-visible rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div class="mb-5">
                    <h2 id="studentFormTitle" class="text-lg font-semibold text-slate-900">Crear alumno</h2>
                    <p class="mt-1 text-sm text-slate-500">
                        Alta inicial para que luego complete su perfil.
                    </p>
                </div>

                <form id="studentForm" class="space-y-4">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                            <label for="firstName" class="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                            <input
                                id="firstName"
                                type="text"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                            />
                            <p id="firstNameError" class="mt-1 hidden text-sm text-rose-600"></p>
                        </div>

                        <div>
                            <label for="lastName" class="mb-1 block text-sm font-medium text-slate-700">Apellido</label>
                            <input
                                id="lastName"
                                type="text"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                            />
                            <p id="lastNameError" class="mt-1 hidden text-sm text-rose-600"></p>
                        </div>

                        <div>
                            <label for="email" class="mb-1 block text-sm font-medium text-slate-700">Email</label>
                            <input
                                id="email"
                                type="email"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                            />
                            <p id="emailError" class="mt-1 hidden text-sm text-rose-600"></p>
                        </div>

                        <div id="passwordBlock">
                            <label for="password" class="mb-1 block text-sm font-medium text-slate-700">Contraseña inicial</label>
                            <input
                                id="password"
                                type="password"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                            />
                            <p id="passwordError" class="mt-1 hidden text-sm text-rose-600"></p>
                        </div>
                    </div>

                    <div id="isActiveBlock" class="hidden max-w-sm">
                        <div class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                            <input id="isActive" type="checkbox" checked class="h-4 w-4" />
                            <label for="isActive" class="text-sm font-medium text-slate-700">
                                Alumno activo
                            </label>
                        </div>
                    </div>

                    <div class="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
                        <button
                            id="saveStudentBtn"
                            type="submit"
                            class="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Guardar
                        </button>

                        <button
                            id="cancelStudentEditBtn"
                            type="button"
                            class="hidden inline-flex min-w-[140px] items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </section>

            <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 class="text-lg font-semibold text-slate-900">Listado de alumnos</h2>
                        <p class="mt-1 text-sm text-slate-500">
                            Buscá por nombre, email o DNI.
                        </p>
                    </div>

                    <div class="w-full lg:max-w-sm">
                        <label for="studentsSearch" class="mb-1 block text-sm font-medium text-slate-700">
                            Buscar
                        </label>
                        <input
                            id="studentsSearch"
                            type="text"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                            placeholder="Nombre, email o DNI"
                        />
                    </div>
                </div>

<div class="hidden overflow-visible md:block">
    <table class="min-w-full text-sm">
                        <thead>
                            <tr class="border-b border-slate-200 text-left text-slate-500">
                                <th class="px-3 py-3 font-medium">Alumno</th>
                                <th class="px-3 py-3 font-medium">Email</th>
                                <th class="px-3 py-3 font-medium">Registro</th>
                                <th class="px-3 py-3 font-medium">Estado</th>
                                <th class="px-3 py-3 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="studentsTable"></tbody>
                    </table>
                </div>

                <div id="studentsMobileList" class="space-y-3 md:hidden"></div>

                <div id="studentsEmptyState" class="hidden py-10 text-center">
                    <p class="text-sm text-slate-500">No hay alumnos cargados.</p>
                </div>
            </section>
        </section>

        <div id="studentsModalRoot"></div>
    `;
}

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

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);

    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function getStudentPhotoUrl(student) {
    return student.profileImageUrl
        || student.photoUrl
        || student.avatarUrl
        || student.imageUrl
        || "";
}

function getStudentFullName(student) {
    return student.fullName
        || `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim()
        || "Sin nombre";
}

function getStudentField(student, ...keys) {
    for (const key of keys) {
        if (student[key] !== undefined && student[key] !== null && String(student[key]).trim() !== "") {
            return student[key];
        }
    }
    return null;
}

function getStudentInitials(student) {
    const firstName = String(student.firstName || "").trim();
    const lastName = String(student.lastName || "").trim();

    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";

    return `${firstInitial}${lastInitial}`.trim() || "A";
}

function renderStudentAvatar(student, sizeClass = "h-11 w-11", textClass = "text-sm") {
    const photoUrl = getStudentPhotoUrl(student);

    if (!photoUrl) {
        return `
            <div class="${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 font-semibold text-slate-600 ${textClass}">
                ${escapeHtml(getStudentInitials(student))}
            </div>
        `;
    }

    return `
        <div class="${sizeClass} shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            <img
                src="${escapeHtml(photoUrl)}"
                alt="Foto de perfil de ${escapeHtml(getStudentFullName(student))}"
                class="block h-full w-full object-cover"
                data-student-photo-id="${student.id}"
            />
        </div>
    `;
}

async function refreshStudentPhotoUrl(studentId, options = {}) {
    if (!studentId || refreshingStudentPhotoIds.has(studentId)) return;

    try {
        refreshingStudentPhotoIds.add(studentId);

        const response = await get(`/api/admin/${company.slug}/students/${studentId}/photo/view`);

        const student = students.find(x => x.id === studentId);
        if (!student) return;

        student.profileImageUrl = response?.url || "";

        if (options.render !== false) {
            renderStudentsTable();
        }
    } catch {
        const student = students.find(x => x.id === studentId);
        if (student) {
            student.profileImageUrl = "";
            if (options.render !== false) {
                renderStudentsTable();
            }
        }
    } finally {
        refreshingStudentPhotoIds.delete(studentId);
    }
}

async function handleStudentImageError(studentId) {
    const student = students.find(x => x.id === studentId);
    if (!student) return;

    if (!student.profileImageUrl) return;

    await refreshStudentPhotoUrl(studentId);
}

function clearStudentErrors() {
    ["firstNameError", "lastNameError", "emailError", "passwordError"].forEach(id => {
        const el = qs(id);
        if (!el) return;
        el.classList.add("hidden");
        el.textContent = "";
    });
}

function showStudentError(id, message) {
    const el = qs(id);
    if (!el) return;

    el.textContent = message;
    el.classList.remove("hidden");
}

function validateStudentForm() {
    clearStudentErrors();

    let valid = true;

    if (!qs("firstName").value.trim()) {
        showStudentError("firstNameError", "El nombre es obligatorio.");
        valid = false;
    }

    if (!qs("lastName").value.trim()) {
        showStudentError("lastNameError", "El apellido es obligatorio.");
        valid = false;
    }

    if (!qs("email").value.trim()) {
        showStudentError("emailError", "El email es obligatorio.");
        valid = false;
    }

    if (!editingStudentId && !qs("password").value.trim()) {
        showStudentError("passwordError", "La contraseña inicial es obligatoria.");
        valid = false;
    }

    return valid;
}

function setStudentFormLoading(loading) {
    isSavingStudent = loading;

    [
        "firstName",
        "lastName",
        "email",
        "password",
        "isActive",
        "cancelStudentEditBtn",
        "saveStudentBtn"
    ].forEach(id => {
        const el = qs(id);
        if (el) el.disabled = loading;
    });

    qs("saveStudentBtn").textContent = loading
        ? (editingStudentId ? "Guardando..." : "Creando...")
        : (editingStudentId ? "Guardar cambios" : "Guardar");
}

function resetStudentForm() {
    editingStudentId = null;

    qs("studentFormTitle").textContent = "Crear alumno";
    qs("studentForm").reset();
    qs("isActive").checked = true;

    qs("passwordBlock").classList.remove("hidden");
    qs("isActiveBlock").classList.add("hidden");
    qs("email").disabled = false;

    qs("cancelStudentEditBtn").classList.add("hidden");
    qs("saveStudentBtn").textContent = "Guardar";

    clearStudentErrors();
}

function renderStats() {
    qs("statStudents").textContent = String(students.length);
    qs("statActiveStudents").textContent = String(students.filter(x => x.isActive).length);
    qs("statRegisteredStudents").textContent = String(students.filter(x => x.isRegistrationCompleted).length);
    qs("statPendingStudents").textContent = String(students.filter(x => !x.isRegistrationCompleted).length);
}

function getDesktopActions(student) {
    const isOpen = openActionsMenuStudentId === student.id;

    return `
        <div class="relative hidden md:flex justify-end">
            <button
                type="button"
                data-id="${student.id}"
                class="desktop-actions-toggle inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-lg font-bold text-slate-700 transition hover:bg-slate-50"
            >
                ⋯
            </button>

            ${isOpen ? `
                <div class="absolute right-0 top-12 z-[80] min-w-[190px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <button type="button" data-id="${student.id}" class="desktop-detail-btn block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50">Detalle</button>
                    <button type="button" data-id="${student.id}" class="desktop-edit-btn block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50">Editar</button>
                    <button type="button" data-id="${student.id}" class="desktop-toggle-btn block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50" ${togglingStudentId === student.id ? "disabled" : ""}>
                        ${togglingStudentId === student.id
                            ? "Guardando..."
                            : (student.isActive ? "Desactivar" : "Activar")}
                    </button>
                    <button type="button" data-id="${student.id}" class="desktop-reset-btn block w-full px-4 py-3 text-left text-sm text-amber-700 hover:bg-amber-50" ${resettingStudentId === student.id ? "disabled" : ""}>
                        ${resettingStudentId === student.id ? "Procesando..." : "Reset password"}
                    </button>
                    <button type="button" data-id="${student.id}" class="desktop-delete-btn block w-full px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50" ${deletingStudentId === student.id ? "disabled" : ""}>
                        ${deletingStudentId === student.id ? "Eliminando..." : "Eliminar"}
                    </button>
                </div>
            ` : ""}
        </div>
    `;
}

function getMobileActions(student) {
    const isOpen = openActionsMenuStudentId === student.id;

    return `
        <div class="relative md:hidden">
            <button
                type="button"
                data-id="${student.id}"
                class="mobile-actions-toggle inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-lg font-bold text-slate-700 transition hover:bg-slate-50"
            >
                ⋯
            </button>

            ${isOpen ? `
                <div class="absolute right-0 top-12 z-[80] min-w-[180px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <button type="button" data-id="${student.id}" class="mobile-detail-btn block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50">Detalle</button>
                    <button type="button" data-id="${student.id}" class="mobile-edit-btn block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50">Editar</button>
                    <button type="button" data-id="${student.id}" class="mobile-toggle-btn block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50">
                        ${student.isActive ? "Desactivar" : "Activar"}
                    </button>
                    <button type="button" data-id="${student.id}" class="mobile-reset-btn block w-full px-4 py-3 text-left text-sm text-amber-700 hover:bg-amber-50">Reset password</button>
                    <button type="button" data-id="${student.id}" class="mobile-delete-btn block w-full px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50">Eliminar</button>
                </div>
            ` : ""}
        </div>
    `;
}

function renderStudentsTable() {
    const tbody = qs("studentsTable");
    const mobileList = qs("studentsMobileList");
    const emptyState = qs("studentsEmptyState");

    if (!students.length) {
        tbody.innerHTML = "";
        mobileList.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    tbody.innerHTML = students.map(student => `
        <tr class="border-b border-slate-100">
            <td class="px-3 py-4">
                <div class="flex min-w-0 items-center gap-3">
                    ${renderStudentAvatar(student, "h-11 w-11", "text-sm")}
                    <div class="min-w-0">
                        <div class="truncate font-medium text-slate-900">${escapeHtml(getStudentFullName(student))}</div>
                        <div class="truncate text-xs text-slate-500">${escapeHtml(student.dni || "Sin DNI")}</div>
                    </div>
                </div>
            </td>

            <td class="px-3 py-4 text-slate-700">
                <div class="max-w-[240px] truncate">${escapeHtml(student.email)}</div>
            </td>

            <td class="px-3 py-4">
                ${student.isRegistrationCompleted
                    ? `<span class="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Registrado</span>`
                    : `<span class="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Pendiente</span>`
                }
            </td>

            <td class="px-3 py-4">
                ${student.isActive
                    ? `<span class="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Activo</span>`
                    : `<span class="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">Inactivo</span>`
                }
            </td>

            <td class="px-3 py-4 text-right">
                ${getDesktopActions(student)}
            </td>
        </tr>
    `).join("");

    mobileList.innerHTML = students.map(student => `
        <article class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 items-start gap-3">
                    ${renderStudentAvatar(student, "h-12 w-12", "text-sm")}

                    <div class="min-w-0">
                        <h3 class="truncate text-base font-semibold text-slate-900">
                            ${escapeHtml(getStudentFullName(student))}
                        </h3>
                        <p class="mt-1 truncate text-sm text-slate-500">${escapeHtml(student.email)}</p>
                        <p class="mt-1 truncate text-xs text-slate-400">${escapeHtml(student.dni || "Sin DNI")}</p>

                        <div class="mt-3 flex flex-wrap gap-2">
                            ${student.isRegistrationCompleted
                                ? `<span class="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Registrado</span>`
                                : `<span class="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Pendiente</span>`
                            }

                            ${student.isActive
                                ? `<span class="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Activo</span>`
                                : `<span class="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">Inactivo</span>`
                            }
                        </div>
                    </div>
                </div>

                ${getMobileActions(student)}
            </div>
        </article>
    `).join("");

    bindStudentActionEvents();
    bindStudentImageEvents();
}

function bindStudentImageEvents() {
    document.querySelectorAll("[data-student-photo-id]").forEach(img => {
        img.addEventListener("error", async () => {
            const studentId = img.dataset.studentPhotoId;
            await handleStudentImageError(studentId);
        });
    });
}

function bindStudentActionEvents() {
    qs("studentsTable")?.querySelectorAll(".desktop-actions-toggle").forEach(btn => {
        btn.addEventListener("click", (event) => {
            event.stopPropagation();
            const id = btn.dataset.id;
            openActionsMenuStudentId = openActionsMenuStudentId === id ? null : id;
            renderStudentsTable();
        });
    });

    qs("studentsTable")?.querySelectorAll(".desktop-detail-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openActionsMenuStudentId = null;
            openStudentDetailModal(btn.dataset.id);
        });
    });

    qs("studentsTable")?.querySelectorAll(".desktop-edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openActionsMenuStudentId = null;
            openEditStudent(btn.dataset.id);
        });
    });

    qs("studentsTable")?.querySelectorAll(".desktop-toggle-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openActionsMenuStudentId = null;
            openToggleStudentModal(btn.dataset.id);
        });
    });

    qs("studentsTable")?.querySelectorAll(".desktop-reset-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openActionsMenuStudentId = null;
            openResetPasswordModal(btn.dataset.id);
        });
    });

    qs("studentsTable")?.querySelectorAll(".desktop-delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openActionsMenuStudentId = null;
            openDeleteStudentModal(btn.dataset.id);
        });
    });

    qs("studentsMobileList")?.querySelectorAll(".mobile-actions-toggle").forEach(btn => {
        btn.addEventListener("click", (event) => {
            event.stopPropagation();
            const id = btn.dataset.id;
            openActionsMenuStudentId = openActionsMenuStudentId === id ? null : id;
            renderStudentsTable();
        });
    });

    qs("studentsMobileList")?.querySelectorAll(".mobile-detail-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openActionsMenuStudentId = null;
            openStudentDetailModal(btn.dataset.id);
        });
    });

    qs("studentsMobileList")?.querySelectorAll(".mobile-edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openActionsMenuStudentId = null;
            openEditStudent(btn.dataset.id);
        });
    });

    qs("studentsMobileList")?.querySelectorAll(".mobile-toggle-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openActionsMenuStudentId = null;
            openToggleStudentModal(btn.dataset.id);
        });
    });

    qs("studentsMobileList")?.querySelectorAll(".mobile-reset-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openActionsMenuStudentId = null;
            openResetPasswordModal(btn.dataset.id);
        });
    });

    qs("studentsMobileList")?.querySelectorAll(".mobile-delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openActionsMenuStudentId = null;
            openDeleteStudentModal(btn.dataset.id);
        });
    });
}

function setModal(html) {
    qs("studentsModalRoot").innerHTML = html;
}

function closeModal() {
    setModal("");
}

function buildConfirmModal({ title, description, confirmText, confirmClass, onConfirm }) {
    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <h3 class="text-lg font-semibold text-slate-900">${escapeHtml(title)}</h3>
                <p class="mt-2 text-sm text-slate-500">${escapeHtml(description)}</p>

                <div class="mt-6 flex gap-3">
                    <button
                        id="modalCancelBtn"
                        type="button"
                        class="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Cancelar
                    </button>

                    <button
                        id="modalConfirmBtn"
                        type="button"
                        class="flex-1 rounded-2xl px-4 py-3 text-sm font-medium text-white transition ${confirmClass}"
                    >
                        ${escapeHtml(confirmText)}
                    </button>
                </div>
            </div>
        </div>
    `);

    qs("modalCancelBtn").addEventListener("click", closeModal);
    qs("modalConfirmBtn").addEventListener("click", onConfirm);
}

function openStudentDetailModal(studentId) {
    const student = students.find(x => x.id === studentId);
    if (!student) return;

    const photoUrl = getStudentPhotoUrl(student);

    const dni = getStudentField(student, "dni");
    const dateOfBirth = getStudentField(student, "dateOfBirth");
    const phone = getStudentField(student, "phone");
    const address = getStudentField(student, "address");
    const emergencyContactName = getStudentField(student, "emergencyContactName");
    const emergencyContactPhone = getStudentField(student, "emergencyContactPhone");
    const notes = getStudentField(student, "notes");

    setModal(`
        <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4">
            <div class="mx-auto flex min-h-full max-w-3xl items-center justify-center py-6">
                <div class="w-full rounded-[28px] bg-white shadow-2xl">
                    <div class="border-b border-slate-200 px-5 py-4 sm:px-6">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <h3 class="text-xl font-semibold text-slate-900">Detalle del alumno</h3>
                                <p class="mt-1 text-sm text-slate-500">
                                    Información completa disponible del alumno.
                                </p>
                            </div>

                            <button
                                id="modalCloseBtn"
                                type="button"
                                class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <div class="space-y-6 px-5 py-5 sm:px-6">
                        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-slate-100">
                                ${photoUrl
                                    ? `<img src="${escapeHtml(photoUrl)}" alt="Foto de perfil" class="h-full w-full object-cover" data-student-photo-id="${student.id}" />`
                                    : `<span class="text-2xl font-semibold text-slate-400">${escapeHtml(getStudentInitials(student))}</span>`
                                }
                            </div>

                            <div class="min-w-0">
                                <h4 class="text-xl font-bold text-slate-900">${escapeHtml(getStudentFullName(student))}</h4>
                                <p class="mt-1 break-words text-sm text-slate-500">${escapeHtml(student.email || "—")}</p>

                                <div class="mt-3 flex flex-wrap gap-2">
                                    ${student.isRegistrationCompleted
                                        ? `<span class="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Registrado</span>`
                                        : `<span class="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Pendiente de completar registro</span>`
                                    }
                                    ${student.isActive
                                        ? `<span class="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Activo</span>`
                                        : `<span class="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">Inactivo</span>`
                                    }
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div class="rounded-3xl border border-slate-200 p-4">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">DNI</p>
                                <p class="mt-2 text-sm font-medium text-slate-900">${escapeHtml(dni || "—")}</p>
                            </div>

                            <div class="rounded-3xl border border-slate-200 p-4">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Fecha de nacimiento</p>
                                <p class="mt-2 text-sm font-medium text-slate-900">${escapeHtml(dateOfBirth ? formatDate(dateOfBirth) : "—")}</p>
                            </div>

                            <div class="rounded-3xl border border-slate-200 p-4">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Teléfono</p>
                                <p class="mt-2 text-sm font-medium text-slate-900">${escapeHtml(phone || "—")}</p>
                            </div>

                            <div class="rounded-3xl border border-slate-200 p-4">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Dirección</p>
                                <p class="mt-2 text-sm font-medium text-slate-900 break-words">${escapeHtml(address || "—")}</p>
                            </div>

                            <div class="rounded-3xl border border-slate-200 p-4">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contacto de emergencia</p>
                                <p class="mt-2 text-sm font-medium text-slate-900 break-words">${escapeHtml(emergencyContactName || "—")}</p>
                            </div>

                            <div class="rounded-3xl border border-slate-200 p-4">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Teléfono emergencia</p>
                                <p class="mt-2 text-sm font-medium text-slate-900 break-words">${escapeHtml(emergencyContactPhone || "—")}</p>
                            </div>
                        </div>

                        <div class="rounded-3xl border border-slate-200 p-4">
                            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notas</p>
                            <p class="mt-2 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">${escapeHtml(notes || "—")}</p>
                        </div>
                    </div>

                    <div class="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-6">
                        <button
                            id="modalFooterCloseBtn"
                            type="button"
                            class="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);

    qs("modalCloseBtn").addEventListener("click", closeModal);
    qs("modalFooterCloseBtn").addEventListener("click", closeModal);
    bindStudentImageEvents();
}

function clearResetPasswordErrors() {
    ["resetPasswordError", "resetPasswordConfirmError"].forEach(id => {
        const el = qs(id);
        if (!el) return;
        el.classList.add("hidden");
        el.textContent = "";
    });
}

function openResetPasswordModal(studentId) {
    const student = students.find(x => x.id === studentId);
    if (!student) return;

    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <h3 class="text-lg font-semibold text-slate-900">Resetear contraseña</h3>
                <p class="mt-2 text-sm text-slate-500">
                    Vas a resetear la contraseña de ${escapeHtml(getStudentFullName(student))}.
                </p>

                <div class="mt-5 space-y-4">
                    <div>
                        <label for="resetPassword" class="mb-1 block text-sm font-medium text-slate-700">
                            Nueva contraseña
                        </label>
                        <input
                            id="resetPassword"
                            type="password"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                        />
                        <p id="resetPasswordError" class="mt-1 hidden text-sm text-rose-600"></p>
                    </div>

                    <div>
                        <label for="resetPasswordConfirm" class="mb-1 block text-sm font-medium text-slate-700">
                            Confirmar contraseña
                        </label>
                        <input
                            id="resetPasswordConfirm"
                            type="password"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                        />
                        <p id="resetPasswordConfirmError" class="mt-1 hidden text-sm text-rose-600"></p>
                    </div>
                </div>

                <div class="mt-6 flex gap-3">
                    <button
                        id="modalCancelBtn"
                        type="button"
                        class="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Cancelar
                    </button>

                    <button
                        id="modalConfirmBtn"
                        type="button"
                        class="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    `);

    qs("modalCancelBtn").addEventListener("click", closeModal);
    qs("modalConfirmBtn").addEventListener("click", async () => {
        await resetStudentPassword(studentId);
    });
}

function openEditStudent(studentId) {
    const student = students.find(x => x.id === studentId);
    if (!student) return;

    editingStudentId = studentId;
    openActionsMenuStudentId = null;

    qs("studentFormTitle").textContent = "Editar alumno";
    qs("firstName").value = student.firstName || "";
    qs("lastName").value = student.lastName || "";
    qs("email").value = student.email || "";
    qs("isActive").checked = !!student.isActive;

    qs("email").disabled = true;
    qs("passwordBlock").classList.add("hidden");
    qs("isActiveBlock").classList.remove("hidden");
    qs("cancelStudentEditBtn").classList.remove("hidden");
    qs("saveStudentBtn").textContent = "Guardar cambios";

    clearStudentErrors();
    renderStudentsTable();

    window.scrollTo({ top: 0, behavior: "smooth" });
    qs("firstName").focus();
}

function openToggleStudentModal(studentId) {
    const student = students.find(x => x.id === studentId);
    if (!student) return;

    const nextActive = !student.isActive;

    buildConfirmModal({
        title: nextActive ? "Activar alumno" : "Desactivar alumno",
        description: nextActive
            ? `Vas a activar a ${getStudentFullName(student)}.`
            : `Vas a desactivar a ${getStudentFullName(student)}.`,
        confirmText: nextActive ? "Activar" : "Desactivar",
        confirmClass: nextActive ? "bg-slate-900 hover:bg-slate-800" : "bg-amber-600 hover:bg-amber-700",
        onConfirm: async () => {
            closeModal();
            await toggleStudent(studentId, nextActive);
        }
    });
}

function openDeleteStudentModal(studentId) {
    const student = students.find(x => x.id === studentId);
    if (!student) return;

    buildConfirmModal({
        title: "Eliminar alumno",
        description: `Vas a eliminar a ${getStudentFullName(student)}. Esta acción no se puede deshacer.`,
        confirmText: "Eliminar",
        confirmClass: "bg-rose-600 hover:bg-rose-700",
        onConfirm: async () => {
            closeModal();
            await deleteStudent(studentId);
        }
    });
}

async function loadStudents() {
    const query = searchTerm.trim()
        ? `?search=${encodeURIComponent(searchTerm.trim())}`
        : "";

    students = await get(`/api/admin/${company.slug}/students${query}`);
    renderStudentsTable();
    renderStats();
}

async function saveStudent(event) {
    event.preventDefault();

    if (isSavingStudent) return;
    if (!validateStudentForm()) return;

    try {
        setStudentFormLoading(true);

        if (editingStudentId) {
            await put(`/api/admin/${company.slug}/students/${editingStudentId}`, {
                firstName: qs("firstName").value.trim(),
                lastName: qs("lastName").value.trim(),
                dni: null,
                dateOfBirth: null,
                phone: null,
                address: null,
                emergencyContactName: null,
                emergencyContactPhone: null,
                notes: null,
                isActive: qs("isActive").checked
            });
        } else {
            await post(`/api/admin/${company.slug}/students`, {
                firstName: qs("firstName").value.trim(),
                lastName: qs("lastName").value.trim(),
                email: qs("email").value.trim(),
                password: qs("password").value
            });
        }

        resetStudentForm();
        await loadStudents();
    } catch (error) {
        console.error(error);
    } finally {
        setStudentFormLoading(false);
    }
}

async function toggleStudent(studentId, isActive) {
    try {
        togglingStudentId = studentId;
        openActionsMenuStudentId = null;
        renderStudentsTable();

        const student = students.find(x => x.id === studentId);
        if (!student) return;

        await put(`/api/admin/${company.slug}/students/${studentId}`, {
            firstName: student.firstName,
            lastName: student.lastName,
            dni: student.dni ?? null,
            dateOfBirth: student.dateOfBirth ?? null,
            phone: student.phone ?? null,
            address: student.address ?? null,
            emergencyContactName: student.emergencyContactName ?? null,
            emergencyContactPhone: student.emergencyContactPhone ?? null,
            notes: student.notes ?? null,
            isActive
        });

        student.isActive = isActive;
        renderStudentsTable();
        renderStats();
    } catch (error) {
        console.error(error);
        await loadStudents();
    } finally {
        togglingStudentId = null;
        renderStudentsTable();
    }
}

async function deleteStudent(studentId) {
    try {
        deletingStudentId = studentId;
        openActionsMenuStudentId = null;
        renderStudentsTable();

        await del(`/api/admin/${company.slug}/students/${studentId}`);

        if (editingStudentId === studentId) {
            resetStudentForm();
        }

        students = students.filter(x => x.id !== studentId);
        renderStudentsTable();
        renderStats();
    } catch (error) {
        console.error(error);
        await loadStudents();
    } finally {
        deletingStudentId = null;
        renderStudentsTable();
    }
}

async function resetStudentPassword(studentId) {
    if (isResettingPassword) return;

    clearResetPasswordErrors();

    const newPassword = qs("resetPassword").value.trim();
    const confirmNewPassword = qs("resetPasswordConfirm").value.trim();

    let valid = true;

    if (!newPassword) {
        qs("resetPasswordError").textContent = "La contraseña es obligatoria.";
        qs("resetPasswordError").classList.remove("hidden");
        valid = false;
    }

    if (!confirmNewPassword) {
        qs("resetPasswordConfirmError").textContent = "La confirmación es obligatoria.";
        qs("resetPasswordConfirmError").classList.remove("hidden");
        valid = false;
    }

    if (newPassword && confirmNewPassword && newPassword !== confirmNewPassword) {
        qs("resetPasswordConfirmError").textContent = "Las contraseñas no coinciden.";
        qs("resetPasswordConfirmError").classList.remove("hidden");
        valid = false;
    }

    if (!valid) return;

    try {
        isResettingPassword = true;
        resettingStudentId = studentId;
        openActionsMenuStudentId = null;

        const confirmBtn = qs("modalConfirmBtn");
        const cancelBtn = qs("modalCancelBtn");

        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        confirmBtn.textContent = "Guardando...";

        await post(`/api/admin/${company.slug}/students/${studentId}/reset-password`, {
            newPassword,
            confirmNewPassword
        });

        closeModal();
        renderStudentsTable();
    } catch (error) {
        console.error(error);
    } finally {
        isResettingPassword = false;
        resettingStudentId = null;
        renderStudentsTable();
    }
}

function handleSearchInput() {
    searchTerm = qs("studentsSearch").value;
    openActionsMenuStudentId = null;

    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    searchTimeout = setTimeout(async () => {
        await loadStudents();
    }, 350);
}

function registerGlobalMenuClose() {
    document.addEventListener("click", (event) => {
        if (!openActionsMenuStudentId) return;

        const table = qs("studentsTable");
        const mobileList = qs("studentsMobileList");

        const clickedInsideTable = table?.contains(event.target);
        const clickedInsideMobileList = mobileList?.contains(event.target);

        if (!clickedInsideTable && !clickedInsideMobileList) {
            openActionsMenuStudentId = null;
            renderStudentsTable();
        }
    });
}

async function init() {
    await loadConfig();
    requireAuth();

    const app = qs("app");

    app.innerHTML = renderAdminLayout({
        activeKey: "students",
        pageTitle: "Alumnos",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;
            editingStudentId = null;
            searchTerm = "";
            openActionsMenuStudentId = null;
            resetStudentForm();
            qs("studentsSearch").value = "";
            await loadStudents();
        }
    });

    company = layout.activeCompany;

    qs("studentForm").addEventListener("submit", saveStudent);
    qs("cancelStudentEditBtn").addEventListener("click", resetStudentForm);
    qs("studentsSearch").addEventListener("input", handleSearchInput);

    registerGlobalMenuClose();

    await loadStudents();
}

init();