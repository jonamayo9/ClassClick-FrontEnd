import { get, post } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";
import { hasModule } from "../../../shared/js/modules.js";

let currentCompany = null;
let currentPayments = [];
let currentSelectedPayment = null;
let currentProofSubmissions = [];
let currentSelectedSubmission = null;
let currentCourses = [];
let currentPaymentMethods = [];

function money(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(n);
}

function formatDateTime(value) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(d);
}

function paymentMethodLabel(value, fallbackName = null) {
  if (fallbackName) return fallbackName;

  const found = currentPaymentMethods.find(
    x => String(x.paymentMethod).toLowerCase() === String(value).toLowerCase()
  );

  return found?.paymentMethodName || found?.name || found?.displayName || "-";
}

function paymentStatusLabel(value) {
  const normalized = String(value ?? "").toLowerCase();

  if (normalized === "1" || normalized === "pending") return "Pendiente";
  if (normalized === "2" || normalized === "inreview" || normalized === "in_review") return "En revisión";
  if (normalized === "3" || normalized === "approved") return "Aprobado";
  if (normalized === "4" || normalized === "rejected") return "Rechazado";

  return "-";
}

function paymentStatusBadge(value) {
  const normalized = String(value ?? "").toLowerCase();

  if (normalized === "1" || normalized === "pending") {
    return `<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Pendiente</span>`;
  }

  if (normalized === "2" || normalized === "inreview" || normalized === "in_review") {
    return `<span class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">En revisión</span>`;
  }

  if (normalized === "3" || normalized === "approved") {
    return `<span class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Aprobado</span>`;
  }

  if (normalized === "4" || normalized === "rejected") {
    return `<span class="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Rechazado</span>`;
  }

  return `<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">-</span>`;
}

function renderPaymentExtras(item) {
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

function showMessage(message, type = "success") {
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
  box.className = "hidden rounded-2xl border px-4 py-3 text-sm";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildContent() {
  return `
    <section class="space-y-6">
      <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm sm:px-7 sm:py-7">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div class="min-w-0">
            <p class="text-sm text-slate-300">Administración</p>
            <h2 class="mt-1 truncate text-3xl font-bold tracking-tight">Pagos</h2>
            <p id="paymentsHeaderText" class="mt-2 text-sm text-slate-300">Cargando empresa activa...</p>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-300">Pagos listados</p>
              <p id="heroPaymentsCount" class="mt-1 text-base font-semibold text-white">0</p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-300">En revisión</p>
              <p id="heroInReviewCount" class="mt-1 text-base font-semibold text-white">0</p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-300">Aprobados</p>
              <p id="heroApprovedCount" class="mt-1 text-base font-semibold text-white">0</p>
            </div>
          </div>
        </div>
      </section>

      <div id="pageMessage" class="hidden rounded-2xl border px-4 py-3 text-sm"></div>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label for="filterStudentQuery" class="mb-1 block text-sm font-medium text-slate-700">Alumno</label>
            <input
              id="filterStudentQuery"
              type="text"
              placeholder="Nombre o DNI"
              class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label for="filterCourseQuery" class="mb-1 block text-sm font-medium text-slate-700">Curso</label>
            <select id="filterCourseId" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500">
              <option value="">Todos</option>
            </select>
          </div>

          <div>
            <label for="filterPeriod" class="mb-1 block text-sm font-medium text-slate-700">Período</label>
            <input
              id="filterPeriod"
              type="text"
              placeholder="MM/AAAA"
              class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label for="filterPaymentMethod" class="mb-1 block text-sm font-medium text-slate-700">Método</label>
            <select id="filterPaymentMethod" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500">
              <option value="">Todos</option>
            </select>
          </div>

          <div>
            <label for="filterPaymentStatus" class="mb-1 block text-sm font-medium text-slate-700">Estado del pago</label>
            <select id="filterPaymentStatus" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500">
              <option value="">Todos</option>
              <option value="2">En revisión</option>
              <option value="3">Aprobado</option>
              <option value="4">Rechazado</option>
            </select>
          </div>

          <div>
            <label for="filterChargeType" class="mb-1 block text-sm font-medium text-slate-700">Tipo de cuota</label>
            <select id="filterChargeType" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500">
              <option value="">Todas</option>
              <option value="scholarship">Con beca</option>
              <option value="promotion">Con promoción</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-3">
          <button id="searchPaymentsButton" type="button" class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
            Buscar
          </button>

          <button id="clearPaymentsFiltersButton" type="button" class="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            Limpiar
          </button>

          <button id="reloadPaymentsButton" type="button" class="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            Actualizar
          </button>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-0 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Alumno</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Curso</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Período</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Monto</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Método</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Adicionales</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pagado</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody id="paymentsTableBody" class="divide-y divide-slate-100 bg-white"></tbody>
          </table>
        </div>
      </section>
    </section>

    <div id="paymentDetailModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50" id="paymentDetailModalBackdrop"></div>

      <div class="absolute inset-x-0 bottom-0 top-auto mx-auto w-full max-w-5xl rounded-t-3xl bg-white shadow-2xl md:inset-10 md:rounded-3xl">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 class="text-lg font-semibold text-slate-900">Detalle del pago</h3>
            <p id="paymentDetailSubtitle" class="mt-1 text-sm text-slate-500">-</p>
          </div>

          <button id="closePaymentDetailModalButton" type="button" class="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cerrar
          </button>
        </div>

        <div class="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
          <section class="space-y-4">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h4 class="text-sm font-semibold text-slate-900">Información</h4>

              <div class="mt-3 space-y-2 text-sm text-slate-700">
                <p><span class="font-semibold">Alumno:</span> <span id="detailStudentFullName">-</span></p>
                <p><span class="font-semibold">Curso:</span> <span id="detailCourseName">-</span></p>
                <p><span class="font-semibold">Período:</span> <span id="detailPeriod">-</span></p>
                <p><span class="font-semibold">Monto:</span> <span id="detailAmount">-</span></p>
                <p><span class="font-semibold">Método:</span> <span id="detailMethod">-</span></p>
                <p><span class="font-semibold">Estado:</span> <span id="detailStatus">-</span></p>
                <p><span class="font-semibold">Pagado el:</span> <span id="detailPaidAt">-</span></p>
                <p><span class="font-semibold">Revisado el:</span> <span id="detailReviewedAt">-</span></p>
                <p><span class="font-semibold">Nota:</span> <span id="detailReviewNote">-</span></p>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h4 class="text-sm font-semibold text-slate-900">Detalle de la cuota</h4>

              <div id="paymentCalculationDetail" class="mt-3 space-y-2 text-sm text-slate-700">
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-4">
              <label for="approveReviewNote" class="mb-1 block text-sm font-medium text-slate-700">Nota de revisión</label>
              <textarea id="approveReviewNote" rows="4" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500"></textarea>

              <div class="mt-4 flex flex-wrap gap-3">
                <button id="approvePaymentButton" type="button" class="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60">
                  Aprobar pago
                </button>

                <button id="rejectSubmissionButton" type="button" class="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60">
                  Rechazar comprobante
                </button>
              </div>
            </div>
          </section>

          <section class="space-y-4">
            <div class="rounded-2xl border border-slate-200 bg-white p-4">
              <div class="flex items-center justify-between gap-3">
                <h4 class="text-sm font-semibold text-slate-900">Comprobante</h4>
                <div class="flex items-center gap-2">
                  <button id="viewProofButton" type="button" class="hidden rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Visualizar comprobante
                  </button>

                  <a id="proofDownloadLink" href="#" target="_blank" rel="noreferrer" class="hidden rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Descargar
                  </a>
                </div>
              </div>

              <div id="proofPreviewContainer" class="mt-4 flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span class="text-sm text-slate-400">Sin comprobante</span>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 class="text-sm font-semibold text-slate-900">Historial de comprobantes</h4>
              <div id="proofSubmissionsList" class="mt-4 space-y-2"></div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div id="proofViewerModal" class="fixed inset-0 z-[70] hidden">
      <div class="absolute inset-0 bg-black/60" id="proofViewerBackdrop"></div>

      <div class="absolute inset-x-0 bottom-0 top-auto mx-auto w-full max-w-6xl rounded-t-3xl bg-white shadow-2xl md:inset-8 md:rounded-3xl">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div class="min-w-0">
            <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Comprobante</div>
            <div id="proofViewerTitle" class="mt-1 truncate text-base font-semibold text-slate-900">Visualización</div>
          </div>

          <div class="flex items-center gap-2">
            <a
              id="proofViewerDownloadLink"
              href="#"
              target="_blank"
              rel="noreferrer"
              class="hidden rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Descargar
            </a>

            <button
              id="closeProofViewerButton"
              type="button"
              class="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div id="proofViewerBody" class="h-[78vh] bg-slate-100 p-4">
          <div class="flex h-full items-center justify-center rounded-2xl bg-white text-sm text-slate-500">
            Sin comprobante
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadCourses() {
  if (!currentCompany?.slug) {
    currentCourses = [];
    return;
  }

  const courses = await get(`/api/admin/${currentCompany.slug}/dashboard/courses/options`);

  currentCourses = Array.isArray(courses) ? courses : [];

  const select = document.getElementById("filterCourseId");
  if (!select) return;

  select.innerHTML = `
    <option value="">Todos</option>
    ${currentCourses.map(course => `
      <option value="${escapeHtml(course.id)}">${escapeHtml(course.name || "-")}</option>
    `).join("")}
  `;
}

function renderHeaderStats() {
  document.getElementById("paymentsHeaderText").textContent =
    currentCompany ? `${currentCompany.name} · ${currentCompany.slug}` : "Sin empresa activa";

  document.getElementById("heroPaymentsCount").textContent = String(currentPayments.length);
  document.getElementById("heroInReviewCount").textContent =
    String(currentPayments.filter(x => ["2", "inreview", "in_review"].includes(String(x.paymentStatus ?? "").toLowerCase())).length);
  document.getElementById("heroApprovedCount").textContent =
    String(currentPayments.filter(x => ["3", "approved"].includes(String(x.paymentStatus ?? "").toLowerCase())).length);
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function formatPeriod(item) {
  return `${String(item.month).padStart(2, "0")}/${item.year}`;
}

function applyFilters(items) {
  const studentQuery = normalizeText(document.getElementById("filterStudentQuery").value);
  const courseId = document.getElementById("filterCourseId").value;
  const period = normalizeText(document.getElementById("filterPeriod").value);
  const paymentMethod = document.getElementById("filterPaymentMethod").value;
  const paymentStatus = document.getElementById("filterPaymentStatus").value;
  const chargeType = document.getElementById("filterChargeType").value;

  return items.filter(item => {
    const studentName = normalizeText(item.studentFullName);
    const studentDni = normalizeText(item.studentDni);
    const itemPeriod = normalizeText(formatPeriod(item));

    if (studentQuery) {
      const matchesName = studentName.includes(studentQuery);
      const matchesDni = studentDni.includes(studentQuery);

      if (!matchesName && !matchesDni) return false;
    }

    if (courseId && String(item.courseId) !== courseId) return false;
    if (period && itemPeriod !== period) return false;
    if (paymentMethod && String(item.paymentMethod) !== paymentMethod) return false;
    if (paymentStatus) {
      const status = String(item.paymentStatus ?? "").toLowerCase();

      const matches =
        (paymentStatus === "2" && ["2", "inreview", "in_review"].includes(status)) ||
        (paymentStatus === "3" && ["3", "approved"].includes(status)) ||
        (paymentStatus === "4" && ["4", "rejected"].includes(status));

      if (!matches) return false;
    }
    if (chargeType === "scholarship" && !item.hasScholarship) return false;
    if (chargeType === "promotion" && !item.hasPromotion) return false;
    if (chargeType === "normal" && (item.hasScholarship || item.hasPromotion)) return false;

    return true;
  });
}

function renderPaymentsTable() {
  const tbody = document.getElementById("paymentsTableBody");
  if (!tbody) return;

  const filtered = applyFilters(currentPayments);

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="px-4 py-8 text-center text-sm text-slate-500">
          No se encontraron pagos.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td class="px-4 py-3 text-sm text-slate-900">${escapeHtml(item.studentFullName || "-")}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(item.courseName || "-")}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${formatPeriod(item)}</td>
      <td class="px-4 py-3 text-sm font-semibold text-slate-900">${money(item.amount)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${paymentMethodLabel(item.paymentMethod, item.paymentMethodNameSnapshot)}</td>
      <td class="px-4 py-3 text-sm">${renderPaymentExtras(item)}</td>
      <td class="px-4 py-3 text-sm">${paymentStatusBadge(item.paymentStatus)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${formatDateTime(item.paidAtUtc)}</td>
      <td class="px-4 py-3 text-right">
        <button type="button" data-id="${item.id}" class="open-payment-detail rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          Ver detalle
        </button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".open-payment-detail").forEach(btn => {
    btn.addEventListener("click", async () => {
      await openPaymentDetail(btn.dataset.id);
    });
  });
}

async function loadPayments() {
  if (!currentCompany) {
    currentPayments = [];
    renderHeaderStats();
    renderPaymentsTable();
    return;
  }

  currentPaymentMethods =
  await get(`/api/admin/${currentCompany.slug}/payment-methods`);
  renderPaymentMethodsFilter();
  hideMessage();

  await loadCourses();

  currentPayments = await get(`/api/admin/${currentCompany.slug}/payments`);
  renderHeaderStats();
  renderPaymentsTable();
}

function renderPaymentMethodsFilter() {
  const select = document.getElementById("filterPaymentMethod");
  if (!select) return;

  select.innerHTML = `
    <option value="">Todos</option>

    ${currentPaymentMethods
      .filter(x => x.enabledBySuperAdmin)
      .map(x => `
        <option value="${escapeHtml(x.paymentMethod)}">
          ${escapeHtml(x.paymentMethodName || x.name || x.displayName || "-")}
        </option>
      `)
      .join("")}
  `;
}

function renderProofPreviewEmpty(message = "Sin comprobante disponible") {
  const container = document.getElementById("proofPreviewContainer");
  const viewButton = document.getElementById("viewProofButton");
  const downloadLink = document.getElementById("proofDownloadLink");

  if (!container || !viewButton || !downloadLink) return;

  container.innerHTML = `<span class="text-sm text-slate-400">${escapeHtml(message)}</span>`;
  viewButton.classList.add("hidden");
  downloadLink.classList.add("hidden");
  downloadLink.href = "#";
}

function renderProofSubmissions() {
  const list = document.getElementById("proofSubmissionsList");
  if (!list) return;

  if (!currentProofSubmissions.length) {
    list.innerHTML = `<p class="text-sm text-slate-500">No hay comprobantes cargados.</p>`;
    return;
  }

  list.innerHTML = currentProofSubmissions.map(item => `
    <button
      type="button"
      data-id="${item.id}"
      class="select-proof-submission w-full rounded-2xl border px-4 py-3 text-left transition hover:bg-slate-50 ${
        currentSelectedSubmission && currentSelectedSubmission.id === item.id
          ? "border-orange-500 bg-orange-50"
          : "border-slate-200 bg-white"
      }"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-slate-900">Intento #${item.attemptNumber}</p>
          <p class="text-xs text-slate-500">${escapeHtml(item.fileName || "-")}</p>
          <p class="text-xs text-slate-500">${formatDateTime(item.uploadedAtUtc)}</p>
        </div>

        <div class="text-right">
          <div>${paymentStatusBadge(item.status)}</div>
          <p class="mt-1 text-xs text-slate-500">${item.isDeletedFromStorage ? "Archivo eliminado" : "Archivo disponible"}</p>
        </div>
      </div>
    </button>
  `).join("");

  list.querySelectorAll(".select-proof-submission").forEach(btn => {
    btn.addEventListener("click", () => {
      const selected = currentProofSubmissions.find(x => x.id === btn.dataset.id);
      if (!selected) return;

      currentSelectedSubmission = selected;
      renderSelectedSubmissionPreview();
      renderProofSubmissions();
      syncModalButtons();
    });
  });
}

function renderPaymentCalculationDetail(payment) {
  const basePrice = Number(payment.basePrice || 0);
  const siblingDiscount = Number(payment.siblingDiscountAmount || 0);
  const siblingPercent = Number(payment.siblingDiscountPercent || 0);
  const scholarshipDiscount = Number(payment.scholarshipDiscountAmount || 0);
  const scholarshipValue = Number(payment.scholarshipDiscountValue || 0);
  const lateCharge = Number(payment.lateChargeAmount || 0);
  const manualDiscount = Number(payment.manualDiscountAmount || 0);
  const manualIncrease = Number(payment.manualIncreaseAmount || 0);
  const finalAmount = Number(payment.finalAmount || payment.amount || 0);
  const surcharge = Number(payment.paymentMethodSurchargeAmount || 0);
  const totalPaid = Number(payment.finalAmountPaid || payment.amount || finalAmount || 0);
  const methodName = payment.paymentMethodNameSnapshot || paymentMethodLabel(payment.paymentMethod);

  return `
    <div class="space-y-2">
      <div class="flex justify-between">
        <span class="text-slate-500">Precio base</span>
        <span class="font-semibold text-slate-900">${money(basePrice)}</span>
      </div>

      ${siblingDiscount > 0 ? `
        <div class="flex justify-between text-rose-500">
          <span>Descuento hermano ${siblingPercent > 0 ? `(${siblingPercent}%)` : ""}</span>
          <span class="font-semibold">-${money(siblingDiscount)}</span>
        </div>
      ` : ""}

      ${scholarshipDiscount > 0 ? `
        <div class="flex justify-between text-rose-500">
          <span>Beca ${payment.scholarshipName ? `(${escapeHtml(payment.scholarshipName)})` : ""} ${scholarshipValue > 0 ? `(${scholarshipValue}%)` : ""}</span>
          <span class="font-semibold">-${money(scholarshipDiscount)}</span>
        </div>
      ` : ""}

      ${manualDiscount > 0 ? `
        <div class="flex justify-between text-rose-500">
          <span>Descuento manual</span>
          <span class="font-semibold">-${money(manualDiscount)}</span>
        </div>
      ` : ""}

      ${lateCharge > 0 ? `
        <div class="flex justify-between text-amber-700">
          <span>Recargo mora</span>
          <span class="font-semibold">+${money(lateCharge)}</span>
        </div>
      ` : ""}

      ${manualIncrease > 0 ? `
        <div class="flex justify-between text-amber-700">
          <span>Ajuste manual</span>
          <span class="font-semibold">+${money(manualIncrease)}</span>
        </div>
      ` : ""}

      <div class="flex justify-between border-t border-slate-200 pt-2">
        <span class="font-semibold text-slate-900">Monto final cuota</span>
        <span class="font-bold text-slate-900">${money(finalAmount)}</span>
      </div>

      ${surcharge > 0 ? `
        <div class="flex justify-between text-amber-700">
          <span>Recargo por ${escapeHtml(methodName)}</span>
          <span class="font-semibold">+${money(surcharge)}</span>
        </div>

        <div class="flex justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
          <span class="font-bold text-emerald-700">Total pagado</span>
          <span class="font-black text-emerald-700">${money(totalPaid)}</span>
        </div>
      ` : ""}
    </div>
  `;
}

function fillPaymentDetail(payment) {
  document.getElementById("paymentDetailSubtitle").textContent =
    `${payment.studentFullName} · ${payment.courseName}`;

  document.getElementById("detailStudentFullName").textContent = payment.studentFullName || "-";
  document.getElementById("detailCourseName").textContent = payment.courseName || "-";
  document.getElementById("detailPeriod").textContent = formatPeriod(payment);
  document.getElementById("detailAmount").textContent = money(payment.finalAmountPaid || payment.amount);
  document.getElementById("detailMethod").textContent =
    payment.paymentMethodNameSnapshot || paymentMethodLabel(payment.paymentMethod);

  document.getElementById("detailStatus").innerHTML = paymentStatusBadge(payment.paymentStatus);
  document.getElementById("detailPaidAt").textContent = formatDateTime(payment.paidAtUtc);
  document.getElementById("detailReviewedAt").textContent = formatDateTime(payment.reviewedAtUtc);
  document.getElementById("detailReviewNote").textContent = payment.reviewNote || "-";
  document.getElementById("approveReviewNote").value = payment.reviewNote || "";

const calculationContainer = document.getElementById("paymentCalculationDetail");
  if (calculationContainer) {
    calculationContainer.innerHTML = renderPaymentCalculationDetail(payment);
  }

  const isTransfer = String(payment.paymentMethod).toLowerCase() === "transfer";

  if (!isTransfer) {
    renderProofPreviewEmpty("Este pago no tiene comprobante.");
    return;
  }

  renderProofPreviewEmpty();
}

function openModal() {
  document.getElementById("paymentDetailModal").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function closeModal() {
  document.getElementById("paymentDetailModal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
  currentSelectedPayment = null;
  currentProofSubmissions = [];
  currentSelectedSubmission = null;
  renderProofPreviewEmpty();
  renderProofSubmissions();
}

async function openProofViewer() {
  if (!currentSelectedPayment || String(currentSelectedPayment.paymentMethod).toLowerCase() !== "transfer") {
    showMessage("Solo los pagos por transferencia tienen comprobante.", "error");
    return;
  }

  if (!currentSelectedSubmission) {
    showMessage("No hay comprobante seleccionado.", "error");
    return;
  }

  if (currentSelectedSubmission.isDeletedFromStorage) {
    showMessage("El archivo fue eliminado del storage.", "error");
    return;
  }

  const modal = document.getElementById("proofViewerModal");
  const body = document.getElementById("proofViewerBody");
  const title = document.getElementById("proofViewerTitle");
  const download = document.getElementById("proofViewerDownloadLink");

  modal.classList.remove("hidden");

  title.textContent = currentSelectedSubmission.fileName || "Comprobante";
  body.innerHTML = `
    <div class="flex h-full items-center justify-center text-sm text-slate-500">
      Cargando comprobante...
    </div>
  `;

  try {
    const result = await get(
      `/api/admin/${currentCompany.slug}/payments/proof-submissions/${currentSelectedSubmission.id}/view`
    );

    if (!result?.url) {
      throw new Error("No se pudo obtener la URL del comprobante.");
    }

    download.href = result.url;
    download.setAttribute("download", result.fileName || "comprobante");
    download.classList.remove("hidden");

    body.innerHTML = "";

    if (result.isImage) {
      const wrapper = document.createElement("div");
      wrapper.className = "flex h-full items-center justify-center";

      const img = document.createElement("img");
      img.src = result.url;
      img.alt = result.fileName || "Comprobante";
      img.className = "max-h-full rounded-xl shadow";

      wrapper.appendChild(img);
      body.appendChild(wrapper);
      return;
    }

    if (result.isPdf) {
      const iframe = document.createElement("iframe");
      iframe.src = result.url;
      iframe.className = "h-full w-full rounded-xl border";
      body.appendChild(iframe);
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "flex h-full items-center justify-center";

    const link = document.createElement("a");
    link.href = result.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "rounded-xl border px-4 py-2 text-sm font-semibold";
    link.textContent = "Descargar archivo";

    wrapper.appendChild(link);
    body.appendChild(wrapper);
  } catch (error) {
    body.innerHTML = `
      <div class="flex h-full items-center justify-center text-red-500 text-sm">
        No se pudo cargar el comprobante
      </div>
    `;

    showMessage(error.message || "No se pudo cargar el comprobante", "error");
  }
}

function closeProofViewer() {
  document.getElementById("proofViewerModal").classList.add("hidden");
}

async function renderSelectedSubmissionPreview() {
  if (!currentSelectedPayment || String(currentSelectedPayment.paymentMethod).toLowerCase() !== "transfer") {
    renderProofPreviewEmpty("Este pago no tiene comprobante porque fue registrado en efectivo.");
    return;
  }

  if (!currentSelectedSubmission) {
    renderProofPreviewEmpty();
    return;
  }

  if (currentSelectedSubmission.isDeletedFromStorage) {
    renderProofPreviewEmpty("Archivo eliminado del storage");
    return;
  }

  const container = document.getElementById("proofPreviewContainer");
  const viewButton = document.getElementById("viewProofButton");
  const downloadLink = document.getElementById("proofDownloadLink");

  if (!container || !viewButton || !downloadLink) return;

  container.innerHTML = `
    <div class="flex h-full items-center justify-center text-sm text-slate-500">
      Cargando vista previa...
    </div>
  `;

  viewButton.classList.add("hidden");
  downloadLink.classList.add("hidden");
  downloadLink.href = "#";

  try {
    const result = await get(
      `/api/admin/${currentCompany.slug}/payments/proof-submissions/${currentSelectedSubmission.id}/view`
    );

    if (!result?.url) {
      throw new Error("No se pudo obtener la vista previa del comprobante.");
    }

    const downloadResult = await get(
      `/api/admin/${currentCompany.slug}/payments/proof-submissions/${currentSelectedSubmission.id}/download`
    );

    downloadLink.href = downloadResult.url;
    downloadLink.setAttribute("download", downloadResult.fileName || "comprobante");
    downloadLink.classList.remove("hidden");
    viewButton.classList.remove("hidden");

    container.innerHTML = "";

    if (result.isImage) {
      const img = document.createElement("img");
      img.src = result.url;
      img.alt = result.fileName || "Comprobante";
      img.className = "max-h-[420px] max-w-full rounded-xl object-contain";

      container.appendChild(img);
      return;
    }

    if (result.isPdf) {
      const iframe = document.createElement("iframe");
      iframe.src = result.url;
      iframe.className = "h-[420px] w-full rounded-xl border bg-white";

      container.appendChild(iframe);
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "flex h-full w-full flex-col items-center justify-center rounded-2xl bg-white text-center";

    const title = document.createElement("div");
    title.className = "text-sm font-semibold text-slate-900";
    title.textContent = result.fileName || "Archivo disponible";

    const text = document.createElement("div");
    text.className = "mt-2 text-sm text-slate-500";
    text.textContent = "Usá “Visualizar comprobante” o “Descargar” para abrir el archivo.";

    wrapper.appendChild(title);
    wrapper.appendChild(text);
    container.appendChild(wrapper);
  } catch {
    renderProofPreviewEmpty("No se pudo cargar la vista previa del comprobante.");
  }
}

function syncModalButtons() {
  const approveButton = document.getElementById("approvePaymentButton");
  const rejectButton = document.getElementById("rejectSubmissionButton");
  const viewButton = document.getElementById("viewProofButton");
  const downloadLink = document.getElementById("proofDownloadLink");

  if (!approveButton || !rejectButton || !viewButton || !downloadLink || !currentSelectedPayment) return;

  const isApproved = Number(currentSelectedPayment.paymentStatus) === 3;
  const isTransfer = String(currentSelectedPayment.paymentMethod).toLowerCase() === "transfer";
const submissionStatus = String(currentSelectedSubmission?.status ?? "").toLowerCase();

const hasSubmissionInReview =
  currentSelectedSubmission &&
  (
    Number(currentSelectedSubmission.status) === 2 ||
    submissionStatus === "inreview" ||
    submissionStatus === "in_review"
  );

approveButton.disabled = !hasSubmissionInReview;
rejectButton.disabled = !isTransfer || !hasSubmissionInReview;

  if (!isTransfer || !currentSelectedSubmission || currentSelectedSubmission.isDeletedFromStorage) {
    viewButton.classList.add("hidden");
    downloadLink.classList.add("hidden");
    downloadLink.href = "#";
    return;
  }

  viewButton.classList.remove("hidden");
}

async function loadProofSubmissions(paymentId) {
  currentProofSubmissions =
    await get(`/api/admin/${currentCompany.slug}/payments/${paymentId}/proof-submissions`);

  currentSelectedSubmission =
    currentProofSubmissions.find(x => {
      const status = String(x.status ?? "").toLowerCase();

      return (
        Number(x.status) === 2 ||
        status === "inreview" ||
        status === "in_review"
      );
    })
    || currentProofSubmissions[0]
    || null;

  renderProofSubmissions();
  renderSelectedSubmissionPreview();
  syncModalButtons();
}

async function openPaymentDetail(paymentId) {
  const payment = currentPayments.find(x => x.id === paymentId);
  if (!payment) return;

  currentSelectedPayment = payment;
  currentProofSubmissions = [];
  currentSelectedSubmission = null;

  fillPaymentDetail(payment);
  renderProofSubmissions();
  syncModalButtons();
  openModal();

  const isTransfer = String(payment.paymentMethod).toLowerCase() === "transfer";

  if (!isTransfer) {
    renderProofPreviewEmpty("Este pago no tiene comprobante porque fue registrado en efectivo.");
    return;
  }

  try {
    const items = await get(`/api/admin/${currentCompany.slug}/payments/${paymentId}/proof-submissions`);
    currentProofSubmissions = Array.isArray(items) ? items : [];
    currentSelectedSubmission =
      currentProofSubmissions.find(x => {
        const status = String(x.status ?? "").toLowerCase();

        return (
          Number(x.status) === 2 ||
          status === "inreview" ||
          status === "in_review"
        );
      })
      || currentProofSubmissions[0]
      || null;

    renderSelectedSubmissionPreview();
    renderProofSubmissions();
    syncModalButtons();
  } catch {
    renderProofPreviewEmpty("No se pudieron cargar los comprobantes.");
    renderProofSubmissions();
    syncModalButtons();
  }
}

async function approvePayment() {
  if (!currentSelectedPayment) return;

  const reviewNote =
    document.getElementById("approveReviewNote")?.value?.trim() || "";

  await post(
    `/api/admin/${currentCompany.slug}/payments/${currentSelectedPayment.id}/approve`,
    {
      reviewNote
    }
  );

  showMessage("Pago aprobado correctamente");
  closeModal();
  await loadPayments();
}

async function rejectSubmission() {
  if (!currentSelectedSubmission) return;

  const reviewNote =
    document.getElementById("approveReviewNote")?.value?.trim() || null;

  await post(
    `/api/admin/${currentCompany.slug}/payments/proof-submissions/${currentSelectedSubmission.id}/reject`,
    {
      reviewNote
    }
  );

  showMessage("Comprobante rechazado");
  closeModal();
  await loadPayments();
}

function bindEvents() {
  document
    .getElementById("searchPaymentsButton")
    .addEventListener("click", renderPaymentsTable);

  document
    .getElementById("clearPaymentsFiltersButton")
    .addEventListener("click", () => {
      document.getElementById("filterStudentQuery").value = "";
      document.getElementById("filterCourseId").value = "";
      document.getElementById("filterPeriod").value = "";
      document.getElementById("filterPaymentMethod").value = "";
      document.getElementById("filterPaymentStatus").value = "";
      document.getElementById("filterChargeType").value = "";

      renderPaymentsTable();
    });

  document
    .getElementById("reloadPaymentsButton")
    .addEventListener("click", loadPayments);

  document
    .getElementById("closePaymentDetailModalButton")
    .addEventListener("click", closeModal);

  document
    .getElementById("paymentDetailModalBackdrop")
    .addEventListener("click", closeModal);

  document
    .getElementById("viewProofButton")
    .addEventListener("click", openProofViewer);

  document
    .getElementById("closeProofViewerButton")
    .addEventListener("click", closeProofViewer);

  document
    .getElementById("proofViewerBackdrop")
    .addEventListener("click", closeProofViewer);

  document
    .getElementById("approvePaymentButton")
    .addEventListener("click", approvePayment);

  document
    .getElementById("rejectSubmissionButton")
    .addEventListener("click", rejectSubmission);
}

async function init() {
  await loadConfig();
  const session = requireAuth();
  if (!session) return;

  const app = document.getElementById("app");

  app.innerHTML = renderAdminLayout({
    activeKey: "payments",
    pageTitle: "Pagos",
    contentHtml: buildContent()
  });

  const layout = await setupAdminLayout({
    onCompanyChanged: async (company) => {
      currentCompany = company;
      await loadPayments();
    }
  });

  currentCompany = layout.activeCompany;

  if (!hasModule(currentCompany, "payments")) {
    window.location.replace("/src/pages/admin/students/index.html");
    return;
  }
  
  bindEvents();
  await loadPayments();
}

init();