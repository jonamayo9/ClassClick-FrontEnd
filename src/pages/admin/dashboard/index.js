import { loadConfig } from "../../../shared/js/config.js";
import { get } from "../../../shared/js/api.js";
import { getUser, getActiveRole, getToken } from "../../../shared/js/storage.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

const state = {
  activeCompany: null,
  items: [],
  summary: null,
  apiBaseUrl: ""
};

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paymentMethodLabel(value) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "cash" || normalized === "efectivo" || normalized === "1") {
    return "Efectivo";
  }

  if (normalized === "transfer" || normalized === "transferencia" || normalized === "2") {
    return "Transferencia";
  }

  return "-";
}

function reportStatusLabel(value) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "paid" || normalized === "approved") return "Aprobado";
  if (normalized === "overdue") return "Vencido";
  if (normalized === "pending") return "Pendiente";

  return value || "-";
}

function reportStatusBadge(value) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "paid" || normalized === "approved") {
    return `<span class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Aprobado</span>`;
  }

  if (normalized === "overdue") {
    return `<span class="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Vencido</span>`;
  }

  if (normalized === "pending") {
    return `<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Pendiente</span>`;
  }

  return `<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">${escapeHtml(value || "-")}</span>`;
}

function getAuthToken() {
  return getToken?.() || "";
}

async function downloadFile(url) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("No se encontró el token de autenticación.");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    let message = `No se pudo exportar el archivo. (${response.status})`;

    try {
      const text = await response.text();
      if (text) {
        message = text;
      }
    } catch {
      // nada
    }

    throw new Error(message);
  }

  const blob = await response.blob();

  let fileName = "reporte";
  const disposition = response.headers.get("content-disposition");

  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const basicMatch = disposition.match(/filename="?([^"]+)"?/i);

    if (utf8Match?.[1]) {
      fileName = decodeURIComponent(utf8Match[1]);
    } else if (basicMatch?.[1]) {
      fileName = basicMatch[1];
    }
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

function buildMetricCard({ title, id }) {
  return `
    <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p class="text-sm text-slate-500">${title}</p>
      <p id="${id}" class="mt-2 text-3xl font-bold tracking-tight text-slate-900">-</p>
    </div>
  `;
}

function buildDashboardContent() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const dateTo = today.toISOString().slice(0, 10);
  const dateFrom = `${year}-${month}-01`;

  return `
    <section class="space-y-6">
      <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm sm:px-7 sm:py-7">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div class="min-w-0">
            <p class="text-sm text-slate-300">Dashboard de cobranza</p>
            <h2 id="welcomeName" class="mt-1 truncate text-3xl font-bold tracking-tight">-</h2>
            <p id="welcomeMeta" class="mt-2 text-sm text-slate-300"></p>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-300">Cobrado</p>
              <p id="heroTotalCollected" class="mt-1 text-2xl font-bold text-white">$ 0</p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-300">Pendiente</p>
              <p id="heroTotalPending" class="mt-1 text-2xl font-bold text-white">$ 0</p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-300">Vencido</p>
              <p id="heroTotalOverdue" class="mt-1 text-2xl font-bold text-white">$ 0</p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-300">Pagas</p>
              <p id="heroPaidChargesCount" class="mt-1 text-2xl font-bold text-white">0</p>
            </div>
          </div>
        </div>
      </section>

      <section id="superAdminBlock" class="hidden">
        <div class="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h3 class="text-lg font-semibold text-amber-900">SuperAdmin</h3>
          <p class="mt-2 text-sm text-amber-800">
            Seleccioná una empresa activa para ver el dashboard de cobranza.
          </p>
        </div>
      </section>

      <section id="adminDashboardBlock" class="hidden space-y-4">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 class="text-2xl font-bold tracking-tight text-slate-900">Resumen de cobranza</h3>
            <p id="companySlugText" class="text-sm text-slate-500"></p>
          </div>
        </div>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
            <div>
              <label for="dateFromUtc" class="mb-2 block text-sm font-medium text-slate-700">Desde</label>
              <input id="dateFromUtc" type="date" value="${dateFrom}" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" />
            </div>

            <div>
              <label for="dateToUtc" class="mb-2 block text-sm font-medium text-slate-700">Hasta</label>
              <input id="dateToUtc" type="date" value="${dateTo}" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" />
            </div>

            <div>
              <label for="paymentMethod" class="mb-2 block text-sm font-medium text-slate-700">Medio de pago</label>
              <select id="paymentMethod" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400">
                <option value="">Todos</option>
                <option value="Cash">Efectivo</option>
                <option value="Transfer">Transferencia</option>
              </select>
            </div>

            <div>
              <label for="chargeType" class="mb-2 block text-sm font-medium text-slate-700">Tipo de cuota</label>
              <select id="chargeType" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400">
                <option value="">Todas</option>
                <option value="Pure">Puras</option>
                <option value="WithPromotion">Con promoción</option>
                <option value="WithoutPromotion">Sin promoción</option>
              </select>
            </div>

            <div>
              <label for="status" class="mb-2 block text-sm font-medium text-slate-700">Estado</label>
              <select id="status" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400">
                <option value="">Todos</option>
                <option value="Paid">Pagadas</option>
                <option value="Unpaid">Impagas</option>
                <option value="Overdue">Vencidas</option>
              </select>
            </div>

            <div>
              <label for="periodPreset" class="mb-2 block text-sm font-medium text-slate-700">Período rápido</label>
              <select id="periodPreset" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400">
                <option value="">Personalizado</option>
                <option value="today">Hoy</option>
                <option value="thisMonth">Este mes</option>
                <option value="lastMonth">Mes anterior</option>
              </select>
            </div>

            <div>
              <label for="exportFormat" class="mb-2 block text-sm font-medium text-slate-700">Exportar como</label>
              <select id="exportFormat" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400">
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <button id="applyButton" class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Aplicar filtros
            </button>

            <button id="clearButton" class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Limpiar
            </button>

            <button id="exportButton" class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Exportar
            </button>
          </div>
        </section>

        <div id="loadingBox" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">Cargando dashboard...</p>
        </div>

        <div id="errorBox" class="hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"></div>

        <div id="dashboardGrid" class="hidden space-y-6">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            ${buildMetricCard({ title: "Total cobrado", id: "totalCollected" })}
            ${buildMetricCard({ title: "Total pendiente", id: "totalPending" })}
            ${buildMetricCard({ title: "Total vencido", id: "totalOverdue" })}
            ${buildMetricCard({ title: "Cuotas pagas", id: "paidChargesCount" })}
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            ${buildMetricCard({ title: "Efectivo", id: "totalCollectedCash" })}
            ${buildMetricCard({ title: "Transferencia", id: "totalCollectedTransfer" })}
            ${buildMetricCard({ title: "Con promoción", id: "totalCollectedWithPromotion" })}
            ${buildMetricCard({ title: "Sin promoción", id: "totalCollectedPure" })}
          </div>

          <section class="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div class="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 class="text-lg font-semibold text-slate-900">Detalle de cuotas</h4>
                <p class="text-sm text-slate-500">Listado filtrado según los criterios seleccionados.</p>
              </div>
              <p id="resultsCount" class="text-sm font-medium text-slate-500">0 resultados</p>
            </div>

            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Alumno</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Curso</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Período</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Vencimiento</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Base</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Descuento</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mora</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Final</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pago</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha pago</th>
                  </tr>
                </thead>
                <tbody id="detailsTableBody" class="divide-y divide-slate-100 bg-white"></tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </section>
  `;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value ?? "-";
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

function getStatusBadge(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid" || value === "approved") {
    return "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700";
  }

  if (value === "overdue") {
    return "inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700";
  }

  return "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700";
}

function getChargeTypeLabel(item) {
  return item.hasPromotion ? "Con promoción" : "Sin promoción";
}

function getApiBaseUrlOrThrow() {
  const value = String(state.apiBaseUrl || "").trim();

  if (!value) {
    throw new Error("No se pudo resolver la URL base del API desde config.json.");
  }

  return value.replace(/\/$/, "");
}

function buildQueryParams() {
  const params = new URLSearchParams();

  const dateFromUtc = document.getElementById("dateFromUtc")?.value;
  const dateToUtc = document.getElementById("dateToUtc")?.value;
  const paymentMethod = document.getElementById("paymentMethod")?.value;
  const chargeType = document.getElementById("chargeType")?.value;
  const status = document.getElementById("status")?.value;

  if (dateFromUtc) params.set("dateFromUtc", `${dateFromUtc}T00:00:00Z`);
  if (dateToUtc) params.set("dateToUtc", `${dateToUtc}T23:59:59Z`);
  if (paymentMethod) params.set("paymentMethod", paymentMethod);
  if (chargeType) params.set("chargeType", chargeType);
  if (status) params.set("status", status);

  return params.toString();
}

function fillSummary(summary) {
  setText("totalCollected", formatCurrency(summary.totalCollected));
  setText("totalPending", formatCurrency(summary.totalPending));
  setText("totalOverdue", formatCurrency(summary.totalOverdue));
  setText("paidChargesCount", summary.paidChargesCount);

  setText("totalCollectedCash", formatCurrency(summary.totalCollectedCash));
  setText("totalCollectedTransfer", formatCurrency(summary.totalCollectedTransfer));
  setText("totalCollectedWithPromotion", formatCurrency(summary.totalCollectedWithPromotion));
  setText("totalCollectedPure", formatCurrency(summary.totalCollectedPure));

  setText("heroTotalCollected", formatCurrency(summary.totalCollected));
  setText("heroTotalPending", formatCurrency(summary.totalPending));
  setText("heroTotalOverdue", formatCurrency(summary.totalOverdue));
  setText("heroPaidChargesCount", summary.paidChargesCount);
}

function fillTable(items) {
  const body = document.getElementById("detailsTableBody");
  const resultsCount = document.getElementById("resultsCount");

  if (!body) return;

  resultsCount.textContent = `${items.length} resultado${items.length === 1 ? "" : "s"}`;

  if (!items.length) {
    body.innerHTML = `
      <tr>
        <td colspan="12" class="px-4 py-8 text-center text-sm text-slate-500">
          No hay resultados para los filtros seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = items.map(item => `
    <tr class="hover:bg-slate-50">
      <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-900">${escapeHtml(item.studentFullName || "-")}</td>
      <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">${escapeHtml(item.courseName || "-")}</td>
      <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">${item.month}/${item.year}</td>
      <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">${formatDate(item.dueDateUtc)}</td>
      <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">${formatCurrency(item.basePrice)}</td>
      <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">${formatCurrency(item.siblingDiscountAmount)}</td>
      <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">${formatCurrency(item.lateChargeAmount)}</td>
      <td class="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">${formatCurrency(item.finalAmount)}</td>
      <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">${getChargeTypeLabel(item)}</td>
      <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">${paymentMethodLabel(item.paymentMethod)}</td>
      <td class="whitespace-nowrap px-4 py-3 text-sm">${reportStatusBadge(item.status)}</td>
      <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">${formatDate(item.paidAtUtc)}</td>
    </tr>
  `).join("");
}

function applyPreset() {
  const preset = document.getElementById("periodPreset")?.value;
  const fromInput = document.getElementById("dateFromUtc");
  const toInput = document.getElementById("dateToUtc");

  if (!fromInput || !toInput || !preset) return;

  const now = new Date();
  const yyyyMmDd = value => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (preset === "today") {
    const value = yyyyMmDd(now);
    fromInput.value = value;
    toInput.value = value;
    return;
  }

  if (preset === "thisMonth") {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    fromInput.value = `${year}-${month}-01`;
    toInput.value = yyyyMmDd(now);
    return;
  }

  if (preset === "lastMonth") {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);

    fromInput.value = yyyyMmDd(firstDay);
    toInput.value = yyyyMmDd(lastDay);
  }
}

function clearFilters() {
  document.getElementById("paymentMethod").value = "";
  document.getElementById("chargeType").value = "";
  document.getElementById("status").value = "";
  document.getElementById("periodPreset").value = "";
  document.getElementById("exportFormat").value = "excel";

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  document.getElementById("dateFromUtc").value = `${year}-${month}-01`;
  document.getElementById("dateToUtc").value = `${year}-${month}-${day}`;
}

async function loadDashboard(activeCompany) {
  const superAdminBlock = document.getElementById("superAdminBlock");
  const adminDashboardBlock = document.getElementById("adminDashboardBlock");
  const companySlugText = document.getElementById("companySlugText");
  const loadingBox = document.getElementById("loadingBox");
  const dashboardGrid = document.getElementById("dashboardGrid");

  const user = getUser();

  if (user?.isSuperAdmin && !activeCompany?.slug) {
    superAdminBlock?.classList.remove("hidden");
    adminDashboardBlock?.classList.add("hidden");
    return;
  }

  superAdminBlock?.classList.add("hidden");
  adminDashboardBlock?.classList.remove("hidden");

  if (!activeCompany?.slug) {
    loadingBox?.classList.add("hidden");
    showError("No hay una empresa activa seleccionada.");
    return;
  }

  companySlugText.textContent = `Empresa activa: ${activeCompany.name} (${activeCompany.slug})`;

  try {
    hideError();
    dashboardGrid?.classList.add("hidden");
    loadingBox?.classList.remove("hidden");

    const query = buildQueryParams();
    const url = query
      ? `/api/admin/${activeCompany.slug}/reports/collections?${query}`
      : `/api/admin/${activeCompany.slug}/reports/collections`;

    const data = await get(url);

    state.summary = data.summary || null;
    state.items = Array.isArray(data.items) ? data.items : [];

    fillSummary(state.summary || {});
    fillTable(state.items);

    loadingBox?.classList.add("hidden");
    dashboardGrid?.classList.remove("hidden");
  } catch (error) {
    loadingBox?.classList.add("hidden");
    showError(error.message || "No se pudo cargar el dashboard.");
  }
}

async function exportReport() {
  if (!state.activeCompany?.slug) return;

  try {
    hideError();

    const baseUrl = getApiBaseUrlOrThrow();
    const format = document.getElementById("exportFormat")?.value || "excel";
    const query = buildQueryParams();
    const endpoint = format === "pdf" ? "pdf" : "excel";

    const url = query
      ? `${baseUrl}/api/admin/${state.activeCompany.slug}/reports/collections/${endpoint}?${query}`
      : `${baseUrl}/api/admin/${state.activeCompany.slug}/reports/collections/${endpoint}`;

    console.log("EXPORT URL:", url);

    await downloadFile(url);
  } catch (error) {
    showError(error.message || "No se pudo exportar el archivo.");
  }
}

function bindEvents() {
  document.getElementById("applyButton")?.addEventListener("click", async () => {
    await loadDashboard(state.activeCompany);
  });

  document.getElementById("clearButton")?.addEventListener("click", async () => {
    clearFilters();
    await loadDashboard(state.activeCompany);
  });

  document.getElementById("periodPreset")?.addEventListener("change", applyPreset);
  document.getElementById("exportButton")?.addEventListener("click", exportReport);
}

async function init() {
  const config = await loadConfig();

  state.apiBaseUrl =
    config?.apiBaseUrl ||
    config?.api?.baseUrl ||
    config?.baseUrl ||
    "";

  const auth = requireAuth();
  if (!auth) return;

  const user = getUser();
  const activeRole = getActiveRole();

  const app = document.getElementById("app");
  app.innerHTML = renderAdminLayout({
    activeKey: "dashboard",
    pageTitle: "Dashboard de cobranza",
    contentHtml: buildDashboardContent()
  });

  const welcomeName = document.getElementById("welcomeName");
  const welcomeMeta = document.getElementById("welcomeMeta");

  welcomeName.textContent =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Usuario";

  welcomeMeta.textContent = user?.isSuperAdmin
    ? "SuperAdmin global"
    : `Rol activo: ${activeRole || "-"}`;

  bindEvents();

  const { activeCompany } = await setupAdminLayout({
    onCompanyChanged: async (company) => {
      state.activeCompany = company;
      await loadDashboard(company);
    }
  });

  state.activeCompany = activeCompany;
  await loadDashboard(activeCompany);
}

init().catch((error) => {
  const app = document.getElementById("app");
  if (app && !app.innerHTML.trim()) {
    app.innerHTML = `
      <div class="mx-auto max-w-3xl px-4 py-10">
        <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ${error.message || "No se pudo inicializar el dashboard."}
        </div>
      </div>
    `;
    return;
  }

  showError(error.message || "No se pudo inicializar el dashboard.");
});