import { get, put, postForm } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { getUser, getActiveRole } from "../../../shared/js/storage.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

function buildCompanySettingsContent() {
  return `
    <section class="space-y-6">
      <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm sm:px-7 sm:py-7">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div class="min-w-0">
            <p class="text-sm text-slate-300">Configuración</p>
            <h2 class="mt-1 truncate text-3xl font-bold tracking-tight">Mi empresa</h2>
            <p id="companyHeaderText" class="mt-2 text-sm text-slate-300">
              Cargando empresa activa...
            </p>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-300">Rol</p>
              <p id="heroRole" class="mt-1 text-base font-semibold text-white">-</p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-300">Estado</p>
              <p id="heroCompanyStatus" class="mt-1 text-base font-semibold text-white">-</p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-300">Slug</p>
              <p id="heroCompanySlug" class="mt-1 text-base font-semibold text-white">-</p>
            </div>
          </div>
        </div>
      </section>

      <div id="pageMessage" class="hidden rounded-2xl border px-4 py-3 text-sm"></div>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h3 class="text-lg font-semibold text-slate-900">Logo e identidad</h3>
          <p class="mt-1 text-sm text-slate-500">
            Este logo se usará en el panel y en las pantallas públicas donde corresponda.
          </p>

          <div class="mt-5 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <div id="logoPreviewWrap" class="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <span id="logoFallback" class="text-2xl font-bold text-slate-500">CC</span>
              <img id="logoPreview" class="hidden h-full w-full object-cover" alt="Logo de empresa" />
            </div>

            <p id="companyNamePreview" class="mt-4 text-base font-semibold text-slate-900">Empresa</p>
            <p id="companySlugPreview" class="mt-1 text-sm text-slate-500">-</p>

            <div class="mt-5 w-full">
              <label
                for="logoFileInput"
                class="flex cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Seleccionar logo
              </label>
              <input id="logoFileInput" type="file" accept="image/*" class="hidden" />

              <button
                id="uploadLogoButton"
                type="button"
                class="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled
              >
                Subir logo
              </button>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">Datos de la empresa</h3>
              <p class="mt-1 text-sm text-slate-500">
                Editá la información operativa que usa tu empresa.
              </p>
            </div>
          </div>

          <form id="companySettingsForm" class="mt-6 space-y-6">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="md:col-span-2">
                <label for="name" class="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                <input id="name" name="name" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500" />
              </div>

              <div class="md:col-span-2">
                <label for="description" class="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
                <textarea id="description" name="description" rows="4" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500"></textarea>
              </div>

              <div>
                <label for="whatsapp" class="mb-1 block text-sm font-medium text-slate-700">WhatsApp</label>
                <input id="whatsapp" name="whatsapp" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500" />
              </div>

              <div>
                <label for="email" class="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input id="email" name="email" type="email" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500" />
              </div>

              <div>
                <label for="phone" class="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
                <input id="phone" name="phone" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500" />
              </div>

              <div>
                <label for="country" class="mb-1 block text-sm font-medium text-slate-700">País</label>
                <input id="country" name="country" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500" />
              </div>

              <div class="md:col-span-2">
                <label for="addressLine1" class="mb-1 block text-sm font-medium text-slate-700">Dirección</label>
                <input id="addressLine1" name="addressLine1" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500" />
               </div>

                <div class="md:col-span-2">
                    <label for="addressLine2" class="mb-1 block text-sm font-medium text-slate-700">Dirección adicional</label>
                    <input id="addressLine2" name="addressLine2" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500" />
                </div>

                <div>
                    <label for="city" class="mb-1 block text-sm font-medium text-slate-700">Ciudad</label>
                    <input id="city" name="city" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500" />
                </div>

                <div>
                    <label for="stateOrProvince" class="mb-1 block text-sm font-medium text-slate-700">Provincia / Estado</label>
                    <input id="stateOrProvince" name="stateOrProvince" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500" />
                </div>

              <div>
                <label for="postalCode" class="mb-1 block text-sm font-medium text-slate-700">Código postal</label>
                <input id="postalCode" name="postalCode" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500" />
              </div>

              <div>
                <label for="slug" class="mb-1 block text-sm font-medium text-slate-700">Slug</label>
                <input id="slug" name="slug" type="text" disabled class="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none" />
              </div>
            </div>

            <div class="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                id="saveButton"
                type="submit"
                class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  `;
}

function getInitials(name) {
  if (!name) return "CC";

  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function setMessage(message, type = "success") {
  const box = document.getElementById("pageMessage");
  if (!box) return;

  box.className = "rounded-2xl border px-4 py-3 text-sm";

  if (type === "error") {
    box.classList.add("border-red-200", "bg-red-50", "text-red-700");
  } else {
    box.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-700");
  }

  box.textContent = message;
  box.classList.remove("hidden");
}

function hideMessage() {
  const box = document.getElementById("pageMessage");
  if (!box) return;

  box.textContent = "";
  box.classList.add("hidden");
}

function setButtonLoading(button, isLoading, loadingText, normalText) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : normalText;
}

function fillLogoPreview(name, slug, logoUrl) {
  const logoPreview = document.getElementById("logoPreview");
  const logoFallback = document.getElementById("logoFallback");
  const companyNamePreview = document.getElementById("companyNamePreview");
  const companySlugPreview = document.getElementById("companySlugPreview");

  if (companyNamePreview) companyNamePreview.textContent = name || "Empresa";
  if (companySlugPreview) companySlugPreview.textContent = slug || "-";

  if (logoUrl) {
    logoPreview.src = logoUrl;
    logoPreview.classList.remove("hidden");
    logoFallback.classList.add("hidden");
  } else {
    logoPreview.removeAttribute("src");
    logoPreview.classList.add("hidden");
    logoFallback.textContent = getInitials(name);
    logoFallback.classList.remove("hidden");
  }
}

function getFormPayload() {
  return {
    name: document.getElementById("name")?.value?.trim() || "",
    description: document.getElementById("description")?.value?.trim() || "",
    whatsapp: document.getElementById("whatsapp")?.value?.trim() || "",
    email: document.getElementById("email")?.value?.trim() || "",
    phone: document.getElementById("phone")?.value?.trim() || "",
    addressLine1: document.getElementById("addressLine1")?.value?.trim() || "",
    addressLine2: document.getElementById("addressLine2")?.value?.trim() || "",
    city: document.getElementById("city")?.value?.trim() || "",
    stateOrProvince: document.getElementById("stateOrProvince")?.value?.trim() || "",
    postalCode: document.getElementById("postalCode")?.value?.trim() || "",
    country: document.getElementById("country")?.value?.trim() || ""
  };
}

function fillForm(data) {
  document.getElementById("name").value = data.name || "";
  document.getElementById("description").value = data.description || "";
  document.getElementById("whatsapp").value = data.whatsapp || "";
  document.getElementById("email").value = data.email || "";
  document.getElementById("phone").value = data.phone || "";
  document.getElementById("addressLine1").value = data.addressLine1 || "";
  document.getElementById("addressLine2").value = data.addressLine2 || "";
  document.getElementById("city").value = data.city || "";
  document.getElementById("stateOrProvince").value = data.stateOrProvince || "";
  document.getElementById("postalCode").value = data.postalCode || "";
  document.getElementById("country").value = data.country || "";
  document.getElementById("slug").value = data.slug || "";

  document.getElementById("companyHeaderText").textContent =
    `${data.name || "Empresa"} · ${data.slug || "-"}`;

  document.getElementById("heroCompanyStatus").textContent =
    data.isActive ? "Activa" : "Inactiva";

  document.getElementById("heroCompanySlug").textContent =
    data.slug || "-";

  fillLogoPreview(data.name, data.slug, data.logoUrl);
}

async function loadCompanySettings(activeCompany) {
  hideMessage();

  if (!activeCompany?.slug) {
    setMessage("No hay empresa activa seleccionada.", "error");
    return;
  }

  const data = await get(`/api/admin/${activeCompany.slug}/company-settings`);
  fillForm(data);
}

async function saveCompanySettings(activeCompany) {
  const saveButton = document.getElementById("saveButton");
  const uploadButton = document.getElementById("uploadLogoButton");

  try {
    hideMessage();

    setButtonLoading(saveButton, true, "Guardando...", "Guardar cambios");
    if (uploadButton) {
      uploadButton.disabled = true;
    }

    const payload = getFormPayload();
    await put(`/api/admin/${activeCompany.slug}/company-settings`, payload);

    await uploadLogo(activeCompany);

    await loadCompanySettings(activeCompany);

    const logoInput = document.getElementById("logoFileInput");
    if (logoInput) {
      logoInput.value = "";
    }

    if (uploadButton) {
      uploadButton.disabled = true;
    }

    setMessage("Los datos de la empresa se guardaron correctamente.");
  } catch (error) {
    setMessage(error.message || "No se pudo guardar la empresa.", "error");
  } finally {
    setButtonLoading(saveButton, false, "Guardando...", "Guardar cambios");
  }
}

async function uploadLogo(activeCompany) {
  const input = document.getElementById("logoFileInput");
  const file = input?.files?.[0];

  if (!file) {
    return false;
  }

  const formData = new FormData();
  formData.append("file", file);

  await postForm(`/api/admin/${activeCompany.slug}/company-settings/logo`, formData);

  input.value = "";
  return true;
}

function bindEvents(activeCompany) {
  const form = document.getElementById("companySettingsForm");
  const fileInput = document.getElementById("logoFileInput");
  const uploadButton = document.getElementById("uploadLogoButton");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveCompanySettings(activeCompany);
  });

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    uploadButton.disabled = !file;

    if (!file) return;

    const tempUrl = URL.createObjectURL(file);
    const currentName = document.getElementById("name")?.value || "Empresa";
    const currentSlug = document.getElementById("slug")?.value || "-";
    fillLogoPreview(currentName, currentSlug, tempUrl);
  });

uploadButton?.addEventListener("click", async () => {
  try {
    hideMessage();
    setButtonLoading(uploadButton, true, "Subiendo...", "Subir logo");

    await uploadLogo(activeCompany);
    await loadCompanySettings(activeCompany);

    uploadButton.disabled = true;
    setMessage("El logo se actualizó correctamente.");
  } catch (error) {
    setMessage(error.message || "No se pudo subir el logo.", "error");
  } finally {
    setButtonLoading(uploadButton, false, "Subiendo...", "Subir logo");
  }
});

  document.getElementById("name")?.addEventListener("input", (e) => {
    const currentSlug = document.getElementById("slug")?.value || "-";
    const logoPreview = document.getElementById("logoPreview");
    const currentLogo = logoPreview && !logoPreview.classList.contains("hidden")
      ? logoPreview.src
      : "";
    fillLogoPreview(e.target.value, currentSlug, currentLogo);
  });
}

async function init() {
  await loadConfig();

  const session = requireAuth();
  if (!session) return;

  const user = getUser();
  const activeRole = getActiveRole();

  const app = document.getElementById("app");
  app.innerHTML = renderAdminLayout({
    activeKey: "company-settings",
    pageTitle: "Mi empresa",
    contentHtml: buildCompanySettingsContent()
  });

  document.getElementById("heroRole").textContent = activeRole || "-";

  const { activeCompany } = await setupAdminLayout({
    onCompanyChanged: async (company) => {
      await loadCompanySettings(company);
      bindEvents(company);
    }
  });

  await loadCompanySettings(activeCompany);
  bindEvents(activeCompany);
}

init().catch((error) => {
  const app = document.getElementById("app");
  if (app && !app.innerHTML.trim()) {
    app.innerHTML = `
      <div class="mx-auto max-w-3xl px-4 py-10">
        <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ${error.message || "No se pudo inicializar la pantalla."}
        </div>
      </div>
    `;
    return;
  }

  setMessage(error.message || "No se pudo inicializar la pantalla.", "error");
});