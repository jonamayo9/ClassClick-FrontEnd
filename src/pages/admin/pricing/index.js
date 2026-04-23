import { get, post, put, del } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

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

let pricingEditKey = null;
let siblingEditId = null;
let lateEditId = null;

let isSavingSettings = false;
let isSavingPricing = false;
let isSavingLateFee = false;
let isSavingSibling = false;
let isSavingTransfer = false;

let deletingPricingId = null;
let deletingLateFeeId = null;
let deletingSiblingId = null;
let isEditingSettings = false;

function qs(id) {
    return document.getElementById(id);
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
    switch (Number(value)) {
        case LATE_FEE_RECURRENCE.ONE_TIME:
            return "Única";
        case LATE_FEE_RECURRENCE.DAILY:
            return "Diaria";
        case LATE_FEE_RECURRENCE.WEEKLY:
            return "Semanal";
        default:
            return "-";
    }
}

function buildContent() {
    return `
        <section class="space-y-6">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Configuración</p>
                        <h1 class="mt-2 text-3xl font-bold">Configuración de pagos</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Configurá cuotas automáticas, precios, moras, descuentos por hermanos y transferencia.
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

            <div id="pageMessage" class="hidden rounded-2xl border px-4 py-3 text-sm"></div>

            <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div class="xl:col-span-2 space-y-6">

                    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="mb-5 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <h2 class="text-lg font-semibold text-slate-900">Generación automática de cuotas</h2>
                                <p class="mt-1 text-sm text-slate-500">
                                    Configurá cuándo generar cuotas y la ventana para cobrar el mes actual a alumnos nuevos.
                                </p>
                            </div>

                            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Última generación</p>
                                <p id="settingsLastGeneration" class="mt-1 font-medium text-slate-800">-</p>
                            </div>
                        </div>

                        <form id="settingsForm" class="space-y-4">
                            <div class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                                <input id="settingsAutoGenerateEnabled" type="checkbox" class="h-4 w-4" />
                                <label for="settingsAutoGenerateEnabled" class="text-sm font-medium text-slate-700">
                                    Generar cuotas automáticamente
                                </label>
                            </div>

                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label for="settingsGenerationDay" class="mb-1 block text-sm font-medium text-slate-700">
                                        Día de generación
                                    </label>
                                    <input
                                        id="settingsGenerationDay"
                                        type="number"
                                        min="1"
                                        max="28"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                        placeholder="Ej: 1"
                                    />
                                </div>

                                <div>
                                    <label for="settingsDueDay" class="mb-1 block text-sm font-medium text-slate-700">
                                        Día de vencimiento
                                    </label>
                                    <input
                                        id="settingsDueDay"
                                        type="number"
                                        min="1"
                                        max="31"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                        placeholder="Ej: 10"
                                    />
                                </div>

                                <div>
                                    <label for="settingsChargeWindowStart" class="mb-1 block text-sm font-medium text-slate-700">
                                        Desde qué día cobrar mes actual
                                    </label>
                                    <input
                                        id="settingsChargeWindowStart"
                                        type="number"
                                        min="1"
                                        max="31"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                        placeholder="Opcional"
                                    />
                                </div>

                                <div>
                                    <label for="settingsChargeWindowEnd" class="mb-1 block text-sm font-medium text-slate-700">
                                        Hasta qué día cobrar mes actual
                                    </label>
                                    <input
                                        id="settingsChargeWindowEnd"
                                        type="number"
                                        min="1"
                                        max="31"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                        placeholder="Opcional"
                                    />
                                </div>
                            </div>

                            <div class="rounded-2xl border border-slate-200 p-4">
                                <div class="flex items-start gap-3">
                                    <input
                                        id="settingsNewStudentRespectOriginalDueDateForLateFee"
                                        type="checkbox"
                                        class="mt-1 h-4 w-4"
                                    />
                                    <div class="min-w-0">
                                        <label for="settingsNewStudentRespectOriginalDueDateForLateFee" class="text-sm font-medium text-slate-700">
                                            Respetar fecha de vencimiento original para alumnos nuevos
                                        </label>
                                        <p class="mt-1 text-sm text-slate-500">
                                            Si está activo, la mora impacta desde el vencimiento original. Si está desactivado,
                                            podés definir días de gracia desde la creación de la cuota.
                                        </p>
                                    </div>
                                </div>

                                <div id="settingsGraceDaysWrapper" class="mt-4">
                                    <label for="settingsNewStudentLateFeeGraceDays" class="mb-1 block text-sm font-medium text-slate-700">
                                        Días de gracia para alumnos nuevos
                                    </label>
                                    <input
                                        id="settingsNewStudentLateFeeGraceDays"
                                        type="number"
                                        min="0"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                        placeholder="Ej: 5"
                                    />
                                    <p class="mt-2 text-xs text-slate-500">
                                        Para mora semanal, al terminar la gracia impacta el primer recargo inmediatamente y luego continúa semanalmente.
                                    </p>
                                </div>
                            </div>

                            <p id="settingsError" class="hidden text-sm text-rose-600"></p>

                            <div class="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                                <button
                                    id="editSettingsBtn"
                                    type="button"
                                    class="hidden inline-flex min-w-[160px] items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Editar
                                </button>

                                <button
                                    id="cancelSettingsEditBtn"
                                    type="button"
                                    class="hidden inline-flex min-w-[160px] items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Cancelar
                                </button>

                                <button
                                    id="saveSettingsBtn"
                                    type="submit"
                                    class="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Guardar configuración
                                </button>
                            </div>
                        </form>
                    </section>

                    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="mb-5">
                            <h2 id="pricingFormTitle" class="text-lg font-semibold text-slate-900">Precios por curso y frecuencia</h2>
                            <p class="mt-1 text-sm text-slate-500">
                                Definí el valor mensual según curso y cantidad de clases por semana.
                            </p>
                        </div>

                        <form id="pricingForm" class="space-y-4">
                            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <label for="pricingCourseId" class="mb-1 block text-sm font-medium text-slate-700">
                                        Curso
                                    </label>
                                    <select
                                        id="pricingCourseId"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    ></select>
                                </div>

                                <div>
                                    <label for="pricingClassesPerWeek" class="mb-1 block text-sm font-medium text-slate-700">
                                        Clases por semana
                                    </label>
                                    <input
                                        id="pricingClassesPerWeek"
                                        type="number"
                                        min="1"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                        placeholder="Ej: 2"
                                    />
                                </div>

                                <div>
                                    <label for="pricingPrice" class="mb-1 block text-sm font-medium text-slate-700">
                                        Precio
                                    </label>
                                    <input
                                        id="pricingPrice"
                                        type="number"
                                        min="0"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                        placeholder="Ej: 25000"
                                    />
                                </div>
                            </div>

                            <p id="pricingError" class="hidden text-sm text-rose-600"></p>

                            <div class="flex flex-col gap-3 pt-2 sm:flex-row">
                                <button
                                    id="savePricingBtn"
                                    type="submit"
                                    class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Guardar precio
                                </button>

                                <button
                                    id="cancelPricingEditBtn"
                                    type="button"
                                    class="hidden inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>

                        <div class="mt-6 overflow-x-auto">
                            <table class="min-w-full text-sm">
                                <thead>
                                    <tr class="border-b border-slate-200 text-left text-slate-500">
                                        <th class="px-3 py-3 font-medium">Curso</th>
                                        <th class="px-3 py-3 font-medium">Frecuencia</th>
                                        <th class="px-3 py-3 font-medium">Precio</th>
                                        <th class="px-3 py-3 font-medium text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="pricingTable"></tbody>
                            </table>
                        </div>

                        <div id="pricingEmptyState" class="hidden py-10 text-center">
                            <p class="text-sm text-slate-500">Todavía no hay precios cargados.</p>
                        </div>
                    </section>

                    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="mb-5">
                            <h2 id="lateFeeFormTitle" class="text-lg font-semibold text-slate-900">Moras y vencimientos</h2>
                            <p class="mt-1 text-sm text-slate-500">
                                Configurá moras generales o específicas por curso.
                            </p>
                        </div>

                        <form id="lateFeeForm" class="space-y-4">
                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label for="lateFeeName" class="mb-1 block text-sm font-medium text-slate-700">
                                        Nombre
                                    </label>
                                    <input
                                        id="lateFeeName"
                                        type="text"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                        placeholder="Ej: Mora general"
                                    />
                                </div>

                                <div>
                                    <label for="lateFeeCourseId" class="mb-1 block text-sm font-medium text-slate-700">
                                        Curso
                                    </label>
                                    <select
                                        id="lateFeeCourseId"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    ></select>
                                </div>

                                <div>
                                    <label for="lateFeeDueDay" class="mb-1 block text-sm font-medium text-slate-700">
                                        Día de vencimiento
                                    </label>
                                    <input
                                        id="lateFeeDueDay"
                                        type="number"
                                        min="1"
                                        max="31"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                        placeholder="Ej: 10"
                                    />
                                </div>

                                <div>
                                    <label for="lateFeeRecurrenceType" class="mb-1 block text-sm font-medium text-slate-700">
                                        Tipo de mora
                                    </label>
                                    <select
                                        id="lateFeeRecurrenceType"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    >
                                        <option value="${LATE_FEE_RECURRENCE.ONE_TIME}">Única</option>
                                        <option value="${LATE_FEE_RECURRENCE.DAILY}">Diaria</option>
                                        <option value="${LATE_FEE_RECURRENCE.WEEKLY}">Semanal</option>
                                    </select>
                                </div>

                                <div>
                                    <label for="lateFeePercentIncrease" class="mb-1 block text-sm font-medium text-slate-700">
                                        Recargo %
                                    </label>
                                    <input
                                        id="lateFeePercentIncrease"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                        placeholder="Ej: 10"
                                    />
                                </div>

                                <div>
                                    <label for="lateFeeFixedIncrease" class="mb-1 block text-sm font-medium text-slate-700">
                                        Recargo fijo
                                    </label>
                                    <input
                                        id="lateFeeFixedIncrease"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                        placeholder="Ej: 2000"
                                    />
                                </div>
                            </div>

                            <div class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                                <input id="lateFeeIsActive" type="checkbox" checked class="h-4 w-4" />
                                <label for="lateFeeIsActive" class="text-sm font-medium text-slate-700">
                                    Mora activa
                                </label>
                            </div>

                            <p id="lateFeeError" class="hidden text-sm text-rose-600"></p>

                            <div class="flex flex-col gap-3 pt-2 sm:flex-row">
                                <button
                                    id="saveLateFeeBtn"
                                    type="submit"
                                    class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Guardar mora
                                </button>

                                <button
                                    id="cancelLateFeeEditBtn"
                                    type="button"
                                    class="hidden inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>

                        <div class="mt-6 overflow-x-auto">
                            <table class="min-w-full text-sm">
                                <thead>
                                    <tr class="border-b border-slate-200 text-left text-slate-500">
                                        <th class="px-3 py-3 font-medium">Nombre</th>
                                        <th class="px-3 py-3 font-medium">Curso</th>
                                        <th class="px-3 py-3 font-medium">Vence</th>
                                        <th class="px-3 py-3 font-medium">Tipo</th>
                                        <th class="px-3 py-3 font-medium">Recargo</th>
                                        <th class="px-3 py-3 font-medium">Estado</th>
                                        <th class="px-3 py-3 font-medium text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="lateFeeTable"></tbody>
                            </table>
                        </div>

                        <div id="lateFeeEmptyState" class="hidden py-10 text-center">
                            <p class="text-sm text-slate-500">Todavía no hay moras configuradas.</p>
                        </div>
                    </section>
                </div>

                <div class="space-y-6">
                    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 class="text-lg font-semibold text-slate-900">Resumen rápido</h3>

                        <div class="mt-4 space-y-4 text-sm">
                            <div>
                                <p class="text-slate-500">Empresa activa</p>
                                <p id="summaryCompanyName" class="mt-1 font-medium text-slate-900">-</p>
                            </div>

                            <div>
                                <p class="text-slate-500">Cursos con precio</p>
                                <p id="summaryPricings" class="mt-1 text-xl font-semibold text-slate-900">0</p>
                            </div>

                            <div>
                                <p class="text-slate-500">Moras activas</p>
                                <p id="summaryLateFees" class="mt-1 text-xl font-semibold text-slate-900">0</p>
                            </div>

                            <div>
                                <p class="text-slate-500">Descuentos hermanos</p>
                                <p id="summarySiblings" class="mt-1 text-xl font-semibold text-slate-900">0</p>
                            </div>

                            <div>
                                <p class="text-slate-500">Día de generación</p>
                                <p id="summaryGenerationDay" class="mt-1 font-medium text-slate-900">-</p>
                            </div>

                            <div>
                                <p class="text-slate-500">Día de vencimiento</p>
                                <p id="summaryDueDay" class="mt-1 font-medium text-slate-900">-</p>
                            </div>
                        </div>
                    </section>

                    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="mb-5">
                            <h3 id="siblingsFormTitle" class="text-lg font-semibold text-slate-900">Descuentos por hermanos</h3>
                            <p class="mt-1 text-sm text-slate-500">
                                Configurá el porcentaje según cantidad de hermanos.
                            </p>
                        </div>

                        <form id="siblingsForm" class="space-y-4">
                            <div>
                                <label for="siblingCount" class="mb-1 block text-sm font-medium text-slate-700">
                                    Cantidad de hermanos
                                </label>
                                <input
                                    id="siblingCount"
                                    type="number"
                                    min="1"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Ej: 2"
                                />
                            </div>

                            <div>
                                <label for="discountPercent" class="mb-1 block text-sm font-medium text-slate-700">
                                    % de descuento
                                </label>
                                <input
                                    id="discountPercent"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Ej: 10"
                                />
                            </div>

                            <p id="siblingsError" class="hidden text-sm text-rose-600"></p>

                            <div class="flex flex-col gap-3">
                                <button
                                    id="saveSiblingBtn"
                                    type="submit"
                                    class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Guardar descuento
                                </button>

                                <button
                                    id="cancelSiblingEditBtn"
                                    type="button"
                                    class="hidden inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>

                        <div id="siblingsList" class="mt-5 space-y-3"></div>

                        <div id="siblingsEmptyState" class="hidden py-8 text-center">
                            <p class="text-sm text-slate-500">Todavía no hay descuentos configurados.</p>
                        </div>
                    </section>

                    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="mb-5">
                            <h3 class="text-lg font-semibold text-slate-900">Configuración de transferencia</h3>
                            <p class="mt-1 text-sm text-slate-500">
                                Datos que verá el alumno al pagar por transferencia.
                            </p>
                        </div>

                        <form id="transferSettingsForm" class="space-y-4">
                            <div>
                                <label for="transferAlias" class="mb-1 block text-sm font-medium text-slate-700">
                                    Alias
                                </label>
                                <input
                                    id="transferAlias"
                                    type="text"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Ej: mi.alias.empresa"
                                />
                            </div>

                            <div>
                                <label for="transferCbu" class="mb-1 block text-sm font-medium text-slate-700">
                                    CBU / CVU
                                </label>
                                <input
                                    id="transferCbu"
                                    type="text"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Ej: 0000003100000000000000"
                                />
                            </div>

                            <div>
                                <label for="transferAccountHolder" class="mb-1 block text-sm font-medium text-slate-700">
                                    Titular de la cuenta
                                </label>
                                <input
                                    id="transferAccountHolder"
                                    type="text"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Ej: Club Atlético..."
                                />
                            </div>

                            <div>
                                <label for="transferBankName" class="mb-1 block text-sm font-medium text-slate-700">
                                    Banco / billetera
                                </label>
                                <input
                                    id="transferBankName"
                                    type="text"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Ej: Mercado Pago / Banco Nación"
                                />
                            </div>

                            <p id="transferSettingsError" class="hidden text-sm text-rose-600"></p>

                            <div class="flex flex-col gap-3">
                                <button
                                    id="saveTransferSettingsBtn"
                                    type="submit"
                                    class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Guardar transferencia
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        </section>

        <div id="pricingModalRoot"></div>
    `;
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

    qs("statPricings").textContent = String(pricingCount);
    qs("statLateFees").textContent = String(activeLateFees);
    qs("statSiblings").textContent = String(siblingCount);

    qs("summaryCompanyName").textContent = company?.name || "-";
    qs("summaryPricings").textContent = String(pricingCount);
    qs("summaryLateFees").textContent = String(activeLateFees);
    qs("summarySiblings").textContent = String(siblingCount);
    qs("summaryGenerationDay").textContent = paymentSettings?.generationDayOfMonth || "-";
    qs("summaryDueDay").textContent = paymentSettings?.dueDayOfMonth || "-";
}

function renderCourseOptions() {
    const orderedCourses = [...courses].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const pricingSelect = qs("pricingCourseId");
    const lateSelect = qs("lateFeeCourseId");

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

    lateSelect.innerHTML = `
        <option value="">Todos los cursos</option>
        ${orderedCourses.map(course => `
            <option value="${course.id}">
                ${escapeHtml(course.name)}${course.isActive ? "" : " (Inactivo)"}
            </option>
        `).join("")}
    `;
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

function renderTransferSettings() {
    qs("transferAlias").value = companySettings?.transferAlias ?? "";
    qs("transferCbu").value = companySettings?.transferCbu ?? "";
    qs("transferAccountHolder").value = companySettings?.transferAccountHolder ?? "";
    qs("transferBankName").value = companySettings?.transferBankName ?? "";
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

function renderSiblings() {
    const list = qs("siblingsList");
    const emptyState = qs("siblingsEmptyState");

    if (!siblingDiscounts.length) {
        list.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    const ordered = [...siblingDiscounts].sort((a, b) => Number(a.siblingCount) - Number(b.siblingCount));

    list.innerHTML = ordered.map(item => `
        <div class="rounded-2xl border border-slate-200 p-4">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="font-medium text-slate-900">${item.siblingCount} ${item.siblingCount === 1 ? "hermano" : "hermanos"}</p>
                    <p class="mt-1 text-sm text-slate-500">${Number(item.discountPercent || 0)}% de descuento</p>
                </div>

                <div class="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        data-id="${item.id}"
                        class="edit-sibling-btn rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        data-id="${item.id}"
                        class="delete-sibling-btn rounded-2xl border border-rose-300 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        ${deletingSiblingId === item.id ? "disabled" : ""}
                    >
                        ${deletingSiblingId === item.id ? "Eliminando..." : "Eliminar"}
                    </button>
                </div>
            </div>
        </div>
    `).join("");

    list.querySelectorAll(".edit-sibling-btn").forEach(btn => {
        btn.addEventListener("click", () => openSiblingEdit(btn.dataset.id));
    });

    list.querySelectorAll(".delete-sibling-btn").forEach(btn => {
        btn.addEventListener("click", () => openDeleteSiblingModal(btn.dataset.id));
    });
}

function renderAll() {
    renderCourseOptions();
    renderSettings();
    renderPricingTable();
    renderLateFeeTable();
    renderSiblings();
    renderTransferSettings();
    renderStats();
}

function resetPricingForm() {
    pricingEditKey = null;
    qs("pricingForm").reset();
    qs("pricingFormTitle").textContent = "Precios por curso y frecuencia";
    qs("savePricingBtn").textContent = "Guardar precio";
    qs("cancelPricingEditBtn").classList.add("hidden");
    clearFieldError("pricingError");
}

function resetLateFeeForm() {
    lateEditId = null;
    qs("lateFeeForm").reset();
    qs("lateFeeCourseId").value = "";
    qs("lateFeeRecurrenceType").value = String(LATE_FEE_RECURRENCE.ONE_TIME);
    qs("lateFeeIsActive").checked = true;
    qs("lateFeeFormTitle").textContent = "Moras y vencimientos";
    qs("saveLateFeeBtn").textContent = "Guardar mora";
    qs("cancelLateFeeEditBtn").classList.add("hidden");
    clearFieldError("lateFeeError");
}

function resetSiblingForm() {
    siblingEditId = null;
    qs("siblingsForm").reset();
    qs("siblingsFormTitle").textContent = "Descuentos por hermanos";
    qs("saveSiblingBtn").textContent = "Guardar descuento";
    qs("cancelSiblingEditBtn").classList.add("hidden");
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
    qs("lateFeeRecurrenceType").value = String(item.recurrenceType ?? LATE_FEE_RECURRENCE.ONE_TIME);
    qs("lateFeePercentIncrease").value = item.percentIncrease ?? 0;
    qs("lateFeeFixedIncrease").value = item.fixedIncrease ?? 0;
    qs("lateFeeIsActive").checked = !!item.isActive;
    qs("cancelLateFeeEditBtn").classList.remove("hidden");
    clearFieldError("lateFeeError");

    window.scrollTo({ top: 0, behavior: "smooth" });
    qs("lateFeeName").focus();
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
        loadSiblingDiscounts()
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
            resetPricingForm();
            resetLateFeeForm();
            resetSiblingForm();
            await loadAllData();
        }
    });

    company = layout.activeCompany;

    qs("settingsForm").addEventListener("submit", saveSettings);
    qs("pricingForm").addEventListener("submit", savePricing);
    qs("lateFeeForm").addEventListener("submit", saveLateFee);
    qs("siblingsForm").addEventListener("submit", saveSibling);
    qs("transferSettingsForm").addEventListener("submit", saveTransferSettings);

    qs("cancelPricingEditBtn").addEventListener("click", resetPricingForm);
    qs("cancelLateFeeEditBtn").addEventListener("click", resetLateFeeForm);
    qs("cancelSiblingEditBtn").addEventListener("click", resetSiblingForm);

    qs("editSettingsBtn").addEventListener("click", startSettingsEdit);
    qs("cancelSettingsEditBtn").addEventListener("click", cancelSettingsEdit);
    qs("settingsNewStudentRespectOriginalDueDateForLateFee").addEventListener("change", toggleGraceDaysVisibility);

    await loadAllData();
    resetPricingForm();
    resetLateFeeForm();
    resetSiblingForm();
}

init();