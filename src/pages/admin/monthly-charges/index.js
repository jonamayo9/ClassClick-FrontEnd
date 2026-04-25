import { get, post, put } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

let company = null;

let charges = [];
let courses = [];
let students = [];

let filters = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    status: "",
    search: ""
};

let selectedChargeId = null;
let selectedEditChargeId = null;

let page = 1;
const pageSize = 20;

function buildContent() {
    return `
        <section class="space-y-6">

            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white">

                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <div>
                        <p class="text-xs uppercase tracking-widest text-slate-300">
                            Pagos
                        </p>

                        <h1 class="text-3xl font-bold">
                            Cuotas
                        </h1>

                        <p class="text-sm text-slate-300">
                            Generación automática, manual e individual
                        </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">

                        <button
                            id="openCreateChargeBtn"
                            type="button"
                            class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                        >
                            Generar cuota
                        </button>

                        <select id="yearFilter" class="rounded-xl px-3 py-2 text-black">
                            ${buildYearOptions()}
                        </select>

                        <select id="monthFilter" class="rounded-xl px-3 py-2 text-black">
                            ${buildMonthOptions()}
                        </select>

                    </div>

                </div>

                <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">

                    <div class="rounded-xl bg-white/10 p-4">
                        <div class="text-xs text-slate-300">Total</div>
                        <div id="totalAmount" class="text-xl font-bold">$0</div>
                    </div>

                    <div class="rounded-xl bg-white/10 p-4">
                        <div class="text-xs text-slate-300">Pagado</div>
                        <div id="paidAmount" class="text-xl font-bold">$0</div>
                    </div>

                    <div class="rounded-xl bg-white/10 p-4">
                        <div class="text-xs text-slate-300">Pendiente</div>
                        <div id="pendingAmount" class="text-xl font-bold">$0</div>
                    </div>

                    <div class="rounded-xl bg-white/10 p-4">
                        <div class="text-xs text-slate-300">Vencido</div>
                        <div id="overdueAmount" class="text-xl font-bold">$0</div>
                    </div>

                </div>

            </section>

            <div id="pageMessage" class="hidden rounded-2xl border px-4 py-3 text-sm"></div>

            <section class="rounded-2xl border bg-white p-4">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div class="w-full lg:max-w-xs">
                        <label class="mb-1 block text-xs font-medium text-slate-500">
                            Estado
                        </label>

                        <select
                            id="statusFilter"
                            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        >
                            <option value="">Todas</option>
                            <option value="1">Pendientes</option>
                            <option value="2">Pagadas</option>
                            <option value="3">Vencidas</option>
                        </select>
                    </div>

                    <div class="w-full">
                        <label class="mb-1 block text-xs font-medium text-slate-500">
                            Buscar alumno
                        </label>

                        <input
                            id="searchFilter"
                            type="text"
                            placeholder="Buscar por nombre, apellido, DNI o curso"
                            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                    </div>
                </div>
            </section>

            <section id="chargesList" class="space-y-3"></section>

            <section id="paginationContainer" class="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"></section>

        </section>

        ${renderChargeDetailModal()}
        ${renderCreateChargeModal()}
        ${renderPayModal()}
        ${renderPaymentSuccessModal()}
        ${renderChargeProofModal()}
    `;
}

function renderChargeDetailModal() {
    return `
        <div
            id="chargeDetailModal"
            class="fixed inset-0 z-50 hidden p-4"
        >
            <div
                class="absolute inset-0 bg-slate-950/60"
                data-close-charge-detail="true"
            ></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                    <div class="flex items-center justify-between border-b px-5 py-4">
                        <div>
                            <h3 class="text-lg font-semibold text-slate-900">Detalle de cuota</h3>
                            <p class="text-sm text-slate-500">Información completa del cálculo</p>
                        </div>

                        <button
                            id="closeChargeDetailModalBtn"
                            class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                            Cerrar
                        </button>
                    </div>

                    <div id="chargeDetailBody" class="p-5"></div>
                </div>
            </div>
        </div>
    `;
}

function renderCreateChargeModal() {
    return `
        <div id="createChargeModal" class="fixed inset-0 z-50 hidden p-4">
            <div class="absolute inset-0 bg-slate-950/60" data-close-create-charge="true"></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

                    <div class="flex items-center justify-between border-b px-5 py-4">
                        <div>
                            <h3 id="createChargeTitle" class="text-lg font-semibold text-slate-900">
                                Generar cuota
                            </h3>
                            <p class="text-sm text-slate-500">
                                Podés generar una cuota individual o masiva por período.
                            </p>
                        </div>

                        <button
                            id="closeCreateChargeModalBtn"
                            type="button"
                            class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                            Cerrar
                        </button>
                    </div>

                    <form id="createChargeForm" class="space-y-5 p-5">

                        <input id="editChargeId" type="hidden" />

                        <div class="grid gap-4 md:grid-cols-3">
                            <div>
                                <label class="mb-1 block text-xs font-medium text-slate-500">Tipo</label>
                                <select id="chargeMode" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                    <option value="single">Individual</option>
                                    <option value="bulk">Masiva</option>
                                </select>
                            </div>

                            <div>
                                <label class="mb-1 block text-xs font-medium text-slate-500">Año</label>
                                <input id="chargeYear" type="number" min="2020" max="2100" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>

                            <div>
                                <label class="mb-1 block text-xs font-medium text-slate-500">Mes</label>
                                <input id="chargeMonth" type="number" min="1" max="12" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>
                        </div>

                        <div id="bulkScopeBox" class="hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div class="mb-3 text-sm font-semibold text-slate-900">
                                Alcance masivo
                            </div>

                            <div class="grid gap-3 md:grid-cols-2">
                                <label class="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-slate-700">
                                    <input type="radio" name="bulkScope" value="global" checked />
                                    Global: todos los alumnos de todos los cursos
                                </label>

                                <label class="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-slate-700">
                                    <input type="radio" name="bulkScope" value="course" />
                                    Por curso
                                </label>
                            </div>
                        </div>

                        <div class="grid gap-4 md:grid-cols-2">
                            <div id="studentFieldBox">
                                <label class="mb-1 block text-xs font-medium text-slate-500">Alumno</label>
                                <select id="chargeStudentId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                    <option value="">Seleccionar alumno</option>
                                    ${buildStudentOptions()}
                                </select>
                            </div>

                            <div id="courseFieldBox">
                                <label class="mb-1 block text-xs font-medium text-slate-500">Curso</label>
                                <select id="chargeCourseId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                    <option value="">Seleccionar curso</option>
                                    ${buildCourseOptions()}
                                </select>
                            </div>
                        </div>

                        <div class="grid gap-4 md:grid-cols-4">
                            <div>
                                <label class="mb-1 block text-xs font-medium text-slate-500">Precio base</label>
                                <input id="chargeBasePrice" type="number" min="0" step="0.01" placeholder="Vacío = precio configurado" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>

                            <div>
                                <label class="mb-1 block text-xs font-medium text-slate-500">Descuento manual</label>
                                <input id="chargeManualDiscount" type="number" min="0" step="0.01" value="0" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>

                            <div>
                                <label class="mb-1 block text-xs font-medium text-slate-500">Incremento manual</label>
                                <input id="chargeManualIncrease" type="number" min="0" step="0.01" value="0" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>

                            <div>
                                <label class="mb-1 block text-xs font-medium text-slate-500">Mora manual</label>
                                <input id="chargeLateAmount" type="number" min="0" step="0.01" value="0" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>
                        </div>

                        <div class="grid gap-4 md:grid-cols-3">
                            <div>
                                <label class="mb-1 block text-xs font-medium text-slate-500">Vencimiento</label>
                                <input id="chargeDueDate" type="date" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>

                            <div id="chargeStatusBox" class="hidden">
                                <label class="mb-1 block text-xs font-medium text-slate-500">Estado</label>
                                <select id="chargeStatus" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                    <option value="1">Pendiente</option>
                                    <option value="3">Vencida</option>
                                    <option value="4">Cancelada</option>
                                </select>
                            </div>

                            <label id="skipExistingBox" class="flex items-end gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                                <input id="skipExisting" type="checkbox" checked />
                                Omitir cuotas existentes
                            </label>
                        </div>

                        <div class="grid gap-4 md:grid-cols-2">
                            <div>
                                <label class="mb-1 block text-xs font-medium text-slate-500">Detalle / nota</label>
                                <textarea id="chargeNotes" rows="3" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
                            </div>

                            <div>
                                <label class="mb-1 block text-xs font-medium text-slate-500">Motivo del ajuste</label>
                                <textarea id="chargeAdjustmentReason" rows="3" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
                            </div>
                        </div>

                        <div class="grid gap-4 md:grid-cols-2">
                            <label class="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                                <input id="chargeHasPromotion" type="checkbox" />
                                Tiene promoción
                            </label>

                            <div>
                                <label class="mb-1 block text-xs font-medium text-slate-500">Nombre promoción</label>
                                <input id="chargePromotionName" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>
                        </div>

                        <div id="createChargeError" class="hidden rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"></div>

                        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                id="cancelCreateChargeBtn"
                                type="button"
                                class="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>

                            <button
                                id="saveCreateChargeBtn"
                                type="submit"
                                class="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
                            >
                                Guardar cuota
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    `;
}

function renderChargeProofModal() {
    return `
        <div id="chargeProofModal" class="fixed inset-0 z-50 hidden p-4">
            <div
                class="absolute inset-0 bg-slate-950/60"
                onclick="closeChargeProofModal()"
            ></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div class="flex items-center justify-between border-b px-5 py-4">
                        <div>
                            <h3 class="text-lg font-semibold text-slate-900">Comprobante</h3>
                            <p class="text-sm text-slate-500">Visualización del archivo subido</p>
                        </div>

                        <div class="flex items-center gap-2">
                            <a
                                id="chargeProofDownloadBtn"
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                Descargar
                            </a>

                            <button
                                type="button"
                                onclick="closeChargeProofModal()"
                                class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>

                    <div id="chargeProofModalBody" class="max-h-[80vh] overflow-auto p-5">
                        <div class="text-sm text-slate-500">Cargando comprobante...</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function buildYearOptions() {
    let html = "";

    for (let i = 2024; i <= 2030; i++) {
        html += `
            <option value="${i}" ${i == filters.year ? "selected" : ""}>
                ${i}
            </option>
        `;
    }

    return html;
}

function buildMonthOptions() {
    const months = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre"
    ];

    let html = "";

    months.forEach((m, i) => {
        html += `
            <option value="${i + 1}" ${i + 1 == filters.month ? "selected" : ""}>
                ${m}
            </option>
        `;
    });

    return html;
}

function buildStudentOptions() {
    return students.map(s => {
        const name =
            s.fullName ||
            s.studentFullName ||
            `${s.firstName || ""} ${s.lastName || ""}`.trim() ||
            s.email ||
            s.id;

        return `<option value="${s.id}">${escapeHtml(name)}</option>`;
    }).join("");
}

function refreshCreateChargeSelects() {
    const studentSelect = document.getElementById("chargeStudentId");
    const courseSelect = document.getElementById("chargeCourseId");

    if (studentSelect) {
        studentSelect.innerHTML = `
            <option value="">Seleccionar alumno</option>
            ${buildStudentOptions()}
        `;
    }

    if (courseSelect) {
        courseSelect.innerHTML = `
            <option value="">Seleccionar curso</option>
            ${buildCourseOptions()}
        `;
    }
}

function buildCourseOptions() {
    return courses.map(c => {
        const name = c.name || c.courseName || c.id;
        return `<option value="${c.id}">${escapeHtml(name)}</option>`;
    }).join("");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showMessage(message, type = "success") {
    const box = document.getElementById("pageMessage");

    if (!box) return;

    box.textContent = message;
    box.className =
        type === "error"
            ? "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            : "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700";
}

function hideMessage() {
    const box = document.getElementById("pageMessage");

    if (!box) return;

    box.textContent = "";
    box.className = "hidden rounded-2xl border px-4 py-3 text-sm";
}

function formatMoney(value) {
    const amount = Number(value || 0);

    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
    }).format(amount);
}

function getCardClasses(c) {
    if (c.status == 3) {
        return `
            rounded-xl border border-red-200 bg-red-50/40 p-5 transition hover:border-red-300 hover:shadow-md
        `;
    }

    if (c.status == 2) {
        return `
            rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 transition hover:shadow-md
        `;
    }

    return `
        rounded-xl border bg-white p-5 transition hover:shadow-md
    `;
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

function formatDateInput(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 10);
}

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function getStatusText(status) {
    if (status == 1) return "Pendiente";
    if (status == 2) return "Pagado";
    if (status == 3) return "Vencido";
    if (status == 4) return "Cancelado";
    return String(status ?? "-");
}

function renderStatus(status) {
    if (status == 1) {
        return `
            <span class="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                Pendiente
            </span>
        `;
    }

    if (status == 2) {
        return `
            <span class="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                Pagada
            </span>
        `;
    }

    if (status == 3) {
        return `
            <span class="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                Vencida
            </span>
        `;
    }

    if (status == 4) {
        return `
            <span class="rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-700">
                Cancelada
            </span>
        `;
    }

    return "";
}

function getFilteredCharges() {
    let result = [...charges];

    if (filters.status) {
        result = result.filter(x => String(x.status) === String(filters.status));
    }

    const search = normalizeText(filters.search);

    if (search) {
        result = result.filter(x => {
            const fullName = normalizeText(x.studentFullName);
            const dni = normalizeText(x.studentDni);
            const courseName = normalizeText(x.courseName);

            return fullName.includes(search)
                || dni.includes(search)
                || courseName.includes(search);
        });
    }

    return result;
}

function getPagedCharges() {
    const filtered = getFilteredCharges();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    if (page > totalPages) page = totalPages;

    const start = (page - 1) * pageSize;

    return {
        filtered,
        items: filtered.slice(start, start + pageSize),
        totalPages
    };
}

function renderCharges() {
    const container = document.getElementById("chargesList");
    const { filtered, items, totalPages } = getPagedCharges();

    if (!filtered.length) {
        container.innerHTML = `
            <div class="rounded-xl border bg-white p-6 text-center text-slate-500">
                No hay cuotas para los filtros seleccionados
            </div>
        `;
        renderPagination(0, 1);
        return;
    }

    container.innerHTML = items.map(c => {
        return `
            <div class="${getCardClasses(c)}">

                <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                    <div class="space-y-1 text-sm">

                        <div class="text-base font-semibold text-slate-900">
                            ${escapeHtml(c.studentFullName || "Sin nombre")}
                        </div>

                        <div class="text-slate-500">
                            DNI: ${escapeHtml(c.studentDni ?? "-")}
                        </div>

                        <div class="text-slate-600">
                            ${escapeHtml(c.courseName || "-")}
                        </div>

                        <div class="space-y-1 pt-2 text-slate-600">

                            <div>
                                Clases por semana:
                                <span class="font-medium">${c.classesPerWeek}</span>
                            </div>

                            <div>
                                Precio base:
                                ${formatMoney(c.basePrice)}
                            </div>

                            <div>
                                Descuento hermano:
                                - ${formatMoney(c.siblingDiscountAmount)}
                                (${c.siblingDiscountPercent}%)
                            </div>

                            <div>
                                Descuento manual:
                                - ${formatMoney(c.manualDiscountAmount)}
                            </div>

                            <div>
                                Incremento manual:
                                ${formatMoney(c.manualIncreaseAmount)}
                            </div>

                            <div class="${c.lateChargeAmount > 0 ? "font-medium text-red-600" : ""}">
                                Recargo mora:
                                ${formatMoney(c.lateChargeAmount)}
                            </div>

                            <div class="text-slate-500">
                                Vencimiento:
                                ${formatDate(c.dueDateUtc)}
                            </div>

                            ${c.notes ? `<div class="text-slate-500">Nota: ${escapeHtml(c.notes)}</div>` : ""}
                        </div>

                        <div class="flex flex-wrap gap-2 pt-3">

                            <button
                                onclick="showChargeDetail('${c.id}')"
                                class="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50">
                                Ver detalle
                            </button>

                            ${
                                c.status == 2
                                    ? `
                                        <button
                                            type="button"
                                            class="cursor-default rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                                            Pagada
                                        </button>
                                    `
                                    : `
                                        <button
                                            onclick="openEditChargeModal('${c.id}')"
                                            class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
                                            Editar cuota
                                        </button>

                                        <button
                                            onclick="openPayModal('${c.id}')"
                                            class="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-black">
                                            Registrar pago
                                        </button>
                                    `
                            }

                        </div>

                    </div>

                    <div class="text-left md:min-w-[180px] md:text-right">

                        <div class="text-xs uppercase tracking-wide text-slate-500">
                            Total cuota
                        </div>

                        <div class="mt-1 text-3xl font-extrabold leading-none md:text-4xl ${c.status == 3 ? "text-red-700" : "text-slate-900"}">
                            ${formatMoney(c.finalAmount)}
                        </div>

                        <div class="mt-3 flex md:justify-end">
                            ${renderStatus(c.status)}
                        </div>

                    </div>

                </div>

            </div>
        `;
    }).join("");

    renderPagination(filtered.length, totalPages);
}

function renderPagination(totalItems, totalPages) {
    const container = document.getElementById("paginationContainer");

    if (!container) return;

    if (!totalItems) {
        container.innerHTML = "";
        return;
    }

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalItems);

    container.innerHTML = `
        <div class="text-sm text-slate-500">
            Mostrando ${from}-${to} de ${totalItems} cuotas · Página ${page} de ${totalPages}
        </div>

        <div class="flex gap-2">
            <button
                id="prevPageBtn"
                type="button"
                class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                ${page <= 1 ? "disabled" : ""}
            >
                Anterior
            </button>

            <button
                id="nextPageBtn"
                type="button"
                class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                ${page >= totalPages ? "disabled" : ""}
            >
                Siguiente
            </button>
        </div>
    `;

    document.getElementById("prevPageBtn")?.addEventListener("click", () => {
        if (page <= 1) return;
        page--;
        renderCharges();
    });

    document.getElementById("nextPageBtn")?.addEventListener("click", () => {
        if (page >= totalPages) return;
        page++;
        renderCharges();
    });
}

function renderSummary() {
    let total = 0;
    let paid = 0;
    let pending = 0;
    let overdue = 0;

    charges.forEach(c => {
        const finalAmount = Number(c.finalAmount || 0);

        total += finalAmount;

        if (c.status == 2) paid += finalAmount;
        if (c.status == 1) pending += finalAmount;
        if (c.status == 3) overdue += finalAmount;
    });

    document.getElementById("totalAmount").innerText = formatMoney(total);
    document.getElementById("paidAmount").innerText = formatMoney(paid);
    document.getElementById("pendingAmount").innerText = formatMoney(pending);
    document.getElementById("overdueAmount").innerText = formatMoney(overdue);
}

function renderPayModal() {
    return `
        <div id="payModal" class="fixed inset-0 z-50 hidden">

            <div
                class="absolute inset-0 bg-slate-950/60"
                onclick="closePayModal()"
            ></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
                    <div class="border-b px-5 py-4">
                        <h3 class="text-lg font-semibold text-slate-900">
                            Registrar pago
                        </h3>
                        <p class="text-sm text-slate-500">
                            Elegí cómo querés registrar esta cuota.
                        </p>
                    </div>

                    <div class="space-y-3 p-5">
                        <button
                            id="payCashBtn"
                            type="button"
                            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
                        >
                            Efectivo
                        </button>

                        <button
                            id="payTransferBtn"
                            type="button"
                            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
                        >
                            Transferencia
                        </button>
                    </div>

                    <div class="border-t px-5 py-4">
                        <button
                            type="button"
                            onclick="closePayModal()"
                            class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderPaymentSuccessModal() {
    return `
        <div id="paymentSuccessModal" class="fixed inset-0 z-50 hidden">
            <div class="absolute inset-0 bg-slate-950/60"></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
                    <div class="p-6 text-center">
                        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
                            ✓
                        </div>

                        <h3 class="mt-4 text-lg font-semibold text-slate-900">
                            Pago confirmado
                        </h3>

                        <p id="paymentSuccessText" class="mt-2 text-sm text-slate-500">
                            El pago fue registrado correctamente.
                        </p>

                        <button
                            id="closePaymentSuccessModalBtn"
                            type="button"
                            class="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-black"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function openPaymentSuccessModal(message) {
    const modal = document.getElementById("paymentSuccessModal");
    const text = document.getElementById("paymentSuccessText");

    if (text) {
        text.textContent = message || "El pago fue registrado correctamente.";
    }

    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

function closePaymentSuccessModal() {
    const modal = document.getElementById("paymentSuccessModal");

    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
}

function getPaymentMethodText(paymentMethod) {
    if (paymentMethod == 1) return "Efectivo";
    if (paymentMethod == 2) return "Transferencia";
    return "-";
}

function getChargeById(id) {
    return charges.find(x => x.id === id) || null;
}

function buildChargeDetailHtml(c) {
    const studentName = c.studentFullName || "Sin nombre";
    const studentDni = c.studentDni || "-";
    const courseName = c.courseName || "-";
    const basePrice = Number(c.basePrice || 0);
    const siblingDiscountAmount = Number(c.siblingDiscountAmount || 0);
    const siblingDiscountPercent = Number(c.siblingDiscountPercent || 0);
    const lateChargeAmount = Number(c.lateChargeAmount || 0);
    const manualDiscountAmount = Number(c.manualDiscountAmount || 0);
    const manualIncreaseAmount = Number(c.manualIncreaseAmount || 0);
    const finalAmount = Number(c.finalAmount || 0);

    return `
        <div class="space-y-5">
            <div class="grid gap-4 md:grid-cols-2">
                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">Alumno</div>
                    <div class="mt-1 font-semibold text-slate-900">${escapeHtml(studentName)}</div>
                </div>

                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">DNI</div>
                    <div class="mt-1 font-semibold text-slate-900">${escapeHtml(studentDni)}</div>
                </div>

                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">Curso</div>
                    <div class="mt-1 font-semibold text-slate-900">${escapeHtml(courseName)}</div>
                </div>

                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">Período</div>
                    <div class="mt-1 font-semibold text-slate-900">${String(c.month).padStart(2, "0")}/${c.year}</div>
                </div>

                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">Estado</div>
                    <div class="mt-1 font-semibold text-slate-900">${getStatusText(c.status)}</div>
                </div>

                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">Clases por semana</div>
                    <div class="mt-1 font-semibold text-slate-900">${c.classesPerWeek ?? 0}</div>
                </div>
            </div>

            <div class="overflow-hidden rounded-2xl border border-slate-200">
                <div class="border-b bg-slate-50 px-4 py-3 font-semibold text-slate-900">
                    Detalle del cálculo
                </div>

                <div class="divide-y">
                    <div class="flex items-center justify-between px-4 py-3 text-sm">
                        <span class="text-slate-500">Precio base</span>
                        <span class="font-medium text-slate-900">${formatMoney(basePrice)}</span>
                    </div>

                    <div class="flex items-center justify-between px-4 py-3 text-sm">
                        <span class="text-slate-500">Descuento por hermano</span>
                        <span class="font-medium text-slate-900">
                            -${formatMoney(siblingDiscountAmount)}
                            ${siblingDiscountPercent > 0 ? `(${siblingDiscountPercent}%)` : ""}
                        </span>
                    </div>

                    <div class="flex items-center justify-between px-4 py-3 text-sm">
                        <span class="text-slate-500">Descuento manual</span>
                        <span class="font-medium text-slate-900">-${formatMoney(manualDiscountAmount)}</span>
                    </div>

                    <div class="flex items-center justify-between px-4 py-3 text-sm">
                        <span class="text-slate-500">Incremento manual</span>
                        <span class="font-medium text-slate-900">${formatMoney(manualIncreaseAmount)}</span>
                    </div>

                    <div class="flex items-center justify-between px-4 py-3 text-sm">
                        <span class="text-slate-500">Recargo por mora</span>
                        <span class="font-medium text-slate-900">${formatMoney(lateChargeAmount)}</span>
                    </div>

                    <div class="flex items-center justify-between bg-slate-50 px-4 py-3 text-sm">
                        <span class="font-semibold text-slate-900">Monto final</span>
                        <span class="font-bold text-slate-900">${formatMoney(finalAmount)}</span>
                    </div>
                </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">Generada</div>
                    <div class="mt-1 font-semibold text-slate-900">${formatDate(c.generatedAtUtc)}</div>
                </div>

                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">Vencimiento</div>
                    <div class="mt-1 font-semibold text-slate-900">${formatDate(c.dueDateUtc)}</div>
                </div>

                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">Método de pago</div>
                    <div class="mt-1 font-semibold text-slate-900">${getPaymentMethodText(c.paymentMethod)}</div>
                </div>

                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">Comprobante</div>
                    <div class="mt-2">
                        ${Number(c.paymentMethod) === 2 && c.paymentId
                            ? `
                                <button
                                    type="button"
                                    onclick="openChargeProofModal('${c.id}')"
                                    class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                >
                                    Ver comprobante
                                </button>
                            `
                            : `<span class="text-sm text-slate-500">-</span>`
                        }
                    </div>
                </div>
            </div>

            <div class="rounded-xl bg-slate-50 p-4">
                <div class="text-xs uppercase tracking-wide text-slate-500">Notas</div>
                <div class="mt-1 text-sm text-slate-700">${escapeHtml(c.notes || "-")}</div>
            </div>

            <div class="rounded-xl bg-slate-50 p-4">
                <div class="text-xs uppercase tracking-wide text-slate-500">Motivo del ajuste</div>
                <div class="mt-1 text-sm text-slate-700">${escapeHtml(c.manualAdjustmentReason || "-")}</div>
            </div>
        </div>
    `;
}

function openChargeDetailModal() {
    const modal = document.getElementById("chargeDetailModal");

    document.body.classList.add("overflow-hidden");
    modal.classList.remove("hidden");
}

function closeChargeDetailModal() {
    const modal = document.getElementById("chargeDetailModal");

    document.body.classList.remove("overflow-hidden");
    modal.classList.add("hidden");
}

window.showChargeDetail = function (id) {
    const charge = getChargeById(id);

    if (!charge) return;

    document.getElementById("chargeDetailBody").innerHTML = buildChargeDetailHtml(charge);
    openChargeDetailModal();
};

function openCreateChargeModal() {
    selectedEditChargeId = null;

    document.getElementById("createChargeTitle").textContent = "Generar cuota";
    document.getElementById("editChargeId").value = "";
    document.getElementById("chargeMode").disabled = false;
    document.getElementById("chargeMode").value = "single";
    document.getElementById("chargeYear").disabled = false;
    document.getElementById("chargeMonth").disabled = false;
    document.getElementById("chargeYear").value = filters.year;
    document.getElementById("chargeMonth").value = filters.month;
    document.getElementById("chargeStudentId").value = "";
    document.getElementById("chargeCourseId").value = "";
    document.getElementById("chargeBasePrice").value = "";
    document.getElementById("chargeManualDiscount").value = "0";
    document.getElementById("chargeManualIncrease").value = "0";
    document.getElementById("chargeLateAmount").value = "0";
    document.getElementById("chargeDueDate").value = "";
    document.getElementById("chargeStatus").value = "1";
    document.getElementById("chargeNotes").value = "";
    document.getElementById("chargeAdjustmentReason").value = "";
    document.getElementById("chargeHasPromotion").checked = false;
    document.getElementById("chargePromotionName").value = "";
    document.getElementById("skipExisting").checked = true;

    hideCreateChargeError();
    syncCreateChargeMode();

    document.getElementById("createChargeModal").classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

window.openEditChargeModal = function (id) {
    const charge = getChargeById(id);

    if (!charge) return;

    selectedEditChargeId = id;

    document.getElementById("createChargeTitle").textContent = "Editar cuota";
    document.getElementById("editChargeId").value = id;
    document.getElementById("chargeMode").value = "single";
    document.getElementById("chargeMode").disabled = true;
    document.getElementById("chargeYear").value = charge.year;
    document.getElementById("chargeMonth").value = charge.month;
    document.getElementById("chargeYear").disabled = true;
    document.getElementById("chargeMonth").disabled = true;
    document.getElementById("chargeStudentId").value = charge.studentId;
    document.getElementById("chargeCourseId").value = charge.courseId;
    document.getElementById("chargeBasePrice").value = charge.basePrice ?? 0;
    document.getElementById("chargeManualDiscount").value = charge.manualDiscountAmount ?? 0;
    document.getElementById("chargeManualIncrease").value = charge.manualIncreaseAmount ?? 0;
    document.getElementById("chargeLateAmount").value = charge.lateChargeAmount ?? 0;
    document.getElementById("chargeDueDate").value = formatDateInput(charge.dueDateUtc);
    document.getElementById("chargeStatus").value = charge.status ?? 1;
    document.getElementById("chargeNotes").value = charge.notes || "";
    document.getElementById("chargeAdjustmentReason").value = charge.manualAdjustmentReason || "";
    document.getElementById("chargeHasPromotion").checked = !!charge.hasPromotion;
    document.getElementById("chargePromotionName").value = charge.promotionName || "";

    hideCreateChargeError();
    syncCreateChargeMode();

    document.getElementById("createChargeModal").classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
};

function closeCreateChargeModal() {
    selectedEditChargeId = null;
    document.getElementById("createChargeModal").classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
}

window.closeCreateChargeModal = closeCreateChargeModal;

function syncCreateChargeMode() {
    const isEdit = !!document.getElementById("editChargeId").value;
    const mode = document.getElementById("chargeMode").value;
    const isBulk = mode === "bulk";
    const scope = document.querySelector("input[name='bulkScope']:checked")?.value || "global";

    document.getElementById("bulkScopeBox").classList.toggle("hidden", !isBulk || isEdit);
    document.getElementById("studentFieldBox").classList.toggle("hidden", isBulk || isEdit);
    document.getElementById("chargeStatusBox").classList.toggle("hidden", !isEdit);
    document.getElementById("skipExistingBox").classList.toggle("hidden", !isBulk || isEdit);

    const hideCourse = isBulk && scope === "global" && !isEdit;
    document.getElementById("courseFieldBox").classList.toggle("hidden", hideCourse);
}

function showCreateChargeError(message) {
    const box = document.getElementById("createChargeError");

    box.textContent = message;
    box.classList.remove("hidden");
}

function hideCreateChargeError() {
    const box = document.getElementById("createChargeError");

    box.textContent = "";
    box.classList.add("hidden");
}

function getDueDatePayload() {
    const value = document.getElementById("chargeDueDate").value;
    return value ? `${value}T23:59:59.000Z` : null;
}

async function submitCreateCharge(e) {
    e.preventDefault();
    hideCreateChargeError();

    const editId = document.getElementById("editChargeId").value;
    const mode = document.getElementById("chargeMode").value;

    const basePriceRaw = document.getElementById("chargeBasePrice").value;

    const commonPayload = {
        year: Number(document.getElementById("chargeYear").value),
        month: Number(document.getElementById("chargeMonth").value),
        basePrice: basePriceRaw ? Number(basePriceRaw) : null,
        manualDiscountAmount: Number(document.getElementById("chargeManualDiscount").value || 0),
        manualIncreaseAmount: Number(document.getElementById("chargeManualIncrease").value || 0),
        lateChargeAmount: Number(document.getElementById("chargeLateAmount").value || 0),
        dueDateUtc: getDueDatePayload(),
        notes: document.getElementById("chargeNotes").value || null,
        manualAdjustmentReason: document.getElementById("chargeAdjustmentReason").value || null,
        hasPromotion: document.getElementById("chargeHasPromotion").checked,
        promotionName: document.getElementById("chargePromotionName").value || null
    };

    try {
        if (editId) {
            const charge = getChargeById(editId);

            await put(`/api/admin/${company.slug}/payments/monthly-charges/${editId}`, {
                basePrice: Number(document.getElementById("chargeBasePrice").value || 0),
                siblingDiscountPercent: Number(charge?.siblingDiscountPercent || 0),
                siblingDiscountAmount: Number(charge?.siblingDiscountAmount || 0),
                lateChargeAmount: commonPayload.lateChargeAmount,
                manualDiscountAmount: commonPayload.manualDiscountAmount,
                manualIncreaseAmount: commonPayload.manualIncreaseAmount,
                dueDateUtc: commonPayload.dueDateUtc || charge?.dueDateUtc,
                status: Number(document.getElementById("chargeStatus").value || 1),
                notes: commonPayload.notes,
                manualAdjustmentReason: commonPayload.manualAdjustmentReason,
                hasPromotion: commonPayload.hasPromotion,
                promotionName: commonPayload.promotionName
            });

            showMessage("Cuota actualizada correctamente.");
            closeCreateChargeModal();
            await loadCharges();
            return;
        }

        if (mode === "bulk") {
            const scope = document.querySelector("input[name='bulkScope']:checked")?.value || "global";
            const courseId = scope === "course" ? document.getElementById("chargeCourseId").value : null;

            if (scope === "course" && !courseId) {
                showCreateChargeError("Seleccioná un curso para generar cuotas masivas por curso.");
                return;
            }

            await post(`/api/admin/${company.slug}/payments/monthly-charges/manual/bulk`, {
                ...commonPayload,
                courseId,
                studentIds: [],
                skipExisting: document.getElementById("skipExisting").checked
            });

            showMessage("Cuotas masivas generadas correctamente.");
            closeCreateChargeModal();
            await loadCharges();
            return;
        }

        const studentId = document.getElementById("chargeStudentId").value;
        const courseId = document.getElementById("chargeCourseId").value;

        if (!studentId || !courseId) {
            showCreateChargeError("Seleccioná alumno y curso.");
            return;
        }

        await post(`/api/admin/${company.slug}/payments/monthly-charges/manual`, {
            ...commonPayload,
            studentId,
            courseId
        });

        showMessage("Cuota generada correctamente.");
        closeCreateChargeModal();
        await loadCharges();
    } catch (error) {
        showCreateChargeError(error?.message || "No se pudo guardar la cuota.");
    }
}

function openChargeProofModalShell() {
    document.getElementById("chargeProofModal").classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

function closeChargeProofModal() {
    document.getElementById("chargeProofModal").classList.add("hidden");
    document.getElementById("chargeProofModalBody").innerHTML = "";
    document.getElementById("chargeProofDownloadBtn").classList.add("hidden");
    document.getElementById("chargeProofDownloadBtn").href = "#";
    document.body.classList.remove("overflow-hidden");
}

window.closeChargeProofModal = closeChargeProofModal;

window.openChargeProofModal = async function (chargeId) {
    if (!chargeId) return;

    openChargeProofModalShell();

    const body = document.getElementById("chargeProofModalBody");
    const downloadBtn = document.getElementById("chargeProofDownloadBtn");

    body.innerHTML = `<div class="text-sm text-slate-500">Cargando comprobante...</div>`;
    downloadBtn.classList.add("hidden");
    downloadBtn.href = "#";

    try {
        const result = await get(
            `/api/admin/${company.slug}/monthly-charges/${chargeId}/proof/view`
        );

        if (!result?.url) {
            body.innerHTML = `<div class="text-sm text-red-600">No se pudo obtener el comprobante.</div>`;
            return;
        }

        const downloadResult = await get(
            `/api/admin/${company.slug}/monthly-charges/${chargeId}/proof/download`
        );

        if (downloadResult?.url) {
            downloadBtn.href = downloadResult.url;
            downloadBtn.classList.remove("hidden");
        }

        body.innerHTML = "";

        if (result.isImage) {
            const img = document.createElement("img");
            img.src = result.url;
            img.alt = result.fileName || "Comprobante";
            img.className = "mx-auto max-h-[70vh] w-auto rounded-xl border";
            body.appendChild(img);
            return;
        }

        if (result.isPdf) {
            const iframe = document.createElement("iframe");
            iframe.src = result.url;
            iframe.title = "Comprobante PDF";
            iframe.className = "h-[70vh] w-full rounded-xl border";
            body.appendChild(iframe);
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "space-y-3";

        const text = document.createElement("div");
        text.className = "text-sm text-slate-600";
        text.textContent = "El archivo no se puede previsualizar.";

        const link = document.createElement("a");
        link.href = result.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "inline-flex rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
        link.textContent = "Abrir archivo";

        wrapper.appendChild(text);
        wrapper.appendChild(link);
        body.appendChild(wrapper);
    } catch (error) {
        body.innerHTML = `
            <div class="text-sm text-red-600">
                ${error?.message || "No se pudo cargar el comprobante."}
            </div>
        `;
    }
};

window.payCharge = async function (id) {
    const charge = getChargeById(id);

    if (!charge) return;

    if (Number(charge.status) === 2) return;

    try {
        await post(
            `/api/admin/${company.slug}/monthly-charges/${id}/pay-manual`,
            {
                paymentMethod: 1,
                paymentReference: null,
                notes: null
            }
        );

        closePayModal();
        await loadCharges();
        openPaymentSuccessModal("El pago en efectivo fue registrado correctamente.");
    } catch (error) {
        alert(error.message || "No se pudo registrar el pago.");
    }
};

window.openPayModal = function (id) {
    selectedChargeId = id;
    document.getElementById("payModal").classList.remove("hidden");
};

window.closePayModal = function () {
    document.getElementById("payModal").classList.add("hidden");
    selectedChargeId = null;
};

async function loadCoursesAndStudents() {
    if (!company) return;

    try {
        courses = await get(`/api/admin/${company.slug}/courses`);
    } catch {
        courses = [];
    }

    try {
        students = await get(`/api/admin/${company.slug}/students`);
    } catch {
        students = [];
    }
}

async function loadCharges() {
    if (!company) return;

    hideMessage();

    charges = await get(
        `/api/admin/${company.slug}/monthly-charges?year=${filters.year}&month=${filters.month}`
    );

    page = 1;
    renderSummary();
    renderCharges();
}

function bindEvents() {
    document.getElementById("yearFilter")?.addEventListener("change", async e => {
        filters.year = Number(e.target.value);
        await loadCharges();
    });

    document.getElementById("monthFilter")?.addEventListener("change", async e => {
        filters.month = Number(e.target.value);
        await loadCharges();
    });

    document.getElementById("statusFilter")?.addEventListener("change", () => {
        filters.status = document.getElementById("statusFilter")?.value || "";
        page = 1;
        renderSummary();
        renderCharges();
    });

    document.getElementById("searchFilter")?.addEventListener("input", () => {
        filters.search = document.getElementById("searchFilter")?.value || "";
        page = 1;
        renderSummary();
        renderCharges();
    });

    document.getElementById("openCreateChargeBtn")?.addEventListener("click", openCreateChargeModal);
    document.getElementById("closeCreateChargeModalBtn")?.addEventListener("click", closeCreateChargeModal);
    document.getElementById("cancelCreateChargeBtn")?.addEventListener("click", closeCreateChargeModal);
    document.getElementById("createChargeForm")?.addEventListener("submit", submitCreateCharge);
    document.getElementById("chargeMode")?.addEventListener("change", syncCreateChargeMode);

    document.querySelectorAll("input[name='bulkScope']").forEach(radio => {
        radio.addEventListener("change", syncCreateChargeMode);
    });

    document.getElementById("createChargeModal")?.addEventListener("click", e => {
        if (e.target.dataset.closeCreateCharge === "true") {
            closeCreateChargeModal();
        }
    });

    document.getElementById("closeChargeDetailModalBtn")?.addEventListener("click", closeChargeDetailModal);

    document.getElementById("chargeDetailModal")?.addEventListener("click", e => {
        if (e.target.dataset.closeChargeDetail === "true") {
            closeChargeDetailModal();
        }
    });

    document.addEventListener("click", async (e) => {
        if (e.target.id === "payCashBtn") {
            if (!selectedChargeId) return;

            try {
                await post(`/api/admin/${company.slug}/monthly-charges/${selectedChargeId}/pay-manual`, {
                    paymentMethod: 1,
                    paymentReference: null,
                    notes: null
                });

                closePayModal();
                await loadCharges();
                openPaymentSuccessModal("El pago en efectivo fue registrado correctamente.");
            } catch (error) {
                alert(error.message || "No se pudo registrar el pago.");
            }
        }

        if (e.target.id === "payTransferBtn") {
            if (!selectedChargeId) return;

            try {
                await post(`/api/admin/${company.slug}/monthly-charges/${selectedChargeId}/pay-manual`, {
                    paymentMethod: 2,
                    paymentReference: null,
                    notes: null
                });

                closePayModal();
                await loadCharges();
                openPaymentSuccessModal("El pago por transferencia fue registrado correctamente.");
            } catch (error) {
                alert(error.message || "No se pudo registrar el pago.");
            }
        }
    });

    document.getElementById("closePaymentSuccessModalBtn")?.addEventListener("click", closePaymentSuccessModal);
}

async function init() {
    await loadConfig();

    requireAuth();

    const app = document.getElementById("app");

    app.innerHTML = renderAdminLayout({
        activeKey: "monthlyCharges",
        pageTitle: "Cuotas",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;

            await loadCoursesAndStudents();
            refreshCreateChargeSelects();
            await loadCharges();
        }
    });

    company = layout.activeCompany;

    bindEvents();

    await loadCoursesAndStudents();
    refreshCreateChargeSelects();
    await loadCharges();
}

init();