import { loadConfig } from "../../../shared/js/config.js";
import { get, post } from "../../../shared/js/api.js";
import { getUser, getActiveRole, getToken } from "../../../shared/js/storage.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";
import { hasModule } from "../../../shared/js/modules.js";

const state = {
  activeCompany: null,
  items: [],
  summary: null,
  apiBaseUrl: "",
  coursesLoadedForSlug: ""
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

  if (normalized === "cash" || normalized === "efectivo" || normalized === "5") return "Efectivo";
  if (normalized === "transfer" || normalized === "transferencia" || normalized === "1") return "Transferencia";
  if (normalized === "debitcard" || normalized === "debit_card" || normalized === "2") return "Débito";
  if (normalized === "creditcard" || normalized === "credit_card" || normalized === "3") return "Crédito";
  if (normalized === "mercadopago" || normalized === "mercado_pago" || normalized === "4") return "Mercado Pago";

  return "-";
}

function renderChargeExtras(item) {
  const badges = [];

  if (item.hasScholarship || Number(item.scholarshipDiscountAmount || 0) > 0) {
    badges.push(`<span class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">🎓 Beca</span>`);
  }

  if (item.hasSiblingDiscount || Number(item.siblingDiscountAmount || 0) > 0) {
    badges.push(`<span class="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">👥 Hermanos</span>`);
  }

  if (item.hasPromotion || Number(item.promotionAmount || item.promotionDiscountAmount || 0) > 0) {
    badges.push(`<span class="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">🏷️ Promo</span>`);
  }

  if (Number(item.lateChargeAmount || 0) > 0) {
    badges.push(`<span class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">⏰ Mora</span>`);
  }

  if (Number(item.paymentMethodSurchargeAmount || 0) > 0) {
    badges.push(`<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">💳 Recargo</span>`);
  }

  if (!badges.length) {
    return `<span class="text-xs text-slate-400">—</span>`;
  }

  return `<div class="flex flex-wrap gap-1.5">${badges.join("")}</div>`;
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
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-300">A vencer</p>
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
            <button id="openMetricsHelpButton"
              class="mt-2 inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              ¿Qué significa cada monto?
            </button>
          </div>
        </div>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
            <div>
              <label for="dateFromUtc" class="mb-2 block text-sm font-medium text-slate-700">Desde</label>
              <input id="dateFromUtc" type="text" value="${dateFrom}" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" />
            </div>

            <div>
              <label for="dateToUtc" class="mb-2 block text-sm font-medium text-slate-700">Hasta</label>
              <input id="dateToUtc" type="text" value="${dateTo}" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" />
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
                <option value="Pure">Sin promoción</option>
                <option value="WithScholarship">Con beca</option>
                <option value="WithPromotion">Con promoción</option>
                <option value="WithLateFee">Con mora</option>
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
              <label for="courseId" class="mb-2 block text-sm font-medium text-slate-700">Curso</label>
              <select id="courseId" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400">
                <option value="">Todos</option>
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
            ${buildMetricCard({ title: "A vencer", id: "totalPending" })}
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

            <div class="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              <p id="resultsCount" class="text-sm font-medium text-slate-500">0 resultados</p>

              <button id="notifyPendingChargesButton"
                class="inline-flex items-center justify-center rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600">
                Notificar pendientes
              </button>
            </div>
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

function initDatePickers() {
  if (!window.flatpickr) return;

  flatpickr("#dateFromUtc", {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    locale: "es",
    allowInput: false
  });

  flatpickr("#dateToUtc", {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    locale: "es",
    allowInput: false
  });
}

function ensureMetricsHelpModal() {
  if (document.getElementById("metricsHelpModal")) return;

document.body.insertAdjacentHTML("beforeend", `
  <div id="metricsHelpModal" class="fixed inset-0 z-[999999] hidden min-h-screen w-screen items-center justify-center bg-slate-900/70 px-4 py-6 overflow-y-auto">

    <div class="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-2xl sm:p-7">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-2xl font-bold tracking-tight text-slate-900">
            ¿Cómo interpretar el dashboard?
          </h3>

          <p class="mt-2 text-sm text-slate-500">
            Estos indicadores te ayudan a entender rápidamente el estado de cobranza de tu empresa.
          </p>
        </div>

        <div class="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
          Cobranza
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p class="text-sm font-semibold text-emerald-900">💰 Cobrado</p>
          <p class="mt-2 text-sm leading-6 text-emerald-800">
            Total de cuotas pagadas dentro del período filtrado.
          </p>
        </div>

        <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p class="text-sm font-semibold text-amber-900">⏳ A vencer</p>
          <p class="mt-2 text-sm leading-6 text-amber-800">
            Cuotas impagas que todavía están dentro de fecha.
          </p>
        </div>

        <div class="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p class="text-sm font-semibold text-rose-900">🚨 Vencido</p>
          <p class="mt-2 text-sm leading-6 text-rose-800">
            Cuotas impagas que ya superaron la fecha de vencimiento.
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm font-semibold text-slate-900">📄 Pagadas</p>
          <p class="mt-2 text-sm leading-6 text-slate-700">
            Cantidad total de cuotas cobradas.
          </p>
        </div>
      </div>

      <div class="mt-6">
        <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Métodos y promociones
        </h4>

        <div class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm font-semibold text-slate-900">💵 Efectivo</p>
            <p class="mt-2 text-sm leading-6 text-slate-700">
              Total cobrado mediante pagos en efectivo.
            </p>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm font-semibold text-slate-900">🏦 Transferencia</p>
            <p class="mt-2 text-sm leading-6 text-slate-700">
              Total cobrado mediante transferencias bancarias.
            </p>
          </div>

          <div class="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p class="text-sm font-semibold text-violet-900">🎟️ Con promoción</p>
            <p class="mt-2 text-sm leading-6 text-violet-800">
              Cuotas que tuvieron descuentos, promociones o beneficios aplicados.
            </p>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm font-semibold text-slate-900">📄 Sin promoción</p>
            <p class="mt-2 text-sm leading-6 text-slate-700">
              Cuotas cobradas sin descuentos ni promociones aplicadas.
            </p>
          </div>

        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <button
          id="closeMetricsHelpButton"
          class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          Entendido
        </button>
      </div>
    </div>

  </div>
`);

  document.getElementById("metricsHelpModal")?.addEventListener("click", (event) => {
    if (event.target?.id === "metricsHelpModal") {
      closeMetricsHelpModal();
    }
  });

  document.getElementById("closeMetricsHelpButton")?.addEventListener("click", closeMetricsHelpModal);
}

function openMetricsHelpModal() {
  ensureMetricsHelpModal();

  const modal = document.getElementById("metricsHelpModal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeMetricsHelpModal() {
  const modal = document.getElementById("metricsHelpModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function ensureNotifyModal() {
  if (document.getElementById("notifyModal")) return;

  document.body.insertAdjacentHTML("beforeend", `
    <div id="notifyModal" class="fixed inset-0 z-[999999] hidden min-h-screen w-screen items-center justify-center bg-slate-900/70 px-4">
      <div class="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl sm:p-6">
        <h3 id="notifyModalTitle" class="text-lg font-bold text-slate-900">Confirmar envío</h3>

        <p id="notifyModalMessage" class="mt-2 text-sm text-slate-600">
          Se enviarán notificaciones a todos los alumnos con cuotas pendientes o vencidas según los filtros actuales.
        </p>

        <div id="notifyModalActions" class="mt-5 flex justify-end gap-2">
          <button id="cancelNotifyButton" class="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
            Cancelar
          </button>

          <button id="confirmNotifyButton" class="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
            Enviar notificaciones
          </button>
        </div>
      </div>
    </div>
  `);

  document.getElementById("notifyModal")?.addEventListener("click", (event) => {
    if (event.target?.id === "notifyModal") {
      closeNotifyModal();
    }
  });
}

function openNotifyModal() {
  ensureNotifyModal();

  const modal = document.getElementById("notifyModal");
  if (!modal) return;

  document.getElementById("notifyModalTitle").textContent = "Confirmar envío";
  document.getElementById("notifyModalMessage").textContent =
    "Se enviarán notificaciones a todos los alumnos con cuotas pendientes o vencidas según los filtros actuales.";

  document.getElementById("notifyModalActions").innerHTML = `
    <button id="cancelNotifyButton" class="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
      Cancelar
    </button>

    <button id="confirmNotifyButton" class="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
      Enviar notificaciones
    </button>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  document.getElementById("cancelNotifyButton")?.addEventListener("click", closeNotifyModal);
  document.getElementById("confirmNotifyButton")?.addEventListener("click", notifyPendingCharges);
}

function closeNotifyModal() {
  const modal = document.getElementById("notifyModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

function setNotifyModalLoading() {
  document.getElementById("notifyModalTitle").textContent = "Enviando notificaciones";
  document.getElementById("notifyModalMessage").textContent = "Aguardá unos segundos mientras se notifican las cuotas pendientes.";
  document.getElementById("notifyModalActions").innerHTML = "";
}

async function notifyPendingCharges() {
  if (!state.activeCompany?.slug) return;

  try {
    hideError();
    setNotifyModalLoading();

    const query = buildQueryParams();

    const url = query
      ? `/api/admin/${state.activeCompany.slug}/dashboard/collections/notify-pending?${query}`
      : `/api/admin/${state.activeCompany.slug}/dashboard/collections/notify-pending`;

    const result = await post(url);

    document.getElementById("notifyModalTitle").textContent = "Notificaciones enviadas";
    document.getElementById("notifyModalMessage").textContent =
      result?.message || "Las notificaciones se enviaron correctamente.";

    document.getElementById("notifyModalActions").innerHTML = `
      <button id="closeNotifySuccessButton" class="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
        Cerrar
      </button>
    `;

    document
      .getElementById("closeNotifySuccessButton")
      ?.addEventListener("click", closeNotifyModal);
  } catch (error) {
    document.getElementById("notifyModalTitle").textContent = "No se pudo enviar";
    document.getElementById("notifyModalMessage").textContent =
      error.message || "No se pudieron enviar las notificaciones.";

    document.getElementById("notifyModalActions").innerHTML = `
      <button id="closeNotifyErrorButton" class="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
        Cerrar
      </button>
    `;

    document
      .getElementById("closeNotifyErrorButton")
      ?.addEventListener("click", closeNotifyModal);
  }
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
  if (item.hasScholarship || Number(item.scholarshipDiscountAmount || 0) > 0) {
    return "Con beca";
  }

  if (item.hasPromotion || Number(item.promotionAmount || item.promotionDiscountAmount || item.siblingDiscountAmount || 0) > 0) {
    return "Con promoción";
  }

  return "Sin promoción";
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

  const courseId = document.getElementById("courseId")?.value;
  const dateFromUtc = document.getElementById("dateFromUtc")?.value;
  const dateToUtc = document.getElementById("dateToUtc")?.value;
  const paymentMethod = document.getElementById("paymentMethod")?.value;
  const chargeType = document.getElementById("chargeType")?.value;
  const status = document.getElementById("status")?.value;

  if (courseId) params.set("courseId", courseId);
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

async function loadCourses(activeCompany) {
  const courseSelect = document.getElementById("courseId");
  if (!courseSelect || !activeCompany?.slug) return;

  courseSelect.innerHTML = `<option value="">Todos</option>`;

  try {
    const courses = await get(`/api/admin/${activeCompany.slug}/dashboard/courses/options`);

    const items = Array.isArray(courses)
      ? courses
      : Array.isArray(courses?.items)
        ? courses.items
        : [];

    courseSelect.innerHTML = `
      <option value="">Todos</option>
      ${items.map(course => `
        <option value="${escapeHtml(course.id)}">${escapeHtml(course.name || course.title || "-")}</option>
      `).join("")}
    `;
  } catch (error) {
    console.error("No se pudieron cargar los cursos", error);
  }
}

function clearFilters() {
  document.getElementById("paymentMethod").value = "";
  document.getElementById("chargeType").value = "";
  document.getElementById("status").value = "";
  document.getElementById("courseId").value = "";
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

  if (state.coursesLoadedForSlug !== activeCompany.slug) {
    await loadCourses(activeCompany);
    state.coursesLoadedForSlug = activeCompany.slug;
  }

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

  document
  .getElementById("notifyPendingChargesButton")
  ?.addEventListener("click", openNotifyModal);

  document.getElementById("clearButton")?.addEventListener("click", async () => {
    clearFilters();
    await loadDashboard(state.activeCompany);
  });

  document.getElementById("exportButton")?.addEventListener("click", exportReport);

  document.getElementById("notifyModal")?.addEventListener("click", (event) => {
  if (event.target?.id === "notifyModal") {
    closeNotifyModal();
  }
});

document
  .getElementById("openMetricsHelpButton")
  ?.addEventListener("click", openMetricsHelpModal);
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

  ensureNotifyModal();
  ensureMetricsHelpModal();

  const welcomeName = document.getElementById("welcomeName");
  const welcomeMeta = document.getElementById("welcomeMeta");

  welcomeName.textContent =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Usuario";

  welcomeMeta.textContent = user?.isSuperAdmin
    ? "SuperAdmin global"
    : `Rol activo: ${activeRole || "-"}`;

  bindEvents();
  initDatePickers();

  const { activeCompany } = await setupAdminLayout({
    onCompanyChanged: async (company) => {
      state.activeCompany = company;
      await loadDashboard(company);
    }
  });

  state.activeCompany = activeCompany;

    if (!hasModule(state.activeCompany, "payments")) {
    window.location.replace("/src/pages/admin/students/index.html");
    return;
  }
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