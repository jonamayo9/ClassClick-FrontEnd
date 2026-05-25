import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth, logoutAndRedirect } from "../../../shared/js/session.js";
import {
  getSuperAdminCompanies,
  createSuperAdminCompany,
  updateSuperAdminCompany,
  setSuperAdminCompanyStatus,
  uploadSuperAdminCompanyLogo
} from "../../../shared/js/superadmin-company-service.js";
import { get, post, put, del } from "../../../shared/js/api.js";

const logoutButton = document.getElementById("logoutButton");
const newCompanyButton = document.getElementById("newCompanyButton");
const searchInput = document.getElementById("searchInput");

const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const emptyState = document.getElementById("emptyState");
const tableWrapper = document.getElementById("tableWrapper");
const companiesTableBody = document.getElementById("companiesTableBody");

const totalCompaniesCount = document.getElementById("totalCompaniesCount");
const activeCompaniesCount = document.getElementById("activeCompaniesCount");
const inactiveCompaniesCount = document.getElementById("inactiveCompaniesCount");
const superAdminPaymentMethodsList = document.getElementById("superAdminPaymentMethodsList");
const companyModal = document.getElementById("companyModal");
const companyModalTitle = document.getElementById("companyModalTitle");
const closeCompanyModalButton = document.getElementById("closeCompanyModalButton");
const cancelCompanyModalButton = document.getElementById("cancelCompanyModalButton");
const companyForm = document.getElementById("companyForm");
const companyFormError = document.getElementById("companyFormError");
const saveCompanyButton = document.getElementById("saveCompanyButton");
const isActiveWrapper = document.getElementById("isActiveWrapper");

const nameInput = document.getElementById("nameInput");
const slugInput = document.getElementById("slugInput");
const descriptionInput = document.getElementById("descriptionInput");
const emailInput = document.getElementById("emailInput");
const phoneInput = document.getElementById("phoneInput");
const whatsappInput = document.getElementById("whatsappInput");
const countryInput = document.getElementById("countryInput");
const addressLine1Input = document.getElementById("addressLine1Input");
const addressLine2Input = document.getElementById("addressLine2Input");
const cityInput = document.getElementById("cityInput");
const stateOrProvinceInput = document.getElementById("stateOrProvinceInput");
const postalCodeInput = document.getElementById("postalCodeInput");
const logoFileInput = document.getElementById("logoFileInput");
const logoPreviewWrapper = document.getElementById("logoPreviewWrapper");
const logoPreviewImage = document.getElementById("logoPreviewImage");
const isActiveInput = document.getElementById("isActiveInput");
const clothingManualProofInput = document.getElementById("clothingManualProofInput");
const clothingMercadoPagoInput = document.getElementById("clothingMercadoPagoInput");
const clothingPaymentAliasInput = document.getElementById("clothingPaymentAliasInput");
const clothingPaymentAliasHolderInput = document.getElementById("clothingPaymentAliasHolderInput");
const statusModal = document.getElementById("statusModal");
const statusModalTitle = document.getElementById("statusModalTitle");
const statusModalText = document.getElementById("statusModalText");
const statusModalError = document.getElementById("statusModalError");
const cancelStatusModalButton = document.getElementById("cancelStatusModalButton");
const confirmStatusModalButton = document.getElementById("confirmStatusModalButton");

const modulePaymentsInput = document.getElementById("modulePaymentsInput");
const moduleDocumentsInput = document.getElementById("moduleDocumentsInput");
const moduleNewsInput = document.getElementById("moduleNewsInput");
const moduleMatchesInput = document.getElementById("moduleMatchesInput");
const moduleClothingInput = document.getElementById("moduleClothingInput");
const moduleTournamentsInput = document.getElementById("moduleTournamentsInput");
const moduleNotificationsInput = document.getElementById("moduleNotificationsInput");
const mobileCompaniesList = document.getElementById("mobileCompaniesList");
const moduleSponsorsInput = document.getElementById("moduleSponsorsInput");

const actionsDropdown = document.getElementById("actionsDropdown");
const actionsEditButton = document.getElementById("actionsEditButton");
const actionsDocumentsLink = document.getElementById("actionsDocumentsLink");
const actionsToggleStatusButton = document.getElementById("actionsToggleStatusButton");

const openCompanyLinkModalButton = document.getElementById("openCompanyLinkModalButton");
const companyLinkModal = document.getElementById("companyLinkModal");
const closeCompanyLinkModalButton = document.getElementById("closeCompanyLinkModalButton");
const cancelCompanyLinkModalButton = document.getElementById("cancelCompanyLinkModalButton");
const saveCompanyLinkButton = document.getElementById("saveCompanyLinkButton");
const companyLinkSourceInput = document.getElementById("companyLinkSourceInput");
const companyLinkTargetInput = document.getElementById("companyLinkTargetInput");
const companyLinkFormError = document.getElementById("companyLinkFormError");
const companyLinksList = document.getElementById("companyLinksList");
const companyLinksEmpty = document.getElementById("companyLinksEmpty");
const companyLinksError = document.getElementById("companyLinksError");

let allCompanies = [];
let companyModalMode = "create";
let selectedCompanyId = null;
let statusTargetCompany = null;
let isSavingCompany = false;
let isChangingStatus = false;
let currentLogoPreviewObjectUrl = null;
let companyLinks = [];
let isSavingCompanyLink = false;
let openedActionsCompanyId = null;

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
    return `
      <span class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Activa
      </span>
    `;
  }

  return `
    <span class="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
      Inactiva
    </span>
  `;
}

function updateCounters(items) {
  totalCompaniesCount.textContent = String(items.length);
  activeCompaniesCount.textContent = String(items.filter((x) => x.isActive).length);
  inactiveCompaniesCount.textContent = String(items.filter((x) => !x.isActive).length);
}

function renderCompanies(items) {
  if (mobileCompaniesList) {
  mobileCompaniesList.innerHTML = "";
}
  companiesTableBody.innerHTML = "";
  updateCounters(allCompanies);

if (!items.length) {
  tableWrapper.classList.add("hidden");
  emptyState.classList.remove("hidden");

  if (mobileCompaniesList) {
    mobileCompaniesList.innerHTML = "";
  }

  return;
}

  emptyState.classList.add("hidden");
  tableWrapper.classList.remove("hidden");

  companiesTableBody.innerHTML = items.map((company) => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-4">
        <div class="flex items-center gap-3">
          ${company.logoUrl
            ? `<img src="${escapeHtml(company.logoUrl)}" alt="${escapeHtml(company.name)}" class="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain p-1" />`
            : `<div class="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-400">LOGO</div>`
          }
          <div class="font-medium text-slate-900">${escapeHtml(company.name)}</div>
        </div>
      </td>
      <td class="px-4 py-4 text-sm text-slate-600">${escapeHtml(company.slug)}</td>
      <td class="px-4 py-4 text-sm text-slate-600">${escapeHtml(company.email || "-")}</td>
      <td class="px-4 py-4 text-sm text-slate-600">${escapeHtml(company.phone || "-")}</td>
      <td class="px-4 py-4 text-sm text-slate-600">${escapeHtml(company.adminsCount ?? 0)}</td>
      <td class="px-4 py-4">${getStatusBadge(company.isActive)}</td>
      <td class="px-4 py-4 text-sm text-slate-600">${formatDate(company.createdAtUtc)}</td>
      <td class="px-4 py-4 text-right">
        <button
          type="button"
          data-action="toggle-menu"
          data-id="${escapeHtml(company.id)}"
          class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          Acciones
        </button>
      </td>
    </tr>
  `).join("");

  if (mobileCompaniesList) {
  mobileCompaniesList.innerHTML = items.map((company) => `
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex items-start gap-3">
        ${company.logoUrl
          ? `<img src="${escapeHtml(company.logoUrl)}" alt="${escapeHtml(company.name)}" class="h-12 w-12 rounded-xl border border-slate-200 bg-white object-contain p-1" />`
          : `<div class="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-400">LOGO</div>`
        }

        <div class="min-w-0 flex-1">
          <div class="font-semibold text-slate-900">${escapeHtml(company.name)}</div>
          <div class="mt-0.5 text-xs text-slate-500">${escapeHtml(company.slug)}</div>
          <div class="mt-2">${getStatusBadge(company.isActive)}</div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div>
          <span class="block text-slate-400">Email</span>
          <span class="break-all">${escapeHtml(company.email || "-")}</span>
        </div>
        <div>
          <span class="block text-slate-400">Teléfono</span>
          <span>${escapeHtml(company.phone || "-")}</span>
        </div>
        <div>
          <span class="block text-slate-400">Admins</span>
          <span>${escapeHtml(company.adminsCount ?? 0)}</span>
        </div>
        <div>
          <span class="block text-slate-400">Alta</span>
          <span>${formatDate(company.createdAtUtc)}</span>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          data-action="edit"
          data-id="${escapeHtml(company.id)}"
          class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
          Editar
        </button>

        <button
          type="button"
          data-action="toggle-status"
          data-id="${escapeHtml(company.id)}"
          class="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
          ${company.isActive ? "Desactivar" : "Activar"}
        </button>
      </div>
    </div>
  `).join("");
}
}

function renderSuperAdminPaymentMethods(items) {
  if (!superAdminPaymentMethodsList) return;

  superAdminPaymentMethodsList.innerHTML = items.map(item => `
    <label class="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3">
      <div>
        <div class="text-sm font-medium text-slate-700">
          ${escapeHtml(item.paymentMethodName)}
        </div>

<div class="mt-0.5 text-xs text-slate-400">
  ${escapeHtml(item.paymentMethod)}
</div>

${item.paymentMethod === "MercadoPago" ? `
  <label class="mt-2 flex items-center gap-2 text-xs text-slate-500">
    <input
      type="checkbox"
      class="superadmin-payment-method-auto-collection h-4 w-4"
      data-payment-method="${escapeHtml(item.paymentMethod)}"
      ${item.autoCollectionEnabledBySuperAdmin ? "checked" : ""}
    />

    <span>
      Permitir cobro automático
    </span>
  </label>
` : ""}
      </div>

      <input
        type="checkbox"
        class="superadmin-payment-method-toggle h-5 w-5 shrink-0"
        data-payment-method="${escapeHtml(item.paymentMethod)}"
        ${item.enabledBySuperAdmin ? "checked" : ""}
      />
    </label>
  `).join("");
}

function showCompanyLinksError(message) {
  if (!companyLinksError) return;

  companyLinksError.textContent = message;
  companyLinksError.classList.remove("hidden");
}

function hideCompanyLinksError() {
  if (!companyLinksError) return;

  companyLinksError.textContent = "";
  companyLinksError.classList.add("hidden");
}

function showCompanyLinkFormError(message) {
  if (!companyLinkFormError) return;

  companyLinkFormError.textContent = message;
  companyLinkFormError.classList.remove("hidden");
}

function hideCompanyLinkFormError() {
  if (!companyLinkFormError) return;

  companyLinkFormError.textContent = "";
  companyLinkFormError.classList.add("hidden");
}

function setCompanyLinkLoading(value) {
  isSavingCompanyLink = value;

  if (!saveCompanyLinkButton) return;

  saveCompanyLinkButton.disabled = value;
  saveCompanyLinkButton.textContent = value
    ? "Vinculando..."
    : "Vincular empresas";
}

async function loadCompanyLinks() {
  hideCompanyLinksError();

  try {
    companyLinks = await get("/api/superadmin/companies/links");
    renderCompanyLinks();
  } catch (error) {
    companyLinks = [];
    renderCompanyLinks();
    showCompanyLinksError(error.message || "No se pudieron cargar las vinculaciones.");
  }
}

function renderCompanyLinks() {
  if (!companyLinksList || !companyLinksEmpty) return;

  companyLinksList.innerHTML = "";

  if (!companyLinks.length) {
    companyLinksEmpty.classList.remove("hidden");
    return;
  }

  companyLinksEmpty.classList.add("hidden");

  companyLinksList.innerHTML = companyLinks.map(link => `
    <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-slate-900">
            ${escapeHtml(link.sourceCompanyName)}
          </div>

          <div class="my-2 text-xs font-bold text-blue-600">
            ↔ vinculada con
          </div>

          <div class="text-sm font-semibold text-slate-900">
            ${escapeHtml(link.targetCompanyName)}
          </div>

          <div class="mt-2 text-xs text-slate-500">
            Estado: ${escapeHtml(link.status || "-")}
          </div>
        </div>

        <button
          type="button"
          data-action="delete-company-link"
          data-id="${escapeHtml(link.id)}"
          class="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
          Eliminar
        </button>
      </div>
    </article>
  `).join("");
}

function buildCompanyLinkOptions(selectedId = "") {
  return `
    <option value="">Seleccionar empresa</option>
    ${allCompanies
      .filter(company => company.isActive)
      .map(company => `
        <option value="${escapeHtml(company.id)}" ${company.id === selectedId ? "selected" : ""}>
          ${escapeHtml(company.name)} · ${escapeHtml(company.slug)}
        </option>
      `).join("")}
  `;
}

function openCompanyLinkModal() {
  hideCompanyLinkFormError();

  if (!companyLinkSourceInput || !companyLinkTargetInput || !companyLinkModal) return;

  companyLinkSourceInput.innerHTML = buildCompanyLinkOptions();
  companyLinkTargetInput.innerHTML = buildCompanyLinkOptions();

  setCompanyLinkLoading(false);
  companyLinkModal.classList.remove("hidden");
}

function closeCompanyLinkModal() {
  if (isSavingCompanyLink) return;

  hideCompanyLinkFormError();
  companyLinkModal?.classList.add("hidden");
}

async function saveCompanyLink() {
  if (isSavingCompanyLink) return;

  hideCompanyLinkFormError();

  const sourceCompanyId = companyLinkSourceInput?.value || "";
  const targetCompanyId = companyLinkTargetInput?.value || "";

  if (!sourceCompanyId) {
    showCompanyLinkFormError("Seleccioná la empresa A.");
    return;
  }

  if (!targetCompanyId) {
    showCompanyLinkFormError("Seleccioná la empresa B.");
    return;
  }

  if (sourceCompanyId === targetCompanyId) {
    showCompanyLinkFormError("No podés vincular una empresa consigo misma.");
    return;
  }

  setCompanyLinkLoading(true);

  try {
    await post("/api/superadmin/companies/links", {
      sourceCompanyId,
      targetCompanyId
    });

    setCompanyLinkLoading(false);
    closeCompanyLinkModal();
    await loadCompanyLinks();
  } catch (error) {
    showCompanyLinkFormError(error.message || "No se pudo crear la vinculación.");
    setCompanyLinkLoading(false);
  }
}

async function deleteCompanyLink(linkId) {
  await del(`/api/superadmin/companies/links/${linkId}`);
  await loadCompanyLinks();
}

function filterCompanies(term) {
  const normalized = term.trim().toLowerCase();

  if (!normalized) {
    renderCompanies(allCompanies);
    return;
  }

  const filtered = allCompanies.filter((company) => {
    return [
      company.name,
      company.slug,
      company.email,
      company.phone,
      company.city,
      company.country
    ].some((value) => (value || "").toLowerCase().includes(normalized));
  });

  renderCompanies(filtered);
}

function showLoading() {
  loadingState.classList.remove("hidden");
  errorState.classList.add("hidden");
  emptyState.classList.add("hidden");
  tableWrapper.classList.add("hidden");

  if (mobileCompaniesList) {
    mobileCompaniesList.innerHTML = "";
  }
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

function showCompanyFormError(message) {
  companyFormError.textContent = message;
  companyFormError.classList.remove("hidden");
}

function hideCompanyFormError() {
  companyFormError.textContent = "";
  companyFormError.classList.add("hidden");
}

function showStatusError(message) {
  statusModalError.textContent = message;
  statusModalError.classList.remove("hidden");
}

function hideStatusError() {
  statusModalError.textContent = "";
  statusModalError.classList.add("hidden");
}

function setSaveCompanyLoading(value) {
  isSavingCompany = value;

  saveCompanyButton.disabled = value;
  saveCompanyButton.classList.toggle("opacity-60", value);
  saveCompanyButton.classList.toggle("cursor-not-allowed", value);

  saveCompanyButton.textContent = value
    ? "Guardando..."
    : companyModalMode === "create"
      ? "Guardar empresa"
      : "Guardar cambios";
}

function setChangeStatusLoading(value) {
  isChangingStatus = value;
  confirmStatusModalButton.disabled = value;
  confirmStatusModalButton.textContent = value ? "Procesando..." : "Confirmar";
}

function clearLogoPreviewObjectUrl() {
  if (currentLogoPreviewObjectUrl) {
    URL.revokeObjectURL(currentLogoPreviewObjectUrl);
    currentLogoPreviewObjectUrl = null;
  }
}

function setLogoPreview(url, isObjectUrl = false) {
  clearLogoPreviewObjectUrl();

  if (!url) {
    logoPreviewImage.src = "";
    logoPreviewWrapper.classList.add("hidden");
    return;
  }

  if (isObjectUrl) {
    currentLogoPreviewObjectUrl = url;
  }

  logoPreviewImage.src = url;
  logoPreviewWrapper.classList.remove("hidden");
}

function resetModulesForm() {
  if (modulePaymentsInput) modulePaymentsInput.checked = true;
  if (moduleDocumentsInput) moduleDocumentsInput.checked = true;
  if (moduleNewsInput) moduleNewsInput.checked = true;
  if (moduleMatchesInput) moduleMatchesInput.checked = false;
  if (moduleClothingInput) moduleClothingInput.checked = false;
  if (moduleTournamentsInput) moduleTournamentsInput.checked = false;
  if (moduleNotificationsInput) moduleNotificationsInput.checked = true;
  if (moduleSponsorsInput) moduleSponsorsInput.checked = false;
}

function resetClothingSettingsForm() {
  if (clothingManualProofInput) clothingManualProofInput.checked = true;
  if (clothingMercadoPagoInput) clothingMercadoPagoInput.checked = false;
  if (clothingPaymentAliasInput) clothingPaymentAliasInput.value = "";
if (clothingPaymentAliasHolderInput) clothingPaymentAliasHolderInput.value = "";
}

function buildModulesPayload() {
  return {
    modules: {
      payments: modulePaymentsInput?.checked === true,
      documents: moduleDocumentsInput?.checked === true,
      news: moduleNewsInput?.checked === true,
      matches: moduleMatchesInput?.checked === true,
      clothing: moduleClothingInput?.checked === true,
      tournaments: moduleTournamentsInput?.checked === true,
      notifications: moduleNotificationsInput?.checked === true,
      sponsors: moduleSponsorsInput?.checked === true,
    }
  };
}

function buildSuperAdminPaymentMethodsPayload() {
  const toggles = document.querySelectorAll(
    ".superadmin-payment-method-toggle"
  );

  return Array.from(toggles).map(toggle => {
    const paymentMethod = toggle.dataset.paymentMethod;

    const autoCollectionToggle = document.querySelector(
      `.superadmin-payment-method-auto-collection[data-payment-method="${paymentMethod}"]`
    );

    return {
      paymentMethod,
      enabledBySuperAdmin: toggle.checked,
      autoCollectionEnabledBySuperAdmin:
        autoCollectionToggle?.checked === true
    };
  });
}

async function loadCompanyModules(companyId) {
  return await get(`/api/superadmin/companies/${companyId}/clothing/modules`);
}

async function saveCompanyModules(companyId) {
  return await put(
    `/api/superadmin/companies/${companyId}/clothing/modules`,
    buildModulesPayload()
  );
}

function buildClothingSettingsPayload() {
  return {
    isEnabled: moduleClothingInput?.checked === true,
    allowsManualProof: clothingManualProofInput?.checked === true,
    allowsMercadoPago: clothingMercadoPagoInput?.checked === true,

    paymentAlias:
      clothingPaymentAliasInput?.value?.trim() || null,

    paymentAliasHolder:
      clothingPaymentAliasHolderInput?.value?.trim() || null
  };
}

async function loadClothingSettings(companyId) {
  return await get(`/api/superadmin/companies/${companyId}/clothing/settings`);
}

async function saveClothingSettings(companyId) {
  return await put(
    `/api/superadmin/companies/${companyId}/clothing/settings`,
    buildClothingSettingsPayload()
  );
}

async function loadCompanyPaymentMethods(companyId) {
  return await get(
    `/api/superadmin/companies/${companyId}/payment-methods`
  );
}

async function saveCompanyPaymentMethods(companyId, payload) {
  return await put(
    `/api/superadmin/companies/${companyId}/payment-methods`,
    payload
  );
}

function resetCompanyForm() {
  companyForm.reset();
  isActiveInput.value = "true";
  slugInput.dataset.touched = "false";
  hideCompanyFormError();

  if (logoFileInput) {
    logoFileInput.value = "";
  }

  setLogoPreview("");
  resetModulesForm();
  resetClothingSettingsForm();
}

function buildCompanyPayload() {
  return {
    name: nameInput.value.trim(),
    slug: slugInput.value.trim().toLowerCase(),
    description: descriptionInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput.value.trim(),
    whatsapp: whatsappInput.value.trim(),
    addressLine1: addressLine1Input.value.trim(),
    addressLine2: addressLine2Input.value.trim(),
    city: cityInput.value.trim(),
    stateOrProvince: stateOrProvinceInput.value.trim(),
    postalCode: postalCodeInput.value.trim(),
    country: countryInput.value.trim(),
    isActive: isActiveInput.value === "true",
    isMatchOrganizationEnabled: moduleMatchesInput?.checked === true
  };
}

function validateCompanyPayload(payload) {
  if (!payload.name) {
    return "El nombre es obligatorio.";
  }

  if (!payload.slug) {
    return "El slug es obligatorio.";
  }

  return "";
}

function openCreateCompanyModal() {
  companyModalMode = "create";
  selectedCompanyId = null;
  resetCompanyForm();
  renderSuperAdminPaymentMethods([
  { paymentMethod: "Transfer", paymentMethodName: "Transferencia", enabledBySuperAdmin: false },
  { paymentMethod: "DebitCard", paymentMethodName: "Tarjeta de débito", enabledBySuperAdmin: false },
  { paymentMethod: "CreditCard", paymentMethodName: "Tarjeta de crédito", enabledBySuperAdmin: false },
  { paymentMethod: "MercadoPago", paymentMethodName: "Mercado Pago", enabledBySuperAdmin: false },
  { paymentMethod: "Cash", paymentMethodName: "Efectivo", enabledBySuperAdmin: false }
]);
  companyModalTitle.textContent = "Nueva empresa";
  isActiveWrapper.classList.add("hidden");

  resetModulesForm();
  resetClothingSettingsForm();

  setSaveCompanyLoading(false);
  companyModal.classList.remove("hidden");
}

function openEditCompanyModal(companyId) {
  const company = allCompanies.find((x) => x.id === companyId);
  if (!company) return;

  companyModalMode = "edit";
  selectedCompanyId = companyId;
  resetCompanyForm();

  companyModalTitle.textContent = "Editar empresa";
  isActiveWrapper.classList.remove("hidden");

  nameInput.value = company.name ?? "";
  slugInput.value = company.slug ?? "";
  descriptionInput.value = company.description ?? "";
  emailInput.value = company.email ?? "";
  phoneInput.value = company.phone ?? "";
  whatsappInput.value = company.whatsapp ?? "";
  addressLine1Input.value = company.addressLine1 ?? "";
  addressLine2Input.value = company.addressLine2 ?? "";
  cityInput.value = company.city ?? "";
  stateOrProvinceInput.value = company.stateOrProvince ?? "";
  postalCodeInput.value = company.postalCode ?? "";
  countryInput.value = company.country ?? "";
  isActiveInput.value = company.isActive ? "true" : "false";
  slugInput.dataset.touched = "true";
  loadCompanyPaymentMethods(companyId)
  .then((items) => {
    renderSuperAdminPaymentMethods(items);
  })
  .catch(() => {
    renderSuperAdminPaymentMethods([]);
  });

  if (company.logoUrl) {
    setLogoPreview(company.logoUrl);
  }

  loadCompanyModules(companyId)
  .then((response) => {
    const modules = response?.modules || {};

    if (modulePaymentsInput) modulePaymentsInput.checked = modules.payments === true;
    if (moduleDocumentsInput) moduleDocumentsInput.checked = modules.documents === true;
    if (moduleNewsInput) moduleNewsInput.checked = modules.news === true;
    if (moduleMatchesInput) moduleMatchesInput.checked = modules.matches === true;
    if (moduleClothingInput) moduleClothingInput.checked = modules.clothing === true;
    if (moduleTournamentsInput) moduleTournamentsInput.checked = modules.tournaments === true;
    if (moduleNotificationsInput) moduleNotificationsInput.checked = modules.notifications === true;
    if (moduleSponsorsInput) moduleSponsorsInput.checked = modules.sponsors === true;
  })
  .catch(() => {
    resetModulesForm();
  });

  loadClothingSettings(companyId)
  .then((settings) => {
    if (clothingManualProofInput) clothingManualProofInput.checked = settings.allowsManualProof === true;
    if (clothingMercadoPagoInput) clothingMercadoPagoInput.checked = settings.allowsMercadoPago === true;
    if (clothingPaymentAliasInput) {
      clothingPaymentAliasInput.value = settings.paymentAlias || "";
    }

    if (clothingPaymentAliasHolderInput) {
      clothingPaymentAliasHolderInput.value = settings.paymentAliasHolder || "";
    }
  })
  .catch(() => {
    resetClothingSettingsForm();
  });
  
  setSaveCompanyLoading(false);
  companyModal.classList.remove("hidden");
}

function closeCompanyModal() {
  if (isSavingCompany) return;
  companyModal.classList.add("hidden");
  clearLogoPreviewObjectUrl();
}

function openStatusModal(companyId) {
  const company = allCompanies.find((x) => x.id === companyId);
  if (!company) return;

  statusTargetCompany = company;
  hideStatusError();

  const willActivate = !company.isActive;
  statusModalTitle.textContent = willActivate ? "Activar empresa" : "Desactivar empresa";
  statusModalText.textContent = willActivate
    ? `Vas a activar la empresa "${company.name}".`
    : `Vas a desactivar la empresa "${company.name}".`;

  setChangeStatusLoading(false);
  statusModal.classList.remove("hidden");
}

function closeStatusModal() {
  if (isChangingStatus) return;
  statusTargetCompany = null;
  hideStatusError();
  statusModal.classList.add("hidden");
}

function closeActionsDropdown() {
  if (!actionsDropdown) return;

  actionsDropdown.classList.add("hidden");
  openedActionsCompanyId = null;
}

function openActionsDropdown(button, companyId) {
  if (!actionsDropdown || !actionsEditButton || !actionsDocumentsLink || !actionsToggleStatusButton) {
    return;
  }

  const company = allCompanies.find((x) => x.id === companyId);
  if (!company) return;

  openedActionsCompanyId = companyId;
  actionsDocumentsLink.onclick = (event) => {
  event.preventDefault();

  localStorage.setItem(
    "classclick_superadmin_document_company_slug",
    company.slug
  );

  window.location.href =
    "/src/pages/superadmin/document-types/index.html";
};
  actionsToggleStatusButton.textContent = company.isActive ? "Desactivar" : "Activar";

  const rect = button.getBoundingClientRect();
  const dropdownWidth = 180;

  actionsDropdown.style.top = `${rect.bottom + 8}px`;
  actionsDropdown.style.left = `${Math.max(8, rect.right - dropdownWidth)}px`;

  actionsDropdown.classList.remove("hidden");
}

async function loadCompanies() {
  showLoading();
  hideError();

  try {
    const items = await getSuperAdminCompanies();
    allCompanies = items;
    hideLoading();
    renderCompanies(allCompanies);
  } catch (error) {
    hideLoading();
    showError(error.message || "No se pudieron cargar las empresas.");
  }
}

async function onSubmitCompanyForm(event) {
  event.preventDefault();

  if (isSavingCompany) return;

  hideCompanyFormError();

  const payload = buildCompanyPayload();
  const validationError = validateCompanyPayload(payload);

  if (validationError) {
    showCompanyFormError(validationError);
    return;
  }

  setSaveCompanyLoading(true);

  try {
    let companyResponse;

    if (companyModalMode === "create") {
      companyResponse = await createSuperAdminCompany(payload);
    } else {
      companyResponse = await updateSuperAdminCompany(selectedCompanyId, payload);
    }

    const selectedFile = logoFileInput?.files?.[0];
    if (selectedFile && companyResponse?.id) {
      await uploadSuperAdminCompanyLogo(companyResponse.id, selectedFile);
    }

    if (companyResponse?.id) {
      await saveCompanyModules(companyResponse.id);
      await saveClothingSettings(companyResponse.id);
      await saveCompanyPaymentMethods(
        companyResponse.id,
        buildSuperAdminPaymentMethodsPayload()
      );
    }

    setSaveCompanyLoading(false);
    closeCompanyModal();
    await loadCompanies();
  } catch (error) {
    showCompanyFormError(error.message || "No se pudo guardar la empresa.");
    setSaveCompanyLoading(false);
  }
}

async function onConfirmStatus() {
  if (isChangingStatus || !statusTargetCompany) return;

  hideStatusError();
  setChangeStatusLoading(true);

  try {
    await setSuperAdminCompanyStatus(
      statusTargetCompany.id,
      !statusTargetCompany.isActive
    );

    setChangeStatusLoading(false);
    closeStatusModal();
    await loadCompanies();
  } catch (error) {
    showStatusError(error.message || "No se pudo cambiar el estado.");
    setChangeStatusLoading(false);
  }
}

function onCompaniesTableClick(event) {
  const menuButton = event.target.closest("button[data-action='toggle-menu']");
  if (menuButton) {
    const companyId = menuButton.dataset.id;
    if (!companyId) return;

    event.stopPropagation();

    const isSameOpen =
      openedActionsCompanyId === companyId &&
      !actionsDropdown.classList.contains("hidden");

    closeActionsDropdown();

    if (!isSameOpen) {
      openActionsDropdown(menuButton, companyId);
    }

    return;
  }

  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const companyId = button.dataset.id;

  if (!companyId) return;

  if (action === "edit") {
    openEditCompanyModal(companyId);
    return;
  }

  if (action === "toggle-status") {
    openStatusModal(companyId);
  }
}

function bindEvents() {
  logoutButton?.addEventListener("click", logoutAndRedirect);
  newCompanyButton?.addEventListener("click", openCreateCompanyModal);

  searchInput?.addEventListener("input", (event) => {
    filterCompanies(event.target.value);
  });

  mobileCompaniesList?.addEventListener("click", onCompaniesTableClick);

  companiesTableBody?.addEventListener("click", onCompaniesTableClick);

  closeCompanyModalButton?.addEventListener("click", closeCompanyModal);
  cancelCompanyModalButton?.addEventListener("click", closeCompanyModal);
  companyForm?.addEventListener("submit", onSubmitCompanyForm);

  cancelStatusModalButton?.addEventListener("click", closeStatusModal);
  confirmStatusModalButton?.addEventListener("click", onConfirmStatus);

  if (actionsDropdown) {
    document.addEventListener("click", () => {
      closeActionsDropdown();
    });

    actionsDropdown.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

actionsEditButton?.addEventListener("click", () => {
  const companyId = openedActionsCompanyId;
  if (!companyId) return;

  openEditCompanyModal(companyId);
  closeActionsDropdown();
});

actionsToggleStatusButton?.addEventListener("click", () => {
  const companyId = openedActionsCompanyId;
  if (!companyId) return;

  openStatusModal(companyId);
  closeActionsDropdown();
});

  logoFileInput?.addEventListener("change", () => {
    const selectedFile = logoFileInput.files?.[0];

    if (!selectedFile) {
      const company = allCompanies.find((x) => x.id === selectedCompanyId);
      setLogoPreview(company?.logoUrl || "");
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFile);
    setLogoPreview(previewUrl, true);
  });

  nameInput?.addEventListener("input", () => {
    if (companyModalMode !== "create") return;
    if (slugInput?.dataset.touched === "true") return;

    slugInput.value = nameInput.value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  });

  slugInput?.addEventListener("input", () => {
    slugInput.dataset.touched = "true";
    slugInput.value = slugInput.value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
  });

  openCompanyLinkModalButton?.addEventListener("click", openCompanyLinkModal);
closeCompanyLinkModalButton?.addEventListener("click", closeCompanyLinkModal);
cancelCompanyLinkModalButton?.addEventListener("click", closeCompanyLinkModal);
saveCompanyLinkButton?.addEventListener("click", saveCompanyLink);

companyLinksList?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='delete-company-link']");
  if (!button) return;

  const linkId = button.dataset.id;
  if (!linkId) return;

  try {
    await deleteCompanyLink(linkId);
  } catch (error) {
    showCompanyLinksError(error.message || "No se pudo eliminar la vinculación.");
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

  bindEvents();
  await loadCompanies();
  await loadCompanyLinks();
}

init().catch((error) => {
  console.error("Error al inicializar empresas:", error);
  hideLoading();
  showError(error?.message || "Ocurrió un error al cargar empresas.");
});