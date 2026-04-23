import { get, post, put, del } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

let company = null;

let courses = [];
let teachers = [];
let availableStudents = [];

let editingCourseId = null;
let selectedCourseIdForStudents = null;

let isSavingCourse = false;
let isSavingStudents = false;
let activeToggleCourseId = null;
let deletingCourseId = null;

let isAssignmentEditMode = false;
let assignmentTargetCourseId = null;
let isUnassignedAssignMode = false;
let studentsMode = "unassigned";
let studentPage = 1;
const STUDENTS_PER_PAGE = 15;

function buildContent() {
    return `
        <section class="space-y-6">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Configuración</p>
                        <h1 class="mt-2 text-3xl font-bold">Cursos</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Creá cursos, asigná profesor y administrá alumnos por curso.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Cursos</p>
                            <p id="statCourses" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Activos</p>
                            <p id="statActiveCourses" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Profesores</p>
                            <p id="statTeachers" class="mt-2 text-2xl font-bold">0</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="space-y-6">
                <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="mb-5">
                        <h2 id="courseFormTitle" class="text-lg font-semibold text-slate-900">Crear curso</h2>
                        <p class="mt-1 text-sm text-slate-500">
                            Cargá el curso y asignale un profesor.
                        </p>
                    </div>

                    <form id="courseForm" class="space-y-4">
                        <div>
                            <label for="courseName" class="mb-1 block text-sm font-medium text-slate-700">
                                Nombre
                            </label>
                            <input
                                id="courseName"
                                type="text"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Ej: Categoría 2012"
                            />
                            <p id="courseNameError" class="mt-1 hidden text-sm text-rose-600"></p>
                        </div>

                        <div>
                            <label for="courseDescription" class="mb-1 block text-sm font-medium text-slate-700">
                                Descripción
                            </label>
                            <textarea
                                id="courseDescription"
                                rows="4"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Ej: Turno tarde"
                            ></textarea>
                        </div>

                        <div>
                            <label for="courseTeacherId" class="mb-1 block text-sm font-medium text-slate-700">
                                Profesor
                            </label>
                            <select
                                id="courseTeacherId"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                            ></select>
                            <p id="courseTeacherError" class="mt-1 hidden text-sm text-rose-600"></p>
                        </div>

                        <div class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                            <input id="courseIsActive" type="checkbox" checked class="h-4 w-4" />
                            <label for="courseIsActive" class="text-sm font-medium text-slate-700">
                                Curso activo
                            </label>
                        </div>

                        <div class="flex gap-3 pt-2">
                            <button
                                id="saveCourseBtn"
                                type="submit"
                                class="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Guardar
                            </button>

                            <button
                                id="cancelCourseEditBtn"
                                type="button"
                                class="hidden inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>

                <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="mb-5 flex items-center justify-between gap-4">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-900">Listado de cursos</h2>
                            <p class="mt-1 text-sm text-slate-500">
                                Administrá los cursos de la empresa activa.
                            </p>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm">
                            <thead>
                                <tr class="border-b border-slate-200 text-left text-slate-500">
                                    <th class="px-3 py-3 font-medium">Curso</th>
                                    <th class="px-3 py-3 font-medium">Profesor</th>
                                    <th class="px-3 py-3 font-medium">Estado</th>
                                    <th class="px-3 py-3 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="coursesTable"></tbody>
                        </table>
                    </div>

                    <div id="coursesEmptyState" class="hidden py-10 text-center">
                        <p class="text-sm text-slate-500">Todavía no hay cursos cargados.</p>
                    </div>
                </div>

                <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="mb-5 flex flex-col gap-4">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-900">Alumnos por curso</h2>
                            <p class="mt-1 text-sm text-slate-500">
                                Por defecto se muestran alumnos sin curso. Seleccioná un curso para ver sus alumnos y luego tocá editar para modificar asignaciones.
                            </p>
                        </div>

                        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                          <div class="w-full lg:max-w-sm">
    <label for="studentsCourseSelect" class="mb-1 block text-sm font-medium text-slate-700">
        Curso
    </label>
    <select
        id="studentsCourseSelect"
        class="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
    ></select>
</div>

<div class="flex flex-col gap-3 lg:items-end">
    <div class="hidden w-full lg:w-72" id="assignStudentsCourseWrap">
        <label for="assignStudentsCourseSelect" class="mb-1 block text-sm font-medium text-slate-700">
            Asignar al curso
        </label>
        <select
            id="assignStudentsCourseSelect"
            class="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
        ></select>
    </div>

    <div class="flex flex-wrap items-center gap-2">
        <button
            id="editStudentsBtn"
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
            Editar
        </button>

        <button
            id="cancelStudentsEditBtn"
            type="button"
            class="hidden inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
            Cancelar
        </button>

        <button
            id="saveStudentsBtn"
            type="button"
            class="hidden inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
            Guardar
        </button>
    </div>
</div>
                    </div>

                    <div class="overflow-x-auto rounded-2xl border border-slate-200">
                        <table class="min-w-full text-sm">
                            <thead>
                                <tr class="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                                    <th class="px-4 py-3 font-medium">Alumno</th>
                                    <th class="px-4 py-3 font-medium">Email</th>
                                    <th class="px-4 py-3 font-medium">Asignado</th>
                                    <th class="px-4 py-3 font-medium">Clases por semana</th>
                                </tr>
                            </thead>
                            <tbody id="studentsTable"></tbody>
                        </table>
                    </div>

                    <div id="studentsEmptyState" class="hidden py-8 text-center">
                        <p class="text-sm text-slate-500">No hay alumnos para mostrar.</p>
                    </div>

                    <div id="studentsPagination" class="mt-5 hidden items-center justify-between gap-3">
                        <p id="studentsPaginationInfo" class="text-sm text-slate-500"></p>

                        <div class="flex items-center gap-2">
                            <button
                                id="studentsPrevBtn"
                                type="button"
                                class="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Anterior
                            </button>

                            <span id="studentsPageIndicator" class="text-sm font-medium text-slate-700"></span>

                            <button
                                id="studentsNextBtn"
                                type="button"
                                class="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </section>
            </section>
        </section>

        <div id="coursesModalRoot"></div>
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

function clearCourseErrors() {
    qs("courseNameError").classList.add("hidden");
    qs("courseNameError").textContent = "";

    qs("courseTeacherError").classList.add("hidden");
    qs("courseTeacherError").textContent = "";
}

function showCourseError(id, message) {
    const el = qs(id);
    el.textContent = message;
    el.classList.remove("hidden");
}

function validateCourseForm() {
    clearCourseErrors();

    let valid = true;

    if (!qs("courseName").value.trim()) {
        showCourseError("courseNameError", "El nombre es obligatorio.");
        valid = false;
    }

    if (!qs("courseTeacherId").value) {
        showCourseError("courseTeacherError", "Seleccioná un profesor.");
        valid = false;
    }

    return valid;
}

function setCourseFormLoading(loading) {
    isSavingCourse = loading;

    qs("courseName").disabled = loading;
    qs("courseDescription").disabled = loading;
    qs("courseTeacherId").disabled = loading;
    qs("courseIsActive").disabled = loading;
    qs("cancelCourseEditBtn").disabled = loading;
    qs("saveCourseBtn").disabled = loading;

    qs("saveCourseBtn").textContent = loading
        ? (editingCourseId ? "Guardando..." : "Creando...")
        : (editingCourseId ? "Guardar cambios" : "Guardar");
}

function setStudentsLoading(loading) {
    isSavingStudents = loading;

    qs("studentsCourseSelect").disabled = loading;
    qs("editStudentsBtn").disabled = loading;
    qs("cancelStudentsEditBtn").disabled = loading;
    qs("saveStudentsBtn").disabled = loading;
    qs("studentsPrevBtn").disabled = loading;
    qs("studentsNextBtn").disabled = loading;

    qs("saveStudentsBtn").textContent = loading ? "Guardando..." : "Guardar alumnos";

    document.querySelectorAll(".student-check").forEach(x => {
        x.disabled = loading || !isAssignmentEditMode;
    });

    document.querySelectorAll(".student-classes").forEach(x => {
        x.disabled = loading || !isAssignmentEditMode;
    });
}

function resetCourseForm() {
    editingCourseId = null;

    qs("courseFormTitle").textContent = "Crear curso";
    qs("courseForm").reset();
    qs("courseIsActive").checked = true;
    qs("saveCourseBtn").textContent = "Guardar";
    qs("cancelCourseEditBtn").classList.add("hidden");

    if (teachers.length > 0) {
        qs("courseTeacherId").value = "";
    }

    clearCourseErrors();
}

function resetStudentEditingState() {
    isAssignmentEditMode = false;
    studentPage = 1;
    updateStudentsActionButtons();
}

function renderStats() {
    qs("statCourses").textContent = String(courses.length);
    qs("statActiveCourses").textContent = String(courses.filter(x => x.isActive).length);
    qs("statTeachers").textContent = String(teachers.length);
}

function renderTeacherOptions() {
    const select = qs("courseTeacherId");

    if (!teachers.length) {
        select.innerHTML = `<option value="">No hay profesores disponibles</option>`;
        return;
    }

    select.innerHTML = `
        <option value="">Seleccionar profesor</option>
        ${teachers.map(t => `
            <option value="${t.teacherId}">${escapeHtml(t.fullName)}</option>
        `).join("")}
    `;
}

function renderCoursesTable() {
    const tbody = qs("coursesTable");
    const emptyState = qs("coursesEmptyState");

    if (!courses.length) {
        tbody.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    tbody.innerHTML = courses.map(course => `
        <tr class="border-b border-slate-100">
            <td class="px-3 py-4">
                <div class="font-medium text-slate-900">${escapeHtml(course.name)}</div>
                <div class="mt-1 text-xs text-slate-500">${escapeHtml(course.description || "")}</div>
            </td>

            <td class="px-3 py-4 text-slate-700">
                ${escapeHtml(course.teacherName || "-")}
            </td>

            <td class="px-3 py-4">
                ${course.isActive
                    ? `<span class="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Activo</span>`
                    : `<span class="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">Inactivo</span>`
                }
            </td>

            <td class="px-3 py-4">
                <div class="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        data-id="${course.id}"
                        class="edit-course-btn rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        data-id="${course.id}"
                        class="toggle-course-btn rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        ${activeToggleCourseId === course.id ? "disabled" : ""}
                    >
                        ${activeToggleCourseId === course.id
                            ? "Guardando..."
                            : (course.isActive ? "Desactivar" : "Activar")}
                    </button>

                    <button
                        type="button"
                        data-id="${course.id}"
                        class="delete-course-btn rounded-2xl border border-rose-300 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        ${deletingCourseId === course.id ? "disabled" : ""}
                    >
                        ${deletingCourseId === course.id ? "Eliminando..." : "Eliminar"}
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".edit-course-btn").forEach(btn => {
        btn.addEventListener("click", () => openEditCourse(btn.dataset.id));
    });

    tbody.querySelectorAll(".toggle-course-btn").forEach(btn => {
        btn.addEventListener("click", () => openToggleModal(btn.dataset.id));
    });

    tbody.querySelectorAll(".delete-course-btn").forEach(btn => {
        btn.addEventListener("click", () => openDeleteModal(btn.dataset.id));
    });
}

function renderCoursesSelect() {
    const select = qs("studentsCourseSelect");
    const assignSelect = qs("assignStudentsCourseSelect");

    if (!courses.length) {
        selectedCourseIdForStudents = null;
        assignmentTargetCourseId = null;

        select.innerHTML = `<option value="">No hay cursos disponibles</option>`;

        if (assignSelect) {
            assignSelect.innerHTML = `<option value="">No hay cursos disponibles</option>`;
        }
        return;
    }

    const orderedCourses = [...courses].sort((a, b) => {
        if (a.isActive === b.isActive) {
            return (a.name || "").localeCompare(b.name || "");
        }

        return a.isActive ? -1 : 1;
    });

    select.innerHTML = `
        <option value="">Sin curso seleccionado</option>
        ${orderedCourses.map(course => `
            <option value="${course.id}" ${selectedCourseIdForStudents === course.id ? "selected" : ""}>
                ${escapeHtml(course.name)}${course.isActive ? "" : " (Inactivo)"}
            </option>
        `).join("")}
    `;

    if (assignSelect) {
        assignSelect.innerHTML = `
            <option value="">Seleccionar curso</option>
            ${orderedCourses.map(course => `
                <option value="${course.id}" ${assignmentTargetCourseId === course.id ? "selected" : ""}>
                    ${escapeHtml(course.name)}${course.isActive ? "" : " (Inactivo)"}
                </option>
            `).join("")}
        `;
    }
}

function getFilteredStudents() {
    if (!selectedCourseIdForStudents) {
        return availableStudents.filter(student => !student.isAssigned);
    }

    if (isAssignmentEditMode) {
        return availableStudents;
    }

    return availableStudents.filter(student => student.isAssigned);
}
function getPagedStudents() {
    const filtered = getFilteredStudents();
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / STUDENTS_PER_PAGE));

    if (studentPage > totalPages) {
        studentPage = totalPages;
    }

    const start = (studentPage - 1) * STUDENTS_PER_PAGE;
    const end = start + STUDENTS_PER_PAGE;

    return {
        items: filtered.slice(start, end),
        total,
        totalPages,
        start,
        end: Math.min(end, total)
    };
}

function renderStudentsPagination() {
    const wrap = qs("studentsPagination");
    const info = qs("studentsPaginationInfo");
    const indicator = qs("studentsPageIndicator");
    const prevBtn = qs("studentsPrevBtn");
    const nextBtn = qs("studentsNextBtn");

    const { total, totalPages, start, end } = getPagedStudents();

    if (!total) {
        wrap.classList.add("hidden");
        wrap.classList.remove("flex");
        return;
    }

    wrap.classList.remove("hidden");
    wrap.classList.add("flex");

    info.textContent = `Mostrando ${start + 1}-${end} de ${total} alumnos`;
    indicator.textContent = `Página ${studentPage} de ${totalPages}`;

    prevBtn.disabled = studentPage <= 1 || isSavingStudents;
    nextBtn.disabled = studentPage >= totalPages || isSavingStudents;
}

function updateStudentsActionButtons() {
    const saveBtn = qs("saveStudentsBtn");
    const cancelBtn = qs("cancelStudentsEditBtn");
    const editBtn = qs("editStudentsBtn");
    const assignWrap = qs("assignStudentsCourseWrap");

    if (isAssignmentEditMode) {
        saveBtn.classList.remove("hidden");
        cancelBtn.classList.remove("hidden");
        editBtn.classList.add("hidden");
    } else {
        saveBtn.classList.add("hidden");
        cancelBtn.classList.add("hidden");
        editBtn.classList.remove("hidden");
    }

    if (!selectedCourseIdForStudents) {
        editBtn.textContent = "Asignar alumnos";
        editBtn.disabled = availableStudents.filter(x => !x.isAssigned).length === 0;
        assignWrap.classList.toggle("hidden", !isUnassignedAssignMode);
        saveBtn.textContent = "Guardar asignación";
    } else {
        editBtn.textContent = "Editar";
        editBtn.disabled = false;
        assignWrap.classList.add("hidden");
        saveBtn.textContent = "Guardar alumnos";
    }
}

function renderStudentsTable() {
    const tbody = qs("studentsTable");
    const emptyState = qs("studentsEmptyState");

    const { items } = getPagedStudents();

    if (!items.length) {
        tbody.innerHTML = "";
        emptyState.classList.remove("hidden");

        if (!selectedCourseIdForStudents) {
            emptyState.innerHTML = `
                <p class="text-sm text-slate-500">
                    No hay alumnos sin curso para mostrar.
                </p>
            `;
        } else {
            emptyState.innerHTML = `
                <p class="text-sm text-slate-500">
                    No hay alumnos disponibles para este curso.
                </p>
            `;
        }

        renderStudentsPagination();
        updateStudentsActionButtons();
        return;
    }

    emptyState.classList.add("hidden");

    tbody.innerHTML = items.map(student => {
        const rowAssigned = !!student.isAssigned;

        return `
            <tr class="border-b border-slate-100">
                <td class="px-4 py-4">
                    <label class="flex items-center gap-3">
                        <input
                            type="checkbox"
                            class="student-check h-4 w-4 ${!isAssignmentEditMode ? "cursor-not-allowed opacity-70" : ""}"
                            data-id="${student.studentId}"
                            ${rowAssigned ? "checked" : ""}
                            ${!isAssignmentEditMode ? "disabled" : ""}
                        />
                        <span class="font-medium text-slate-900">${escapeHtml(student.fullName)}</span>
                    </label>
                </td>

                <td class="px-4 py-4 text-slate-600">
                    ${escapeHtml(student.email || "-")}
                </td>

                <td class="px-4 py-4">
                    ${rowAssigned
                        ? `<span class="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Sí</span>`
                        : `<span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">No</span>`
                    }
                </td>

                <td class="px-4 py-4">
                    <input
                        type="number"
                        min="1"
                        class="student-classes w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400 ${!isAssignmentEditMode ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}"
                        data-id="${student.studentId}"
                        value="${student.classesPerWeek || 1}"
                        ${!isAssignmentEditMode ? "disabled" : ""}
                    />
                </td>
            </tr>
        `;
    }).join("");

    renderStudentsPagination();
    updateStudentsActionButtons();
}

function setModal(html) {
    qs("coursesModalRoot").innerHTML = html;
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

function openEditCourse(courseId) {
    const course = courses.find(x => x.id === courseId);
    if (!course) return;

    editingCourseId = courseId;

    qs("courseFormTitle").textContent = "Editar curso";
    qs("courseName").value = course.name || "";
    qs("courseDescription").value = course.description || "";
    qs("courseTeacherId").value = course.teacherId || "";
    qs("courseIsActive").checked = !!course.isActive;
    qs("cancelCourseEditBtn").classList.remove("hidden");

    clearCourseErrors();
    window.scrollTo({ top: 0, behavior: "smooth" });
    qs("courseName").focus();
}

function openToggleModal(courseId) {
    const course = courses.find(x => x.id === courseId);
    if (!course) return;

    const nextActive = !course.isActive;

    buildConfirmModal({
        title: nextActive ? "Activar curso" : "Desactivar curso",
        description: nextActive
            ? `Vas a activar el curso "${course.name}".`
            : `Vas a desactivar el curso "${course.name}".`,
        confirmText: nextActive ? "Activar" : "Desactivar",
        confirmClass: nextActive ? "bg-slate-900 hover:bg-slate-800" : "bg-amber-600 hover:bg-amber-700",
        onConfirm: async () => {
            closeModal();
            await toggleCourse(courseId, nextActive);
        }
    });
}

function openDeleteModal(courseId) {
    const course = courses.find(x => x.id === courseId);
    if (!course) return;

    buildConfirmModal({
        title: "Eliminar curso",
        description: `Vas a eliminar el curso "${course.name}". Esta acción no se puede deshacer.`,
        confirmText: "Eliminar",
        confirmClass: "bg-rose-600 hover:bg-rose-700",
        onConfirm: async () => {
            closeModal();
            await deleteCourse(courseId);
        }
    });
}

async function loadTeachers() {
    teachers = await get(`/api/admin/${company.slug}/courses/teachers/options`);
    renderTeacherOptions();
    renderStats();
}

async function loadCourses() {
    courses = await get(`/api/admin/${company.slug}/courses`);
    renderCoursesTable();
    renderCoursesSelect();
    renderStats();

    if (selectedCourseIdForStudents && !courses.some(x => x.id === selectedCourseIdForStudents)) {
        selectedCourseIdForStudents = null;
    }

    await loadAvailableStudents();
}

async function loadAvailableStudents() {
    if (selectedCourseIdForStudents) {
        availableStudents = await get(`/api/admin/${company.slug}/courses/${selectedCourseIdForStudents}/available-students`);
    } else {
        availableStudents = await get(`/api/admin/${company.slug}/courses/unassigned-students`);
    }

    studentPage = 1;
    renderStudentsTable();
}

async function saveCourse(event) {
    event.preventDefault();

    if (isSavingCourse) return;
    if (!validateCourseForm()) return;

    const payload = {
        name: qs("courseName").value.trim(),
        description: qs("courseDescription").value.trim(),
        teacherId: qs("courseTeacherId").value,
        isActive: qs("courseIsActive").checked
    };

    try {
        setCourseFormLoading(true);

        if (editingCourseId) {
            await put(`/api/admin/${company.slug}/courses/${editingCourseId}`, payload);
        } else {
            await post(`/api/admin/${company.slug}/courses`, payload);
        }

        resetCourseForm();
        await loadCourses();
    } catch (error) {
        console.error(error);
    } finally {
        setCourseFormLoading(false);
    }
}

async function toggleCourse(courseId, isActive) {
    try {
        activeToggleCourseId = courseId;
        renderCoursesTable();

        const course = courses.find(x => x.id === courseId);
        if (!course) return;

        await put(`/api/admin/${company.slug}/courses/${courseId}`, {
            name: course.name,
            description: course.description || "",
            teacherId: course.teacherId,
            isActive
        });

        course.isActive = isActive;

        renderCoursesTable();
        renderCoursesSelect();
        renderStats();
    } catch (error) {
        console.error(error);
        await loadCourses();
    } finally {
        activeToggleCourseId = null;
        renderCoursesTable();
    }
}

async function deleteCourse(courseId) {
    try {
        deletingCourseId = courseId;
        renderCoursesTable();

        await del(`/api/admin/${company.slug}/courses/${courseId}`);

        if (editingCourseId === courseId) {
            resetCourseForm();
        }

        if (selectedCourseIdForStudents === courseId) {
            selectedCourseIdForStudents = null;
            resetStudentEditingState();
        }

        courses = courses.filter(x => x.id !== courseId);
        renderCoursesTable();
        renderCoursesSelect();
        renderStats();

        await loadAvailableStudents();
    } catch (error) {
        console.error(error);
        await loadCourses();
    } finally {
        deletingCourseId = null;
        renderCoursesTable();
    }
}

async function saveStudents() {
    if (isSavingStudents) return;
    if (!isAssignmentEditMode) return;

    let targetCourseId = selectedCourseIdForStudents;

    if (!targetCourseId) {
        targetCourseId = qs("assignStudentsCourseSelect").value || null;
    }

    if (!targetCourseId) {
        return;
    }

    const students = [];

    document.querySelectorAll(".student-check").forEach(check => {
        if (!check.checked) return;

        const studentId = check.dataset.id;
        const classesInput = document.querySelector(`.student-classes[data-id="${studentId}"]`);
        const classesPerWeek = Number(classesInput?.value || 0);

        if (classesPerWeek > 0) {
            students.push({
                studentId,
                classesPerWeek
            });
        }
    });

    try {
        setStudentsLoading(true);

        const url = studentsMode === "unassigned"
            ? `/api/admin/${company.slug}/courses/${targetCourseId}/students/add`
            : `/api/admin/${company.slug}/courses/${targetCourseId}/students`;
        await post(url, {
            students
        });

        assignmentTargetCourseId = null;
        isUnassignedAssignMode = false;
        selectedCourseIdForStudents = null;
        studentsMode = "unassigned";
        renderCoursesSelect();
        resetStudentEditingState();
        await loadAvailableStudents();
    } catch (error) {
        console.error(error);
    } finally {
        setStudentsLoading(false);
        renderStudentsTable();
    }
}

async function handleCourseSelectChange() {
    selectedCourseIdForStudents = qs("studentsCourseSelect").value || null;
    studentsMode = selectedCourseIdForStudents ? "course" : "unassigned";
    isUnassignedAssignMode = false;
    assignmentTargetCourseId = null;
    resetStudentEditingState();
    renderCoursesSelect();
    await loadAvailableStudents();
}

function handleAssignCourseChange() {
    assignmentTargetCourseId = qs("assignStudentsCourseSelect").value || null;
}

function handleEditStudents() {
    if (!selectedCourseIdForStudents) {
        studentsMode = "unassigned";
        isUnassignedAssignMode = true;
        isAssignmentEditMode = true;
        updateStudentsActionButtons();
        renderStudentsTable();
        return;
    }

    studentsMode = "course";
    isUnassignedAssignMode = false;
    isAssignmentEditMode = true;
    updateStudentsActionButtons();
    renderStudentsTable();
}
async function handleCancelStudentsEdit() {
    isUnassignedAssignMode = false;
    assignmentTargetCourseId = null;
    resetStudentEditingState();
    renderCoursesSelect();
    await loadAvailableStudents();
}

function goToPreviousStudentsPage() {
    if (studentPage <= 1) return;
    studentPage -= 1;
    renderStudentsTable();
}

function goToNextStudentsPage() {
    const { totalPages } = getPagedStudents();

    if (studentPage >= totalPages) return;
    studentPage += 1;
    renderStudentsTable();
}

async function init() {
    await loadConfig();
    requireAuth();

    const app = qs("app");

    app.innerHTML = renderAdminLayout({
        activeKey: "courses",
        pageTitle: "Cursos",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;
            editingCourseId = null;
            selectedCourseIdForStudents = null;
            resetCourseForm();
            resetStudentEditingState();
            await loadTeachers();
            await loadCourses();
        }
    });

    company = layout.activeCompany;

    qs("courseForm").addEventListener("submit", saveCourse);
    qs("cancelCourseEditBtn").addEventListener("click", resetCourseForm);
qs("assignStudentsCourseSelect").addEventListener("change", handleAssignCourseChange);
    qs("studentsCourseSelect").addEventListener("change", handleCourseSelectChange);
    qs("editStudentsBtn").addEventListener("click", handleEditStudents);
    qs("cancelStudentsEditBtn").addEventListener("click", handleCancelStudentsEdit);
    qs("saveStudentsBtn").addEventListener("click", saveStudents);

    qs("studentsPrevBtn").addEventListener("click", goToPreviousStudentsPage);
    qs("studentsNextBtn").addEventListener("click", goToNextStudentsPage);

    await loadTeachers();
    await loadCourses();
    updateStudentsActionButtons();
    renderStudentsPagination();
}

init();