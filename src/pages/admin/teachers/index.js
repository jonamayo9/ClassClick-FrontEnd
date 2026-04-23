import { get, post, put, del } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

let currentCompany = null;
let teachers = [];

let createForm;
let createBtn;
let createMessage;

let editForm;
let editBtn;
let editMessage;
let editId = null;

let resetId = null;
let deleteId = null;

function buildContent() {
  return `
    <section class="space-y-6">

      <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
        <h1 class="text-2xl font-bold">Profesores</h1>
        <p class="text-sm text-slate-300">
          Administrá los profesores de la escuelita
        </p>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm w-full">
        <h2 class="text-lg font-semibold mb-4">Crear profesor</h2>

        <div id="createTeacherMessage" class="hidden rounded-2xl border px-4 py-3 text-sm mb-4"></div>

        <form id="createTeacherForm" class="space-y-4 w-full">
          <div class="grid gap-4 grid-cols-1 md:grid-cols-2">
            <input id="c_firstName" required class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500" placeholder="Nombre" />
            <input id="c_lastName" required class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500" placeholder="Apellido" />
          </div>

          <input id="c_email" required type="email" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500" placeholder="Email" />

          <input id="c_password" required type="password" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500" placeholder="Contraseña" />

          <button
            id="createTeacherBtn"
            type="submit"
            class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            Crear profesor
          </button>
        </form>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm w-full">
        <h2 class="text-lg font-semibold mb-4">Listado de profesores</h2>

        <div class="overflow-hidden rounded-2xl border border-slate-200">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Profesor</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Email</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Estado</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody id="teachersTable" class="divide-y divide-slate-100 bg-white">
              <tr>
                <td colspan="4" class="px-4 py-6 text-center text-sm text-slate-400">
                  Cargando...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- EDIT MODAL -->
      <div id="editModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/40 px-4">
        <div class="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">Editar profesor</h3>
              <p class="text-sm text-slate-500 mt-1">Actualizá los datos del profesor.</p>
            </div>

            <button
              type="button"
              onclick="closeEditModal()"
              class="rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>

          <div id="editTeacherMessage" class="hidden rounded-2xl border px-4 py-3 text-sm mt-4"></div>

          <form id="editTeacherForm" class="space-y-4 mt-4">
            <div class="grid gap-3 md:grid-cols-2">
              <input id="e_firstName" required class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500" placeholder="Nombre" />
              <input id="e_lastName" required class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500" placeholder="Apellido" />
            </div>

            <input id="e_email" required type="email" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500" placeholder="Email" />

            <div class="flex gap-3">
              <button
                id="editTeacherBtn"
                type="submit"
                class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                Guardar cambios
              </button>

              <button
                type="button"
                onclick="closeEditModal()"
                class="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- RESET MODAL -->
      <div id="resetModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/40 px-4">
        <div class="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">Resetear contraseña</h3>
              <p class="text-sm text-slate-500 mt-1">Ingresá y confirmá la nueva contraseña.</p>
            </div>

            <button
              type="button"
              onclick="closeResetModal()"
              class="rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>

          <div id="resetTeacherMessage" class="hidden rounded-2xl border px-4 py-3 text-sm mt-4"></div>

          <div class="space-y-4 mt-4">
            <input
              id="resetPassInput"
              type="password"
              class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500"
              placeholder="Nueva contraseña"
            />

            <input
              id="resetPassConfirmInput"
              type="password"
              class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500"
              placeholder="Confirmar nueva contraseña"
            />

            <div class="flex gap-3">
              <button
                id="resetTeacherBtn"
                type="button"
                onclick="confirmReset()"
                class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                Guardar
              </button>

              <button
                type="button"
                onclick="closeResetModal()"
                class="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- DELETE MODAL -->
      <div id="deleteModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/40 px-4">
        <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-semibold text-slate-900">Eliminar profesor</h3>
          <p class="text-sm text-slate-500 mt-2">
            Esta acción no se puede deshacer.
          </p>

          <div id="deleteTeacherMessage" class="hidden rounded-2xl border px-4 py-3 text-sm mt-4"></div>

          <div class="flex gap-3 mt-5">
            <button
              type="button"
              onclick="closeDeleteModal()"
              class="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>

            <button
              id="deleteTeacherBtn"
              type="button"
              onclick="confirmDelete()"
              class="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function setMessage(el, text, type = "error") {
  if (!el) return;
  el.className = "rounded-2xl border px-4 py-3 text-sm";
  if (type === "success") {
    el.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-700");
  } else {
    el.classList.add("border-red-200", "bg-red-50", "text-red-700");
  }
  el.textContent = text;
  el.classList.remove("hidden");
}

function clearMessage(el) {
  if (!el) return;
  el.textContent = "";
  el.className = "hidden rounded-2xl border px-4 py-3 text-sm";
}

function setButtonLoading(button, isLoading, loadingText, normalText) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : normalText;
}

function renderTeachers() {
  const table = document.getElementById("teachersTable");

  if (!teachers.length) {
    table.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-8 text-center text-sm text-slate-400">
          No hay profesores cargados
        </td>
      </tr>
    `;
    return;
  }

  table.innerHTML = teachers.map((t) => `
    <tr>
      <td class="px-4 py-3">
        <div class="font-medium text-slate-900">${t.firstName} ${t.lastName}</div>
        <div class="text-xs text-slate-400">ID ${t.id.slice(0, 8)}</div>
      </td>

      <td class="px-4 py-3 text-sm text-slate-600">
        ${t.email}
      </td>

      <td class="px-4 py-3">
        <span class="
          inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold
          ${t.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}
        ">
          ${t.isActive ? "Activo" : "Inactivo"}
        </span>
      </td>

      <td class="px-4 py-3 text-right">
        <div class="flex flex-wrap justify-end gap-2">
          <button
            class="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onclick="openEditModal('${t.id}')"
          >
            Editar
          </button>

          <button
            class="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onclick="openResetModal('${t.id}')"
          >
            Resetear contraseña
          </button>

          <button
            class="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onclick="toggleTeacher('${t.id}')"
          >
            ${t.isActive ? "Desactivar" : "Activar"}
          </button>

          <button
            class="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
            onclick="openDeleteModal('${t.id}')"
          >
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadTeachers() {
  teachers = await get(`/api/admin/${currentCompany.slug}/teachers`);
  renderTeachers();
}

async function createTeacher(e) {
  e.preventDefault();

  const message = document.getElementById("createTeacherMessage");
  clearMessage(message);

  const firstName = document.getElementById("c_firstName").value.trim();
  const lastName = document.getElementById("c_lastName").value.trim();
  const email = document.getElementById("c_email").value.trim();
  const password = document.getElementById("c_password").value;

  try {
    setButtonLoading(createBtn, true, "Guardando...", "Crear profesor");

    await post(`/api/admin/${currentCompany.slug}/teachers`, {
      firstName,
      lastName,
      email,
      password
    });

    createForm.reset();
    setMessage(message, "Profesor creado correctamente.", "success");
    await loadTeachers();
  } catch (error) {
    setMessage(message, error.message || "No se pudo crear el profesor.");
  } finally {
    setButtonLoading(createBtn, false, "Guardando...", "Crear profesor");
  }
}

function openEditModal(id) {
  const teacher = teachers.find((x) => x.id === id);
  if (!teacher) return;

  editId = id;

  document.getElementById("e_firstName").value = teacher.firstName;
  document.getElementById("e_lastName").value = teacher.lastName;
  document.getElementById("e_email").value = teacher.email;

  clearMessage(editMessage);
  document.getElementById("editModal").classList.remove("hidden");
  document.getElementById("editModal").classList.add("flex");
}

function closeEditModal() {
  editId = null;
  clearMessage(editMessage);
  document.getElementById("editModal").classList.add("hidden");
  document.getElementById("editModal").classList.remove("flex");
}

async function saveEdit(e) {
  e.preventDefault();

  clearMessage(editMessage);

  const firstName = document.getElementById("e_firstName").value.trim();
  const lastName = document.getElementById("e_lastName").value.trim();
  const email = document.getElementById("e_email").value.trim();

  try {
    setButtonLoading(editBtn, true, "Guardando...", "Guardar cambios");

    await put(`/api/admin/${currentCompany.slug}/teachers/${editId}`, {
      firstName,
      lastName,
      email
    });

    closeEditModal();
    await loadTeachers();
  } catch (error) {
    setMessage(editMessage, error.message || "No se pudo guardar el profesor.");
  } finally {
    setButtonLoading(editBtn, false, "Guardando...", "Guardar cambios");
  }
}

function openResetModal(id) {
  resetId = id;
  document.getElementById("resetPassInput").value = "";
  document.getElementById("resetPassConfirmInput").value = "";
  clearMessage(document.getElementById("resetTeacherMessage"));
  document.getElementById("resetModal").classList.remove("hidden");
  document.getElementById("resetModal").classList.add("flex");
}

function closeResetModal() {
  resetId = null;
  document.getElementById("resetPassInput").value = "";
  document.getElementById("resetPassConfirmInput").value = "";
  clearMessage(document.getElementById("resetTeacherMessage"));
  document.getElementById("resetModal").classList.add("hidden");
  document.getElementById("resetModal").classList.remove("flex");
}

async function confirmReset() {
  const button = document.getElementById("resetTeacherBtn");
  const message = document.getElementById("resetTeacherMessage");
  const newPassword = document.getElementById("resetPassInput").value;
  const confirmNewPassword = document.getElementById("resetPassConfirmInput").value;

  clearMessage(message);

  if (!newPassword.trim()) {
    setMessage(message, "La nueva contraseña es requerida.");
    return;
  }

  if (!confirmNewPassword.trim()) {
    setMessage(message, "Debés confirmar la nueva contraseña.");
    return;
  }

  if (newPassword !== confirmNewPassword) {
    setMessage(message, "Las contraseñas no coinciden.");
    return;
  }

  try {
    setButtonLoading(button, true, "Guardando...", "Guardar");

    await put(`/api/admin/${currentCompany.slug}/teachers/${resetId}/reset-password`, {
      newPassword,
      confirmNewPassword
    });

    closeResetModal();
  } catch (error) {
    setMessage(message, error.message || "No se pudo resetear la contraseña.");
  } finally {
    setButtonLoading(button, false, "Guardando...", "Guardar");
  }
}

function openDeleteModal(id) {
  deleteId = id;
  clearMessage(document.getElementById("deleteTeacherMessage"));
  document.getElementById("deleteModal").classList.remove("hidden");
  document.getElementById("deleteModal").classList.add("flex");
}

function closeDeleteModal() {
  deleteId = null;
  clearMessage(document.getElementById("deleteTeacherMessage"));
  document.getElementById("deleteModal").classList.add("hidden");
  document.getElementById("deleteModal").classList.remove("flex");
}

async function confirmDelete() {
  const button = document.getElementById("deleteTeacherBtn");
  const message = document.getElementById("deleteTeacherMessage");

  clearMessage(message);

  try {
    setButtonLoading(button, true, "Eliminando...", "Eliminar");

    await del(`/api/admin/${currentCompany.slug}/teachers/${deleteId}`);

    closeDeleteModal();
    await loadTeachers();
  } catch (error) {
    setMessage(message, error.message || "No se pudo eliminar el profesor.");
  } finally {
    setButtonLoading(button, false, "Eliminando...", "Eliminar");
  }
}

async function toggleTeacher(id) {
  await put(`/api/admin/${currentCompany.slug}/teachers/${id}/toggle-active`);
  await loadTeachers();
}

function bindEvents() {
  createForm = document.getElementById("createTeacherForm");
  createBtn = document.getElementById("createTeacherBtn");
  createMessage = document.getElementById("createTeacherMessage");

  editForm = document.getElementById("editTeacherForm");
  editBtn = document.getElementById("editTeacherBtn");
  editMessage = document.getElementById("editTeacherMessage");

  createForm.addEventListener("submit", createTeacher);
  editForm.addEventListener("submit", saveEdit);
}

async function init() {
  await loadConfig();
  requireAuth();

  const app = document.getElementById("app");

  app.innerHTML = renderAdminLayout({
    activeKey: "teachers",
    pageTitle: "Profesores",
    contentHtml: buildContent()
  });

  const layout = await setupAdminLayout({
    onCompanyChanged: async (company) => {
      currentCompany = company;
      await loadTeachers();
    }
  });

  currentCompany = layout.activeCompany;

  bindEvents();
  await loadTeachers();
}

window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.openResetModal = openResetModal;
window.closeResetModal = closeResetModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.confirmReset = confirmReset;
window.toggleTeacher = toggleTeacher;

init();