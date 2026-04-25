import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth, logoutAndRedirect } from "../../../shared/js/session.js";
import { apiFetch } from "../../../shared/js/api.js";
import { getSuperAdminCompanies } from "../../../shared/js/superadmin-company-service.js";

const logoutButton = document.getElementById("logoutButton");

const errorBox = document.getElementById("errorBox");
const successBox = document.getElementById("successBox");

const companySearchInput = document.getElementById("companySearchInput");
const companySelect = document.getElementById("companySelect");

const selectedCompanyName = document.getElementById("selectedCompanyName");
const selectedCompanySlug = document.getElementById("selectedCompanySlug");

const configStatusText = document.getElementById("configStatusText");
const openBillingModalButton = document.getElementById("openBillingModalButton");

const basePriceText = document.getElementById("basePriceText");
const includedUsersText = document.getElementById("includedUsersText");
const extraModeText = document.getElementById("extraModeText");
const extraUserPriceText = document.getElementById("extraUserPriceText");
const extraFixedAmountText = document.getElementById("extraFixedAmountText");
const billingDayText = document.getElementById("billingDayText");
const notifyDaysBeforeText = document.getElementById("notifyDaysBeforeText");

const overviewPeriod = document.getElementById("overviewPeriod");
const currentStudentsText = document.getElementById("currentStudentsText");
const maxStudentsText = document.getElementById("maxStudentsText");
const extraUsersText = document.getElementById("extraUsersText");
const extraAmountText = document.getElementById("extraAmountText");
const totalAmountText = document.getElementById("totalAmountText");

const billingModal = document.getElementById("billingModal");
const billingModalTitle = document.getElementById("billingModalTitle");
const billingModalSubtitle = document.getElementById("billingModalSubtitle");
const closeBillingModalButton = document.getElementById("closeBillingModalButton");
const cancelBillingModalButton = document.getElementById("cancelBillingModalButton");
const billingForm = document.getElementById("billingForm");
const billingFormError = document.getElementById("billingFormError");
const saveButton = document.getElementById("saveButton");

const basePriceInput = document.getElementById("basePriceInput");
const includedUsersInput = document.getElementById("includedUsersInput");
const extraModeInput = document.getElementById("extraModeInput");
const extraUserPriceInput = document.getElementById("extraUserPriceInput");
const extraFixedAmountInput = document.getElementById("extraFixedAmountInput");
const billingDayInput = document.getElementById("billingDayInput");
const notifyDaysBeforeInput = document.getElementById("notifyDaysBeforeInput");

let allCompanies = [];
let filteredCompanies = [];
let selectedCompanyId = null;
let currentConfig = null;
let isSaving = false;

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  successBox.classList.add("hidden");
}

function showSuccess(message) {
  successBox.textContent = message;
  successBox.classList.remove("hidden");
  errorBox.classList.add("hidden");
}

function hideMessages() {
  errorBox.textContent = "";
  successBox.textContent = "";
  errorBox.classList.add("hidden");
  successBox.classList.add("hidden");
}

function showFormError(message) {
  billingFormError.textContent = message;
  billingFormError.classList.remove("hidden");
}

function hideFormError() {
  billingFormError.textContent = "";
  billingFormError.classList.add("hidden");
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(number);
}

function formatExtraMode(value) {
  return Number(value) === 2 ? "Monto fijo global" : "Por alumno adicional";
}

function setSaveLoading(value) {
  isSaving = value;
  saveButton.disabled = value;
  saveButton.textContent = value ? "Guardando..." : "Guardar configuración";
}

function getSelectedCompany() {
  return allCompanies.find((company) => String(company.id) === String(selectedCompanyId));
}

function renderCompanySelect() {
  if (!filteredCompanies.length) {
    companySelect.innerHTML = `<option value="">No hay empresas para mostrar</option>`;
    selectedCompanyId = null;
    renderSelectedCompany();
    renderConfig(null);
    renderOverview(null);
    return;
  }

  companySelect.innerHTML = filteredCompanies
    .map((company) => `
      <option value="${company.id}">
        ${company.name} (${company.slug})
      </option>
    `)
    .join("");

  if (!selectedCompanyId || !filteredCompanies.some((x) => String(x.id) === String(selectedCompanyId))) {
    selectedCompanyId = filteredCompanies[0].id;
  }

  companySelect.value = selectedCompanyId;
  renderSelectedCompany();
}

function filterCompanies(term) {
  const normalized = term.trim().toLowerCase();

  filteredCompanies = allCompanies.filter((company) => {
    const text = `${company.name ?? ""} ${company.slug ?? ""}`.toLowerCase();
    return !normalized || text.includes(normalized);
  });

  renderCompanySelect();
}

function renderSelectedCompany() {
  const company = getSelectedCompany();

  selectedCompanyName.textContent = company?.name || "-";
  selectedCompanySlug.textContent = company?.slug || "-";
  billingModalSubtitle.textContent = company
    ? `${company.name} (${company.slug})`
    : "-";
}

function renderConfig(config) {
  currentConfig = config;

  if (!config) {
    configStatusText.textContent = "Esta empresa todavía no tiene configuración de facturación.";
    basePriceText.textContent = "-";
    includedUsersText.textContent = "-";
    extraModeText.textContent = "-";
    extraUserPriceText.textContent = "-";
    extraFixedAmountText.textContent = "-";
    billingDayText.textContent = "-";
    notifyDaysBeforeText.textContent = "-";
    openBillingModalButton.textContent = "Nueva facturación";
    return;
  }

  configStatusText.textContent = "Configuración activa.";
  basePriceText.textContent = formatMoney(config.basePrice);
  includedUsersText.textContent = config.includedUsers ?? 0;
  extraModeText.textContent = formatExtraMode(config.extraChargeMode);
  extraUserPriceText.textContent = formatMoney(config.extraUserPrice);
  extraFixedAmountText.textContent = formatMoney(config.extraFixedAmount);
  billingDayText.textContent = config.billingDay ?? "-";
  notifyDaysBeforeText.textContent = config.notifyDaysBefore ?? "-";
  openBillingModalButton.textContent = "Editar facturación";
}

function renderOverview(data) {
  if (!data) {
    overviewPeriod.textContent = "-";
    currentStudentsText.textContent = "-";
    maxStudentsText.textContent = "-";
    extraUsersText.textContent = "-";
    extraAmountText.textContent = formatMoney(0);
    totalAmountText.textContent = formatMoney(0);
    return;
  }

  overviewPeriod.textContent = `${String(data.month).padStart(2, "0")}/${data.year}`;
  currentStudentsText.textContent = data.currentActiveStudents ?? 0;
  maxStudentsText.textContent = data.maxStudentsInMonth ?? 0;
  extraUsersText.textContent = data.extraUsers ?? 0;
  extraAmountText.textContent = formatMoney(data.extraAmount);
  totalAmountText.textContent = formatMoney(data.totalAmount);
}

function fillModalForm() {
  hideFormError();

  billingModalTitle.textContent = currentConfig
    ? "Editar facturación"
    : "Alta de facturación";

  basePriceInput.value = currentConfig?.basePrice ?? "";
  includedUsersInput.value = currentConfig?.includedUsers ?? "";
  extraModeInput.value = String(currentConfig?.extraChargeMode ?? "1");
  extraUserPriceInput.value = currentConfig?.extraUserPrice ?? "";
  extraFixedAmountInput.value = currentConfig?.extraFixedAmount ?? "";
  billingDayInput.value = currentConfig?.billingDay ?? "10";
  notifyDaysBeforeInput.value = currentConfig?.notifyDaysBefore ?? "3";
}

function openBillingModal() {
  if (!selectedCompanyId) {
    showError("Seleccioná una empresa.");
    return;
  }

  fillModalForm();
  billingModal.classList.remove("hidden");
}

function closeBillingModal() {
  if (isSaving) return;
  hideFormError();
  billingModal.classList.add("hidden");
}

async function loadCompanies() {
  allCompanies = await getSuperAdminCompanies();
  filteredCompanies = [...allCompanies];

  if (!allCompanies.length) {
    companySelect.innerHTML = `<option value="">No hay empresas disponibles</option>`;
    selectedCompanyId = null;
    return;
  }

  selectedCompanyId = allCompanies[0].id;
  renderCompanySelect();
}

async function loadBillingConfig() {
  if (!selectedCompanyId) return;

  const data = await apiFetch(`/api/superadmin/billing/${selectedCompanyId}`);
  renderConfig(data || null);
}

async function loadOverview() {
  if (!selectedCompanyId) return;

  try {
    const data = await apiFetch(`/api/superadmin/billing/${selectedCompanyId}/overview`);
    renderOverview(data);
  } catch {
    renderOverview(null);
  }
}

async function loadSelectedCompanyData() {
  hideMessages();
  renderSelectedCompany();
  await loadBillingConfig();
  await loadOverview();
}

function buildPayload() {
  return {
    companyId: selectedCompanyId,
    basePrice: Number(basePriceInput.value || 0),
    includedUsers: Number(includedUsersInput.value || 0),
    extraChargeMode: Number(extraModeInput.value || 1),
    extraUserPrice: Number(extraUserPriceInput.value || 0),
    extraFixedAmount: Number(extraFixedAmountInput.value || 0),
    billingDay: Number(billingDayInput.value || 10),
    notifyDaysBefore: Number(notifyDaysBeforeInput.value || 3)
  };
}

function validatePayload(payload) {
  if (!payload.companyId) return "Seleccioná una empresa.";
  if (payload.basePrice < 0) return "El precio base no puede ser negativo.";
  if (payload.includedUsers < 0) return "Los alumnos incluidos no pueden ser negativos.";
  if (payload.extraUserPrice < 0) return "El precio por alumno extra no puede ser negativo.";
  if (payload.extraFixedAmount < 0) return "El monto fijo extra no puede ser negativo.";
  if (payload.billingDay < 1 || payload.billingDay > 28) return "El día de facturación debe estar entre 1 y 28.";
  if (payload.notifyDaysBefore < 0 || payload.notifyDaysBefore > 15) return "Los días de aviso deben estar entre 0 y 15.";

  return "";
}

async function saveBillingConfig() {
  hideFormError();

  const payload = buildPayload();
  const validationError = validatePayload(payload);

  if (validationError) {
    showFormError(validationError);
    return;
  }

  setSaveLoading(true);

  try {
    await apiFetch("/api/superadmin/billing", {
      method: "POST",
      body: payload
    });

    closeBillingModal();
    showSuccess("Configuración guardada correctamente.");
    await loadSelectedCompanyData();
  } catch (error) {
    showFormError(error.message || "No se pudo guardar la configuración.");
  } finally {
    setSaveLoading(false);
  }
}

function bindEvents() {
  logoutButton?.addEventListener("click", logoutAndRedirect);

  companySearchInput?.addEventListener("input", async (event) => {
    filterCompanies(event.target.value);
    await loadSelectedCompanyData();
  });

  companySelect?.addEventListener("change", async () => {
    selectedCompanyId = companySelect.value;
    await loadSelectedCompanyData();
  });

  openBillingModalButton?.addEventListener("click", openBillingModal);

  closeBillingModalButton?.addEventListener("click", closeBillingModal);
  cancelBillingModalButton?.addEventListener("click", closeBillingModal);

  billingModal?.addEventListener("click", (event) => {
    if (event.target === billingModal) {
      closeBillingModal();
    }
  });

  billingForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveBillingConfig();
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

  bindEvents();

  await loadCompanies();

  if (selectedCompanyId) {
    await loadSelectedCompanyData();
  }
}

init().catch((error) => {
  console.error("Error al inicializar facturación:", error);
  showError(error?.message || "No se pudo cargar facturación.");
});