import { get, post, put, del } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";
import { hasModule } from "../../../shared/js/modules.js";

const LATE_FEE_RECURRENCE = {
    ONE_TIME: 1,
    DAILY: 2,
    WEEKLY: 3
};

let company = null;
let companySettings = null;
let courses = [];
let paymentSettings = null;
let coursePricings = [];
let latePaymentConfigs = [];
let siblingDiscounts = [];
let scholarships = [];
let selectedStudentScholarships = [];
let scholarshipStudents = [];
let scholarshipStudentSearch = "";
let isSavingScholarship = false;
let isAssigningScholarship = false;
let selectedScholarshipStudentId = null;
let scholarshipAssignments = [];
let scholarshipAssignmentsSearch = "";
let pricingEditKey = null;
let siblingEditId = null;
let lateEditId = null;
let scholarshipsSearch = "";
let isSavingSettings = false;
let isSavingPricing = false;
let isSavingLateFee = false;
let isSavingSibling = false;
let isSavingTransfer = false;
let paymentMethods = [];
let isSavingPaymentMethods = false;
let mercadoPagoStatus = null;
let isLoadingMercadoPagoStatus = false;
let isConnectingMercadoPago = false;
let isDisconnectingMercadoPago = false;
let deletingPricingId = null;
let deletingLateFeeId = null;
let deletingSiblingId = null;
let isEditingSettings = false;
let activeSection = "summary";

function qs(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const el = qs(id);
    if (el) el.textContent = value;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function money(value) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
    }).format(Number(value || 0));
}

function scholarshipTypeLabel(value) {
    const text = String(value ?? "").toLowerCase();

    if (text === "percentage" || Number(value) === 1) return "Porcentaje";
    if (text === "fixedamount" || Number(value) === 2) return "Monto fijo";

    return "-";
}

function scholarshipValueLabel(item) {
    const type = String(item?.discountType ?? "").toLowerCase();

    if (type === "percentage" || Number(item?.discountType) === 1) {
        return `${Number(item.discountValue || 0)}%`;
    }

    return money(item?.discountValue || 0);
}

function formatDate(date) {
    if (!date) return "-";

    try {
        return new Date(date).toLocaleString("es-AR", {
            dateStyle: "short",
            timeStyle: "short"
        });
    } catch {
        return "-";
    }
}

function recurrenceLabel(value) {
    const text = String(value ?? "").toLowerCase();

    if (text === "onetime" || Number(value) === LATE_FEE_RECURRENCE.ONE_TIME) {
        return "Única";
    }

    if (text === "daily" || Number(value) === LATE_FEE_RECURRENCE.DAILY) {
        return "Diaria";
    }

    if (text === "weekly" || Number(value) === LATE_FEE_RECURRENCE.WEEKLY) {
        return "Semanal";
    }

    return "-";
}
function buildContent() {
    return `
    <section class="space-y-6">
        ${renderPaymentsHero()}
        ${renderPaymentSettingsNav()}

        <div id="pageMessage" class="hidden rounded-2xl border px-4 py-3 text-sm"></div>

        <div id="paymentSettingsSectionRoot"></div>

        <div id="pricingModalRoot"></div>
    </section>
`;
}

function renderPaymentSettingsNav() {
    const items = [
        { key: "summary", label: "Resumen rápido" },
        { key: "charges", label: "Cuotas" },
        { key: "pricing", label: "Precios" },
        { key: "promotions", label: "Promociones" },
        { key: "lateFees", label: "Vencimientos y moras" },
        { key: "payments", label: "Pagos" }
    ];

    return `
        <div class="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
            <div class="flex min-w-max gap-2">
                ${items.map(item => `
                    <button
                        type="button"
                        data-section="${item.key}"
                        class="payment-settings-tab rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                            activeSection === item.key
                                ? "bg-slate-900 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                        }"
                    >
                        ${item.label}
                    </button>
                `).join("")}
            </div>
        </div>
    `;
}

function renderActiveSection() {
    const root = qs("paymentSettingsSectionRoot");
    if (!root) return;

    switch (activeSection) {
        case "summary":
            root.innerHTML = renderSummarySection();
            break;

        case "charges":
            root.innerHTML = renderChargesSection();
            break;

        case "pricing":
            root.innerHTML = renderPricingSection();
            break;

        case "promotions":
            root.innerHTML = renderPromotionsSection();
            break;

        case "lateFees":
            root.innerHTML = renderLateFeesSection();
            break;

        case "payments":
            root.innerHTML = renderPaymentsSection();
            break;

        default:
            root.innerHTML = renderSummarySection();
            break;
    }

    renderStats();
}

function bindPaymentSettingsNav() {
    document.querySelectorAll(".payment-settings-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            activeSection = btn.dataset.section || "summary";

            const navWrapper = btn.closest(".overflow-x-auto");
            if (navWrapper) {
                navWrapper.outerHTML = renderPaymentSettingsNav();
            }

            renderActiveSection();
            bindPaymentSettingsNav();
            bindSectionEvents();
            renderStats();
        });
    });
}

function renderSummarySection() {
    return `
        <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="text-lg font-bold text-slate-900">Resumen rápido</h2>
            <p class="mt-1 text-sm text-slate-500">
                Estado general de la configuración de pagos.
            </p>

            <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div class="rounded-2xl bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Empresa</p>
                    <p id="summaryCompanyName" class="mt-2 font-bold text-slate-900">-</p>
                </div>

                <div class="rounded-2xl bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Cuotas</p>
                    <p class="mt-2 font-bold text-slate-900">
                        Generación día <span id="summaryGenerationDay">-</span>
                    </p>
                    <p class="text-sm text-slate-500">
                        Vencimiento día <span id="summaryDueDay">-</span>
                    </p>
                </div>

                <div class="rounded-2xl bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Precios</p>
                    <p class="mt-2 font-bold text-slate-900">
                        <span id="summaryPricings">0</span> configurados
                    </p>
                </div>

                <div class="rounded-2xl bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Moras</p>
                    <p class="mt-2 font-bold text-slate-900">
                        <span id="summaryLateFees">0</span> activas
                    </p>
                </div>

                <div class="rounded-2xl bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Hermanos</p>
                    <p class="mt-2 font-bold text-slate-900">
                        <span id="summarySiblings">0</span> descuentos
                    </p>
                </div>

                <div class="rounded-2xl bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Becas</p>
                    <p class="mt-2 font-bold text-slate-900">
                        <span id="summaryScholarships">0</span> tipos
                    </p>
                    <p class="text-sm text-slate-500">
                        <span id="summaryScholarshipAssignments">0</span> asignadas
                    </p>
                </div>

                <div class="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                    <p class="text-xs font-semibold uppercase text-slate-500">Medios de pago</p>
                    <p class="mt-2 font-bold text-slate-900">
                        <span id="summaryPaymentMethods">0</span> activos
                    </p>
                    <p id="summaryPaymentMethodsDetail" class="mt-1 text-sm text-slate-500">
                        Sin medios activos
                    </p>
                </div>
            </div>
        </section>
    `;
}

function renderChargesSection() {
    return `
        <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="text-lg font-bold text-slate-900">Generación automática de cuotas</h2>
            <p class="mt-1 text-sm text-slate-500">
                Configurá cuándo se generan las cuotas y cuándo vencen.
            </p>

            <form id="settingsForm" class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label class="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 md:col-span-2">
                    <input id="settingsAutoGenerateEnabled" type="checkbox" class="h-5 w-5" />
                    <span class="font-semibold text-slate-800">Generar cuotas automáticamente</span>
                </label>

                <div>
                    <label class="mb-1 block text-sm font-medium text-slate-700">Día de generación</label>
                    <input id="settingsGenerationDay" type="number" min="1" max="28"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                </div>

                <div>
                    <label class="mb-1 block text-sm font-medium text-slate-700">Día de vencimiento</label>
                    <input id="settingsDueDay" type="number" min="1" max="31"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                </div>

                <div>
                    <label class="mb-1 block text-sm font-medium text-slate-700">Cobrar mes actual desde día</label>
                    <input id="settingsChargeWindowStart" type="number" min="1" max="31"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                </div>

                <div>
                    <label class="mb-1 block text-sm font-medium text-slate-700">Hasta día</label>
                    <input id="settingsChargeWindowEnd" type="number" min="1" max="31"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                </div>

                <label class="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 md:col-span-2">
                    <input id="settingsNewStudentRespectOriginalDueDateForLateFee" type="checkbox" class="h-5 w-5" />
                    <span class="text-sm font-medium text-slate-700">
                        Respetar vencimiento original para alumnos nuevos
                    </span>
                </label>

                <div id="settingsGraceDaysWrapper" class="md:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-slate-700">Días de gracia alumnos nuevos</label>
                    <input id="settingsNewStudentLateFeeGraceDays" type="number" min="0"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                </div>

                <p class="text-sm text-slate-500 md:col-span-2">
                    Última generación: <span id="settingsLastGeneration">-</span>
                </p>

                <p id="settingsError" class="hidden text-sm text-rose-600 md:col-span-2"></p>

                <div class="flex flex-wrap gap-3 md:col-span-2">
                    <button id="editSettingsBtn" type="button"
                        class="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
                        Editar
                    </button>

                    <button id="cancelSettingsEditBtn" type="button"
                        class="hidden rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
                        Cancelar
                    </button>

                    <button id="saveSettingsBtn" type="submit"
                        class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
                        Guardar configuración
                    </button>
                </div>
            </form>
        </section>
    `;
}

function renderPricingSection() {
    return `
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <form id="pricingForm" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 id="pricingFormTitle" class="text-lg font-bold text-slate-900">
                    Precios por curso y frecuencia
                </h2>

                <div class="mt-5 space-y-4">
                    <div>
                        <label class="mb-1 block text-sm font-medium text-slate-700">Curso</label>
                        <select id="pricingCourseId"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"></select>
                    </div>

                    <div>
                        <label class="mb-1 block text-sm font-medium text-slate-700">Clases por semana</label>
                        <input id="pricingClassesPerWeek" type="number" min="1"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                    </div>

                    <div>
                        <label class="mb-1 block text-sm font-medium text-slate-700">Precio</label>
                        <input id="pricingPrice" type="number" min="0" step="0.01"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                    </div>

                    <p id="pricingError" class="hidden text-sm text-rose-600"></p>

                    <div class="flex gap-3">
                        <button id="cancelPricingEditBtn" type="button"
                            class="hidden flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                            Cancelar
                        </button>

                        <button id="savePricingBtn" type="submit"
                            class="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                            Guardar precio
                        </button>
                    </div>
                </div>
            </form>

            <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <h2 class="text-lg font-bold text-slate-900">Precios configurados</h2>

                <div class="mt-5 overflow-x-auto">
                    <table class="w-full min-w-[680px] text-left text-sm">
                        <thead>
                            <tr class="border-b border-slate-200 text-xs uppercase text-slate-500">
                                <th class="px-3 py-3">Curso</th>
                                <th class="px-3 py-3">Frecuencia</th>
                                <th class="px-3 py-3">Precio</th>
                                <th class="px-3 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="pricingTable"></tbody>
                    </table>

                    <p id="pricingEmptyState" class="hidden rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                        Todavía no hay precios configurados.
                    </p>
                </div>
            </section>
        </section>
    `;
}

function renderPromotionsSection() {
    return `
        <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">

            <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h2 class="text-lg font-bold text-slate-900">
                            Descuentos por hermanos
                        </h2>

                        <p class="mt-1 text-sm text-slate-500">
                            Configurá descuentos automáticos para hermanos.
                        </p>
                    </div>
                </div>

                <form id="siblingsForm" class="mt-5 space-y-4">
                    <div>
                        <label class="mb-1 block text-sm font-medium text-slate-700">
                            Cantidad mínima de hermanos
                        </label>

                        <input
                            id="siblingCount"
                            type="number"
                            min="2"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        />
                    </div>

                    <div>
                        <label class="mb-1 block text-sm font-medium text-slate-700">
                            Descuento (%)
                        </label>

                        <input
                            id="discountPercent"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        />
                    </div>
                    </label>

                    <p id="siblingsError" class="hidden text-sm text-rose-600"></p>

                    <div class="flex gap-3">
                        <button
                            id="cancelSiblingEditBtn"
                            type="button"
                            class="hidden flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
                        >
                            Cancelar
                        </button>

                        <button
                            id="saveSiblingBtn"
                            type="submit"
                            class="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                        >
                            Guardar descuento
                        </button>
                    </div>
                </form>

                <div class="mt-6 overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead>
                            <tr class="border-b border-slate-200 text-xs uppercase text-slate-500">
                                <th class="px-3 py-3">Hermanos</th>
                                <th class="px-3 py-3">Descuento</th>
                                <th class="px-3 py-3">Estado</th>
                                <th class="px-3 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>

                        <tbody id="siblingsTable"></tbody>
                    </table>
                    <div id="siblingsList" class="hidden"></div>

                    <p id="siblingsEmptyState"
                        class="hidden rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                        No hay descuentos configurados.
                    </p>
                </div>
            </section>

            <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h2 class="text-lg font-bold text-slate-900">
                            Becas
                        </h2>

                        <p class="mt-1 text-sm text-slate-500">
                            Administrá becas y asignaciones.
                        </p>
                    </div>

                    <button
                        id="openScholarshipsBtn"
                        type="button"
                        class="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                        Administrar becas
                    </button>
                </div>

                <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="text-xs uppercase tracking-wide text-slate-500">
                            Tipos de beca
                        </p>

                        <p id="summaryScholarships"
                            class="mt-2 text-3xl font-bold text-slate-900">
                            0
                        </p>
                    </div>

                    <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="text-xs uppercase tracking-wide text-slate-500">
                            Becas asignadas
                        </p>

                        <p id="summaryScholarshipAssignments"
                            class="mt-2 text-3xl font-bold text-slate-900">
                            0
                        </p>
                    </div>
                </div>

                <div class="mt-6 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    Las becas permiten aplicar descuentos personalizados por alumno y curso.
                </div>
                <div id="promotionsScholarshipsList" class="mt-5 space-y-3"></div>
            </section>
        </div>
    `;
}

function renderPromotionsScholarshipsList() {
    const list = qs("promotionsScholarshipsList");
    if (!list) return;

    if (!scholarships.length) {
        list.innerHTML = `
            <p class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Todavía no hay becas creadas.
            </p>
        `;
        return;
    }

    const ordered = [...scholarships].sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return (a.name || "").localeCompare(b.name || "");
    });

    list.innerHTML = ordered.map(item => `
        <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
            <div>
                <p class="font-semibold text-slate-900">${escapeHtml(item.name)}</p>
                <p class="mt-1 text-sm text-slate-500">
                    ${escapeHtml(scholarshipTypeLabel(item.discountType))}: ${escapeHtml(scholarshipValueLabel(item))}
                </p>
            </div>

            ${item.isActive
                ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Activa</span>`
                : `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Inactiva</span>`
            }
        </div>
    `).join("");
}

function renderLateFeesSection() {
    return `
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <form id="lateFeeForm" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 id="lateFeeFormTitle" class="text-lg font-bold text-slate-900">
                    Moras y vencimientos
                </h2>

                <div class="mt-5 space-y-4">
                    <input id="lateFeeName" type="text" placeholder="Nombre"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />

                    <select id="lateFeeCourseId"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"></select>

                    <input id="lateFeeDueDay" type="number" min="1" max="31" placeholder="Día de vencimiento"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />

                    <select id="lateFeeRecurrenceType"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm">
                        <option value="1">Única</option>
                        <option value="2">Diaria</option>
                        <option value="3">Semanal</option>
                    </select>

                    <input id="lateFeePercentIncrease" type="number" min="0" step="0.01" placeholder="Recargo %"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />

                    <input id="lateFeeFixedIncrease" type="number" min="0" step="0.01" placeholder="Recargo fijo"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />

                    <label class="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                        <input id="lateFeeIsActive" type="checkbox" class="h-5 w-5" />
                        <span class="text-sm font-medium text-slate-700">Mora activa</span>
                    </label>

                    <p id="lateFeeError" class="hidden text-sm text-rose-600"></p>

                    <div class="flex gap-3">
                        <button id="cancelLateFeeEditBtn" type="button"
                            class="hidden flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                            Cancelar
                        </button>

                        <button id="saveLateFeeBtn" type="submit"
                            class="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                            Guardar mora
                        </button>
                    </div>
                </div>
            </form>

            <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <h2 class="text-lg font-bold text-slate-900">Moras configuradas</h2>

                <div class="mt-5 overflow-x-auto">
                    <table class="w-full min-w-[760px] text-left text-sm">
                        <thead>
                            <tr class="border-b border-slate-200 text-xs uppercase text-slate-500">
                                <th class="px-3 py-3">Nombre</th>
                                <th class="px-3 py-3">Curso</th>
                                <th class="px-3 py-3">Vence</th>
                                <th class="px-3 py-3">Recurrencia</th>
                                <th class="px-3 py-3">Recargo</th>
                                <th class="px-3 py-3">Estado</th>
                                <th class="px-3 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="lateFeeTable"></tbody>
                    </table>

                    <p id="lateFeeEmptyState" class="hidden rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                        Todavía no hay moras configuradas.
                    </p>
                </div>
            </section>
        </section>
    `;
}

function renderPaymentsSection() {
    const mercadoPago = paymentMethods.find(x =>
        String(x.paymentMethod).toLowerCase() === "mercadopago" ||
        String(x.paymentMethodName).toLowerCase() === "mercado pago"
    );

    const shouldShowMercadoPago =
        mercadoPagoStatus?.autoCollectionEnabledBySuperAdmin === true ||
        (
            mercadoPago &&
            mercadoPago.enabledBySuperAdmin === true &&
            mercadoPago.autoCollectionEnabledBySuperAdmin === true
        );

    return `
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 class="text-lg font-bold text-slate-900">Medios de pago</h2>
                <p class="mt-1 text-sm text-slate-500">
                    Configurá transferencia, efectivo, tarjetas y otros medios habilitados.
                </p>

                <div class="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Activos para alumnos</p>
                    <p class="mt-2 text-2xl font-bold text-slate-900">
                        <span id="summaryPaymentMethods">0</span>
                    </p>
                    <p id="summaryPaymentMethodsDetail" class="mt-1 text-sm text-slate-500">
                        Sin medios activos
                    </p>
                </div>

                <button
                    id="openPaymentMethodsBtn"
                    type="button"
                    class="mt-5 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
                    Configurar medios de pago
                </button>
            </section>

            ${renderMercadoPagoAdminCard(shouldShowMercadoPago)}
        </section>
    `;
}

function renderMercadoPagoAdminCard(shouldShowMercadoPago) {
    if (!shouldShowMercadoPago) {
        return `
            <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 class="text-lg font-bold text-slate-900">Mercado Pago automático</h2>
                <p class="mt-1 text-sm text-slate-500">
                    Esta funcionalidad todavía no está habilitada para esta empresa.
                </p>

                <div class="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                    Para usar cobro automático, el SuperAdmin debe habilitar Mercado Pago automático.
                </div>
            </section>
        `;
    }

    const isConnected = mercadoPagoStatus?.isConnected === true;
    const status = mercadoPagoStatus?.status || "not_connected";

    return `
        <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h2 class="text-lg font-bold text-slate-900">Mercado Pago automático</h2>
                    <p class="mt-1 text-sm text-slate-500">
                        Conectá la cuenta del club para cobrar cuotas automáticamente.
                    </p>
                </div>

                ${isConnected
                    ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Conectado</span>`
                    : `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">No conectado</span>`
                }
            </div>

            <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs font-semibold uppercase text-slate-500">Estado</p>
                <p class="mt-1 font-bold text-slate-900">
                    ${isConnected ? "Cuenta conectada correctamente" : "Pendiente de conexión"}
                </p>

                ${mercadoPagoStatus?.mercadoPagoUserId ? `
                    <p class="mt-2 text-sm text-slate-500">
                        Usuario MP: ${escapeHtml(mercadoPagoStatus.mercadoPagoUserId)}
                    </p>
                ` : ""}

                ${mercadoPagoStatus?.connectedAtUtc ? `
                    <p class="mt-1 text-sm text-slate-500">
                        Conectado: ${formatDate(mercadoPagoStatus.connectedAtUtc)}
                    </p>
                ` : ""}

                ${mercadoPagoStatus?.lastError ? `
                    <div class="mt-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                        ${escapeHtml(mercadoPagoStatus.lastError)}
                    </div>
                ` : ""}
            </div>

            <div class="mt-5 flex flex-col gap-3 sm:flex-row">
                ${isConnected ? `
                    <button
                        id="disconnectMercadoPagoBtn"
                        type="button"
                        class="flex-1 rounded-2xl border border-rose-300 px-5 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                        ${isDisconnectingMercadoPago ? "Desconectando..." : "Desconectar"}
                    </button>
                ` : `
                    <button
                        id="connectMercadoPagoBtn"
                        type="button"
                        class="flex-1 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                        ${isConnectingMercadoPago ? "Conectando..." : "Conectar Mercado Pago"}
                    </button>
                `}
            </div>

            <p class="mt-4 text-xs text-slate-400">
                Estado técnico: ${escapeHtml(status)}
            </p>
        </section>
    `;
}

function bindSectionEvents() {
    qs("settingsForm")?.addEventListener("submit", saveSettings);
    qs("editSettingsBtn")?.addEventListener("click", startSettingsEdit);
    qs("cancelSettingsEditBtn")?.addEventListener("click", cancelSettingsEdit);
    qs("settingsNewStudentRespectOriginalDueDateForLateFee")?.addEventListener("change", toggleGraceDaysVisibility);

    qs("pricingForm")?.addEventListener("submit", savePricing);
    qs("cancelPricingEditBtn")?.addEventListener("click", resetPricingForm);

    qs("siblingsForm")?.addEventListener("submit", saveSibling);
    qs("cancelSiblingEditBtn")?.addEventListener("click", resetSiblingForm);
    qs("openScholarshipsBtn")?.addEventListener("click", openScholarshipsModal);
    qs("lateFeeForm")?.addEventListener("submit", saveLateFee);
    qs("cancelLateFeeEditBtn")?.addEventListener("click", resetLateFeeForm);
    qs("openPaymentMethodsBtn")?.addEventListener("click", openPaymentMethodsModal);
    qs("connectMercadoPagoBtn")?.addEventListener("click", connectMercadoPago);
    qs("disconnectMercadoPagoBtn")?.addEventListener("click", disconnectMercadoPago);

    if (activeSection === "charges") {
        renderSettings();
    }

    if (activeSection === "pricing") {
        renderCourseOptions();
        renderPricingTable();
        resetPricingForm();
    }

    if (activeSection === "promotions") {
        renderSiblings();
        renderPromotionsScholarshipsList();
        resetSiblingForm();
    }

    if (activeSection === "lateFees") {
        renderCourseOptions();
        renderLateFeeTable();
        resetLateFeeForm();
    }

    if (activeSection === "payments") {
        renderStats();
    }
}

function showPageMessage(message, type = "success") {
    const el = qs("pageMessage");
    if (!el) return;

    const baseClasses = "rounded-2xl border px-4 py-3 text-sm";
    const typeClasses = type === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

    el.className = `${baseClasses} ${typeClasses}`;
    el.textContent = message;
    el.classList.remove("hidden");
}

function hidePageMessage() {
    const el = qs("pageMessage");
    if (!el) return;

    el.classList.add("hidden");
    el.textContent = "";
}

function showFieldError(id, message) {
    const el = qs(id);
    if (!el) return;

    el.textContent = message;
    el.classList.remove("hidden");
}

function clearFieldError(id) {
    const el = qs(id);
    if (!el) return;

    el.textContent = "";
    el.classList.add("hidden");
}

function clearAllErrors() {
    clearFieldError("settingsError");
    clearFieldError("pricingError");
    clearFieldError("lateFeeError");
    clearFieldError("siblingsError");
    clearFieldError("transferSettingsError");
}

function setSettingsLoading(loading) {
    isSavingSettings = loading;

    qs("saveSettingsBtn").disabled = loading;
    qs("editSettingsBtn").disabled = loading;
    qs("cancelSettingsEditBtn").disabled = loading;

    if (loading) {
        qs("settingsAutoGenerateEnabled").disabled = true;
        qs("settingsGenerationDay").disabled = true;
        qs("settingsDueDay").disabled = true;
        qs("settingsChargeWindowStart").disabled = true;
        qs("settingsChargeWindowEnd").disabled = true;
        qs("settingsNewStudentRespectOriginalDueDateForLateFee").disabled = true;
        qs("settingsNewStudentLateFeeGraceDays").disabled = true;
        qs("saveSettingsBtn").textContent = "Guardando...";
        return;
    }

    applySettingsReadonlyState();
}

function setPricingLoading(loading) {
    isSavingPricing = loading;

    qs("pricingCourseId").disabled = loading;
    qs("pricingClassesPerWeek").disabled = loading;
    qs("pricingPrice").disabled = loading;
    qs("savePricingBtn").disabled = loading;
    qs("cancelPricingEditBtn").disabled = loading;

    qs("savePricingBtn").textContent = loading
        ? "Guardando..."
        : (pricingEditKey ? "Guardar cambios" : "Guardar precio");
}

function setLateFeeLoading(loading) {
    isSavingLateFee = loading;

    qs("lateFeeName").disabled = loading;
    qs("lateFeeCourseId").disabled = loading;
    qs("lateFeeDueDay").disabled = loading;
    qs("lateFeeRecurrenceType").disabled = loading;
    qs("lateFeePercentIncrease").disabled = loading;
    qs("lateFeeFixedIncrease").disabled = loading;
    qs("lateFeeIsActive").disabled = loading;
    qs("saveLateFeeBtn").disabled = loading;
    qs("cancelLateFeeEditBtn").disabled = loading;

    qs("saveLateFeeBtn").textContent = loading
        ? "Guardando..."
        : (lateEditId ? "Guardar cambios" : "Guardar mora");
}

function setSiblingLoading(loading) {
    isSavingSibling = loading;

    qs("siblingCount").disabled = loading;
    qs("discountPercent").disabled = loading;
    qs("saveSiblingBtn").disabled = loading;
    qs("cancelSiblingEditBtn").disabled = loading;

    qs("saveSiblingBtn").textContent = loading
        ? "Guardando..."
        : (siblingEditId ? "Guardar cambios" : "Guardar descuento");
}

function setTransferLoading(loading) {
    isSavingTransfer = loading;

    qs("transferAlias").disabled = loading;
    qs("transferCbu").disabled = loading;
    qs("transferAccountHolder").disabled = loading;
    qs("transferBankName").disabled = loading;
    qs("saveTransferSettingsBtn").disabled = loading;

    qs("saveTransferSettingsBtn").textContent = loading
        ? "Guardando..."
        : "Guardar transferencia";
}

function renderStats() {
    const pricingCount = coursePricings.length;
    const activeLateFees = latePaymentConfigs.filter(x => x.isActive).length;
    const siblingCount = siblingDiscounts.length;

    setText("statPricings", String(pricingCount));
    setText("statLateFees", String(activeLateFees));
    setText("statSiblings", String(siblingCount));

    setText("summaryCompanyName", company?.name || "-");
    setText("summaryPricings", String(pricingCount));
    setText("summaryLateFees", String(activeLateFees));
    setText("summarySiblings", String(siblingCount));
    setText("summaryGenerationDay", paymentSettings?.generationDayOfMonth || "-");
    setText("summaryDueDay", paymentSettings?.dueDayOfMonth || "-");
    setText("summaryScholarships", String(scholarships.length));
    setText("summaryScholarshipAssignments", String(scholarshipAssignments.length));

    const enabledPaymentMethods = paymentMethods.filter(x =>
        x.isEnabledByAdmin === true ||
        x.enabledByAdmin === true ||
        x.isEnabled === true
    );

    setText("summaryPaymentMethods", String(enabledPaymentMethods.length));
    setText(
        "summaryPaymentMethodsDetail",
        enabledPaymentMethods.length
            ? enabledPaymentMethods
                .map(x => x.paymentMethodName || x.paymentMethod || "Medio de pago")
                .join(", ")
            : "Sin medios activos"
    );
}

async function loadScholarships() {
    scholarships = await get(`/api/admin/${company.slug}/scholarships`);
}

async function loadScholarshipStudents() {
    const response = await get(`/api/admin/${company.slug}/students`);
    scholarshipStudents = Array.isArray(response)
        ? response
        : (response.items || []);
}

async function loadScholarshipAssignments() {
    scholarshipAssignments = await get(`/api/admin/${company.slug}/scholarships/assignments`);
}

async function loadStudentScholarships(studentId) {
    if (!studentId) {
        selectedStudentScholarships = [];
        return;
    }

    selectedStudentScholarships = await get(`/api/admin/${company.slug}/scholarships/students/${studentId}`);
}

function renderCourseOptions() {
    const orderedCourses = [...courses].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const pricingSelect = qs("pricingCourseId");
    const lateSelect = qs("lateFeeCourseId");

    if (pricingSelect) {
        pricingSelect.innerHTML = orderedCourses.length
            ? `
                <option value="">Seleccionar curso</option>
                ${orderedCourses.map(course => `
                    <option value="${course.id}">
                        ${escapeHtml(course.name)}${course.isActive ? "" : " (Inactivo)"}
                    </option>
                `).join("")}
            `
            : `<option value="">No hay cursos disponibles</option>`;
    }

    if (lateSelect) {
        lateSelect.innerHTML = `
            <option value="">Todos los cursos</option>
            ${orderedCourses.map(course => `
                <option value="${course.id}">
                    ${escapeHtml(course.name)}${course.isActive ? "" : " (Inactivo)"}
                </option>
            `).join("")}
        `;
    }
}

function renderSettings() {
    if (!paymentSettings) return;

    qs("settingsAutoGenerateEnabled").checked = !!paymentSettings.autoGenerateEnabled;
    qs("settingsGenerationDay").value = paymentSettings.generationDayOfMonth ?? "";
    qs("settingsDueDay").value = paymentSettings.dueDayOfMonth ?? "";
    qs("settingsChargeWindowStart").value = paymentSettings.currentMonthChargeWindowStartDay ?? "";
    qs("settingsChargeWindowEnd").value = paymentSettings.currentMonthChargeWindowEndDay ?? "";
    qs("settingsNewStudentRespectOriginalDueDateForLateFee").checked =
        paymentSettings.newStudentRespectOriginalDueDateForLateFee ?? true;
    qs("settingsNewStudentLateFeeGraceDays").value =
        paymentSettings.newStudentLateFeeGraceDays ?? "";
    qs("settingsLastGeneration").textContent = formatDate(paymentSettings.lastAutoGenerationUtc);

    toggleGraceDaysVisibility();
    applySettingsReadonlyState();
}

async function loadPaymentMethods() {
    paymentMethods = await get(`/api/admin/${company.slug}/payment-methods`);
}

async function savePaymentMethods(payload) {
    return await put(`/api/admin/${company.slug}/payment-methods`, payload);
}

async function loadMercadoPagoStatus() {
    try {
        isLoadingMercadoPagoStatus = true;
        mercadoPagoStatus = await get(`/api/admin/${company.slug}/mercadopago/status`);
    } catch {
        mercadoPagoStatus = null;
    } finally {
        isLoadingMercadoPagoStatus = false;
    }
}

async function connectMercadoPago() {
    if (isConnectingMercadoPago) return;

    try {
        isConnectingMercadoPago = true;

        const response = await get(`/api/admin/${company.slug}/mercadopago/connect-url`);

        if (!response?.url) {
            showPageMessage("No se pudo obtener la URL de conexión de Mercado Pago.", "error");
            return;
        }

        window.location.href = response.url;
    } catch (error) {
        showPageMessage(error.message || "No se pudo iniciar la conexión con Mercado Pago.", "error");
        isConnectingMercadoPago = false;
    }
}

async function disconnectMercadoPago() {
    if (isDisconnectingMercadoPago) return;

    const confirmed = window.confirm("¿Querés desconectar Mercado Pago automático?");
    if (!confirmed) return;

    try {
        isDisconnectingMercadoPago = true;

        await post(`/api/admin/${company.slug}/mercadopago/disconnect`, {});

        await loadMercadoPagoStatus();

        renderActiveSection();
        bindSectionEvents();

        showPageMessage("Mercado Pago se desconectó correctamente.");
    } catch (error) {
        showPageMessage(error.message || "No se pudo desconectar Mercado Pago.", "error");
    } finally {
        isDisconnectingMercadoPago = false;
    }
}

function renderTransferSettings() {
    const alias = qs("transferAlias");
    const cbu = qs("transferCbu");
    const holder = qs("transferAccountHolder");
    const bank = qs("transferBankName");

    if (!alias || !cbu || !holder || !bank) return;

    alias.value = companySettings?.transferAlias ?? "";
    cbu.value = companySettings?.transferCbu ?? "";
    holder.value = companySettings?.transferAccountHolder ?? "";
    bank.value = companySettings?.transferBankName ?? "";
}

function hasSavedSettings() {
    return !!paymentSettings;
}

function applySettingsReadonlyState() {
    const hasSettings = hasSavedSettings();
    const shouldLock = hasSettings && !isEditingSettings && !isSavingSettings;
    const respectCheckbox = qs("settingsNewStudentRespectOriginalDueDateForLateFee");

    qs("settingsAutoGenerateEnabled").disabled = shouldLock;
    qs("settingsGenerationDay").disabled = shouldLock;
    qs("settingsDueDay").disabled = shouldLock;
    qs("settingsChargeWindowStart").disabled = shouldLock;
    qs("settingsChargeWindowEnd").disabled = shouldLock;
    respectCheckbox.disabled = shouldLock;

    const shouldDisableGraceDays = shouldLock || respectCheckbox.checked;
    qs("settingsNewStudentLateFeeGraceDays").disabled = shouldDisableGraceDays;

    const editBtn = qs("editSettingsBtn");
    const cancelBtn = qs("cancelSettingsEditBtn");
    const saveBtn = qs("saveSettingsBtn");

    if (!hasSettings) {
        editBtn.classList.add("hidden");
        cancelBtn.classList.add("hidden");
        saveBtn.classList.remove("hidden");
        saveBtn.textContent = "Guardar configuración";
        return;
    }

    if (isEditingSettings) {
        editBtn.classList.add("hidden");
        cancelBtn.classList.remove("hidden");
        saveBtn.classList.remove("hidden");
        saveBtn.textContent = "Guardar cambios";
    } else {
        editBtn.classList.remove("hidden");
        cancelBtn.classList.add("hidden");
        saveBtn.classList.add("hidden");
    }
}

function toggleGraceDaysVisibility() {
    const wrapper = qs("settingsGraceDaysWrapper");
    const respectDueDate = qs("settingsNewStudentRespectOriginalDueDateForLateFee")?.checked ?? true;

    if (!wrapper) return;

    if (respectDueDate) {
        wrapper.classList.add("hidden");
    } else {
        wrapper.classList.remove("hidden");
    }

    if (!isSavingSettings) {
        applySettingsReadonlyState();
    }
}

function startSettingsEdit() {
    if (!hasSavedSettings()) return;

    isEditingSettings = true;
    clearFieldError("settingsError");
    applySettingsReadonlyState();
    toggleGraceDaysVisibility();
}

function cancelSettingsEdit() {
    isEditingSettings = false;
    clearFieldError("settingsError");
    renderSettings();
    applySettingsReadonlyState();
}

function renderPricingTable() {
const tbody = qs("pricingTable");
const emptyState = qs("pricingEmptyState");

    if (!tbody || !emptyState) return;

    if (!coursePricings.length) {
        tbody.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    const ordered = [...coursePricings].sort((a, b) => {
        const byName = (a.courseName || "").localeCompare(b.courseName || "");
        if (byName !== 0) return byName;
        return Number(a.classesPerWeek || 0) - Number(b.classesPerWeek || 0);
    });

    tbody.innerHTML = ordered.map(item => {
        const editKey = `${item.courseId}_${item.classesPerWeek}`;

        return `
            <tr class="border-b border-slate-100">
                <td class="px-3 py-4 font-medium text-slate-900">${escapeHtml(item.courseName)}</td>
                <td class="px-3 py-4 text-slate-700">${item.classesPerWeek} ${item.classesPerWeek === 1 ? "clase" : "clases"} / semana</td>
                <td class="px-3 py-4 text-slate-700">${money(item.price)}</td>
                <td class="px-3 py-4">
                    <div class="flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            data-key="${editKey}"
                            class="edit-pricing-btn rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            data-id="${item.id}"
                            class="delete-pricing-btn rounded-2xl border border-rose-300 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            ${deletingPricingId === item.id ? "disabled" : ""}
                        >
                            ${deletingPricingId === item.id ? "Eliminando..." : "Eliminar"}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll(".edit-pricing-btn").forEach(btn => {
        btn.addEventListener("click", () => openPricingEdit(btn.dataset.key));
    });

    tbody.querySelectorAll(".delete-pricing-btn").forEach(btn => {
        btn.addEventListener("click", () => openDeletePricingModal(btn.dataset.id));
    });
}

function renderLateFeeTable() {
    const tbody = qs("lateFeeTable");
    const emptyState = qs("lateFeeEmptyState");

    if (!latePaymentConfigs.length) {
        tbody.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    tbody.innerHTML = latePaymentConfigs.map(item => `
        <tr class="border-b border-slate-100">
            <td class="px-3 py-4">
                <div class="font-medium text-slate-900">${escapeHtml(item.name)}</div>
            </td>
            <td class="px-3 py-4 text-slate-700">${escapeHtml(item.courseName || "Todos los cursos")}</td>
            <td class="px-3 py-4 text-slate-700">Día ${item.dueDayOfMonth}</td>
            <td class="px-3 py-4 text-slate-700">${escapeHtml(recurrenceLabel(item.recurrenceType))}</td>
            <td class="px-3 py-4 text-slate-700">
                <div>% ${Number(item.percentIncrease || 0)}</div>
                <div class="text-xs text-slate-500">+ ${money(item.fixedIncrease || 0)}</div>
            </td>
            <td class="px-3 py-4">
                ${item.isActive
                    ? `<span class="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Activa</span>`
                    : `<span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Inactiva</span>`
                }
            </td>
            <td class="px-3 py-4">
                <div class="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        data-id="${item.id}"
                        class="edit-late-fee-btn rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        data-id="${item.id}"
                        class="delete-late-fee-btn rounded-2xl border border-rose-300 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        ${deletingLateFeeId === item.id ? "disabled" : ""}
                    >
                        ${deletingLateFeeId === item.id ? "Eliminando..." : "Eliminar"}
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".edit-late-fee-btn").forEach(btn => {
        btn.addEventListener("click", () => openLateFeeEdit(btn.dataset.id));
    });

    tbody.querySelectorAll(".delete-late-fee-btn").forEach(btn => {
        btn.addEventListener("click", () => openDeleteLateFeeModal(btn.dataset.id));
    });
}

function openScholarshipsModal() {
    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div class="max-h-[90vh] w-full max-w-7xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div class="flex items-start justify-between gap-4">
<div>
    <div class="flex items-center gap-3">
        <h3 class="text-xl font-semibold text-slate-900">Gestión de becas</h3>

        <button
            id="openScholarshipsHelpBtn"
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50"
            title="Ayuda"
        >
            ?
        </button>
    </div>

    <p class="mt-1 text-sm text-slate-500">
        Primero creá un tipo de beca y después asignásela a un alumno.
    </p>
</div>

                    <button
                        id="closeScholarshipsModalBtn"
                        type="button"
                        class="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                </div>

                <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <section class="rounded-3xl border border-slate-200 p-5">
                        <h4 class="text-lg font-semibold text-slate-900">1. Crear tipo de beca</h4>
                            <p class="mt-1 text-sm text-slate-500">
                                Definí el descuento: puede ser porcentaje o monto fijo.
                            </p>

                        <form id="scholarshipForm" class="mt-4 space-y-4">
                            <div>
                                <label class="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                                <input
                                    id="scholarshipName"
                                    type="text"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                    placeholder="Ej: Beca deportiva 50%"
                                />
                            </div>

                            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label class="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
                                    <select
                                        id="scholarshipDiscountType"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                    >
                                        <option value="1">Porcentaje</option>
                                        <option value="2">Monto fijo</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="mb-1 block text-sm font-medium text-slate-700">Valor</label>
                                    <input
                                        id="scholarshipDiscountValue"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                        placeholder="Ej: 50"
                                    />
                                </div>
                            </div>

                            <div class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                                <input id="scholarshipIsActive" type="checkbox" checked class="h-4 w-4" />
                                <label for="scholarshipIsActive" class="text-sm font-medium text-slate-700">
                                    Beca activa
                                </label>
                            </div>

                            <p id="scholarshipError" class="hidden text-sm text-rose-600"></p>

                            <button
                                id="saveScholarshipBtn"
                                type="submit"
                                class="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                                Guardar beca
                            </button>
                        </form>

                        <div class="mt-6">
                            <label class="mb-1 block text-sm font-medium text-slate-700">Buscar beca</label>
                            <input
                                id="scholarshipsSearch"
                                type="text"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                placeholder="Buscar por nombre o valor"
                            />
                        </div>

                        <div class="mt-6 space-y-3" id="scholarshipsList"></div>
                    </section>

                    <section class="rounded-3xl border border-slate-200 p-5">
                        <h4 class="text-lg font-semibold text-slate-900">2. Asignar beca a alumno</h4>
                        <p class="mt-1 text-sm text-slate-500">
                            Elegí el alumno, la beca y si aplica a todos sus cursos o solo a uno.
                        </p>

                        <form id="assignScholarshipForm" class="mt-4 space-y-4">
                            <label class="mb-1 block text-sm font-medium text-slate-700">Buscar alumno</label>
                            <input
                                id="assignScholarshipStudentSearch"
                                type="text"
                                class="mb-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                placeholder="Buscar por nombre, apellido, email o DNI"
                            />

                            <label class="mb-1 block text-sm font-medium text-slate-700">Alumno</label>
                            <select
                                id="assignScholarshipStudentId"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                            ></select>

                            <div>
                                <label class="mb-1 block text-sm font-medium text-slate-700">Beca</label>
                                <select
                                    id="assignScholarshipId"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                ></select>
                            </div>

                            <div>
                                <label class="mb-1 block text-sm font-medium text-slate-700">Curso donde aplica</label>
                                <select
                                    id="assignScholarshipCourseId"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                ></select>
                                <p class="mt-1 text-xs text-slate-500">Si lo dejás vacío, la beca será global para el alumno.</p>
                            </div>

                            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label class="mb-1 block text-sm font-medium text-slate-700">Inicio</label>
                                    <input
                                        id="assignScholarshipStartDate"
                                        type="date"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>

                                <div>
                                    <label class="mb-1 block text-sm font-medium text-slate-700">Fin</label>
                                    <input
                                        id="assignScholarshipEndDate"
                                        type="date"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label class="mb-1 block text-sm font-medium text-slate-700">Nota</label>
                                <textarea
                                    id="assignScholarshipNotes"
                                    rows="3"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                    placeholder="Opcional"
                                ></textarea>
                            </div>

                            <p id="assignScholarshipError" class="hidden text-sm text-rose-600"></p>

                            <button
                                id="assignScholarshipBtn"
                                type="submit"
                                class="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                                Asignar beca
                            </button>
                        </form>

                        <div class="mt-6">
                            <h5 class="font-semibold text-slate-900">Becas del alumno</h5>
                            <div id="studentScholarshipsList" class="mt-3 space-y-3"></div>
                        </div>
                    </section>

                    <section class="rounded-3xl border border-slate-200 p-5">
                        <h4 class="text-lg font-semibold text-slate-900">3. Becas otorgadas</h4>
                        <p class="mt-1 text-sm text-slate-500">
                            Consultá todas las becas asignadas en la empresa.
                        </p>

                        <div class="mt-4">
                            <label class="mb-1 block text-sm font-medium text-slate-700">Buscar</label>
                            <input
                                id="scholarshipAssignmentsSearch"
                                type="text"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                placeholder="Alumno, beca, curso, email o DNI"
                            />
                        </div>

                        <div id="scholarshipAssignmentsList" class="mt-5 space-y-3"></div>
                    </section>
                </div>
            </div>
        </div>
    `);

    bindScholarshipsModal();
    renderScholarshipsModalData();
}

function bindScholarshipsModal() {
    qs("closeScholarshipsModalBtn").addEventListener("click", closeModal);
    qs("scholarshipForm").addEventListener("submit", saveScholarship);
    qs("assignScholarshipForm").addEventListener("submit", assignScholarship);
    qs("assignScholarshipStudentSearch").addEventListener("input", () => {
    scholarshipStudentSearch = qs("assignScholarshipStudentSearch").value.trim().toLowerCase();
    renderScholarshipSelects();
    });
    qs("openScholarshipsHelpBtn").addEventListener("click", openScholarshipsHelpModal);
    qs("assignScholarshipStudentId").addEventListener("change", async () => {
        selectedScholarshipStudentId = qs("assignScholarshipStudentId").value || null;
        await loadStudentScholarships(selectedScholarshipStudentId);
        renderStudentScholarships();
    });
    qs("scholarshipAssignmentsSearch").addEventListener("input", () => {
    scholarshipAssignmentsSearch = qs("scholarshipAssignmentsSearch").value.trim().toLowerCase();
    renderScholarshipAssignments();
    });
    qs("scholarshipsSearch").addEventListener("input", () => {
    scholarshipsSearch = qs("scholarshipsSearch").value.trim().toLowerCase();
    renderScholarshipsList();
    });
}

function renderScholarshipsModalData() {
    renderScholarshipsList();
    renderScholarshipSelects();

    const today = new Date().toISOString().slice(0, 10);
    qs("assignScholarshipStartDate").value = today;

    selectedScholarshipStudentId = qs("assignScholarshipStudentId").value || null;

    if (selectedScholarshipStudentId) {
        loadStudentScholarships(selectedScholarshipStudentId).then(renderStudentScholarships);
    } else {
        renderStudentScholarships();
    }
    renderScholarshipAssignments();
}

function renderScholarshipAssignments() {
    const list = qs("scholarshipAssignmentsList");
    if (!list) return;

    const filtered = [...scholarshipAssignments]
        .filter(item => {
            const text = [
                item.studentFullName,
                item.studentEmail,
                item.studentDni,
                item.scholarshipName,
                item.courseName,
                item.isGlobal ? "global todos cursos" : ""
            ].join(" ").toLowerCase();

            return !scholarshipAssignmentsSearch || text.includes(scholarshipAssignmentsSearch);
        })
        .sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            return (a.studentFullName || "").localeCompare(b.studentFullName || "");
        });

    if (!filtered.length) {
        list.innerHTML = `
            <p class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No se encontraron becas otorgadas.
            </p>
        `;
        return;
    }

    list.innerHTML = `
        <div class="mb-2 flex items-center justify-between">
            <p class="text-sm font-semibold text-slate-900">Total otorgadas</p>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                ${filtered.length}
            </span>
        </div>

        ${filtered.map(item => `
            <div class="rounded-2xl border border-slate-200 p-4">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="font-medium text-slate-900">${escapeHtml(item.studentFullName)}</p>
                        <p class="mt-1 text-sm text-slate-500">
                            ${escapeHtml(item.scholarshipName)}
                            · ${escapeHtml(scholarshipValueLabel(item))}
                        </p>
                        <p class="mt-1 text-xs text-slate-500">
                            ${item.isGlobal ? "Global - todos sus cursos" : escapeHtml(item.courseName || "Curso específico")}
                        </p>
                        <p class="mt-1 text-xs text-slate-400">
                            Desde ${formatDateOnly(item.startDateUtc)} hasta ${item.endDateUtc ? formatDateOnly(item.endDateUtc) : "sin fin"}
                        </p>
                        ${item.studentEmail ? `<p class="mt-1 text-xs text-slate-400">${escapeHtml(item.studentEmail)}</p>` : ""}
                        ${item.studentDni ? `<p class="mt-1 text-xs text-slate-400">DNI: ${escapeHtml(item.studentDni)}</p>` : ""}
                    </div>

                    <div class="shrink-0">
                        ${item.isActive
                            ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Activa</span>`
                            : `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Inactiva</span>`
                        }
                    </div>
                </div>

                ${item.isActive
                    ? `
                        <button
                            type="button"
                            data-id="${item.id}"
                            class="deactivate-assignment-btn mt-3 w-full rounded-2xl border border-rose-300 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                            Desactivar beca
                        </button>
                    `
                    : ""
                }
            </div>
        `).join("")}
    `;

    list.querySelectorAll(".deactivate-assignment-btn").forEach(btn => {
        btn.addEventListener("click", () => deactivateStudentScholarship(btn.dataset.id));
    });
}

function renderScholarshipSelects() {
    const orderedScholarships = [...scholarships]
        .filter(x => x.isActive)
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    qs("assignScholarshipId").innerHTML = orderedScholarships.length
        ? `
            <option value="">Seleccionar beca</option>
            ${orderedScholarships.map(item => `
                <option value="${item.id}">
                    ${escapeHtml(item.name)} - ${escapeHtml(scholarshipValueLabel(item))}
                </option>
            `).join("")}
        `
        : `<option value="">No hay becas activas</option>`;

    const filteredStudents = [...scholarshipStudents]
        .filter(item => {
            const text = [
                item.firstName,
                item.lastName,
                item.fullName,
                item.email,
                item.dni,
                item.memberNumber
            ].join(" ").toLowerCase();

            return !scholarshipStudentSearch || text.includes(scholarshipStudentSearch);
        })
        .sort((a, b) => {
            const an = `${a.lastName || ""} ${a.firstName || ""}`;
            const bn = `${b.lastName || ""} ${b.firstName || ""}`;
            return an.localeCompare(bn);
        });

    qs("assignScholarshipStudentId").innerHTML = filteredStudents.length
        ? `
            <option value="">Seleccionar alumno</option>
            ${filteredStudents.map(item => `
                <option value="${item.id}">
                    ${escapeHtml(item.fullName || `${item.lastName || ""}, ${item.firstName || ""}`)}
                    ${item.email ? ` - ${escapeHtml(item.email)}` : ""}
                    ${item.dni ? ` - DNI ${escapeHtml(item.dni)}` : ""}
                </option>
            `).join("")}
        `
        : `<option value="">No se encontraron alumnos</option>`;

    const orderedCourses = [...courses].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    qs("assignScholarshipCourseId").innerHTML = `
        <option value="">Todos sus cursos - Beca Global</option>
        ${orderedCourses.map(course => `
            <option value="${course.id}">
                ${escapeHtml(course.name)}${course.isActive ? "" : " (Inactivo)"}
            </option>
        `).join("")}
    `;
}

function renderScholarshipsList() {
    const list = qs("scholarshipsList");

    const filtered = [...scholarships]
        .filter(item => {
            const text = [
                item.name,
                scholarshipTypeLabel(item.discountType),
                scholarshipValueLabel(item),
                item.isActive ? "activa" : "inactiva"
            ].join(" ").toLowerCase();

            return !scholarshipsSearch || text.includes(scholarshipsSearch);
        })
        .sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            return (a.name || "").localeCompare(b.name || "");
        });

    if (!filtered.length) {
        list.innerHTML = `<p class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No se encontraron becas.</p>`;
        return;
    }

    list.innerHTML = `
        <div class="mb-2 flex items-center justify-between">
            <p class="text-sm font-semibold text-slate-900">Becas creadas</p>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                ${filtered.length}
            </span>
        </div>

        <div class="max-h-[320px] space-y-3 overflow-y-auto pr-1">
            <div class="max-h-[520px] space-y-3 overflow-y-auto pr-1">
            ${filtered.map(item => `
                <div class="rounded-2xl border border-slate-200 p-4">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <p class="font-medium text-slate-900">${escapeHtml(item.name)}</p>
                            <p class="mt-1 text-sm text-slate-500">
                                ${escapeHtml(scholarshipTypeLabel(item.discountType))}: ${escapeHtml(scholarshipValueLabel(item))}
                            </p>
                        </div>

                        ${item.isActive
                            ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Activa</span>`
                            : `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Inactiva</span>`
                        }
                    </div>
                </div>
            `).join("")}
            </div>
        </div>
    `;
}

function renderStudentScholarships() {
    const list = qs("studentScholarshipsList");

    if (!selectedScholarshipStudentId) {
        list.innerHTML = `<p class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Seleccioná un alumno para ver sus becas asignadas.</p>`;
        return;
    }

    const selectedStudent = scholarshipStudents.find(x => x.id === selectedScholarshipStudentId);
    const studentName = selectedStudent?.fullName
        || `${selectedStudent?.firstName || ""} ${selectedStudent?.lastName || ""}`.trim()
        || "Alumno";

    if (!selectedStudentScholarships.length) {
        list.innerHTML = `
            <div class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                <p class="font-medium text-slate-700">${escapeHtml(studentName)}</p>
                <p class="mt-1">Este alumno todavía no tiene becas asignadas.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = `
        <div class="mb-2">
            <p class="text-sm font-semibold text-slate-900">${escapeHtml(studentName)}</p>
            <p class="text-xs text-slate-500">Becas asignadas al alumno</p>
        </div>

        ${selectedStudentScholarships.map(item => `
            <div class="rounded-2xl border border-slate-200 p-4">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="font-medium text-slate-900">${escapeHtml(item.scholarshipName)}</p>
                        <p class="mt-1 text-sm text-slate-500">
                            ${item.isGlobal ? "Global - todos sus cursos" : escapeHtml(item.courseName || "Curso específico")}
                            · ${escapeHtml(scholarshipTypeLabel(item.discountType))}
                            · ${escapeHtml(scholarshipValueLabel(item))}
                        </p>
                        <p class="mt-1 text-xs text-slate-400">
                            Desde ${formatDateOnly(item.startDateUtc)} hasta ${item.endDateUtc ? formatDateOnly(item.endDateUtc) : "sin fin"}
                        </p>
                        ${item.notes ? `<p class="mt-2 text-xs text-slate-500">${escapeHtml(item.notes)}</p>` : ""}
                    </div>

                    <button
                        type="button"
                        data-id="${item.id}"
                        class="deactivate-student-scholarship-btn rounded-2xl border border-rose-300 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        ${!item.isActive ? "disabled" : ""}
                    >
                        ${item.isActive ? "Desactivar" : "Inactiva"}
                    </button>
                </div>
            </div>
        `).join("")}
    `;

    list.querySelectorAll(".deactivate-student-scholarship-btn").forEach(btn => {
        btn.addEventListener("click", () => deactivateStudentScholarship(btn.dataset.id));
    });
}

function formatDateOnly(date) {
    if (!date) return "-";

    try {
        return new Date(date).toLocaleDateString("es-AR");
    } catch {
        return "-";
    }
}

function setScholarshipLoading(loading) {
    isSavingScholarship = loading;

    qs("scholarshipName").disabled = loading;
    qs("scholarshipDiscountType").disabled = loading;
    qs("scholarshipDiscountValue").disabled = loading;
    qs("scholarshipIsActive").disabled = loading;
    qs("saveScholarshipBtn").disabled = loading;

    qs("saveScholarshipBtn").textContent = loading ? "Guardando..." : "Guardar beca";
}

function setAssignScholarshipLoading(loading) {
    isAssigningScholarship = loading;

    qs("assignScholarshipStudentId").disabled = loading;
    qs("assignScholarshipId").disabled = loading;
    qs("assignScholarshipCourseId").disabled = loading;
    qs("assignScholarshipStartDate").disabled = loading;
    qs("assignScholarshipEndDate").disabled = loading;
    qs("assignScholarshipNotes").disabled = loading;
    qs("assignScholarshipBtn").disabled = loading;

    qs("assignScholarshipBtn").textContent = loading ? "Asignando..." : "Asignar beca";
}

function validateScholarshipForm() {
    clearFieldError("scholarshipError");

    const name = qs("scholarshipName").value.trim();
    const type = Number(qs("scholarshipDiscountType").value);
    const value = Number(qs("scholarshipDiscountValue").value);

    if (!name) {
        showFieldError("scholarshipError", "El nombre es obligatorio.");
        return false;
    }

    if (!value || value <= 0) {
        showFieldError("scholarshipError", "El valor debe ser mayor a cero.");
        return false;
    }

    if (type === 1 && value > 100) {
        showFieldError("scholarshipError", "El porcentaje no puede superar el 100%.");
        return false;
    }

    return true;
}

function validateAssignScholarshipForm() {
    clearFieldError("assignScholarshipError");

    if (!qs("assignScholarshipStudentId").value) {
        showFieldError("assignScholarshipError", "Seleccioná un alumno.");
        return false;
    }

    if (!qs("assignScholarshipId").value) {
        showFieldError("assignScholarshipError", "Seleccioná una beca.");
        return false;
    }

    if (!qs("assignScholarshipStartDate").value) {
        showFieldError("assignScholarshipError", "Indicá la fecha de inicio.");
        return false;
    }

    const start = qs("assignScholarshipStartDate").value;
    const end = qs("assignScholarshipEndDate").value;

    if (end && end < start) {
        showFieldError("assignScholarshipError", "La fecha de fin no puede ser menor al inicio.");
        return false;
    }

    return true;
}

function openScholarshipsHelpModal() {
    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div class="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h3 class="text-xl font-semibold text-slate-900">¿Cómo funcionan las becas?</h3>
                        <p class="mt-1 text-sm text-slate-500">
                            Las becas sirven para aplicar descuentos individuales a alumnos.
                        </p>
                    </div>

                    <button
                        id="closeScholarshipsHelpBtn"
                        type="button"
                        class="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                </div>

                <div class="mt-6 space-y-4 text-sm text-slate-600">
                    <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="font-semibold text-slate-900">1. Crear tipo de beca</p>
                        <p class="mt-1">
                            Primero creás una beca base. Por ejemplo: <strong>Beca 50%</strong> o
                            <strong>Beca $10.000</strong>.
                        </p>
                    </div>

                    <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="font-semibold text-slate-900">2. Asignarla a un alumno</p>
                        <p class="mt-1">
                            Después elegís el alumno y la beca que querés aplicar.
                        </p>
                    </div>

                    <div class="rounded-2xl bg-slate-50 p-4">
                        <p class="font-semibold text-slate-900">3. Global o por curso</p>
                        <p class="mt-1">
                            Si dejás el curso vacío, la beca aplica a todos los cursos del alumno.
                            Si elegís un curso, aplica solo a ese curso.
                        </p>
                    </div>

                    <div class="rounded-2xl bg-amber-50 p-4 text-amber-800">
                        <p class="font-semibold">Importante</p>
                        <p class="mt-1">
                            Por ahora esta pantalla solo crea y asigna becas. El impacto en cuotas lo conectamos después,
                            para hacerlo seguro y no romper el cálculo actual.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `);

    qs("closeScholarshipsHelpBtn").addEventListener("click", openScholarshipsModal);
}

async function saveScholarship(event) {
    event.preventDefault();

    if (isSavingScholarship) return;
    if (!validateScholarshipForm()) return;

    const payload = {
        name: qs("scholarshipName").value.trim(),
        discountType: Number(qs("scholarshipDiscountType").value),
        discountValue: Number(qs("scholarshipDiscountValue").value),
        isActive: qs("scholarshipIsActive").checked
    };

    try {
        setScholarshipLoading(true);

        await post(`/api/admin/${company.slug}/scholarships`, payload);

        await loadScholarships();

        qs("scholarshipForm").reset();
        qs("scholarshipIsActive").checked = true;

        renderScholarshipsList();
        renderScholarshipSelects();
        renderStats();

        showPageMessage("La beca se creó correctamente.");
    } catch (error) {
        showFieldError("scholarshipError", error.message || "No se pudo guardar la beca.");
    } finally {
        setScholarshipLoading(false);
    }
}

async function assignScholarship(event) {
    event.preventDefault();

    if (isAssigningScholarship) return;
    if (!validateAssignScholarshipForm()) return;

    const startDate = qs("assignScholarshipStartDate").value;
    const endDate = qs("assignScholarshipEndDate").value;

    const payload = {
        studentId: qs("assignScholarshipStudentId").value,
        courseId: qs("assignScholarshipCourseId").value || null,
        scholarshipId: qs("assignScholarshipId").value,
        startDateUtc: `${startDate}T00:00:00.000Z`,
        endDateUtc: endDate ? `${endDate}T00:00:00.000Z` : null,
        notes: qs("assignScholarshipNotes").value.trim() || null
    };

    try {
        setAssignScholarshipLoading(true);

        await post(`/api/admin/${company.slug}/scholarships/assign`, payload);

        selectedScholarshipStudentId = payload.studentId;
        await loadStudentScholarships(selectedScholarshipStudentId);
        await loadScholarshipAssignments();

        qs("assignScholarshipCourseId").value = "";
        qs("assignScholarshipId").value = "";
        qs("assignScholarshipEndDate").value = "";
        qs("assignScholarshipNotes").value = "";

        renderStudentScholarships();
        renderScholarshipAssignments();
        renderStats();

        showPageMessage("La beca se asignó correctamente.");
    } catch (error) {
        showFieldError("assignScholarshipError", error.message || "No se pudo asignar la beca.");
    } finally {
        setAssignScholarshipLoading(false);
    }
}

async function deactivateStudentScholarship(id) {
    if (!id) return;

    try {
        await put(`/api/admin/${company.slug}/scholarships/student-scholarships/${id}/deactivate`, {});

        await loadStudentScholarships(selectedScholarshipStudentId);
        await loadScholarshipAssignments();
        renderStudentScholarships();
        renderScholarshipAssignments();
        renderStats();

        showPageMessage("La beca del alumno se desactivó correctamente.");
    } catch (error) {
        showPageMessage(error.message || "No se pudo desactivar la beca.", "error");
    }
}

function renderSiblings() {
    const tbody = qs("siblingsTable");
    const emptyState = qs("siblingsEmptyState");

    if (!tbody || !emptyState) return;

    if (!siblingDiscounts.length) {
        tbody.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    const ordered = [...siblingDiscounts].sort((a, b) => Number(a.siblingCount) - Number(b.siblingCount));

    tbody.innerHTML = ordered.map(item => `
        <tr class="border-b border-slate-100">
            <td class="px-3 py-4 font-medium text-slate-900">
                ${item.siblingCount} ${item.siblingCount === 1 ? "hermano" : "hermanos"}
            </td>

            <td class="px-3 py-4 text-slate-700">
                ${Number(item.discountPercent || 0)}%
            </td>

            <td class="px-3 py-4">
                <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    Activo
                </span>
            </td>

            <td class="px-3 py-4">
                <div class="flex justify-end gap-2">
                    <button
                        type="button"
                        data-id="${item.id}"
                        class="edit-sibling-btn rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        data-id="${item.id}"
                        class="delete-sibling-btn rounded-2xl border border-rose-300 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        ${deletingSiblingId === item.id ? "disabled" : ""}
                    >
                        ${deletingSiblingId === item.id ? "Eliminando..." : "Eliminar"}
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".edit-sibling-btn").forEach(btn => {
        btn.addEventListener("click", () => openSiblingEdit(btn.dataset.id));
    });

    tbody.querySelectorAll(".delete-sibling-btn").forEach(btn => {
        btn.addEventListener("click", () => openDeleteSiblingModal(btn.dataset.id));
    });
}

function renderAll() {
    renderActiveSection();
    bindSectionEvents();
    renderStats();
}

function resetPricingForm() {
    pricingEditKey = null;

    const form = qs("pricingForm");
    if (!form) return;

    form.reset();

    setText("pricingFormTitle", "Precios por curso y frecuencia");
    setText("savePricingBtn", "Guardar precio");

    qs("cancelPricingEditBtn")?.classList.add("hidden");
    clearFieldError("pricingError");
}

function resetLateFeeForm() {
    lateEditId = null;

    const form = qs("lateFeeForm");
    if (!form) return;

    form.reset();

    const course = qs("lateFeeCourseId");
    if (course) course.value = "";

    const recurrence = qs("lateFeeRecurrenceType");
    if (recurrence) recurrence.value = String(LATE_FEE_RECURRENCE.ONE_TIME);

    const active = qs("lateFeeIsActive");
    if (active) active.checked = true;

    setText("lateFeeFormTitle", "Moras y vencimientos");
    setText("saveLateFeeBtn", "Guardar mora");

    qs("cancelLateFeeEditBtn")?.classList.add("hidden");
    clearFieldError("lateFeeError");
}

function resetSiblingForm() {
    siblingEditId = null;

    const form = qs("siblingsForm");
    if (!form) return;

    form.reset();

    setText("siblingsFormTitle", "Descuentos por hermanos");
    setText("saveSiblingBtn", "Guardar descuento");

    qs("cancelSiblingEditBtn")?.classList.add("hidden");
    clearFieldError("siblingsError");
}

function openPricingEdit(key) {
    const item = coursePricings.find(x => `${x.courseId}_${x.classesPerWeek}` === key);
    if (!item) return;

    pricingEditKey = key;
    qs("pricingFormTitle").textContent = "Editar precio";
    qs("pricingCourseId").value = item.courseId;
    qs("pricingClassesPerWeek").value = item.classesPerWeek;
    qs("pricingPrice").value = item.price;
    qs("cancelPricingEditBtn").classList.remove("hidden");
    clearFieldError("pricingError");

    window.scrollTo({ top: 0, behavior: "smooth" });
    qs("pricingCourseId").focus();
}

function openLateFeeEdit(id) {
    const item = latePaymentConfigs.find(x => x.id === id);
    if (!item) return;

    lateEditId = id;
    qs("lateFeeFormTitle").textContent = "Editar mora";
    qs("lateFeeName").value = item.name || "";
    qs("lateFeeCourseId").value = item.courseId || "";
    qs("lateFeeDueDay").value = item.dueDayOfMonth ?? "";
    qs("lateFeeRecurrenceType").value = String(normalizeRecurrenceType(item.recurrenceType));
    qs("lateFeePercentIncrease").value = item.percentIncrease ?? 0;
    qs("lateFeeFixedIncrease").value = item.fixedIncrease ?? 0;
    qs("lateFeeIsActive").checked = !!item.isActive;
    qs("cancelLateFeeEditBtn").classList.remove("hidden");
    clearFieldError("lateFeeError");

    window.scrollTo({ top: 0, behavior: "smooth" });
    qs("lateFeeName").focus();
}

function normalizeRecurrenceType(value) {
    const text = String(value ?? "").toLowerCase();

    if (text === "onetime") return LATE_FEE_RECURRENCE.ONE_TIME;
    if (text === "daily") return LATE_FEE_RECURRENCE.DAILY;
    if (text === "weekly") return LATE_FEE_RECURRENCE.WEEKLY;

    const number = Number(value);
    return number > 0 ? number : LATE_FEE_RECURRENCE.ONE_TIME;
}

function openSiblingEdit(id) {
    const item = siblingDiscounts.find(x => x.id === id);
    if (!item) return;

    siblingEditId = id;
    qs("siblingsFormTitle").textContent = "Editar descuento por hermanos";
    qs("siblingCount").value = item.siblingCount ?? "";
    qs("discountPercent").value = item.discountPercent ?? "";
    qs("cancelSiblingEditBtn").classList.remove("hidden");
    clearFieldError("siblingsError");

    qs("siblingCount").focus();
}

function setModal(html) {
    qs("pricingModalRoot").innerHTML = html;
}

function closeModal() {
    setModal("");
}

function buildConfirmModal({ title, description, confirmText, confirmClass, onConfirm }) {
    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <h3 class="text-lg font-semibold text-slate-900">${escapeHtml(title)}</h3>
                <p class="mt-2 text-sm text-slate-500">${escapeHtml(description)}</p>

                <div class="mt-6 flex gap-3">
                    <button
                        id="modalCancelBtn"
                        type="button"
                        class="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Cancelar
                    </button>

                    <button
                        id="modalConfirmBtn"
                        type="button"
                        class="flex-1 rounded-2xl px-4 py-3 text-sm font-medium text-white transition ${confirmClass}"
                    >
                        ${escapeHtml(confirmText)}
                    </button>
                </div>
            </div>
        </div>
    `);

    qs("modalCancelBtn").addEventListener("click", closeModal);
    qs("modalConfirmBtn").addEventListener("click", onConfirm);
}

function openDeletePricingModal(id) {
    const item = coursePricings.find(x => x.id === id);
    if (!item) return;

    buildConfirmModal({
        title: "Eliminar precio",
        description: `Vas a eliminar el precio de "${item.courseName}" para ${item.classesPerWeek} clases por semana.`,
        confirmText: "Eliminar",
        confirmClass: "bg-rose-600 hover:bg-rose-700",
        onConfirm: async () => {
            closeModal();
            await deletePricing(id);
        }
    });
}

function openDeleteLateFeeModal(id) {
    const item = latePaymentConfigs.find(x => x.id === id);
    if (!item) return;

    buildConfirmModal({
        title: "Eliminar mora",
        description: `Vas a eliminar la configuración "${item.name}". Esta acción no se puede deshacer.`,
        confirmText: "Eliminar",
        confirmClass: "bg-rose-600 hover:bg-rose-700",
        onConfirm: async () => {
            closeModal();
            await deleteLateFee(id);
        }
    });
}

function openDeleteSiblingModal(id) {
    const item = siblingDiscounts.find(x => x.id === id);
    if (!item) return;

    buildConfirmModal({
        title: "Eliminar descuento",
        description: `Vas a eliminar el descuento para ${item.siblingCount} ${item.siblingCount === 1 ? "hermano" : "hermanos"}.`,
        confirmText: "Eliminar",
        confirmClass: "bg-rose-600 hover:bg-rose-700",
        onConfirm: async () => {
            closeModal();
            await deleteSibling(id);
        }
    });
}

async function loadCourses() {
    courses = await get(`/api/admin/${company.slug}/courses`);
}

async function loadCompanySettings() {
    companySettings = await get(`/api/admin/${company.slug}/company-settings`);
}

async function loadPaymentSettings() {
    paymentSettings = await get(`/api/admin/${company.slug}/payment-settings`);
}

async function loadCoursePricings() {
    coursePricings = await get(`/api/admin/${company.slug}/payments/course-pricing`);
}

async function loadLatePaymentConfigs() {
    latePaymentConfigs = await get(`/api/admin/${company.slug}/payments/late-payment-configs`);
}

async function loadSiblingDiscounts() {
    siblingDiscounts = await get(`/api/admin/${company.slug}/payments/sibling-discounts`);
}

async function loadAllData() {
    await Promise.all([
        loadCourses(),
        loadCompanySettings(),
        loadPaymentSettings(),
        loadCoursePricings(),
        loadLatePaymentConfigs(),
        loadSiblingDiscounts(),
        loadScholarships(),
        loadScholarshipStudents(),
        loadScholarshipAssignments(),
        loadPaymentMethods(),
        loadMercadoPagoStatus()
    ]);

    renderAll();
}

function validateSettingsForm() {
    clearFieldError("settingsError");

    const generationDay = Number(qs("settingsGenerationDay").value);
    const dueDay = Number(qs("settingsDueDay").value);
    const startDayRaw = qs("settingsChargeWindowStart").value.trim();
    const endDayRaw = qs("settingsChargeWindowEnd").value.trim();
    const respectOriginalDueDate = qs("settingsNewStudentRespectOriginalDueDateForLateFee").checked;
    const graceDaysRaw = qs("settingsNewStudentLateFeeGraceDays").value.trim();

    if (!generationDay || generationDay < 1 || generationDay > 28) {
        showFieldError("settingsError", "El día de generación debe estar entre 1 y 28.");
        return false;
    }

    if (!dueDay || dueDay < 1 || dueDay > 31) {
        showFieldError("settingsError", "El día de vencimiento debe estar entre 1 y 31.");
        return false;
    }

    if ((startDayRaw && !endDayRaw) || (!startDayRaw && endDayRaw)) {
        showFieldError("settingsError", "Debés completar ambos campos del rango de cobro del mes actual.");
        return false;
    }

    if (startDayRaw && endDayRaw) {
        const startDay = Number(startDayRaw);
        const endDay = Number(endDayRaw);

        if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
            showFieldError("settingsError", "El rango de cobro del mes actual debe estar entre 1 y 31.");
            return false;
        }

        if (startDay > endDay) {
            showFieldError("settingsError", "El día inicial no puede ser mayor al día final.");
            return false;
        }
    }

    if (!respectOriginalDueDate) {
        if (graceDaysRaw === "") {
            showFieldError("settingsError", "Debés indicar los días de gracia para alumnos nuevos.");
            return false;
        }

        const graceDays = Number(graceDaysRaw);

        if (Number.isNaN(graceDays) || graceDays < 0) {
            showFieldError("settingsError", "Los días de gracia para alumnos nuevos no pueden ser negativos.");
            return false;
        }
    }

    return true;
}

function validatePricingForm() {
    clearFieldError("pricingError");

    const courseId = qs("pricingCourseId").value;
    const classesPerWeek = Number(qs("pricingClassesPerWeek").value);
    const price = Number(qs("pricingPrice").value);

    if (!courseId) {
        showFieldError("pricingError", "Seleccioná un curso.");
        return false;
    }

    if (!classesPerWeek || classesPerWeek <= 0) {
        showFieldError("pricingError", "La cantidad de clases por semana debe ser mayor a 0.");
        return false;
    }

    if (Number.isNaN(price) || price < 0) {
        showFieldError("pricingError", "El precio no puede ser negativo.");
        return false;
    }

    return true;
}

function validateLateFeeForm() {
    clearFieldError("lateFeeError");

    const name = qs("lateFeeName").value.trim();
    const dueDay = Number(qs("lateFeeDueDay").value);
    const percent = Number(qs("lateFeePercentIncrease").value || 0);
    const fixed = Number(qs("lateFeeFixedIncrease").value || 0);

    if (!name) {
        showFieldError("lateFeeError", "El nombre es obligatorio.");
        return false;
    }

    if (!dueDay || dueDay < 1 || dueDay > 31) {
        showFieldError("lateFeeError", "El día de vencimiento debe estar entre 1 y 31.");
        return false;
    }

    if (percent < 0 || fixed < 0) {
        showFieldError("lateFeeError", "Los recargos no pueden ser negativos.");
        return false;
    }

    return true;
}

function renderPaymentsHero() {
    return `
        <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Configuración</p>
                    <h1 class="mt-2 text-3xl font-bold">Configuración de pagos</h1>
                    <p class="mt-2 text-sm text-slate-300">
                        Configurá cuotas, precios, promociones, vencimientos, moras y medios de pago.
                    </p>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Cursos con precio</p>
                        <p id="statPricings" class="mt-2 text-2xl font-bold">0</p>
                    </div>

                    <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Moras activas</p>
                        <p id="statLateFees" class="mt-2 text-2xl font-bold">0</p>
                    </div>

                    <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Descuentos hermanos</p>
                        <p id="statSiblings" class="mt-2 text-2xl font-bold">0</p>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function validateSiblingForm() {
    clearFieldError("siblingsError");

    const siblingCount = Number(qs("siblingCount").value);
    const discountPercent = Number(qs("discountPercent").value);

    if (!siblingCount || siblingCount <= 0) {
        showFieldError("siblingsError", "La cantidad de hermanos debe ser mayor a 0.");
        return false;
    }

    if (Number.isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        showFieldError("siblingsError", "El descuento debe estar entre 0 y 100.");
        return false;
    }

    return true;
}

function validateTransferForm() {
    clearFieldError("transferSettingsError");
    return true;
}

function openPaymentMethodsModal() {
    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h3 class="text-xl font-semibold text-slate-900">Medios de pago</h3>
                        <p class="mt-1 text-sm text-slate-500">
                            Configurá qué medios verá el alumno y si aplican recargo.
                        </p>
                    </div>

                    <button
                        id="closePaymentMethodsModalBtn"
                        type="button"
                        class="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                </div>

                <form id="paymentMethodsForm" class="mt-6 space-y-4">
                    ${paymentMethods.map(item => `
                        <section class="rounded-3xl border border-slate-200 p-4">
                            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h4 class="font-semibold text-slate-900">${escapeHtml(item.paymentMethodName)}</h4>
                                    <p class="text-xs text-slate-500">
                                        ${item.enabledBySuperAdmin ? "Habilitado por SuperAdmin" : "No disponible"}
                                    </p>
                                </div>

                                <label class="flex items-center gap-2 text-sm text-slate-700">
                                    <span>Activo para alumnos</span>
                                    <input
                                        type="checkbox"
                                        class="payment-method-enabled h-5 w-5"
                                        data-id="${escapeHtml(item.id)}"
                                        ${item.isEnabledByAdmin ? "checked" : ""}
                                        ${!item.enabledBySuperAdmin ? "disabled" : ""}
                                    />
                                </label>
                            </div>

                            <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label class="mb-1 block text-sm font-medium text-slate-700">Tipo de recargo</label>
                                    <select
                                        class="payment-method-surcharge-type w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                                        data-id="${escapeHtml(item.id)}"
                                        ${!item.enabledBySuperAdmin ? "disabled" : ""}
                                    >
                                        <option value="None" ${String(item.surchargeType).toLowerCase() === "none" || Number(item.surchargeType) === 0 ? "selected" : ""}>Sin recargo</option>
                                        <option value="Percentage" ${String(item.surchargeType).toLowerCase() === "percentage" || Number(item.surchargeType) === 1 ? "selected" : ""}>Porcentaje</option>
                                        <option value="FixedAmount" ${String(item.surchargeType).toLowerCase() === "fixedamount" || Number(item.surchargeType) === 2 ? "selected" : ""}>Monto fijo</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="mb-1 block text-sm font-medium text-slate-700">Valor</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        class="payment-method-surcharge-value w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                                        data-id="${escapeHtml(item.id)}"
                                        value="${Number(item.surchargeValue || 0)}"
                                        ${!item.enabledBySuperAdmin ? "disabled" : ""}
                                    />
                                </div>

                                <div>
                                    <label class="mb-1 block text-sm font-medium text-slate-700">Alias</label>
                                    <input
                                        type="text"
                                        class="payment-method-alias w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                                        data-id="${escapeHtml(item.id)}"
                                        value="${escapeHtml(item.alias || "")}"
                                    />
                                </div>

                                <div>
                                    <label class="mb-1 block text-sm font-medium text-slate-700">CBU / CVU</label>
                                    <input
                                        type="text"
                                        class="payment-method-cbu w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                                        data-id="${escapeHtml(item.id)}"
                                        value="${escapeHtml(item.cbu || "")}"
                                    />
                                </div>

                                <div>
                                    <label class="mb-1 block text-sm font-medium text-slate-700">Titular</label>
                                    <input
                                        type="text"
                                        class="payment-method-holder w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                                        data-id="${escapeHtml(item.id)}"
                                        value="${escapeHtml(item.holderName || "")}"
                                    />
                                </div>

                                <div>
                                    <label class="mb-1 block text-sm font-medium text-slate-700">Instrucciones</label>
                                    <textarea
                                        class="payment-method-instructions w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                                        data-id="${escapeHtml(item.id)}"
                                        rows="2"
                                    >${escapeHtml(item.instructions || "")}</textarea>
                                </div>
                            </div>
                        </section>
                    `).join("")}

                    <p id="paymentMethodsError" class="hidden text-sm text-rose-600"></p>

                    <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                        <button
                            id="cancelPaymentMethodsBtn"
                            type="button"
                            class="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>

                        <button
                            id="savePaymentMethodsBtn"
                            type="submit"
                            class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                            Guardar medios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `);

    qs("closePaymentMethodsModalBtn").addEventListener("click", closeModal);
    qs("cancelPaymentMethodsBtn").addEventListener("click", closeModal);
    qs("paymentMethodsForm").addEventListener("submit", submitPaymentMethods);
}

async function submitPaymentMethods(event) {
    event.preventDefault();

    if (isSavingPaymentMethods) return;

    const payload = paymentMethods.map(item => {
        const id = item.id;

        return {
            companyPaymentMethodId: id,
            isEnabledByAdmin: document.querySelector(`.payment-method-enabled[data-id="${id}"]`)?.checked === true,
            surchargeType: document.querySelector(`.payment-method-surcharge-type[data-id="${id}"]`)?.value || "None",
            surchargeValue: Number(document.querySelector(`.payment-method-surcharge-value[data-id="${id}"]`)?.value || 0),
            alias: document.querySelector(`.payment-method-alias[data-id="${id}"]`)?.value?.trim() || null,
            cbu: document.querySelector(`.payment-method-cbu[data-id="${id}"]`)?.value?.trim() || null,
            holderName: document.querySelector(`.payment-method-holder[data-id="${id}"]`)?.value?.trim() || null,
            instructions: document.querySelector(`.payment-method-instructions[data-id="${id}"]`)?.value?.trim() || null
        };
    });

    try {
        isSavingPaymentMethods = true;
        qs("savePaymentMethodsBtn").disabled = true;
        qs("savePaymentMethodsBtn").textContent = "Guardando...";

        await savePaymentMethods(payload);
        await loadPaymentMethods();

        closeModal();

        if (activeSection === "payments") {
            renderActiveSection();
            bindSectionEvents();
        }

        renderStats();

        showPageMessage("Los medios de pago se guardaron correctamente.");
    } catch (error) {
        showFieldError("paymentMethodsError", error.message || "No se pudieron guardar los medios de pago.");
    } finally {
        isSavingPaymentMethods = false;
    }
}

async function saveSettings(event) {
    event.preventDefault();

    if (isSavingSettings) return;
    hidePageMessage();

    const hasSettings = hasSavedSettings();

    if (hasSettings && !isEditingSettings) {
        return;
    }

    if (!validateSettingsForm()) return;

    const startDayRaw = qs("settingsChargeWindowStart").value.trim();
    const endDayRaw = qs("settingsChargeWindowEnd").value.trim();
    const respectOriginalDueDate = qs("settingsNewStudentRespectOriginalDueDateForLateFee").checked;
    const graceDaysRaw = qs("settingsNewStudentLateFeeGraceDays").value.trim();

    const payload = {
        autoGenerateEnabled: qs("settingsAutoGenerateEnabled").checked,
        generationDayOfMonth: Number(qs("settingsGenerationDay").value),
        generationHourUtc: Number(paymentSettings?.generationHourUtc ?? 3),
        dueDayOfMonth: Number(qs("settingsDueDay").value),
        currentMonthChargeWindowStartDay: startDayRaw ? Number(startDayRaw) : null,
        currentMonthChargeWindowEndDay: endDayRaw ? Number(endDayRaw) : null,
        newStudentRespectOriginalDueDateForLateFee: respectOriginalDueDate,
        newStudentLateFeeGraceDays: respectOriginalDueDate
            ? null
            : Number(graceDaysRaw)
    };

    try {
        setSettingsLoading(true);

        await put(`/api/admin/${company.slug}/payment-settings`, payload);

        await loadPaymentSettings();

        isEditingSettings = false;

        renderSettings();
        renderStats();

        showPageMessage(hasSettings
            ? "La configuración automática de cuotas se actualizó correctamente."
            : "La configuración automática de cuotas se guardó correctamente.");
    } catch (error) {
        showFieldError("settingsError", error.message || "No se pudo guardar la configuración.");
    } finally {
        setSettingsLoading(false);
    }
}

async function savePricing(event) {
    event.preventDefault();

    if (isSavingPricing) return;
    hidePageMessage();

    if (!validatePricingForm()) return;

    const payload = {
        courseId: qs("pricingCourseId").value,
        classesPerWeek: Number(qs("pricingClassesPerWeek").value),
        price: Number(qs("pricingPrice").value)
    };

    try {
        setPricingLoading(true);
        await post(`/api/admin/${company.slug}/payments/course-pricing`, payload);
        await loadCoursePricings();
        renderPricingTable();
        renderStats();
        resetPricingForm();
        showPageMessage("El precio se guardó correctamente.");
    } catch (error) {
        showFieldError("pricingError", error.message || "No se pudo guardar el precio.");
    } finally {
        setPricingLoading(false);
    }
}

async function saveLateFee(event) {
    event.preventDefault();

    if (isSavingLateFee) return;
    hidePageMessage();

    if (!validateLateFeeForm()) return;

    const isEditing = !!lateEditId;

    const payload = {
        courseId: qs("lateFeeCourseId").value || null,
        name: qs("lateFeeName").value.trim(),
        dueDayOfMonth: Number(qs("lateFeeDueDay").value),
        recurrenceType: Number(qs("lateFeeRecurrenceType").value),
        percentIncrease: Number(qs("lateFeePercentIncrease").value || 0),
        fixedIncrease: Number(qs("lateFeeFixedIncrease").value || 0),
        isActive: qs("lateFeeIsActive").checked
    };

    try {
        setLateFeeLoading(true);

        if (isEditing) {
            await put(`/api/admin/${company.slug}/payments/late-payment-configs/${lateEditId}`, payload);
        } else {
            await post(`/api/admin/${company.slug}/payments/late-payment-configs`, payload);
        }

        await loadLatePaymentConfigs();
        renderLateFeeTable();
        renderStats();
        resetLateFeeForm();

        showPageMessage(isEditing
            ? "La mora se actualizó correctamente."
            : "La mora se guardó correctamente.");
    } catch (error) {
        showFieldError("lateFeeError", error.message || "No se pudo guardar la mora.");
    } finally {
        setLateFeeLoading(false);
    }
}

async function saveSibling(event) {
    event.preventDefault();

    if (isSavingSibling) return;
    hidePageMessage();

    if (!validateSiblingForm()) return;

    const payload = {
        siblingCount: Number(qs("siblingCount").value),
        discountPercent: Number(qs("discountPercent").value)
    };

    try {
        setSiblingLoading(true);
        await post(`/api/admin/${company.slug}/payments/sibling-discounts`, payload);
        await loadSiblingDiscounts();
        renderSiblings();
        renderStats();
        resetSiblingForm();
        showPageMessage("El descuento por hermanos se guardó correctamente.");
    } catch (error) {
        showFieldError("siblingsError", error.message || "No se pudo guardar el descuento.");
    } finally {
        setSiblingLoading(false);
    }
}

async function saveTransferSettings(event) {
    event.preventDefault();

    if (isSavingTransfer) return;
    hidePageMessage();

    if (!validateTransferForm()) return;

    const payload = {
        name: companySettings?.name ?? company?.name ?? "",
        description: companySettings?.description ?? "",
        whatsapp: companySettings?.whatsapp ?? "",
        email: companySettings?.email ?? "",
        phone: companySettings?.phone ?? "",
        addressLine1: companySettings?.addressLine1 ?? "",
        addressLine2: companySettings?.addressLine2 ?? "",
        city: companySettings?.city ?? "",
        stateOrProvince: companySettings?.stateOrProvince ?? "",
        postalCode: companySettings?.postalCode ?? "",
        country: companySettings?.country ?? "",
        transferAlias: qs("transferAlias").value.trim() || null,
        transferCbu: qs("transferCbu").value.trim() || null,
        transferAccountHolder: qs("transferAccountHolder").value.trim() || null,
        transferBankName: qs("transferBankName").value.trim() || null
    };

    try {
        setTransferLoading(true);
        await put(`/api/admin/${company.slug}/company-settings`, payload);
        await loadCompanySettings();
        renderTransferSettings();
        showPageMessage("La configuración de transferencia se guardó correctamente.");
    } catch (error) {
        showFieldError("transferSettingsError", error.message || "No se pudo guardar la configuración de transferencia.");
    } finally {
        setTransferLoading(false);
    }
}

async function deletePricing(id) {
    try {
        deletingPricingId = id;
        renderPricingTable();

        await del(`/api/admin/${company.slug}/payments/course-pricing/${id}`);

        if (coursePricings.some(x => x.id === id && `${x.courseId}_${x.classesPerWeek}` === pricingEditKey)) {
            resetPricingForm();
        }

        await loadCoursePricings();
        renderPricingTable();
        renderStats();
        showPageMessage("El precio se eliminó correctamente.");
    } catch (error) {
        showPageMessage(error.message || "No se pudo eliminar el precio.", "error");
    } finally {
        deletingPricingId = null;
        renderPricingTable();
    }
}

async function deleteLateFee(id) {
    try {
        deletingLateFeeId = id;
        renderLateFeeTable();

        await del(`/api/admin/${company.slug}/payments/late-payment-configs/${id}`);

        if (lateEditId === id) {
            resetLateFeeForm();
        }

        await loadLatePaymentConfigs();
        renderLateFeeTable();
        renderStats();
        showPageMessage("La mora se eliminó correctamente.");
    } catch (error) {
        showPageMessage(error.message || "No se pudo eliminar la mora.", "error");
    } finally {
        deletingLateFeeId = null;
        renderLateFeeTable();
    }
}

async function deleteSibling(id) {
    try {
        deletingSiblingId = id;
        renderSiblings();

        await del(`/api/admin/${company.slug}/payments/sibling-discounts/${id}`);

        if (siblingEditId === id) {
            resetSiblingForm();
        }

        await loadSiblingDiscounts();
        renderSiblings();
        renderStats();
        showPageMessage("El descuento se eliminó correctamente.");
    } catch (error) {
        showPageMessage(error.message || "No se pudo eliminar el descuento.", "error");
    } finally {
        deletingSiblingId = null;
        renderSiblings();
    }
}

async function init() {
    await loadConfig();
    requireAuth();

    const urlParams = new URLSearchParams(window.location.search);
    const mercadoPagoCallbackStatus = urlParams.get("mp");

    if (mercadoPagoCallbackStatus) {
        activeSection = "payments";
    }
    const app = qs("app");

    app.innerHTML = renderAdminLayout({
        activeKey: "pricing",
        pageTitle: "Pagos",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;
            isEditingSettings = false;
            clearAllErrors();
            hidePageMessage();
            await loadAllData();
        }
    });

    company = layout.activeCompany;
      if (!hasModule(company, "payments")) {
          window.location.replace("/src/pages/admin/students/index.html");
          return;
      }

    qs("settingsForm")?.addEventListener("submit", saveSettings);
    qs("pricingForm")?.addEventListener("submit", savePricing);
    qs("lateFeeForm")?.addEventListener("submit", saveLateFee);
    qs("siblingsForm")?.addEventListener("submit", saveSibling);
    qs("openPaymentMethodsBtn")?.addEventListener("click", openPaymentMethodsModal);
    qs("cancelPricingEditBtn")?.addEventListener("click", resetPricingForm);
    qs("cancelLateFeeEditBtn")?.addEventListener("click", resetLateFeeForm);
    qs("cancelSiblingEditBtn")?.addEventListener("click", resetSiblingForm);
    qs("editSettingsBtn")?.addEventListener("click", startSettingsEdit);
    qs("cancelSettingsEditBtn")?.addEventListener("click", cancelSettingsEdit);
    qs("settingsNewStudentRespectOriginalDueDateForLateFee")?.addEventListener("change", toggleGraceDaysVisibility);
    qs("openScholarshipsBtn")?.addEventListener("click", openScholarshipsModal);

    await loadAllData();
    bindPaymentSettingsNav();
    bindSectionEvents();
    renderStats();
    if (mercadoPagoCallbackStatus === "connected") {
        showPageMessage("Mercado Pago se conectó correctamente.");
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (mercadoPagoCallbackStatus === "error") {
        showPageMessage("No se pudo conectar Mercado Pago.", "error");
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (mercadoPagoCallbackStatus === "invalid") {
        showPageMessage("La respuesta de Mercado Pago no fue válida.", "error");
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

init();