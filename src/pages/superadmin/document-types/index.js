import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth, logoutAndRedirect } from "../../../shared/js/session.js";
import { get, post, put } from "../../../shared/js/api.js";

const logoutButton = document.getElementById("logoutButton");
const createButton = document.getElementById("createButton");
const searchInput = document.getElementById("searchInput");

const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const tableWrapper = document.getElementById("tableWrapper");
const tableBody = document.getElementById("tableBody");

const modal = document.getElementById("modal");
const form = document.getElementById("form");
const cancelButton = document.getElementById("cancelButton");

const idInput = document.getElementById("id");
const nameInput = document.getElementById("name");
const descriptionInput = document.getElementById("description");
const isRequiredInput = document.getElementById("isRequired");
const hasExpirationInput = document.getElementById("hasExpiration");
const expirationWarningDaysInput = document.getElementById("expirationWarningDays");
const allowMultipleFilesInput = document.getElementById("allowMultipleFiles");
const maxFilesInput = document.getElementById("maxFiles");
const maxFileSizeMbInput = document.getElementById("maxFileSizeMb");
const allowedExtensionsInput = document.getElementById("allowedExtensions");
const isActiveInput = document.getElementById("isActive");

const expirationWarningDaysWrapper = document.getElementById("expirationWarningDaysWrapper");
const maxFilesWrapper = document.getElementById("maxFilesWrapper");

const DOCUMENT_TYPES_COMPANY_KEY = "classclick_superadmin_document_company_slug";
const companySlug = localStorage.getItem(DOCUMENT_TYPES_COMPANY_KEY);

let list = [];
let filtered = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStatusBadge(isActive) {
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

function getBooleanBadge(value, trueText, falseText) {
  if (value) {
    return `
      <span class="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
        ${escapeHtml(trueText)}
      </span>
    `;
  }

  return `
    <span class="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
      ${escapeHtml(falseText)}
    </span>
  `;
}

function showLoading() {
  loadingState.classList.remove("hidden");
  emptyState.classList.add("hidden");
  tableWrapper.classList.add("hidden");
}

function hideLoading() {
  loadingState.classList.add("hidden");
}

function toggleExpirationVisibility() {
  const hasExpiration = hasExpirationInput.checked;

  expirationWarningDaysWrapper.classList.toggle("hidden", !hasExpiration);
  expirationWarningDaysInput.disabled = !hasExpiration;

  if (!hasExpiration) {
    expirationWarningDaysInput.value = "";
  }
}

function toggleMultipleFilesVisibility() {
  const allowMultipleFiles = allowMultipleFilesInput.checked;

  maxFilesWrapper.classList.toggle("hidden", !allowMultipleFiles);
  maxFilesInput.disabled = !allowMultipleFiles;

  if (!allowMultipleFiles) {
    maxFilesInput.value = "";
  } else if (!maxFilesInput.value.trim()) {
    maxFilesInput.value = "2";
  }
}

function render() {
  if (!filtered.length) {
    tableWrapper.classList.add("hidden");
    emptyState.classList.remove("hidden");
    tableBody.innerHTML = "";
    return;
  }

  emptyState.classList.add("hidden");
  tableWrapper.classList.remove("hidden");

  tableBody.innerHTML = filtered.map((item) => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3">
        <div class="font-medium text-slate-900">${escapeHtml(item.name)}</div>
        <div class="text-xs text-slate-500">${escapeHtml(item.description || "-")}</div>
      </td>

      <td class="px-4 py-3">
        ${getBooleanBadge(item.isRequired, "Sí", "No")}
      </td>

      <td class="px-4 py-3 text-sm text-slate-600">
        ${
          item.hasExpiration
            ? `
              <div class="flex flex-col gap-1">
                ${getBooleanBadge(true, "Sí", "No")}
                <span class="text-xs text-slate-500">
                  ${item.expirationWarningDays != null
                    ? `Aviso: ${escapeHtml(item.expirationWarningDays)} día(s) antes`
                    : "Sin aviso configurado"}
                </span>
              </div>
            `
            : getBooleanBadge(false, "Sí", "No")
        }
      </td>

      <td class="px-4 py-3 text-sm text-slate-600">
        ${
          item.allowMultipleFiles
            ? `
              <div class="flex flex-col gap-1">
                ${getBooleanBadge(true, "Sí", "No")}
                <span class="text-xs text-slate-500">
                  Máximo: ${escapeHtml(item.maxFiles ?? "-")} archivo(s)
                </span>
              </div>
            `
            : getBooleanBadge(false, "Sí", "No")
        }
      </td>

      <td class="px-4 py-3">
        ${getStatusBadge(item.isActive)}
      </td>

      <td class="px-4 py-3 text-right">
        <button
          type="button"
          data-action="edit"
          data-id="${escapeHtml(item.id)}"
          class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
          Editar
        </button>
      </td>
    </tr>
  `).join("");
}

function applyFilter() {
  const value = searchInput.value.trim().toLowerCase();

  if (!value) {
    filtered = [...list];
    render();
    return;
  }

  filtered = list.filter((x) =>
    (x.name || "").toLowerCase().includes(value) ||
    (x.description || "").toLowerCase().includes(value)
  );

  render();
}

function resetForm() {
  form.reset();
  idInput.value = "";
  nameInput.value = "";
  descriptionInput.value = "";
  isRequiredInput.checked = false;
  hasExpirationInput.checked = false;
  expirationWarningDaysInput.value = "";
  allowMultipleFilesInput.checked = false;
  maxFilesInput.value = "";
  maxFileSizeMbInput.value = "10";
  allowedExtensionsInput.value = ".pdf,.jpg,.jpeg,.png";
  isActiveInput.checked = true;

  toggleExpirationVisibility();
  toggleMultipleFilesVisibility();
}

function openModal(data = null) {
  resetForm();

  if (data) {
    idInput.value = data.id || "";
    nameInput.value = data.name || "";
    descriptionInput.value = data.description || "";
    isRequiredInput.checked = !!data.isRequired;
    hasExpirationInput.checked = !!data.hasExpiration;
    expirationWarningDaysInput.value = data.expirationWarningDays ?? "";
    allowMultipleFilesInput.checked = !!data.allowMultipleFiles;
maxFilesInput.value = data.maxFiles ?? (data.allowMultipleFiles ? "2" : "");
    maxFileSizeMbInput.value = data.maxFileSizeMb ?? "10";
    allowedExtensionsInput.value = data.allowedExtensions || ".pdf,.jpg,.jpeg,.png";
    isActiveInput.checked = !!data.isActive;
  }

  toggleExpirationVisibility();
  toggleMultipleFilesVisibility();

  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

async function load() {
  if (!companySlug) {
    alert("No se recibió la empresa.");
    window.location.href = "/src/pages/superadmin/companies/index.html";
    return;
  }

  showLoading();

  try {
    list = await get(`/api/superadmin/companies/${encodeURIComponent(companySlug)}/document-types`);
    filtered = [...list];
    render();
  } finally {
    hideLoading();
  }
}

async function save(event) {
  event.preventDefault();

  if (!companySlug) {
    alert("No se pudo resolver la empresa.");
    return;
  }

  const hasExpiration = hasExpirationInput.checked;
  const allowMultipleFiles = allowMultipleFilesInput.checked;

  const expirationWarningDaysRaw = expirationWarningDaysInput.value.trim();
  const maxFilesRaw = maxFilesInput.value.trim();
  const maxFileSizeMbRaw = maxFileSizeMbInput.value.trim();
  const allowedExtensionsRaw = allowedExtensionsInput.value.trim();

  const payload = {
    name: nameInput.value.trim(),
    description: descriptionInput.value.trim() || null,
    isRequired: isRequiredInput.checked,
    hasExpiration,
    expirationWarningDays: hasExpiration
      ? Number(expirationWarningDaysRaw)
      : null,
    allowMultipleFiles,
    maxFiles: allowMultipleFiles
      ? Number(maxFilesRaw)
      : 1,
    maxFileSizeMb: Number(maxFileSizeMbRaw),
    allowedExtensions: allowedExtensionsRaw,
    isActive: isActiveInput.checked
  };

  if (!payload.name) {
    alert("El nombre es obligatorio.");
    return;
  }

  if (hasExpiration) {
    if (!expirationWarningDaysRaw) {
      alert("Los días de aviso de vencimiento son obligatorios.");
      return;
    }

    if (Number.isNaN(payload.expirationWarningDays) || payload.expirationWarningDays < 0) {
      alert("Los días de aviso de vencimiento son inválidos.");
      return;
    }
  }

  if (allowMultipleFiles) {
    if (!maxFilesRaw) {
      alert("La cantidad máxima de archivos es obligatoria.");
      return;
    }

    if (Number.isNaN(payload.maxFiles) || payload.maxFiles < 2) {
      alert("La cantidad máxima de archivos debe ser 2 o mayor.");
      return;
    }
  }

  if (!allowMultipleFiles) {
    payload.maxFiles = 1;
  }

  if (!maxFileSizeMbRaw) {
    alert("El tamaño máximo por archivo es obligatorio.");
    return;
  }

  if (Number.isNaN(payload.maxFileSizeMb) || payload.maxFileSizeMb <= 0) {
    alert("El tamaño máximo por archivo es inválido.");
    return;
  }

  if (!payload.allowedExtensions) {
    alert("Las extensiones permitidas son obligatorias.");
    return;
  }

  if (idInput.value) {
    await put(
      `/api/superadmin/companies/${encodeURIComponent(companySlug)}/document-types/${idInput.value}`,
      payload
    );
  } else {
    await post(
      `/api/superadmin/companies/${encodeURIComponent(companySlug)}/document-types`,
      payload
    );
  }

  closeModal();
  await load();
}

function bindEvents() {
  logoutButton?.addEventListener("click", logoutAndRedirect);

  createButton?.addEventListener("click", () => openModal());

  cancelButton?.addEventListener("click", closeModal);

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  searchInput?.addEventListener("input", applyFilter);

  form?.addEventListener("submit", save);

  hasExpirationInput?.addEventListener("change", toggleExpirationVisibility);
  allowMultipleFilesInput?.addEventListener("change", toggleMultipleFilesVisibility);

  tableBody?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='edit']");
    if (!button) return;

    const itemId = button.dataset.id;
    const item = list.find((x) => x.id === itemId);

    if (!item) return;

    openModal(item);
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

  if (!companySlug) {
    alert("No se recibió la empresa.");
    window.location.href = "/src/pages/superadmin/companies/index.html";
    return;
  }

  bindEvents();
  await load();
}

init().catch((error) => {
  console.error("Error al inicializar document-types:", error);
  hideLoading();
  alert(error?.message || "No se pudo cargar la pantalla.");
});