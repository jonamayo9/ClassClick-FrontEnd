import { get, post } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { getUser } from "../../../shared/js/storage.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

const PAGE_SIZE = 20;
const DOCUMENT_REQUEST_SCOPE_INDIVIDUAL = 1;

let allCourses = [];
let allDocumentTypes = [];
let activeCompany = null;
let allStudents = [];
let filteredStudents = [];
let currentPage = 1;
let searchFilter = "";
let courseFilter = "";
let statusFilter = "";
let documentStatusFilter = "";
let isSubmittingRequest = false;
let selectedStudentIds = new Set();

let selectedStudentDetailId = null;
let selectedStudentDetail = null;
let isLoadingStudentDetail = false;

let previewFile = null;
let reviewAction = null;
let reviewAssignmentId = null;
let reviewDocumentName = "";

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
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function normalizeStatus(status) {
  if (status === 1 || status === "1") return "Pending";
  if (status === 2 || status === "2") return "Submitted";
  if (status === 3 || status === "3") return "Approved";
  if (status === 4 || status === "4") return "Rejected";
  if (status === 5 || status === "5") return "Expired";

  return String(status || "");
}

function getStatusLabel(status) {
  const normalized = normalizeStatus(status);

  switch (normalized) {
    case "Pending": return "Pendiente";
    case "Submitted": return "En revisión";
    case "Approved": return "Aprobado";
    case "Rejected": return "Rechazado";
    case "Expired": return "Vencido";
    default: return normalized || "Sin estado";
  }
}

function getStatusBadge(status) {
  const normalized = normalizeStatus(status);

  const map = {
    Pending: "bg-amber-100 text-amber-700",
    Submitted: "bg-blue-100 text-blue-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-rose-100 text-rose-700",
    Expired: "bg-slate-200 text-slate-700"
  };

  return `
    <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${map[normalized] || "bg-slate-100 text-slate-700"}">
      ${escapeHtml(getStatusLabel(normalized))}
    </span>
  `;
}

function buildStudentInitials(firstName, lastName) {
  const initials = `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.trim().toUpperCase();
  return initials || "AL";
}



function buildDetailAvatar(detail) {
  const fullName = detail?.fullName || "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map(x => x.charAt(0).toUpperCase()).join("") || "AL";

  if (!detail?.profileImageUrl) {
    return `
      <div class="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-sm font-bold text-slate-700">
        ${escapeHtml(initials)}
      </div>
    `;
  }

  return `
    <div class="h-14 w-14 overflow-hidden rounded-3xl bg-slate-100">
      <img
        src="${escapeHtml(detail.profileImageUrl)}"
        alt="${escapeHtml(fullName)}"
        class="h-full w-full object-cover"
        onerror="this.remove(); this.parentElement.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center text-sm font-bold text-slate-700&quot;>${escapeHtml(initials)}</div>';"
      />
    </div>
  `;
}

function buildStudentDocumentSummary(student) {
  const total =
    Number(student.pendingCount || 0) +
    Number(student.submittedCount || 0) +
    Number(student.approvedCount || 0) +
    Number(student.rejectedCount || 0) +
    Number(student.expiredCount || 0);

  if (!total) {
    return `<span class="text-sm text-slate-500">Sin documentos</span>`;
  }

  return `
    <div class="flex flex-wrap gap-2">
      ${student.pendingCount ? `<span class="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">${student.pendingCount} pend.</span>` : ""}
      ${student.submittedCount ? `<span class="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">${student.submittedCount} rev.</span>` : ""}
      ${student.approvedCount ? `<span class="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">${student.approvedCount} aprob.</span>` : ""}
      ${student.rejectedCount ? `<span class="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">${student.rejectedCount} rech.</span>` : ""}
      ${student.expiredCount ? `<span class="inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">${student.expiredCount} venc.</span>` : ""}
    </div>
  `;
}

function canPreviewFile(mimeType) {
  const type = String(mimeType || "").toLowerCase();
  return type.startsWith("image/") || type === "application/pdf";
}

function isImageFile(mimeType) {
  return String(mimeType || "").toLowerCase().startsWith("image/");
}

function isPdfFile(mimeType) {
  return String(mimeType || "").toLowerCase() === "application/pdf";
}

function buildContent() {
  return `
    <section class="space-y-6">
      <div class="flex justify-end">
        <button
          id="requestDocumentsButton"
          type="button"
          class="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Solicitar documentos
        </button>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
  <div>
    <label class="label" for="searchInput">Buscar</label>
    <input
      id="searchInput"
      type="text"
      class="input"
      placeholder="Nombre, apellido, email o DNI"
    />
  </div>

  <div>
    <label class="label" for="courseFilter">Curso</label>
    <select id="courseFilter" class="input">
      <option value="">Todos los cursos</option>
    </select>
  </div>

  <div>
    <label class="label" for="statusFilter">Alumno</label>
    <select id="statusFilter" class="input">
      <option value="">Todos</option>
      <option value="active">Activos</option>
      <option value="inactive">Inactivos</option>
    </select>
  </div>

  <div>
    <label class="label" for="documentStatusFilter">Documentación</label>
    <select id="documentStatusFilter" class="input">
      <option value="">Todos</option>
      <option value="pending">Pendientes</option>
      <option value="submitted">En revisión</option>
      <option value="approved">Aprobados</option>
      <option value="rejected">Rechazados</option>
      <option value="expired">Vencidos</option>
      <option value="none">Sin documentos</option>
    </select>
  </div>

  <div class="flex items-end">
    <button
      id="clearFiltersButton"
      type="button"
      class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      Limpiar filtros
    </button>
  </div>
</div>
      </div>

      <div id="toastContainer" class="fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-3"></div>

      <div id="loadingBox" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">Cargando alumnos...</p>
      </div>

      <div
        id="errorBox"
        class="hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      ></div>

      <div
        id="emptyBox"
        class="hidden rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center"
      >
        <h4 class="text-lg font-semibold text-slate-900">No hay alumnos para mostrar</h4>
        <p class="mt-2 text-sm text-slate-500">Probá cambiando los filtros.</p>
      </div>

      <div
        id="tableWrapper"
        class="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span id="selectionSummary">0 alumno(s) seleccionados</span>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  <input id="selectAllCheckbox" type="checkbox" />
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Alumno</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Email</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Curso</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Documentación</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Estado</th>
                <th class="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody id="tableBody" class="divide-y divide-slate-200 bg-white"></tbody>
          </table>
        </div>

        <div class="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p id="paginationText" class="text-sm text-slate-500">-</p>

          <div class="flex items-center gap-2">
            <button
              id="prevPageButton"
              type="button"
              class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Anterior
            </button>

            <button
              id="nextPageButton"
              type="button"
              class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </section>

    <div id="requestModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-slate-900/60"></div>

      <div class="absolute inset-0 overflow-y-auto p-4">
        <div class="mx-auto flex min-h-full max-w-2xl items-center justify-center">
          <div class="w-full rounded-3xl bg-white shadow-2xl">
            <div class="border-b border-slate-200 px-5 py-4">
              <h3 class="text-lg font-bold text-slate-900">Solicitar documentos</h3>
              <p class="mt-1 text-sm text-slate-500">
                Configurá el alcance y completá la solicitud.
              </p>
            </div>

            <form id="requestForm" class="space-y-4 p-5">
              <div>
                <label class="label" for="requestScopeInput">Alcance</label>
                <select id="requestScopeInput" class="input">
                  <option value="selected">Alumnos seleccionados</option>
                  <option value="all">Todos los alumnos</option>
                </select>
              </div>

              <div>
                <label class="label" for="documentTypeIdInput">Tipo documental</label>
                <select id="documentTypeIdInput" class="input" required>
                  <option value="">Seleccionar tipo documental</option>
                </select>
              </div>

              <div>
                <label class="label" for="requestNoteInput">Nota</label>
                <textarea
                  id="requestNoteInput"
                  class="input"
                  rows="3"
                  placeholder="Ej: subir frente y dorso del DNI"
                ></textarea>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="label" for="dueDateInput">Fecha límite</label>
                  <input id="dueDateInput" type="date" class="input" />
                </div>

                <div class="flex items-end">
                  <label class="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3">
                    <input id="isMandatoryInput" type="checkbox" checked />
                    <span class="text-sm font-medium text-slate-700">Obligatorio</span>
                  </label>
                </div>
              </div>

              <div class="rounded-2xl bg-slate-50 px-4 py-3">
                <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Alumnos seleccionados</p>
                <p id="selectedStudentsCountText" class="mt-1 text-sm font-semibold text-slate-900">0</p>
              </div>

              <div
                id="requestFormError"
                class="hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              ></div>

              <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  id="cancelRequestButton"
                  type="button"
                  class="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  id="submitRequestButton"
                  type="submit"
                  class="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Enviar solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <div id="detailDrawer" class="fixed inset-0 z-[55] hidden">
      <div id="detailDrawerOverlay" class="absolute inset-0 bg-slate-900/50"></div>

      <div class="absolute inset-y-0 right-0 flex w-full max-w-4xl">
        <div class="ml-auto flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">
          <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Legajo del alumno</h3>
              <p class="mt-1 text-sm text-slate-500">Revisá documentación, aprobá o rechazá archivos.</p>
            </div>

            <button
              id="closeDetailDrawerButton"
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-300 text-slate-700 transition hover:bg-slate-50"
            >
              ✕
            </button>
          </div>

          <div id="detailDrawerContent" class="flex-1 overflow-y-auto px-5 py-5">
            <p class="text-sm text-slate-500">Seleccioná un alumno para ver su legajo.</p>
          </div>
        </div>
      </div>
    </div>

    <div id="previewModal" class="fixed inset-0 z-[65] hidden">
      <div id="previewModalOverlay" class="absolute inset-0 bg-slate-900/70"></div>

      <div class="absolute inset-0 overflow-y-auto p-4">
        <div class="mx-auto flex min-h-full max-w-6xl items-center justify-center">
          <div class="w-full rounded-3xl bg-white shadow-2xl">
            <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 id="previewTitle" class="text-lg font-bold text-slate-900">Documento</h3>
                <p id="previewSubtitle" class="mt-1 text-sm text-slate-500">Vista previa</p>
              </div>

              <div class="flex items-center gap-2">
                <button
                  id="previewDownloadButton"
                  type="button"
                  class="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Descargar
                </button>

                <button
                  id="closePreviewModalButton"
                  type="button"
                  class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>
            </div>

            <div id="previewBody" class="p-5"></div>
          </div>
        </div>
      </div>
    </div>

    <div id="reviewModal" class="fixed inset-0 z-[66] hidden">
      <div id="reviewModalOverlay" class="absolute inset-0 bg-slate-900/60"></div>

      <div class="absolute inset-0 overflow-y-auto p-4">
        <div class="mx-auto flex min-h-full max-w-xl items-center justify-center">
          <div class="w-full rounded-3xl bg-white shadow-2xl">
            <div class="border-b border-slate-200 px-5 py-4">
              <h3 id="reviewModalTitle" class="text-lg font-bold text-slate-900">Revisar documento</h3>
              <p id="reviewModalSubtitle" class="mt-1 text-sm text-slate-500">Completá los datos de revisión.</p>
            </div>

            <form id="reviewForm" class="space-y-4 p-5">
              <div class="rounded-2xl bg-slate-50 px-4 py-3">
                <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Documento</p>
                <p id="reviewDocumentName" class="mt-1 text-sm font-semibold text-slate-900">-</p>
              </div>

              <div id="approvalExpirationWrap" class="hidden">
                <label class="label" for="approvalExpirationInput">Fecha de vencimiento</label>
                <input id="approvalExpirationInput" type="date" class="input" />
              </div>

              <div>
                <label class="label" for="reviewNoteInput">Observación</label>
                <textarea
                  id="reviewNoteInput"
                  class="input"
                  rows="4"
                  placeholder="Agregá una observación para el alumno"
                ></textarea>
              </div>

              <div
                id="reviewFormError"
                class="hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              ></div>

              <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  id="cancelReviewButton"
                  type="button"
                  class="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  id="submitReviewButton"
                  type="submit"
                  class="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
}

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const baseClass =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  const toast = document.createElement("div");
  toast.className = `rounded-2xl border px-4 py-3 text-sm shadow-lg ${baseClass}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function showError(message) {
  const errorBox = document.getElementById("errorBox");
  if (!errorBox) return;

  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  const errorBox = document.getElementById("errorBox");
  if (!errorBox) return;

  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function showLoading() {
  document.getElementById("loadingBox")?.classList.remove("hidden");
  document.getElementById("tableWrapper")?.classList.add("hidden");
  document.getElementById("emptyBox")?.classList.add("hidden");
}

function hideLoading() {
  document.getElementById("loadingBox")?.classList.add("hidden");
}

function showRequestFormError(message) {
  const box = document.getElementById("requestFormError");
  if (!box) return;

  box.textContent = message;
  box.classList.remove("hidden");
}

function hideRequestFormError() {
  const box = document.getElementById("requestFormError");
  if (!box) return;

  box.textContent = "";
  box.classList.add("hidden");
}

function showReviewFormError(message) {
  const box = document.getElementById("reviewFormError");
  if (!box) return;

  box.textContent = message;
  box.classList.remove("hidden");
}

function hideReviewFormError() {
  const box = document.getElementById("reviewFormError");
  if (!box) return;

  box.textContent = "";
  box.classList.add("hidden");
}

function getStudentStatusBadge(isActive) {
  if (isActive) {
    return `
      <span class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Activo
      </span>
    `;
  }

  return `
    <span class="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
      Inactivo
    </span>
  `;
}

function fillCourseFilter() {
  const select = document.getElementById("courseFilter");
  if (!select) return;

  select.innerHTML = `
    <option value="">Todos los cursos</option>
    ${allCourses.map(course => `
      <option value="${escapeHtml(course.id)}">${escapeHtml(course.name)}</option>
    `).join("")}
  `;
}

function fillDocumentTypesSelect() {
  const select = document.getElementById("documentTypeIdInput");
  if (!select) return;

  select.innerHTML = `
    <option value="">Seleccionar tipo documental</option>
    ${allDocumentTypes.map(item => `
      <option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>
    `).join("")}
  `;
}

function updateSelectionSummary() {
  const summary = document.getElementById("selectionSummary");
  if (!summary) return;

  summary.textContent = `${selectedStudentIds.size} alumno(s) seleccionados`;
}

async function loadCourses() {
  if (!activeCompany?.slug) return;

  const items = await get(`/api/admin/${activeCompany.slug}/courses`);
  allCourses = Array.isArray(items) ? items : [];
  fillCourseFilter();
}

async function loadDocumentTypes() {
  if (!activeCompany?.slug) return;

  const items = await get(`/api/admin/${activeCompany.slug}/document-types`);
  allDocumentTypes = Array.isArray(items) ? items.filter(x => x.isActive) : [];
  fillDocumentTypesSelect();
}

function applyFilters() {
  searchFilter = document.getElementById("searchInput")?.value?.trim().toLowerCase() || "";
  courseFilter = document.getElementById("courseFilter")?.value || "";
  statusFilter = document.getElementById("statusFilter")?.value || "";
  documentStatusFilter = document.getElementById("documentStatusFilter")?.value || "";

  filteredStudents = allStudents.filter((item) => {
    const fullName = (item.fullName || "").trim().toLowerCase();
    const email = (item.email || "").toLowerCase();
    const dni = String(item.dni || "").toLowerCase();
    const memberNumber = String(item.memberNumber || "").toLowerCase();
    const courseId = String(item.courseId || "");

    const matchesSearch =
      !searchFilter ||
      fullName.includes(searchFilter) ||
      email.includes(searchFilter) ||
      dni.includes(searchFilter) ||
      memberNumber.includes(searchFilter);

    const matchesCourse =
      !courseFilter ||
      courseId === courseFilter;

    const matchesStatus =
      !statusFilter ||
      (statusFilter === "active" && item.isActive) ||
      (statusFilter === "inactive" && !item.isActive);

    const totalDocs =
      Number(item.pendingCount || 0) +
      Number(item.submittedCount || 0) +
      Number(item.approvedCount || 0) +
      Number(item.rejectedCount || 0) +
      Number(item.expiredCount || 0);

    const matchesDocumentStatus =
      !documentStatusFilter ||
      (documentStatusFilter === "pending" && Number(item.pendingCount || 0) > 0) ||
      (documentStatusFilter === "submitted" && Number(item.submittedCount || 0) > 0) ||
      (documentStatusFilter === "approved" && Number(item.approvedCount || 0) > 0) ||
      (documentStatusFilter === "rejected" && Number(item.rejectedCount || 0) > 0) ||
      (documentStatusFilter === "expired" && Number(item.expiredCount || 0) > 0) ||
      (documentStatusFilter === "none" && totalDocs === 0);

    return matchesSearch && matchesCourse && matchesStatus && matchesDocumentStatus;
  });

  currentPage = 1;
  renderTable();
}

function renderTable() {
  const tableWrapper = document.getElementById("tableWrapper");
  const emptyBox = document.getElementById("emptyBox");
  const tableBody = document.getElementById("tableBody");
  const paginationText = document.getElementById("paginationText");
  const prevPageButton = document.getElementById("prevPageButton");
  const nextPageButton = document.getElementById("nextPageButton");
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");

  if (!tableBody || !tableWrapper || !emptyBox) return;

  updateSelectionSummary();

  if (!filteredStudents.length) {
    tableWrapper.classList.add("hidden");
    emptyBox.classList.remove("hidden");
    tableBody.innerHTML = "";
    if (paginationText) paginationText.textContent = "Sin resultados";
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    return;
  }

  emptyBox.classList.add("hidden");
  tableWrapper.classList.remove("hidden");

  const total = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = filteredStudents.slice(start, end);

  tableBody.innerHTML = pageItems.map((item) => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3">
        <input
          type="checkbox"
          class="student-checkbox"
 data-id="${escapeHtml(String(item.studentId || ""))}"
${selectedStudentIds.has(String(item.studentId || "")) ? "checked" : ""}
        />
      </td>

<td class="px-4 py-3">
  <div>
    <div class="font-medium text-slate-900">
      ${escapeHtml(item.fullName || "-")}
    </div>
    <div class="text-xs text-slate-500">
      ${escapeHtml(item.memberNumber || item.dni || "Sin legajo")}
    </div>
  </div>
</td>

      <td class="px-4 py-3 text-sm text-slate-600">
        ${escapeHtml(item.email || "-")}
      </td>

      <td class="px-4 py-3 text-sm text-slate-600">
        ${escapeHtml(item.courseName || "-")}
      </td>

      <td class="px-4 py-3">
        ${buildStudentDocumentSummary(item)}
      </td>

      <td class="px-4 py-3">
        ${getStudentStatusBadge(item.isActive)}
      </td>

      <td class="px-4 py-3">
        <div class="flex justify-end">
          <button
            type="button"
            class="open-detail-button rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            data-student-id="${escapeHtml(String(item.studentId || ""))}"
          >
            Ver legajo
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  if (paginationText) {
    paginationText.textContent = `Mostrando ${start + 1} a ${Math.min(end, total)} de ${total} alumnos`;
  }

  if (prevPageButton) {
    prevPageButton.disabled = safePage <= 1;
    prevPageButton.classList.toggle("opacity-50", safePage <= 1);
  }

  if (nextPageButton) {
    nextPageButton.disabled = safePage >= totalPages;
    nextPageButton.classList.toggle("opacity-50", safePage >= totalPages);
  }

  if (selectAllCheckbox) {
    const allChecked = pageItems.length > 0 && pageItems.every(x => selectedStudentIds.has(String(x.studentId || "")));
    selectAllCheckbox.checked = allChecked;
  }
}

function renderDetailDrawer() {
  const content = document.getElementById("detailDrawerContent");
  const drawer = document.getElementById("detailDrawer");
  if (!content || !drawer) return;

  if (!selectedStudentDetailId) {
    drawer.classList.add("hidden");
    return;
  }

  drawer.classList.remove("hidden");

  if (isLoadingStudentDetail) {
    content.innerHTML = `
      <div class="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
        <p class="text-sm text-slate-500">Cargando legajo del alumno...</p>
      </div>
    `;
    return;
  }

  if (!selectedStudentDetail) {
    content.innerHTML = `
      <div class="rounded-3xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        No se pudo cargar el legajo del alumno.
      </div>
    `;
    return;
  }

  const documents = Array.isArray(selectedStudentDetail.documents) ? selectedStudentDetail.documents : [];

  const hasHealthInsurance = !!selectedStudentDetail.hasHealthInsurance;
const healthInsuranceName = selectedStudentDetail.healthInsuranceName || "";
const healthInsuranceMemberNumber = selectedStudentDetail.healthInsuranceMemberNumber || "";
const healthInsurancePlan = selectedStudentDetail.healthInsurancePlan || "";

  content.innerHTML = `
    <div class="space-y-6">
      <section class="rounded-3xl border border-slate-200 bg-white p-5">
        <div class="flex items-start gap-4">
          ${buildDetailAvatar(selectedStudentDetail)}

          <div class="min-w-0 flex-1">
            <h4 class="text-xl font-bold text-slate-900">${escapeHtml(selectedStudentDetail.fullName || "-")}</h4>
            <div class="mt-2 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div><span class="font-semibold text-slate-900">Email:</span> ${escapeHtml(selectedStudentDetail.email || "-")}</div>
              <div><span class="font-semibold text-slate-900">DNI:</span> ${escapeHtml(selectedStudentDetail.dni || "-")}</div>
              <div><span class="font-semibold text-slate-900">Legajo:</span> ${escapeHtml(selectedStudentDetail.memberNumber || "-")}</div>
              <div><span class="font-semibold text-slate-900">Curso:</span> ${escapeHtml(selectedStudentDetail.courseName || "-")}</div>
              <div><span class="font-semibold text-slate-900">Obra social:</span> ${hasHealthInsurance ? "Sí" : "No"}</div>
${
  hasHealthInsurance
    ? `
      <div><span class="font-semibold text-slate-900">Nombre obra social:</span> ${escapeHtml(healthInsuranceName || "-")}</div>
      <div><span class="font-semibold text-slate-900">Nro. afiliado / socio:</span> ${escapeHtml(healthInsuranceMemberNumber || "-")}</div>
      <div><span class="font-semibold text-slate-900">Plan:</span> ${escapeHtml(healthInsurancePlan || "-")}</div>
    `
    : ""
}
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-lg font-bold text-slate-900">Documentación</h4>
          <span class="text-sm text-slate-500">${documents.length} documento(s)</span>
        </div>

        ${
          !documents.length
            ? `
              <div class="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <p class="text-sm text-slate-500">Este alumno no tiene documentación solicitada.</p>
              </div>
            `
            : documents.map(buildDetailDocumentCard).join("")
        }
      </section>
    </div>
  `;
}

function buildDetailDocumentCard(doc) {
  const normalizedStatus = normalizeStatus(doc.status);
  const canApprove = normalizedStatus === "Submitted";
  const canReject = normalizedStatus === "Submitted";
  const hasFile = !!doc.currentFileId;

  return `
    <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h5 class="text-base font-bold text-slate-900">${escapeHtml(doc.documentTypeName || "Documento")}</h5>
            ${getStatusBadge(doc.status)}
          </div>

          <div class="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div><span class="font-semibold text-slate-900">Asignado:</span> ${escapeHtml(formatDate(doc.assignedAtUtc))}</div>
            <div><span class="font-semibold text-slate-900">Fecha límite:</span> ${escapeHtml(formatDate(doc.dueDateUtc))}</div>
            <div><span class="font-semibold text-slate-900">Enviado:</span> ${escapeHtml(formatDate(doc.submittedAtUtc))}</div>
            <div><span class="font-semibold text-slate-900">Revisado:</span> ${escapeHtml(formatDate(doc.reviewedAtUtc))}</div>
            <div><span class="font-semibold text-slate-900">Vencimiento:</span> ${escapeHtml(formatDate(doc.expirationDateUtc))}</div>
            <div><span class="font-semibold text-slate-900">Archivo:</span> ${escapeHtml(doc.currentFileName || "—")}</div>
          </div>

          ${
            doc.requestNote
              ? `
                <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div class="text-xs uppercase tracking-[0.14em] text-slate-500">Nota de la solicitud</div>
                  <p class="mt-2 text-sm text-slate-700">${escapeHtml(doc.requestNote)}</p>
                </div>
              `
              : ""
          }

          ${
            doc.reviewNote
              ? `
                <div class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <div class="text-xs uppercase tracking-[0.14em] text-rose-500">Observación de revisión</div>
                  <p class="mt-2 text-sm text-rose-700">${escapeHtml(doc.reviewNote)}</p>
                </div>
              `
              : ""
          }
        </div>

        <div class="flex flex-wrap gap-2 lg:max-w-[280px] lg:justify-end">
          ${
            hasFile
              ? `
                <button
                  type="button"
                  class="preview-file-button rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  data-file-id="${escapeHtml(doc.currentFileId)}"
                  data-file-name="${escapeHtml(doc.currentFileName || "Documento")}"
                  data-file-type="${escapeHtml(doc.currentFileMimeType || "")}"
                >
                  Ver
                </button>

                <button
                  type="button"
                  class="download-file-button rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  data-file-id="${escapeHtml(doc.currentFileId)}"
                >
                  Descargar
                </button>
              `
              : ""
          }

          ${
            canApprove
              ? `
                <button
                  type="button"
                  class="approve-document-button rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  data-assignment-id="${escapeHtml(doc.assignmentId)}"
                  data-document-name="${escapeHtml(doc.documentTypeName || "Documento")}"
                >
                  Aprobar
                </button>
              `
              : ""
          }

          ${
            canReject
              ? `
                <button
                  type="button"
                  class="reject-document-button rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                  data-assignment-id="${escapeHtml(doc.assignmentId)}"
                  data-document-name="${escapeHtml(doc.documentTypeName || "Documento")}"
                >
                  Rechazar
                </button>
              `
              : ""
          }
        </div>
      </div>
    </article>
  `;
}

async function loadStudents() {
  if (!activeCompany?.slug) {
    showError("No hay empresa activa seleccionada.");
    return;
  }

  showLoading();
  hideError();

  try {
    const items = await get(`/api/admin/${activeCompany.slug}/student-files/students`);
    allStudents = Array.isArray(items) ? items : [];
    filteredStudents = [...allStudents];
    renderTable();
  } catch (error) {
    showError(error.message || "No se pudieron cargar los alumnos.");
  } finally {
    hideLoading();
  }
}

function getSelectedStudents() {
  return Array.from(selectedStudentIds);
}

function openRequestModal() {
  if (!allDocumentTypes.length) {
    showToast("No hay tipos documentales activos para esta empresa.", "error");
    return;
  }

  const modal = document.getElementById("requestModal");
  const form = document.getElementById("requestForm");
  const selectedStudentsCountText = document.getElementById("selectedStudentsCountText");
  const requestScopeInput = document.getElementById("requestScopeInput");

  if (!modal || !form || !selectedStudentsCountText || !requestScopeInput) {
    return;
  }

  form.reset();
  hideRequestFormError();
  fillDocumentTypesSelect();

  requestScopeInput.value = "selected";
  updateRequestScopeUi();

  modal.classList.remove("hidden");
}

function updateRequestScopeUi() {
  const requestScopeInput = document.getElementById("requestScopeInput");
  const selectedStudentsCountText = document.getElementById("selectedStudentsCountText");

  if (!requestScopeInput || !selectedStudentsCountText) return;

  if (requestScopeInput.value === "all") {
    selectedStudentsCountText.textContent = `Todos los alumnos activos de la empresa (${allStudents.length})`;
    return;
  }

  selectedStudentsCountText.textContent = `${selectedStudentIds.size} alumno(s)`;
}

function closeRequestModal() {
  if (isSubmittingRequest) return;

  const modal = document.getElementById("requestModal");
  modal?.classList.add("hidden");
  hideRequestFormError();
}

function setSubmitLoading(value) {
  isSubmittingRequest = value;

  const button = document.getElementById("submitRequestButton");
  if (!button) return;

  button.disabled = value;
  button.textContent = value ? "Enviando..." : "Enviar solicitud";
}

async function submitDocumentRequest(event) {
  event.preventDefault();

  if (isSubmittingRequest) return;
  if (!activeCompany?.slug) return;

  hideRequestFormError();

  const requestScope = document.getElementById("requestScopeInput")?.value || "selected";
  const studentIds = getSelectedStudents();
  const documentTypeId = document.getElementById("documentTypeIdInput")?.value || "";
  const requestNote = document.getElementById("requestNoteInput")?.value?.trim() || "";
  const dueDateValue = document.getElementById("dueDateInput")?.value || "";
  const isMandatory = !!document.getElementById("isMandatoryInput")?.checked;

  if (!documentTypeId) {
    showRequestFormError("El tipo documental es obligatorio.");
    return;
  }

  if (requestScope === "selected" && !studentIds.length) {
    showRequestFormError("Seleccioná al menos un alumno o elegí 'Todos los alumnos'.");
    return;
  }

  let dueDateUtc = null;
  if (dueDateValue) {
    dueDateUtc = `${dueDateValue}T00:00:00Z`;
  }

  setSubmitLoading(true);

  try {
    if (requestScope === "all") {
      await post(`/api/admin/${activeCompany.slug}/student-files/requests`, {
        documentTypeId,
        scope: 3,
        studentId: null,
        courseId: null,
        note: requestNote || null,
        isMandatory,
        dueDateUtc
      });
    } else {
      for (const studentId of studentIds) {
        await post(`/api/admin/${activeCompany.slug}/student-files/requests`, {
          documentTypeId,
          scope: DOCUMENT_REQUEST_SCOPE_INDIVIDUAL,
          studentId,
          courseId: null,
          note: requestNote || null,
          isMandatory,
          dueDateUtc
        });
      }
    }

    setSubmitLoading(false);
    closeRequestModal();
    showToast("Solicitud enviada correctamente.");
    await loadStudents();
  } catch (error) {
    setSubmitLoading(false);
    showRequestFormError(error.message || "No se pudo enviar la solicitud.");
  }
}

async function openStudentDetail(studentId) {
  const normalizedStudentId = String(studentId || "").trim();

  if (!activeCompany?.slug || !normalizedStudentId) return;

  console.log("openStudentDetail", normalizedStudentId);

  selectedStudentDetailId = normalizedStudentId;
  selectedStudentDetail = null;
  isLoadingStudentDetail = true;
  renderDetailDrawer();

  try {
    const detail = await get(`/api/admin/${activeCompany.slug}/student-files/students/${normalizedStudentId}`);
    selectedStudentDetail = detail;
  } catch (error) {
    selectedStudentDetail = null;
    showToast(error.message || "No se pudo cargar el legajo.", "error");
  } finally {
    isLoadingStudentDetail = false;
    renderDetailDrawer();
  }
}

function closeStudentDetail() {
  selectedStudentDetailId = null;
  selectedStudentDetail = null;
  isLoadingStudentDetail = false;
  renderDetailDrawer();
}

async function previewFileById(fileId, fileName, fileType) {
  if (!activeCompany?.slug || !fileId) return;

  try {
    const result = await get(`/api/admin/${activeCompany.slug}/student-files/files/${fileId}/view`);

    previewFile = {
      fileId,
      fileName: fileName || result.fileName || "Documento",
      mimeType: fileType || result.contentType || "",
      url: result.url
    };

    renderPreviewModal();
  } catch (error) {
    showToast(error.message || "No se pudo abrir el archivo.", "error");
  }
}

async function downloadFileById(fileId) {
  if (!activeCompany?.slug || !fileId) return;

  try {
    const result = await get(`/api/admin/${activeCompany.slug}/student-files/files/${fileId}/download`);

    if (!result?.url) {
      throw new Error("No se pudo obtener el archivo.");
    }

    window.open(result.url, "_blank", "noopener,noreferrer");
  } catch (error) {
    showToast(error.message || "No se pudo descargar el archivo.", "error");
  }
}

function renderPreviewModal() {
  const modal = document.getElementById("previewModal");
  const title = document.getElementById("previewTitle");
  const subtitle = document.getElementById("previewSubtitle");
  const body = document.getElementById("previewBody");

  if (!modal || !title || !subtitle || !body) return;

  if (!previewFile) {
    modal.classList.add("hidden");
    return;
  }

  title.textContent = previewFile.fileName || "Documento";
  subtitle.textContent = previewFile.mimeType || "Vista previa";

  if (isPdfFile(previewFile.mimeType)) {
    body.innerHTML = `
      <iframe
        src="${escapeHtml(previewFile.url)}"
        class="h-[75vh] w-full rounded-2xl border border-slate-200"
        title="${escapeHtml(previewFile.fileName || "Documento")}"
      ></iframe>
    `;
  } else if (isImageFile(previewFile.mimeType)) {
    body.innerHTML = `
      <div class="flex max-h-[75vh] items-center justify-center overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <img
          src="${escapeHtml(previewFile.url)}"
          alt="${escapeHtml(previewFile.fileName || "Documento")}"
          class="max-h-[70vh] w-auto max-w-full object-contain"
        />
      </div>
    `;
  } else {
    body.innerHTML = `
      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
        <p class="text-sm text-slate-600">Este archivo no se puede previsualizar desde la página.</p>
        <p class="mt-2 text-sm text-slate-500">Usá el botón descargar.</p>
      </div>
    `;
  }

  modal.classList.remove("hidden");
}

function closePreviewModal() {
  previewFile = null;
  renderPreviewModal();
}

function openReviewModal(action, assignmentId, documentName) {
  reviewAction = action;
  reviewAssignmentId = assignmentId;
  reviewDocumentName = documentName || "Documento";

  hideReviewFormError();

  const modal = document.getElementById("reviewModal");
  const title = document.getElementById("reviewModalTitle");
  const subtitle = document.getElementById("reviewModalSubtitle");
  const documentNameBox = document.getElementById("reviewDocumentName");
  const expirationWrap = document.getElementById("approvalExpirationWrap");
  const noteInput = document.getElementById("reviewNoteInput");
  const expirationInput = document.getElementById("approvalExpirationInput");
  const submitButton = document.getElementById("submitReviewButton");

  if (!modal || !title || !subtitle || !documentNameBox || !expirationWrap || !noteInput || !expirationInput || !submitButton) {
    return;
  }

  documentNameBox.textContent = reviewDocumentName;
  noteInput.value = "";
  expirationInput.value = "";

  if (action === "approve") {
    title.textContent = "Aprobar documento";
    subtitle.textContent = "Podés indicar fecha de vencimiento y una observación opcional.";
    submitButton.textContent = "Aprobar";
    submitButton.className = "rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60";
    expirationWrap.classList.remove("hidden");
  } else {
    title.textContent = "Rechazar documento";
    subtitle.textContent = "Indicá el motivo del rechazo para el alumno.";
    submitButton.textContent = "Rechazar";
    submitButton.className = "rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60";
    expirationWrap.classList.add("hidden");
  }

  modal.classList.remove("hidden");
}

function closeReviewModal() {
  reviewAction = null;
  reviewAssignmentId = null;
  reviewDocumentName = "";
  hideReviewFormError();
  document.getElementById("reviewModal")?.classList.add("hidden");
}

async function submitReview(event) {
  event.preventDefault();

  if (!activeCompany?.slug || !reviewAction || !reviewAssignmentId) return;

  hideReviewFormError();

  const note = document.getElementById("reviewNoteInput")?.value?.trim() || "";
  const expirationValue = document.getElementById("approvalExpirationInput")?.value || "";

  if (reviewAction === "reject" && !note) {
    showReviewFormError("Debés indicar el motivo del rechazo.");
    return;
  }

  const submitButton = document.getElementById("submitReviewButton");
  if (submitButton) {
    submitButton.disabled = true;
  }

  try {
    if (reviewAction === "approve") {
      await post(`/api/admin/${activeCompany.slug}/student-files/assignments/${reviewAssignmentId}/approve`, {
        reviewNote: note || null,
        expirationDateUtc: expirationValue ? `${expirationValue}T00:00:00Z` : null
      });

      showToast("Documento aprobado correctamente.");
    } else {
      await post(`/api/admin/${activeCompany.slug}/student-files/assignments/${reviewAssignmentId}/reject`, {
        reviewNote: note
      });

      showToast("Documento rechazado correctamente.");
    }

    closeReviewModal();

    if (selectedStudentDetailId) {
      await openStudentDetail(selectedStudentDetailId);
    }

    await loadStudents();
  } catch (error) {
    showReviewFormError(error.message || "No se pudo completar la revisión.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

function bindEvents() {
document.getElementById("searchInput")?.addEventListener("input", applyFilters);
document.getElementById("courseFilter")?.addEventListener("change", applyFilters);
document.getElementById("statusFilter")?.addEventListener("change", applyFilters);
document.getElementById("documentStatusFilter")?.addEventListener("change", applyFilters);

document.getElementById("clearFiltersButton")?.addEventListener("click", () => {
  const searchInput = document.getElementById("searchInput");
  const courseSelect = document.getElementById("courseFilter");
  const statusSelect = document.getElementById("statusFilter");
  const documentStatusSelect = document.getElementById("documentStatusFilter");

  if (searchInput) searchInput.value = "";
  if (courseSelect) courseSelect.value = "";
  if (statusSelect) statusSelect.value = "";
  if (documentStatusSelect) documentStatusSelect.value = "";

  searchFilter = "";
  courseFilter = "";
  statusFilter = "";
  documentStatusFilter = "";

  applyFilters();
});

  document.getElementById("prevPageButton")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderTable();
    }
  });

  document.getElementById("nextPageButton")?.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
    if (currentPage < totalPages) {
      currentPage += 1;
      renderTable();
    }
  });


document.getElementById("selectAllCheckbox")?.addEventListener("change", (event) => {
  const checked = !!event.target.checked;
  const total = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = filteredStudents.slice(start, end);

  pageItems.forEach((item) => {
    const studentId = String(item.studentId || "");
    if (!studentId) return;

    if (checked) {
      selectedStudentIds.add(studentId);
    } else {
      selectedStudentIds.delete(studentId);
    }
  });

  renderTable();
  updateRequestScopeUi();
});

  document.getElementById("requestScopeInput")?.addEventListener("change", updateRequestScopeUi);

document.getElementById("tableBody")?.addEventListener("change", (event) => {
  const checkbox = event.target.closest(".student-checkbox");
  if (!checkbox) return;

  const studentId = String(checkbox.dataset.id || "");
  if (!studentId) return;

  if (checkbox.checked) {
    selectedStudentIds.add(studentId);
  } else {
    selectedStudentIds.delete(studentId);
  }

  renderTable();
  updateRequestScopeUi();
});

document.getElementById("tableBody")?.addEventListener("click", (event) => {
  const openDetailButton = event.target.closest(".open-detail-button");
  if (openDetailButton) {
    const studentId = String(openDetailButton.dataset.studentId || "");
    if (!studentId) return;

    openStudentDetail(studentId);
    return;
  }
});

  document.getElementById("detailDrawerContent")?.addEventListener("click", (event) => {
    const previewButton = event.target.closest(".preview-file-button");
    if (previewButton) {
      previewFileById(
        previewButton.dataset.fileId,
        previewButton.dataset.fileName,
        previewButton.dataset.fileType
      );
      return;
    }

    const downloadButton = event.target.closest(".download-file-button");
    if (downloadButton) {
      downloadFileById(downloadButton.dataset.fileId);
      return;
    }

    const approveButton = event.target.closest(".approve-document-button");
    if (approveButton) {
      openReviewModal("approve", approveButton.dataset.assignmentId, approveButton.dataset.documentName);
      return;
    }

    const rejectButton = event.target.closest(".reject-document-button");
    if (rejectButton) {
      openReviewModal("reject", rejectButton.dataset.assignmentId, rejectButton.dataset.documentName);
    }
  });

  document.getElementById("requestDocumentsButton")?.addEventListener("click", openRequestModal);
  document.getElementById("cancelRequestButton")?.addEventListener("click", closeRequestModal);
  document.getElementById("requestForm")?.addEventListener("submit", submitDocumentRequest);

  document.getElementById("requestModal")?.addEventListener("click", (event) => {
    if (event.target.id === "requestModal") {
      closeRequestModal();
    }
  });

  document.getElementById("closeDetailDrawerButton")?.addEventListener("click", closeStudentDetail);
  document.getElementById("detailDrawerOverlay")?.addEventListener("click", closeStudentDetail);

  document.getElementById("closePreviewModalButton")?.addEventListener("click", closePreviewModal);
  document.getElementById("previewModalOverlay")?.addEventListener("click", closePreviewModal);
  document.getElementById("previewDownloadButton")?.addEventListener("click", () => {
    if (previewFile?.fileId) {
      downloadFileById(previewFile.fileId);
    }
  });

  document.getElementById("cancelReviewButton")?.addEventListener("click", closeReviewModal);
  document.getElementById("reviewModalOverlay")?.addEventListener("click", closeReviewModal);
  document.getElementById("reviewForm")?.addEventListener("submit", submitReview);
}

async function init() {
  await loadConfig();

  const session = requireAuth();
  if (!session) return;

  const user = getUser();
  if (!user) return;

  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = renderAdminLayout({
    activeKey: "records",
    pageTitle: "Legajos",
    contentHtml: buildContent()
  });

  const layout = await setupAdminLayout({
    onCompanyChanged: async (company) => {
      activeCompany = company;
      selectedStudentIds = new Set();
      selectedStudentDetailId = null;
      selectedStudentDetail = null;
      previewFile = null;
      closeStudentDetail();
      closePreviewModal();
      closeReviewModal();

      await loadDocumentTypes();
      await loadCourses();
      await loadStudents();
    }
  });

  activeCompany = layout.activeCompany;

  bindEvents();
  await loadDocumentTypes();
  await loadCourses();
  await loadStudents();
}

init().catch((error) => {
  const app = document.getElementById("app");
  if (app && !app.innerHTML.trim()) {
    app.innerHTML = `
      <div class="mx-auto max-w-3xl px-4 py-10">
        <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ${error.message || "No se pudo inicializar la pantalla de Legajo."}
        </div>
      </div>
    `;
    return;
  }

  showError(error.message || "No se pudo inicializar la pantalla de Legajo.");
});