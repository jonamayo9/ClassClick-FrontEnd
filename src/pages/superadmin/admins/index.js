import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth, logoutAndRedirect } from "../../../shared/js/session.js";
import {
  getSuperAdminAdmins,
  createSuperAdminAdmin,
  updateSuperAdminAdmin,
  setSuperAdminAdminStatus,
  deleteSuperAdminAdmin,
  normalizeAdminsResponse,
  mapAdmin,
  assignCompaniesToSuperAdminAdmin,
  removeCompanyFromSuperAdminAdmin
} from "../../../shared/js/superadmin-admin-service.js";
import { getSuperAdminCompanies } from "../../../shared/js/superadmin-company-service.js";

const logoutButton = document.getElementById("logoutButton");
const searchInput = document.getElementById("searchInput");

const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const emptyState = document.getElementById("emptyState");
const tableWrapper = document.getElementById("tableWrapper");
const adminsTableBody = document.getElementById("adminsTableBody");

const openCreateModalButton = document.getElementById("openCreateModalButton");
const closeCreateModalButton = document.getElementById("closeCreateModalButton");
const cancelCreateButton = document.getElementById("cancelCreateButton");
const createModal = document.getElementById("createModal");
const createAdminForm = document.getElementById("createAdminForm");
const createErrorBox = document.getElementById("createErrorBox");
const submitCreateButton = document.getElementById("submitCreateButton");

const editModal = document.getElementById("editModal");
const editAdminForm = document.getElementById("editAdminForm");
const closeEditModalButton = document.getElementById("closeEditModalButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const submitEditButton = document.getElementById("submitEditButton");
const editErrorBox = document.getElementById("editErrorBox");

const manageCompaniesModal = document.getElementById("manageCompaniesModal");
const closeManageCompaniesModalButton = document.getElementById("closeManageCompaniesModalButton");
const manageCompaniesSubtitle = document.getElementById("manageCompaniesSubtitle");
const assignedCompaniesList = document.getElementById("assignedCompaniesList");
const manageCompaniesErrorBox = document.getElementById("manageCompaniesErrorBox");
const saveAssignedCompaniesButton = document.getElementById("saveAssignedCompaniesButton");

const createCompanySearchInput = document.getElementById("createCompanySearchInput");
const createCompanySearchResults = document.getElementById("createCompanySearchResults");
const createSelectedCompanies = document.getElementById("createSelectedCompanies");

const assignCompanySearchInput = document.getElementById("assignCompanySearchInput");
const assignCompanySearchResults = document.getElementById("assignCompanySearchResults");
const assignSelectedCompanies = document.getElementById("assignSelectedCompanies");

const confirmModal = document.getElementById("confirmModal");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const confirmErrorBox = document.getElementById("confirmErrorBox");
const confirmCancelButton = document.getElementById("confirmCancelButton");
const confirmAcceptButton = document.getElementById("confirmAcceptButton");

let allAdmins = [];
let allCompanies = [];
let confirmAction = null;
let selectedAdminForCompanies = null;
let isSavingCompanies = false;
let selectedCreateCompanyIds = [];
let selectedAssignCompanyIds = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function getStatusBadge(isActive) {
  if (isActive) {
    return `<span class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Activo</span>`;
  }

  return `<span class="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">Inactivo</span>`;
}

function getCompaniesHtml(companies) {
  if (!companies.length) {
    return `<span class="text-sm font-medium text-amber-600">Sin empresas</span>`;
  }

  return `
    <div class="flex flex-wrap gap-2">
      ${companies.map((company) => `
        <span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          ${escapeHtml(company.companyName || company.companySlug || "-")}
        </span>
      `).join("")}
    </div>
  `;
}

function getActionButtonsHtml(admin) {
  const toggleLabel = admin.isActive ? "Desactivar" : "Activar";

  return `
    <div class="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        data-action="edit"
        data-id="${escapeHtml(admin.id)}"
        class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
        Editar
      </button>

      <button
        type="button"
        data-action="companies"
        data-id="${escapeHtml(admin.id)}"
        class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100">
        Empresas
      </button>

      <button
        type="button"
        data-action="toggle"
        data-id="${escapeHtml(admin.id)}"
        class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
        ${toggleLabel}
      </button>

      <button
        type="button"
        data-action="delete"
        data-id="${escapeHtml(admin.id)}"
        class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100">
        Eliminar
      </button>
    </div>
  `;
}

function renderAdmins(items) {
  adminsTableBody.innerHTML = "";

  if (!items.length) {
    tableWrapper.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  tableWrapper.classList.remove("hidden");

  adminsTableBody.innerHTML = items.map((admin) => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-4">
        <div class="font-medium text-slate-900">${escapeHtml(admin.firstName)} ${escapeHtml(admin.lastName)}</div>
      </td>
      <td class="px-4 py-4 text-sm text-slate-600">${escapeHtml(admin.email)}</td>
      <td class="px-4 py-4 text-sm text-slate-600">${escapeHtml(admin.systemRole || "-")}</td>
      <td class="px-4 py-4">${getStatusBadge(admin.isActive)}</td>
      <td class="px-4 py-4">${getCompaniesHtml(admin.companies)}</td>
      <td class="px-4 py-4 text-sm text-slate-600">${formatDate(admin.createdAtUtc)}</td>
      <td class="px-4 py-4 text-right">${getActionButtonsHtml(admin)}</td>
    </tr>
  `).join("");
}

function filterAdmins(term) {
  const normalized = term.trim().toLowerCase();

  if (!normalized) {
    renderAdmins(allAdmins);
    return;
  }

  const filtered = allAdmins.filter((admin) => {
    return [
      admin.firstName,
      admin.lastName,
      admin.email
    ].some((value) => (value || "").toLowerCase().includes(normalized));
  });

  renderAdmins(filtered);
}

function showLoading() {
  loadingState.classList.remove("hidden");
  errorState.classList.add("hidden");
  emptyState.classList.add("hidden");
  tableWrapper.classList.add("hidden");
}

function hideLoading() {
  loadingState.classList.add("hidden");
}

function showError(message) {
  errorState.textContent = message;
  errorState.classList.remove("hidden");
}

function hideError() {
  errorState.textContent = "";
  errorState.classList.add("hidden");
}

function showCreateError(message) {
  createErrorBox.textContent = message;
  createErrorBox.classList.remove("hidden");
}

function hideCreateError() {
  createErrorBox.textContent = "";
  createErrorBox.classList.add("hidden");
}

function showEditError(message) {
  editErrorBox.textContent = message;
  editErrorBox.classList.remove("hidden");
}

function hideEditError() {
  editErrorBox.textContent = "";
  editErrorBox.classList.add("hidden");
}

function showConfirmError(message) {
  confirmErrorBox.textContent = message;
  confirmErrorBox.classList.remove("hidden");
}

function hideConfirmError() {
  confirmErrorBox.textContent = "";
  confirmErrorBox.classList.add("hidden");
}

function showManageCompaniesError(message) {
  manageCompaniesErrorBox.textContent = message;
  manageCompaniesErrorBox.classList.remove("hidden");
}

function hideManageCompaniesError() {
  manageCompaniesErrorBox.textContent = "";
  manageCompaniesErrorBox.classList.add("hidden");
}

function setCreateLoading(isLoading) {
  submitCreateButton.disabled = isLoading;
  submitCreateButton.textContent = isLoading ? "Creando..." : "Crear admin";
}

function setEditLoading(isLoading) {
  submitEditButton.disabled = isLoading;
  submitEditButton.textContent = isLoading ? "Guardando..." : "Guardar cambios";
}

function setConfirmLoading(isLoading) {
  confirmAcceptButton.disabled = isLoading;
  if (isLoading) {
    confirmAcceptButton.dataset.originalText = confirmAcceptButton.textContent;
    confirmAcceptButton.textContent = "Procesando...";
    return;
  }

  confirmAcceptButton.textContent = confirmAcceptButton.dataset.originalText || "Confirmar";
}

function setManageCompaniesLoading(isLoading) {
  isSavingCompanies = isLoading;
  saveAssignedCompaniesButton.disabled = isLoading;
  saveAssignedCompaniesButton.textContent = isLoading ? "Agregando..." : "Agregar seleccionadas";
}

function renderCompanyChip(company, type) {
  return `
    <span class="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
      <span class="max-w-[180px] truncate">${escapeHtml(company.name)}</span>
      <button
        type="button"
        data-action="remove-selected-company"
        data-type="${escapeHtml(type)}"
        data-id="${escapeHtml(company.id)}"
        class="rounded-full text-blue-700 transition hover:text-blue-900">
        ✕
      </button>
    </span>
  `;
}

function renderSearchResultItem(company, type) {
  return `
    <button
      type="button"
      data-action="add-company"
      data-type="${escapeHtml(type)}"
      data-id="${escapeHtml(company.id)}"
      class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-slate-900">${escapeHtml(company.name)}</p>
        <p class="truncate text-xs text-slate-500">${escapeHtml(company.slug)}</p>
      </div>

      <span class="inline-flex shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
        Agregar
      </span>
    </button>
  `;
}

function renderCreateSelectedCompanies() {
  if (!selectedCreateCompanyIds.length) {
    createSelectedCompanies.innerHTML = `<span class="text-sm text-slate-400">No hay empresas seleccionadas.</span>`;
    return;
  }

  const selectedCompanies = allCompanies.filter((company) => selectedCreateCompanyIds.includes(company.id));

  createSelectedCompanies.innerHTML = selectedCompanies
    .map((company) => renderCompanyChip(company, "create"))
    .join("");
}

function renderAssignSelectedCompanies() {
  if (!selectedAssignCompanyIds.length) {
    assignSelectedCompanies.innerHTML = `<span class="text-sm text-slate-400">No hay empresas seleccionadas para agregar.</span>`;
    return;
  }

  const selectedCompanies = allCompanies.filter((company) => selectedAssignCompanyIds.includes(company.id));

  assignSelectedCompanies.innerHTML = selectedCompanies
    .map((company) => renderCompanyChip(company, "assign"))
    .join("");
}

function renderCreateCompanySearchResults(term = "") {
  const normalized = term.trim().toLowerCase();

  const filtered = allCompanies.filter((company) => {
    if (selectedCreateCompanyIds.includes(company.id)) {
      return false;
    }

    const text = `${company.name} ${company.slug}`.toLowerCase();
    return !normalized || text.includes(normalized);
  });

  if (!filtered.length) {
    createCompanySearchResults.innerHTML = `
      <div class="px-3 py-3 text-sm text-slate-500">No hay empresas para mostrar.</div>
    `;
    return;
  }

  createCompanySearchResults.innerHTML = filtered
    .map((company) => renderSearchResultItem(company, "create"))
    .join("");
}

function renderAssignCompanySearchResults(term = "") {
  if (!selectedAdminForCompanies) {
    assignCompanySearchResults.innerHTML = "";
    return;
  }

  const assignedIds = new Set(selectedAdminForCompanies.companies.map((company) => company.companyId));
  const normalized = term.trim().toLowerCase();

  const filtered = allCompanies.filter((company) => {
    if (assignedIds.has(company.id)) {
      return false;
    }

    if (selectedAssignCompanyIds.includes(company.id)) {
      return false;
    }

    const text = `${company.name} ${company.slug}`.toLowerCase();
    return !normalized || text.includes(normalized);
  });

  if (!filtered.length) {
    assignCompanySearchResults.innerHTML = `
      <div class="px-3 py-3 text-sm text-slate-500">No hay empresas disponibles.</div>
    `;
    return;
  }

  assignCompanySearchResults.innerHTML = filtered
    .map((company) => renderSearchResultItem(company, "assign"))
    .join("");
}

function addSelectedCompany(type, companyId) {
  if (type === "create") {
    if (!selectedCreateCompanyIds.includes(companyId)) {
      selectedCreateCompanyIds.push(companyId);
    }

    renderCreateSelectedCompanies();
    renderCreateCompanySearchResults(createCompanySearchInput.value);
    createCompanySearchInput.value = "";
    return;
  }

  if (type === "assign") {
    if (!selectedAssignCompanyIds.includes(companyId)) {
      selectedAssignCompanyIds.push(companyId);
    }

    renderAssignSelectedCompanies();
    renderAssignCompanySearchResults(assignCompanySearchInput.value);
    assignCompanySearchInput.value = "";
  }
}

function removeSelectedCompany(type, companyId) {
  if (type === "create") {
    selectedCreateCompanyIds = selectedCreateCompanyIds.filter((id) => id !== companyId);
    renderCreateSelectedCompanies();
    renderCreateCompanySearchResults(createCompanySearchInput.value);
    return;
  }

  if (type === "assign") {
    selectedAssignCompanyIds = selectedAssignCompanyIds.filter((id) => id !== companyId);
    renderAssignSelectedCompanies();
    renderAssignCompanySearchResults(assignCompanySearchInput.value);
  }
}

function openCreateModal() {
  hideCreateError();
  createAdminForm.reset();
  selectedCreateCompanyIds = [];
  renderCreateSelectedCompanies();
  renderCreateCompanySearchResults("");
  createCompanySearchInput.value = "";
  createModal.classList.remove("hidden");
}

function closeCreateModal() {
  hideCreateError();
  createModal.classList.add("hidden");
}

function openEditModal(admin) {
  hideEditError();

  document.getElementById("editId").value = admin.id;
  document.getElementById("editFirstName").value = admin.firstName || "";
  document.getElementById("editLastName").value = admin.lastName || "";
  document.getElementById("editEmail").value = admin.email || "";
  document.getElementById("editIsActive").checked = !!admin.isActive;

  editModal.classList.remove("hidden");
}

function closeEditModal() {
  hideEditError();
  editModal.classList.add("hidden");
}

function openConfirmModal({ title, message, confirmText = "Confirmar", confirmClass = "danger", onConfirm }) {
  hideConfirmError();
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmAcceptButton.textContent = confirmText;
  confirmAcceptButton.dataset.originalText = confirmText;

  confirmAcceptButton.classList.remove("bg-red-600", "hover:bg-red-700", "bg-blue-600", "hover:bg-blue-700");

  if (confirmClass === "primary") {
    confirmAcceptButton.classList.add("bg-blue-600", "hover:bg-blue-700");
  } else {
    confirmAcceptButton.classList.add("bg-red-600", "hover:bg-red-700");
  }

  confirmAction = onConfirm;
  confirmModal.classList.remove("hidden");
}

function closeConfirmModal() {
  hideConfirmError();
  confirmAcceptButton.disabled = false;
  confirmAction = null;
  confirmModal.classList.add("hidden");
}

function renderAssignedCompaniesList(admin) {
  if (!admin.companies.length) {
    assignedCompaniesList.innerHTML = `
      <div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
        Este admin no tiene empresas asignadas.
      </div>
    `;
    return;
  }

  assignedCompaniesList.innerHTML = admin.companies.map((company) => `
    <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-slate-900">${escapeHtml(company.companyName || "-")}</p>
        <p class="truncate text-xs text-slate-500">${escapeHtml(company.companySlug || "-")}</p>
      </div>

      <button
        type="button"
        data-action="remove-company"
        data-admin-id="${escapeHtml(admin.id)}"
        data-company-id="${escapeHtml(company.companyId)}"
        class="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100">
        Quitar
      </button>
    </div>
  `).join("");
}

function openManageCompaniesModal(admin) {
  selectedAdminForCompanies = admin;
  selectedAssignCompanyIds = [];
  hideManageCompaniesError();
  setManageCompaniesLoading(false);
  manageCompaniesSubtitle.textContent = `${admin.firstName} ${admin.lastName} · ${admin.email}`;
  renderAssignSelectedCompanies();
  renderAssignCompanySearchResults("");
  renderAssignedCompaniesList(admin);
  assignCompanySearchInput.value = "";
  manageCompaniesModal.classList.remove("hidden");
}

function closeManageCompaniesModal() {
  if (isSavingCompanies) return;
  hideManageCompaniesError();
  selectedAdminForCompanies = null;
  manageCompaniesModal.classList.add("hidden");
}

async function loadCompanies() {
  allCompanies = await getSuperAdminCompanies();
}

async function loadAdmins() {
  showLoading();
  hideError();

  try {
    const response = await getSuperAdminAdmins();
    const items = normalizeAdminsResponse(response).map(mapAdmin);

    allAdmins = items;
    hideLoading();
    renderAdmins(allAdmins);

    if (selectedAdminForCompanies) {
      const refreshedAdmin = findAdminById(selectedAdminForCompanies.id);
      if (refreshedAdmin) {
        openManageCompaniesModal(refreshedAdmin);
      }
    }
  } catch (error) {
    hideLoading();
    showError(error.message || "No se pudieron cargar los admins.");
  }
}

function findAdminById(id) {
  return allAdmins.find((admin) => admin.id === id);
}

function askToggleAdmin(adminId) {
  const admin = findAdminById(adminId);
  if (!admin) return;

  const nextStatus = !admin.isActive;
  const title = nextStatus ? "Activar admin" : "Desactivar admin";
  const message = nextStatus
    ? `Vas a activar a ${admin.firstName} ${admin.lastName}.`
    : `Vas a desactivar a ${admin.firstName} ${admin.lastName}.`;

  openConfirmModal({
    title,
    message,
    confirmText: nextStatus ? "Activar" : "Desactivar",
    confirmClass: "primary",
    onConfirm: async () => {
      try {
        setConfirmLoading(true);
        await setSuperAdminAdminStatus(adminId, nextStatus);
        closeConfirmModal();
        await loadAdmins();
      } catch (error) {
        showConfirmError(error.message || "No se pudo cambiar el estado del admin.");
        setConfirmLoading(false);
      }
    }
  });
}

function askDeleteAdmin(adminId) {
  const admin = findAdminById(adminId);
  if (!admin) return;

  openConfirmModal({
    title: "Eliminar admin",
    message: `Vas a eliminar a ${admin.firstName} ${admin.lastName}. Esta acción no se puede deshacer.`,
    confirmText: "Eliminar",
    confirmClass: "danger",
    onConfirm: async () => {
      try {
        setConfirmLoading(true);
        await deleteSuperAdminAdmin(adminId);
        closeConfirmModal();
        await loadAdmins();
      } catch (error) {
        showConfirmError(error.message || "No se pudo eliminar el admin.");
        setConfirmLoading(false);
      }
    }
  });
}

function askRemoveCompanyFromAdmin(adminId, companyId) {
  const admin = findAdminById(adminId);
  if (!admin) return;

  const company = admin.companies.find((item) => item.companyId === companyId);
  if (!company) return;

  openConfirmModal({
    title: "Quitar empresa",
    message: `Vas a quitar "${company.companyName || company.companySlug}" de ${admin.firstName} ${admin.lastName}.`,
    confirmText: "Quitar",
    confirmClass: "danger",
    onConfirm: async () => {
      try {
        setConfirmLoading(true);
        await removeCompanyFromSuperAdminAdmin(adminId, companyId);
        closeConfirmModal();
        await loadAdmins();
      } catch (error) {
        showConfirmError(error.message || "No se pudo quitar la empresa.");
        setConfirmLoading(false);
      }
    }
  });
}

async function init() {
  await loadConfig();

  const session = requireAuth();
  if (!session) return;

  const { user } = session;

  if (!user?.isSuperAdmin) {
    window.location.href = "/src/pages/admin/dashboard/index.html";
    return;
  }

  logoutButton.addEventListener("click", logoutAndRedirect);

  searchInput.addEventListener("input", (event) => {
    filterAdmins(event.target.value);
  });

  openCreateModalButton.addEventListener("click", openCreateModal);
  closeCreateModalButton.addEventListener("click", closeCreateModal);
  cancelCreateButton.addEventListener("click", closeCreateModal);

  closeEditModalButton.addEventListener("click", closeEditModal);
  cancelEditButton.addEventListener("click", closeEditModal);

  closeManageCompaniesModalButton.addEventListener("click", closeManageCompaniesModal);

  confirmCancelButton.addEventListener("click", closeConfirmModal);

  createModal.addEventListener("click", (event) => {
    if (event.target === createModal) {
      closeCreateModal();
    }
  });

  editModal.addEventListener("click", (event) => {
    if (event.target === editModal) {
      closeEditModal();
    }
  });

  manageCompaniesModal.addEventListener("click", (event) => {
    if (event.target === manageCompaniesModal) {
      closeManageCompaniesModal();
    }
  });

  confirmModal.addEventListener("click", (event) => {
    if (event.target === confirmModal) {
      closeConfirmModal();
    }
  });

  confirmAcceptButton.addEventListener("click", async () => {
    if (!confirmAction) return;
    await confirmAction();
  });

  createAdminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideCreateError();
    setCreateLoading(true);

    try {
      const formData = new FormData(createAdminForm);

      const payload = {
        firstName: formData.get("firstName")?.toString().trim(),
        lastName: formData.get("lastName")?.toString().trim(),
        email: formData.get("email")?.toString().trim(),
        password: formData.get("password")?.toString()
      };

      const selectedCompanyIds = [...selectedCreateCompanyIds];

      if (!payload.firstName || !payload.lastName || !payload.email || !payload.password) {
        throw new Error("Completá todos los campos.");
      }

      const createdAdminResponse = await createSuperAdminAdmin(payload);
      const createdAdmin = mapAdmin(createdAdminResponse);

      if (selectedCompanyIds.length > 0) {
        await assignCompaniesToSuperAdminAdmin(createdAdmin.id, selectedCompanyIds);
      }

      closeCreateModal();
      await loadAdmins();
    } catch (error) {
      showCreateError(error.message || "No se pudo crear el admin.");
    } finally {
      setCreateLoading(false);
    }
  });

  editAdminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideEditError();
    setEditLoading(true);

    try {
      const formData = new FormData(editAdminForm);

      const adminId = formData.get("editId")?.toString();
      const payload = {
        firstName: formData.get("editFirstName")?.toString().trim(),
        lastName: formData.get("editLastName")?.toString().trim(),
        email: formData.get("editEmail")?.toString().trim(),
        isActive: document.getElementById("editIsActive").checked
      };

      if (!adminId) {
        throw new Error("No se encontró el admin a editar.");
      }

      if (!payload.firstName || !payload.lastName || !payload.email) {
        throw new Error("Completá todos los campos.");
      }

      await updateSuperAdminAdmin(adminId, payload);
      closeEditModal();
      await loadAdmins();
    } catch (error) {
      showEditError(error.message || "No se pudo editar el admin.");
    } finally {
      setEditLoading(false);
    }
  });

  saveAssignedCompaniesButton.addEventListener("click", async () => {
    if (!selectedAdminForCompanies || isSavingCompanies) return;

    hideManageCompaniesError();

    const selectedIds = [...selectedAssignCompanyIds];

    if (!selectedIds.length) {
      closeManageCompaniesModal();
      return;
    }

    setManageCompaniesLoading(true);

    try {
      await assignCompaniesToSuperAdminAdmin(selectedAdminForCompanies.id, selectedIds);
      await loadAdmins();
      closeManageCompaniesModal();
    } catch (error) {
      showManageCompaniesError(error.message || "No se pudieron asignar las empresas.");
      setManageCompaniesLoading(false);
    }
  });

  createCompanySearchInput.addEventListener("input", (event) => {
  renderCreateCompanySearchResults(event.target.value);
});

assignCompanySearchInput.addEventListener("input", (event) => {
  renderAssignCompanySearchResults(event.target.value);
});

createCompanySearchResults.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='add-company']");
  if (!button) return;

  const companyId = button.dataset.id;
  const type = button.dataset.type;

  if (!companyId || !type) return;

  addSelectedCompany(type, companyId);
});

assignCompanySearchResults.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='add-company']");
  if (!button) return;

  const companyId = button.dataset.id;
  const type = button.dataset.type;

  if (!companyId || !type) return;

  addSelectedCompany(type, companyId);
});

createSelectedCompanies.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='remove-selected-company']");
  if (!button) return;

  const companyId = button.dataset.id;
  const type = button.dataset.type;

  if (!companyId || !type) return;

  removeSelectedCompany(type, companyId);
});

assignSelectedCompanies.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='remove-selected-company']");
  if (!button) return;

  const companyId = button.dataset.id;
  const type = button.dataset.type;

  if (!companyId || !type) return;

  removeSelectedCompany(type, companyId);
});

  assignedCompaniesList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='remove-company']");
    if (!button) return;

    const adminId = button.dataset.adminId;
    const companyId = button.dataset.companyId;

    if (!adminId || !companyId) return;

    askRemoveCompanyFromAdmin(adminId, companyId);
  });

  adminsTableBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const adminId = button.dataset.id;
    if (!adminId) return;

    hideError();

    if (action === "edit") {
      const admin = findAdminById(adminId);
      if (!admin) return;
      openEditModal(admin);
      return;
    }

    if (action === "companies") {
      const admin = findAdminById(adminId);
      if (!admin) return;
      openManageCompaniesModal(admin);
      return;
    }

    if (action === "toggle") {
      askToggleAdmin(adminId);
      return;
    }

    if (action === "delete") {
      askDeleteAdmin(adminId);
    }
  });

  await loadCompanies();
  await loadAdmins();
}

init().catch(() => {
  //window.location.href = "/src/pages/auth/login.html";
  throw new Error("Se encontraron errores en superadmin");
});