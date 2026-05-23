import { get, post, put } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";
import { hasModule } from "../../../shared/js/modules.js";

let company = null;

let charges = [];
let courses = [];
let students = [];
let selectedPaymentMethod = null;
let selectedPaymentPreview = null;
let filters = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    status: "",
    search: "",
    courseId: "",
    chargeType: ""
};
let paymentMethods = [];
let selectedChargeId = null;
let selectedEditChargeId = null;
let selectedGenerateStudentIds = [];
let selectedGenerateStudents = [];

function normalizeChargeStatus(status) {
    const value = String(status ?? "").toLowerCase();

    if (value === "1" || value === "pending") return "pending";
    if (value === "2" || value === "paid") return "paid";
    if (value === "3" || value === "overdue") return "overdue";
    if (value === "4" || value === "inreview" || value === "in_review") return "inreview";

    return value;
}

function buildContent() {
    return `
        <section class="space-y-6">

            <section class="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl">
                <div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <div class="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                            Pagos
                        </div>

                        <h1 class="mt-4 text-4xl font-black tracking-tight text-white">
                            Cuotas
                        </h1>

                        <p class="mt-2 max-w-xl text-sm text-slate-300">
                            Gestión completa de cuotas, vencimientos, becas, descuentos y pagos.
                        </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-3">
                        <button
                            id="openGenerateChargeModalBtn"
                            type="button"
                            class="h-12 rounded-2xl bg-white px-5 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
                        >
                            Generar cuota
                        </button>

                        <select id="yearFilter" class="h-12 rounded-2xl border border-white/10 bg-white px-4 text-sm font-bold text-slate-900 outline-none">
                            ${buildYearOptions()}
                        </select>

                        <select id="monthFilter" class="h-12 rounded-2xl border border-white/10 bg-white px-4 text-sm font-bold text-slate-900 outline-none">
                            ${buildMonthOptions()}
                        </select>
                    </div>
                </div>

                <div class="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div class="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                        <div class="text-xs font-semibold uppercase tracking-wide text-slate-300">Total</div>
                        <div id="totalAmount" class="mt-3 text-3xl font-black text-white">$0</div>
                    </div>

                    <div class="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                        <div class="text-xs font-semibold uppercase tracking-wide text-slate-300">Pagado</div>
                        <div id="paidAmount" class="mt-3 text-3xl font-black text-emerald-300">$0</div>
                    </div>

                    <div class="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                        <div class="text-xs font-semibold uppercase tracking-wide text-slate-300">Pendiente</div>
                        <div id="pendingAmount" class="mt-3 text-3xl font-black text-amber-300">$0</div>
                    </div>

                    <div class="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                        <div class="text-xs font-semibold uppercase tracking-wide text-slate-300">Vencido</div>
                        <div id="overdueAmount" class="mt-3 text-3xl font-black text-red-300">$0</div>
                    </div>
                </div>
            </section>

            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-[180px_220px_220px_1fr]">
                    <div>
                        <label class="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Estado
                        </label>

                        <select
                            id="statusFilter"
                            class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800"
                        >
                            <option value="">Todas</option>
                            <option value="Pending">Pendientes</option>
                            <option value="Paid">Pagadas</option>
                            <option value="Overdue">Vencidas</option>
                        </select>
                    </div>

                    <div>
                        <label class="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Curso
                        </label>

                        <select
                            id="courseFilter"
                            class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800"
                        >
                            <option value="">Todos</option>
                        </select>
                    </div>

                    <div>
                        <label class="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Tipo
                        </label>

                        <select
                            id="chargeTypeFilter"
                            class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800"
                        >
                            <option value="">Todas</option>
                            <option value="scholarship">Con beca</option>
                            <option value="sibling">Con hermanos</option>
                            <option value="late">Con mora</option>
                            <option value="promotion">Con promoción</option>
                            <option value="manual">Manual</option>
                            <option value="normal">Sin descuentos ni recargos</option>
                        </select>
                    </div>

                    <div>
                        <label class="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Buscar alumno
                        </label>

                        <div class="relative">
                            <input
                                id="searchFilter"
                                type="text"
                                placeholder="Buscar por nombre, apellido o DNI"
                                class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-sm font-medium text-slate-800"
                            />

                            <div class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                                🔍
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="chargesList" class="space-y-3"></section>

        </section>

        ${renderGenerateChargeModal()}
        ${renderEditChargeModal()}

        <div id="chargeDetailModal" class="fixed inset-0 z-50 hidden p-4">
            <div class="absolute inset-0 bg-slate-950/60" data-close-charge-detail="true"></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
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

        ${renderPayModal()}
        ${renderPaymentSuccessModal()}
        ${renderChargeProofModal()}
    `;
}

function renderGenerateChargeModal() {
    return `
        <div id="generateChargeModal" class="fixed inset-0 z-50 hidden p-4">
            <div
                class="absolute inset-0 bg-slate-950/60"
                data-close-generate-charge="true"
            ></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                    <div class="flex items-center justify-between border-b px-5 py-4">
                        <div>
                            <h3 class="text-lg font-semibold text-slate-900">Generar cuota</h3>
                            <p class="text-sm text-slate-500">Creación manual de cuotas para el período seleccionado.</p>
                        </div>

                        <button
                            id="closeGenerateChargeModalBtn"
                            type="button"
                            class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                            Cerrar
                        </button>
                    </div>

                    <form id="generateChargeForm" class="p-5 space-y-4">

                        <div class="grid gap-4 md:grid-cols-2">
                            <div>
                                <label class="block text-xs font-medium text-slate-500 mb-1">
                                    Año
                                </label>
                                <input
                                    id="generateYearInput"
                                    type="number"
                                    min="2024"
                                    max="2030"
                                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-slate-500 mb-1">
                                    Mes
                                </label>
                                <select
                                    id="generateMonthInput"
                                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                >
                                    ${buildMonthOptions()}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-medium text-slate-500 mb-1">
                                Tipo de generación
                            </label>
                            <select
                                id="generateTypeInput"
                                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            >
                                <option value="global">Todos los alumnos</option>
                                <option value="course">Por curso</option>
                                <option value="student">Alumno específico</option>
                            </select>
                        </div>

                        <div id="generateCourseWrapper" class="hidden">
                            <label class="block text-xs font-medium text-slate-500 mb-1">
                                Curso
                            </label>
                            <select
                                id="generateCourseInput"
                                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            >
                                <option value="">Seleccionar curso</option>
                            </select>
                        </div>

<div id="generateStudentWrapper" class="hidden">
    <label class="block text-xs font-medium text-slate-500 mb-1">
        Alumno/s
    </label>

    <input
        id="generateStudentSearchInput"
        type="text"
        placeholder="Buscar por nombre, apellido o DNI"
        class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
    />

    <div id="generateSelectedStudents" class="mt-2 flex flex-wrap gap-2"></div>

    <div
        id="generateStudentResults"
        class="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white text-sm"
    ></div>
</div>

<label class="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
    <input
        id="generateSkipExistingInput"
        type="checkbox"
        checked
        class="rounded border-slate-300"
    />
    Omitir cuotas ya existentes
</label>

<div id="generateChargeMessage" class="hidden rounded-xl px-3 py-2 text-sm"></div>

                        <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                            <button
                                id="cancelGenerateChargeBtn"
                                type="button"
                                class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>

                            <button
                                id="submitGenerateChargeBtn"
                                type="submit"
                                class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
                            >
                                Generar
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    `;
}

function renderSelectedGenerateStudents() {
    const container = document.getElementById("generateSelectedStudents");
    if (!container) return;

    container.innerHTML = selectedGenerateStudents.map(student => `
        <button
            type="button"
            data-remove-student-id="${student.id}"
            class="rounded-full bg-slate-900 px-3 py-1 text-xs text-white"
        >
            ${getItemName(student)} ✕
        </button>
    `).join("");
}

function filterStudentsBySearch(items, search) {
    const value = normalizeText(search);

    if (!value) return [];

    return items.filter(student => {
        const firstName = normalizeText(student.firstName);
        const lastName = normalizeText(student.lastName);
        const fullName = normalizeText(getItemName(student));
        const dni = normalizeText(student.dni);

        return firstName.startsWith(value)
            || lastName.startsWith(value)
            || fullName.startsWith(value)
            || dni.startsWith(value);
    });
}

function renderGenerateStudentResults() {
    const container = document.getElementById("generateStudentResults");
    if (!container) return;

    if (!students.length) {
        container.innerHTML = `
            <div class="px-3 py-2 text-slate-500">
                Sin resultados
            </div>
        `;
        return;
    }

    container.innerHTML = students.map(student => `
        <button
            type="button"
            data-select-student-id="${student.id}"
            class="block w-full px-3 py-2 text-left hover:bg-slate-50"
        >
            ${getItemName(student)}${student.dni ? ` - DNI ${student.dni}` : ""}
        </button>
    `).join("");
}

function renderEditChargeModal() {
    return `
        <div id="editChargeModal" class="fixed inset-0 z-50 hidden p-4">
            <div class="absolute inset-0 bg-slate-950/60" data-close-edit-charge="true"></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                    <div class="flex items-center justify-between border-b px-5 py-4">
                        <div>
                            <h3 class="text-lg font-semibold text-slate-900">Editar cuota</h3>
                            <p class="text-sm text-slate-500">Ajustes manuales sobre la cuota seleccionada.</p>
                        </div>

                        <button id="closeEditChargeModalBtn" type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                            Cerrar
                        </button>
                    </div>

                    <form id="editChargeForm" class="p-5 space-y-4">
                        <div class="rounded-xl bg-slate-50 p-4">
                            <div id="editChargeStudentName" class="font-semibold text-slate-900">-</div>
                            <div id="editChargeCourseName" class="text-sm text-slate-500">-</div>
                        </div>

                        <div class="grid gap-4 md:grid-cols-2">
                            <div>
                                <label class="block text-xs font-medium text-slate-500 mb-1">Estado</label>
                                <select id="editStatusInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                    <option value="1">Pendiente</option>
                                    <option value="2">Pagada</option>
                                    <option value="3">Vencida</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-slate-500 mb-1">Vencimiento</label>
                                <input id="editDueDateInput" type="date" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-slate-500 mb-1">Precio base</label>
                                <input id="editBasePriceInput" type="number" min="0" step="0.01" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-slate-500 mb-1">% descuento hermanos</label>
                                <input id="editSiblingDiscountPercentInput" type="number" min="0" max="100" step="0.01" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-slate-500 mb-1">Importe descuento hermanos</label>
                                <input id="editSiblingDiscountAmountInput" type="number" min="0" step="0.01" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-slate-500 mb-1">Mora</label>
                                <input id="editLateChargeAmountInput" type="number" min="0" step="0.01" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                            </div>

                        </div>

                        <div>
                            <label class="block text-xs font-medium text-slate-500 mb-1">Notas</label>
                            <textarea id="editNotesInput" rows="3" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
                        </div>

                        <div id="editChargeMessage" class="hidden rounded-xl px-3 py-2 text-sm"></div>

                        <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                            <button id="cancelEditChargeBtn" type="button" class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                Cancelar
                            </button>

                            <button id="submitEditChargeBtn" type="submit" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function toDateInputValue(value) {
    if (!value || value.startsWith("0001-01-01")) return "";

    return String(value).slice(0, 10);
}

function renderChargeProofModal() {
    return `
        <div id="chargeProofModal" class="fixed inset-0 z-50 hidden p-4">
            <div
                class="absolute inset-0 bg-slate-950/60"
                onclick="closeChargeProofModal()"
            ></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden">
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
                                class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hidden"
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

                    <div id="chargeProofModalBody" class="p-5 max-h-[80vh] overflow-auto">
                        <div class="text-sm text-slate-500">Cargando comprobante...</div>
                    </div>
                </div>
            </div>
        </div>
    `;
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

function formatMoney(value) {
    const amount = Number(value || 0);

    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
    }).format(amount);
}

function getCardClasses(c) {
    const status = normalizeChargeStatus(c.status);

    if (status === "overdue") {
        return `
            rounded-3xl
            border border-red-200
            bg-red-50/40
            p-5
            shadow-sm
            transition
            hover:shadow-md
        `;
    }

    if (status === "paid") {
        return `
            rounded-3xl
            border border-emerald-200
            bg-emerald-50/40
            p-5
            shadow-sm
            transition
            hover:shadow-md
        `;
    }

    if (status === "inreview") {
        return `
            rounded-3xl
            border border-amber-200
            bg-amber-50/40
            p-5
            shadow-sm
            transition
            hover:shadow-md
        `;
    }

    return `
        rounded-3xl
        border border-slate-200
        bg-white
        p-5
        shadow-sm
        transition
        hover:shadow-md
    `;
}

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    return date.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function getStatusText(status) {
    const value = normalizeChargeStatus(status);

    if (value === "pending") return "Pendiente";
    if (value === "paid") return "Pagada";
    if (value === "overdue") return "Vencida";
    if (value === "inreview") return "Pendiente de revisión";

    return "-";
}

function renderStatus(status) {
    if (status == 1) {
        return `
            <span class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                ● Pendiente
            </span>
        `;
    }

    if (status == 2) {
        return `
            <span class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                ● Pagada
            </span>
        `;
    }

    if (status == 3) {
        return `
            <span class="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                ● Vencida
            </span>
        `;
    }

    return "";
}

function isFootballCompany() {
    const value = normalizeText(
        company?.sportType ||
        company?.sport ||
        company?.mainSport ||
        company?.activityType ||
        ""
    );

    return value.includes("futbol") || value.includes("football") || value.includes("soccer");
}

function getInitials(name) {
    return String(name || "A")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(x => x[0])
        .join("")
        .toUpperCase();
}

function scholarshipValueText(c) {
    const type = String(c.scholarshipDiscountType ?? "").toLowerCase();

    if (type === "percentage" || Number(c.scholarshipDiscountType) === 1) {
        return `${Number(c.scholarshipDiscountValue || 0)}%`;
    }

    return formatMoney(c.scholarshipDiscountValue || 0);
}

function renderChargeBadges(c) {
    const badges = [];

    if (Number(c.lateChargeAmount || 0) > 0) {
        badges.push(`
            <span class="inline-flex max-w-full items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold leading-none text-amber-800">
                <span class="text-sm leading-none">⏰</span>
                <span class="truncate">Mora ${formatMoney(c.lateChargeAmount)}</span>
            </span>
        `);
    }

    if (Number(c.siblingDiscountAmount || 0) > 0) {
        badges.push(`
            <span class="inline-flex max-w-full items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-bold leading-none text-emerald-800">
                <span class="text-sm leading-none">👥</span>
                <span class="truncate">Hermanos ${Number(c.siblingDiscountPercent || 0)}%</span>
            </span>
        `);
    }

    if (c.hasScholarship && Number(c.scholarshipDiscountAmount || 0) > 0) {
        badges.push(`
            <span class="inline-flex max-w-full items-center gap-1 rounded-lg bg-violet-100 px-2 py-1 text-[11px] font-bold leading-none text-violet-800">
                <span class="text-sm leading-none">🎓</span>
                <span class="truncate">Beca ${scholarshipValueText(c)}</span>
            </span>
        `);
    }

    return badges.length
        ? `<div class="flex max-w-[360px] flex-wrap items-center gap-1.5">${badges.join("")}</div>`
        : "";
}

function getFilteredCharges() {
    let result = [...charges];

    if (filters.status) {
        result = result.filter(x =>
            normalizeChargeStatus(x.status) === normalizeChargeStatus(filters.status)
        );
    }

    if (filters.courseId) {
        result = result.filter(x => String(x.courseId) === String(filters.courseId));
    }

    if (filters.chargeType) {
        result = result.filter(x => {
            if (filters.chargeType === "scholarship") return x.hasScholarship;
            if (filters.chargeType === "sibling") return Number(x.siblingDiscountAmount || 0) > 0;
            if (filters.chargeType === "late") return Number(x.lateChargeAmount || 0) > 0;
            if (filters.chargeType === "promotion") return x.hasPromotion;
            if (filters.chargeType === "manual") return x.isManual;
            if (filters.chargeType === "normal") {
                return !x.hasScholarship &&
                    !x.hasPromotion &&
                    !x.isManual &&
                    Number(x.siblingDiscountAmount || 0) <= 0 &&
                    Number(x.lateChargeAmount || 0) <= 0;
            }

            return true;
        });
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

function renderCharges() {
    const container = document.getElementById("chargesList");
    const filteredCharges = getFilteredCharges();

    if (!filteredCharges.length) {
        container.innerHTML = `
            <div class="rounded-2xl border bg-white p-6 text-center text-slate-500">
                No hay cuotas para los filtros seleccionados
            </div>
        `;
        return;
    }

    container.innerHTML = filteredCharges.map(c => {
        const status = normalizeChargeStatus(c.status);
        const isPaid = status === "paid";
        const isOverdue = status === "overdue";
        const isInReview = status === "inreview";
        const initials = getInitials(c.studentFullName);

        const footballIcon = isFootballCompany()
            ? `<span class="mr-1 inline-flex h-4 w-4 items-center justify-center">⚽</span>`
            : "";

        return `
            <div class="${getCardClasses(c)}">
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_190px_360px] lg:items-center">

                    <div class="flex min-w-0 gap-4">
                        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${getAvatarColor(c.studentFullName)} text-lg font-extrabold">
                            ${escapeHtml(initials)}
                        </div>

                        <div class="min-w-0 flex-1">
                            <div class="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-start">
                                <div class="min-w-0 xl:w-[170px]">
                                    <div class="truncate text-xl font-extrabold leading-tight text-slate-900">
                                        ${escapeHtml(c.studentFullName || "Sin nombre")}
                                    </div>

                                    <div class="mt-1 text-sm font-medium text-slate-700">
                                        DNI: ${escapeHtml(c.studentDni || "-")}
                                    </div>

                                    <div class="mt-1 flex items-center text-sm font-medium text-slate-600">
                                        ${footballIcon}${escapeHtml(c.courseName || "-")}
                                    </div>
                                </div>

                                <div class="flex min-w-0 items-center xl:flex-1">
                                    ${renderChargeBadges(c)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col lg:items-end">
                        <div class="text-[11px] uppercase tracking-wide text-slate-500">
                            ${c.finalAmountPaid ? "Total pagado" : "Total cuota"}
                        </div>

                        <div class="text-3xl font-extrabold leading-none ${isOverdue ? "text-red-600" : "text-slate-900"}">
                            ${formatMoney(c.finalAmountPaid || c.finalAmount)}
                        </div>

<div class="mt-2 flex items-center gap-1.5 text-sm font-extrabold ${isOverdue ? "text-red-500" : "text-slate-800"}">
    <span>📅</span>
    VTO: ${formatDate(c.dueDateUtc)}
</div>
                    </div>

                    <div class="grid grid-cols-3 gap-2 lg:w-[360px]">
                        <button
                            onclick="showChargeDetail('${c.id}')"
                            class="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                            Ver detalle
                        </button>

                        ${isPaid
                            ? ``
                            : `
                                <button
                                    onclick="openEditChargeModal('${c.id}')"
                                    class="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                                    Editar
                                </button>
                            `
                        }

                        ${isPaid
                            ? `
                                <button
                                    type="button"
                                    class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 cursor-default">
                                    Pagada
                                </button>
                            `
                            : `
                                <button
                                    onclick="openPayModal('${c.id}')"
                                    class="h-11 rounded-xl bg-slate-950 px-3 text-sm font-bold text-white shadow-sm hover:bg-black">
                                    Registrar pago
                                </button>
                            `
                        }
                    </div>
                </div>
            </div>
       `;
    }).join("");
}

function getAvatarColor(name) {
    const colors = [
        "bg-sky-100 text-sky-700",
        "bg-emerald-100 text-emerald-700",
        "bg-amber-100 text-amber-700",
        "bg-rose-100 text-rose-700",
        "bg-violet-100 text-violet-700"
    ];

    const text = String(name || "");
    const index = text.length % colors.length;

    return colors[index];
}

function renderSummary() {
    const filteredCharges = getFilteredCharges();

    let total = 0;
    let paid = 0;
    let pending = 0;
    let overdue = 0;

    filteredCharges.forEach(c => {
        const finalAmount = Number(c.finalAmount || 0);
        const status = normalizeChargeStatus(c.status);

        total += finalAmount;

        if (status === "paid") paid += finalAmount;
        if (status === "pending") pending += finalAmount;
        if (status === "overdue") overdue += finalAmount;
    });

    document.getElementById("totalAmount").innerText = formatMoney(total);
    document.getElementById("paidAmount").innerText = formatMoney(paid);
    document.getElementById("pendingAmount").innerText = formatMoney(pending);
    document.getElementById("overdueAmount").innerText = formatMoney(overdue);
}


function renderPayModal() {
    return `
    <div id="payModal" class="fixed inset-0 z-50 hidden">
        <div class="absolute inset-0 bg-slate-950/60" onclick="closePayModal()"></div>

        <div class="absolute inset-0 flex items-center justify-center p-4">
            <div class="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
                <div class="border-b px-5 py-4">
                    <h3 class="text-lg font-semibold text-slate-900">Registrar pago</h3>
                    <p class="text-sm text-slate-500">Elegí el medio habilitado para esta empresa.</p>
                </div>

                <div id="payMethodsContainer" class="p-5 space-y-3"></div>

                <div id="paymentPreviewContainer" class="hidden border-t px-5 py-4"></div>

                <div class="border-t px-5 py-4">
                    <button type="button" onclick="closePayModal()" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}

function calculatePaymentPreview(charge, method) {
    const base = Number(charge?.finalAmount || 0);
    const type = String(method?.surchargeType || "").toLowerCase();
    const value = Number(method?.surchargeValue || 0);

    let surcharge = 0;

    if (value > 0 && type === "percentage") {
        surcharge = Math.round((base * value / 100) * 100) / 100;
    }

    if (value > 0 && type === "fixedamount") {
        surcharge = value;
    }

    return {
        base,
        surcharge,
        total: base + surcharge
    };
}

function renderPaymentPreview(charge, method) {
    const container = document.getElementById("paymentPreviewContainer");
    if (!container) return;

    const preview = calculatePaymentPreview(charge, method);
    selectedPaymentPreview = preview;

    container.classList.remove("hidden");
    container.innerHTML = `
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div class="text-sm font-bold text-slate-900">Detalle del pago</div>

            <div class="mt-3 space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-slate-500">Cuota</span>
                    <span class="font-semibold text-slate-900">${formatMoney(preview.base)}</span>
                </div>

                <div class="flex justify-between">
                    <span class="text-slate-500">${escapeHtml(method.paymentMethodName || "Recargo")}</span>
                    <span class="font-semibold text-slate-900">${formatMoney(preview.surcharge)}</span>
                </div>

                <div class="flex justify-between border-t border-slate-200 pt-2 text-base">
                    <span class="font-bold text-slate-900">Total a cobrar</span>
                    <span class="font-black text-slate-900">${formatMoney(preview.total)}</span>
                </div>
            </div>

            <button
                type="button"
                id="confirmManualPaymentBtn"
                class="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-black"
            >
                Confirmar pago
            </button>
        </div>
    `;
}

function renderPayMethods() {
    const container = document.getElementById("payMethodsContainer");
    if (!container) return;

   const enabledMethods = paymentMethods.filter(x =>
    x.enabledBySuperAdmin === true ||
    x.enabledBySuperAdmin === "true"
);

    if (!enabledMethods.length) {
        container.innerHTML = `
            <div class="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No hay medios de pago habilitados para esta empresa.
            </div>
        `;
        return;
    }

    container.innerHTML = enabledMethods.map(method => `
        <button
            type="button"
            data-pay-method="${method.paymentMethod}"
            class="admin-pay-method-btn w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
            <div class="font-bold">${escapeHtml(method.paymentMethodName)}</div>
            <div class="mt-1 text-xs text-slate-500">
                ${renderSurchargeText(method)}
            </div>
        </button>
    `).join("");
}

function renderSurchargeText(method) {
    const type = String(method.surchargeType || "").toLowerCase();
    const value = Number(method.surchargeValue || 0);

    if (!value || type === "none" || Number(method.surchargeType) === 0) {
        return "Sin recargo";
    }

    if (type === "percentage" || Number(method.surchargeType) === 1) {
        return `Recargo ${value}%`;
    }

    return `Recargo ${formatMoney(value)}`;
}

function getChargeById(id) {
    return charges.find(x => x.id === id) || null;
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

<h3 id="paymentSuccessTitle" class="mt-4 text-lg font-semibold text-slate-900">
    Operación realizada
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

function openPaymentSuccessModal(message, title = "Operación realizada") {
    const modal = document.getElementById("paymentSuccessModal");
    const titleElement = document.getElementById("paymentSuccessTitle");
    const text = document.getElementById("paymentSuccessText");

    if (titleElement) {
        titleElement.textContent = title;
    }

    if (text) {
        text.textContent = message || "La operación fue realizada correctamente.";
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
    const value = String(paymentMethod ?? "").toLowerCase();

    if (value === "1" || value === "transfer") return "Transferencia";
    if (value === "2" || value === "debitcard") return "Tarjeta de débito";
    if (value === "3" || value === "creditcard") return "Tarjeta de crédito";
    if (value === "4" || value === "mercadopago") return "Mercado Pago";
    if (value === "5" || value === "cash") return "Efectivo";

    return "-";
}

function buildChargeDetailHtml(c) {
    const studentName = c.studentFullName || "Sin nombre";
    const studentDni = c.studentDni || "-";
    const courseName = c.courseName || "-";

    const basePrice = Number(c.basePrice || 0);
    const siblingDiscountAmount = Number(c.siblingDiscountAmount || 0);
    const siblingDiscountPercent = Number(c.siblingDiscountPercent || 0);
    const scholarshipDiscountAmount = Number(c.scholarshipDiscountAmount || 0);
    const scholarshipName = c.scholarshipName || "-";
    const lateChargeAmount = Number(c.lateChargeAmount || 0);
    const finalAmount = Number(c.finalAmount || 0);
    const paymentBaseAmount = Number(c.baseAmountBeforePaymentMethod || c.finalAmount || 0);
    const paymentSurchargeAmount = Number(c.paymentMethodSurchargeAmount || 0);
    const finalAmountPaid = Number(c.finalAmountPaid || c.finalAmount || 0);
    const paymentMethodName = c.paymentMethodNameSnapshot || getPaymentMethodText(c.paymentMethod);
    const hasPaymentDetail = c.paymentId && Number(c.paymentMethodSurchargeAmount || 0) > 0;


    return `
        <div class="space-y-5">
            <div class="grid gap-4 md:grid-cols-2">
                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">Alumno</div>
                    <div class="mt-1 font-semibold text-slate-900">${studentName}</div>
                </div>

                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">DNI</div>
                    <div class="mt-1 font-semibold text-slate-900">${studentDni}</div>
                </div>

                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="text-xs uppercase tracking-wide text-slate-500">Curso</div>
                    <div class="mt-1 font-semibold text-slate-900">${courseName}</div>
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

            <div class="rounded-2xl border border-slate-200 overflow-hidden">
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

                    ${c.hasScholarship ? `
                        <div class="flex items-center justify-between px-4 py-3 text-sm">
                            <span class="text-slate-500">
                                Beca ${scholarshipName !== "-" ? `(${escapeHtml(scholarshipName)})` : ""}
                            </span>
                            <span class="font-medium text-slate-900">
                                -${formatMoney(scholarshipDiscountAmount)}
                                ${c.scholarshipDiscountValue ? `(${scholarshipValueText(c)})` : ""}
                            </span>
                        </div>
                    ` : ""}

                    <div class="flex items-center justify-between px-4 py-3 text-sm">
                        <span class="text-slate-500">Recargo por mora</span>
                        <span class="font-medium text-slate-900">${formatMoney(lateChargeAmount)}</span>
                    </div>

                    <div class="flex items-center justify-between px-4 py-3 text-sm bg-slate-50">
                        <span class="font-semibold text-slate-900">Monto final</span>
                        <span class="font-bold text-slate-900">${formatMoney(finalAmount)}</span>
                    </div>
                    ${hasPaymentDetail ? `
                        <div class="flex items-center justify-between px-4 py-3 text-sm">
                            <span class="text-slate-500">Medio aplicado</span>
                            <span class="font-medium text-slate-900">${escapeHtml(paymentMethodName)}</span>
                        </div>

                        <div class="flex items-center justify-between px-4 py-3 text-sm">
                            <span class="text-slate-500">Recargo medio de pago</span>
                            <span class="font-medium text-slate-900">${formatMoney(paymentSurchargeAmount)}</span>
                        </div>

                        <div class="flex items-center justify-between px-4 py-3 text-sm bg-slate-900">
                            <span class="font-semibold text-white">Total pagado</span>
                            <span class="font-bold text-white">${formatMoney(finalAmountPaid)}</span>
                        </div>
                    ` : ""}
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
                    ${Number(c.paymentMethod) === 2 && c.paymentId && c.paymentReference
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
                <div class="mt-1 text-sm text-slate-700">${c.notes || "-"}</div>
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

    if (!charge)
        return;

    document.getElementById("chargeDetailBody").innerHTML = buildChargeDetailHtml(charge);
    openChargeDetailModal();
};

window.openPayModal = function (id) {
    selectedChargeId = id;
    selectedPaymentMethod = null;
    selectedPaymentPreview = null;
    renderPayMethods();

    const preview = document.getElementById("paymentPreviewContainer");
    if (preview) {
        preview.classList.add("hidden");
        preview.innerHTML = "";
    }

    document.getElementById("payModal").classList.remove("hidden");
};

window.closePayModal = function () {
    document.getElementById("payModal").classList.add("hidden");
    selectedChargeId = null;
    selectedPaymentMethod = null;
    selectedPaymentPreview = null;
};

function openGenerateChargeModal() {
    clearGenerateChargeMessage();

    document.getElementById("generateYearInput").value = filters.year;
    document.getElementById("generateMonthInput").value = filters.month;
    document.getElementById("generateTypeInput").value = "global";
    document.getElementById("generateCourseInput").value = "";
    document.getElementById("generateSkipExistingInput").checked = true;

    selectedGenerateStudentIds = [];
    selectedGenerateStudents = [];
    const studentSearchInput = document.getElementById("generateStudentSearchInput");
    if (studentSearchInput) {
        studentSearchInput.value = "";
    }

    students = [];
    renderSelectedGenerateStudents();
    renderGenerateStudentResults();

    refreshGenerateTypeVisibility();

    document.getElementById("generateChargeModal").classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

function closeGenerateChargeModal() {
    document.getElementById("generateChargeModal").classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
}

function refreshGenerateTypeVisibility() {
    const type = document.getElementById("generateTypeInput").value;
    const courseWrapper = document.getElementById("generateCourseWrapper");
    const studentWrapper = document.getElementById("generateStudentWrapper");

    courseWrapper.classList.toggle("hidden", type !== "course");
    studentWrapper.classList.toggle("hidden", type !== "student");
}

function setGenerateChargeMessage(message, isError = false) {
    const element = document.getElementById("generateChargeMessage");

    element.textContent = message;
    element.className = `rounded-xl px-3 py-2 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`;
    element.classList.remove("hidden");
}

function clearGenerateChargeMessage() {
    const element = document.getElementById("generateChargeMessage");

    if (!element) return;

    element.textContent = "";
    element.classList.add("hidden");
}

async function onSubmitGenerateCharge(event) {
    event.preventDefault();

    clearGenerateChargeMessage();

    const submitButton = document.getElementById("submitGenerateChargeBtn");

    const year = Number(document.getElementById("generateYearInput").value);
    const month = Number(document.getElementById("generateMonthInput").value);
    const type = document.getElementById("generateTypeInput").value;
    const courseId = document.getElementById("generateCourseInput").value;
    const studentIds = selectedGenerateStudentIds;
    const skipExisting = document.getElementById("generateSkipExistingInput").checked;

    if (!year || !month) {
        setGenerateChargeMessage("Seleccioná año y mes.", true);
        return;
    }

    if (type === "course" && !courseId) {
        setGenerateChargeMessage("Seleccioná un curso.", true);
        return;
    }

if (type === "student" && !studentIds.length) {
    setGenerateChargeMessage("Seleccioná al menos un alumno.", true);
    return;
}

    const body = {
        year,
        month,
        courseId: type === "course" ? courseId : null,
        studentIds: type === "student" ? studentIds : [],
        skipExisting
    };

    try {
        submitButton.disabled = true;
        submitButton.textContent = "Generando...";

        const result = await post(
            `/api/admin/${company.slug}/payments/monthly-charges/manual/bulk`,
            body
        );

        closeGenerateChargeModal();
        await loadCharges();

        openPaymentSuccessModal(
            `Generadas: ${result?.created || 0}. Omitidas: ${result?.skipped || 0}.`,
            "Cuotas generadas"
        );
    } catch (error) {
        setGenerateChargeMessage(error?.message || "No se pudieron generar las cuotas.", true);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Generar";
    }
}

window.openEditChargeModal = function (id) {
    const charge = getChargeById(id);

    if (!charge) return;

    selectedEditChargeId = id;

    clearEditChargeMessage();

    document.getElementById("editChargeStudentName").textContent = charge.studentFullName || "Sin nombre";
    document.getElementById("editChargeCourseName").textContent = charge.courseName || "-";

    document.getElementById("editStatusInput").value = Number(charge.status || 1);
    document.getElementById("editDueDateInput").value = toDateInputValue(charge.dueDateUtc);

    document.getElementById("editBasePriceInput").value = Number(charge.basePrice || 0);
    document.getElementById("editSiblingDiscountPercentInput").value = Number(charge.siblingDiscountPercent || 0);
    document.getElementById("editSiblingDiscountAmountInput").value = Number(charge.siblingDiscountAmount || 0);
    document.getElementById("editLateChargeAmountInput").value = Number(charge.lateChargeAmount || 0);
    document.getElementById("editNotesInput").value = charge.notes || "";

    document.getElementById("editChargeModal").classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
};

function closeEditChargeModal() {
    selectedEditChargeId = null;
    document.getElementById("editChargeModal").classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
}

function setEditChargeMessage(message, isError = false) {
    const element = document.getElementById("editChargeMessage");

    element.textContent = message;
    element.className = `rounded-xl px-3 py-2 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`;
    element.classList.remove("hidden");
}

function clearEditChargeMessage() {
    const element = document.getElementById("editChargeMessage");

    if (!element) return;

    element.textContent = "";
    element.classList.add("hidden");
}

async function onSubmitEditCharge(event) {
    event.preventDefault();

    if (!selectedEditChargeId)
        return;

    clearEditChargeMessage();

    const submitButton = document.getElementById("submitEditChargeBtn");
    const dueDateValue = document.getElementById("editDueDateInput").value;

const body = {
    basePrice: Number(document.getElementById("editBasePriceInput").value || 0),
    siblingDiscountPercent: Number(document.getElementById("editSiblingDiscountPercentInput").value || 0),
    siblingDiscountAmount: Number(document.getElementById("editSiblingDiscountAmountInput").value || 0),
    lateChargeAmount: Number(document.getElementById("editLateChargeAmountInput").value || 0),

    dueDateUtc: dueDateValue
        ? `${dueDateValue}T23:59:59Z`
        : getChargeById(selectedEditChargeId)?.dueDateUtc,

    status: Number(document.getElementById("editStatusInput").value),

    notes: document.getElementById("editNotesInput").value?.trim() || null
};
    if (body.basePrice < 0 || body.siblingDiscountPercent < 0 || body.lateChargeAmount < 0) {
        setEditChargeMessage("Los importes no pueden ser negativos.", true);
        return;
    }

    if (body.siblingDiscountPercent > 100) {
        setEditChargeMessage("El descuento no puede superar el 100%.", true);
        return;
    }

    try {
        submitButton.disabled = true;
        submitButton.textContent = "Guardando...";

        await put(
            `/api/admin/${company.slug}/payments/monthly-charges/${selectedEditChargeId}`,
            body
        );

        closeEditChargeModal();
        await loadCharges();
        openPaymentSuccessModal("La cuota fue actualizada correctamente.");
    } catch (error) {
        setEditChargeMessage(error?.message || "No se pudo actualizar la cuota.", true);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Guardar";
    }
}

function getItemName(item) {
    return item.name
        || item.fullName
        || item.studentFullName
        || `${item.firstName || ""} ${item.lastName || ""}`.trim()
        || item.email
        || "Sin nombre";
}

function fillCourseOptions() {
    const select = document.getElementById("generateCourseInput");

    if (!select) return;

    select.innerHTML = `
        <option value="">Seleccionar curso</option>
        ${courses.map(course => `
            <option value="${course.id}">
                ${getItemName(course)}
            </option>
        `).join("")}
    `;

    const courseFilter = document.getElementById("courseFilter");

if (courseFilter) {
    courseFilter.innerHTML = `
        <option value="">Todos</option>
        ${courses.map(course => `
            <option value="${course.id}">
                ${getItemName(course)}
            </option>
        `).join("")}
    `;
}
}

function fillStudentOptions() {
    const select = document.getElementById("generateStudentInput");

    if (!select) return;

    select.innerHTML = `
        <option value="">Seleccionar alumno</option>
        ${students.map(student => `
            <option value="${student.id}">
                ${getItemName(student)}${student.dni ? ` - DNI ${student.dni}` : ""}
            </option>
        `).join("")}
    `;
}

function unwrapList(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.students)) return result.students;
    if (Array.isArray(result?.courses)) return result.courses;
    return [];
}

async function loadCoursesAndStudents() {
    try {
        const coursesResult = await get(`/api/admin/${company.slug}/courses`);
        courses = unwrapList(coursesResult);
    } catch (error) {
        console.error("Error cargando cursos", error);
        courses = [];
    }

    try {
        const studentsResult = await get(`/api/admin/${company.slug}/students?search=`);
        students = unwrapList(studentsResult);
    } catch (error) {
        console.error("Error cargando alumnos", error);
        students = [];
    }

    fillCourseOptions();
    fillStudentOptions();
}

async function loadPaymentMethods() {
    try {
        paymentMethods = await get(`/api/admin/${company.slug}/payment-methods`);
    } catch {
        paymentMethods = [];
    }
}

async function loadCharges() {
    const params = new URLSearchParams();

    params.append("year", filters.year);
    params.append("month", filters.month);

    if (filters.status) {
        params.append("status", filters.status);
    }

    if (filters.search.trim()) {
        params.append("search", filters.search.trim());
    }

    charges = await get(
        `/api/admin/${company.slug}/monthly-charges?${params.toString()}`
    );

    renderSummary();
    renderCharges();
}

function bindEvents() {
    document.getElementById("yearFilter").addEventListener("change", async e => {
        filters.year = Number(e.target.value);
        await loadCharges();
    });

    document.getElementById("monthFilter").addEventListener("change", async e => {
        filters.month = Number(e.target.value);
        await loadCharges();
    });

    document.getElementById("statusFilter").addEventListener("change", async () => {
        filters.status = document.getElementById("statusFilter").value;
        await loadCharges();
    });

    document.getElementById("searchFilter").addEventListener("input", async () => {
        filters.search = document.getElementById("searchFilter").value;
        await loadCharges();
    });

    document.getElementById("closeChargeDetailModalBtn").addEventListener("click", () => {
        closeChargeDetailModal();
    });

    document.getElementById("chargeDetailModal").addEventListener("click", e => {
        if (e.target.dataset.closeChargeDetail === "true") {
            closeChargeDetailModal();
        }
    });

    document.getElementById("openGenerateChargeModalBtn")?.addEventListener("click", () => {
        openGenerateChargeModal();
    });

    document.getElementById("closeGenerateChargeModalBtn")?.addEventListener("click", () => {
        closeGenerateChargeModal();
    });

    document.getElementById("cancelGenerateChargeBtn")?.addEventListener("click", () => {
        closeGenerateChargeModal();
    });

    document.getElementById("courseFilter")?.addEventListener("change", async () => {
    filters.courseId = document.getElementById("courseFilter").value;
    renderSummary();
    renderCharges();
});

document.getElementById("chargeTypeFilter")?.addEventListener("change", async () => {
    filters.chargeType = document.getElementById("chargeTypeFilter").value;
    renderSummary();
    renderCharges();
});

document.getElementById("generateStudentSearchInput")?.addEventListener("input", async e => {
    const search = e.target.value.trim();

    if (search.length < 2) {
        students = [];
        renderGenerateStudentResults();
        return;
    }

    try {
        const result = await get(`/api/admin/${company.slug}/students?search=${encodeURIComponent(search)}`);

        students = unwrapList(result)
            .filter(student => !selectedGenerateStudentIds.includes(student.id));

        renderGenerateStudentResults();
        renderSelectedGenerateStudents();
    } catch (error) {
        console.error("Error buscando alumnos", error);
        students = [];
        renderGenerateStudentResults();
    }
});

document.getElementById("generateStudentResults")?.addEventListener("click", e => {
    const studentId = e.target.dataset.selectStudentId;
    if (!studentId) return;

    const student = students.find(x => x.id === studentId);
    if (!student) return;

    if (!selectedGenerateStudentIds.includes(studentId)) {
        selectedGenerateStudentIds.push(studentId);
        selectedGenerateStudents.push(student);
    }

    students = students.filter(x => x.id !== studentId);

    renderSelectedGenerateStudents();
    renderGenerateStudentResults();
});

document.getElementById("generateSelectedStudents")?.addEventListener("click", e => {
    const studentId = e.target.dataset.removeStudentId;
    if (!studentId) return;

    selectedGenerateStudentIds = selectedGenerateStudentIds.filter(x => x !== studentId);
    selectedGenerateStudents = selectedGenerateStudents.filter(x => x.id !== studentId);

    renderSelectedGenerateStudents();
});

    document.getElementById("generateChargeModal")?.addEventListener("click", e => {
        if (e.target.dataset.closeGenerateCharge === "true") {
            closeGenerateChargeModal();
        }
    });

    document.getElementById("generateTypeInput")?.addEventListener("change", () => {
        refreshGenerateTypeVisibility();
    });

    document.getElementById("generateChargeForm")?.addEventListener("submit", onSubmitGenerateCharge);

    document.getElementById("closeEditChargeModalBtn")?.addEventListener("click", () => {
        closeEditChargeModal();
    });

    document.getElementById("cancelEditChargeBtn")?.addEventListener("click", () => {
        closeEditChargeModal();
    });

    document.getElementById("editChargeModal")?.addEventListener("click", e => {
        if (e.target.dataset.closeEditCharge === "true") {
            closeEditChargeModal();
        }
    });

    document.getElementById("editChargeForm")?.addEventListener("submit", onSubmitEditCharge);

document.addEventListener("click", async (e) => {
    const payMethodBtn = e.target.closest(".admin-pay-method-btn");
    if (!payMethodBtn) return;
    if (!selectedChargeId) return;

    const paymentMethod = payMethodBtn.dataset.payMethod;
    const charge = getChargeById(selectedChargeId);
    const method = paymentMethods.find(x => String(x.paymentMethod) === String(paymentMethod));

    selectedPaymentMethod = method;

    renderPaymentPreview(charge, method);
});

document.addEventListener("click", async (e) => {
    const confirmBtn = e.target.closest("#confirmManualPaymentBtn");
    if (!confirmBtn) return;
    if (!selectedChargeId || !selectedPaymentMethod) return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Registrando...";

    try {
        const updatedCharge = await post(
            `/api/admin/${company.slug}/monthly-charges/${selectedChargeId}/pay-manual`,
            {
                paymentMethod: selectedPaymentMethod.paymentMethod,
                paymentReference: null,
                notes: null
            }
        );

        charges = charges.map(x =>
            x.id === updatedCharge.id ? updatedCharge : x
        );

        closePayModal();
        renderSummary();
        renderCharges();

        openPaymentSuccessModal("El pago fue registrado correctamente.");

    } catch (error) {
        closePayModal();
        openPaymentSuccessModal(
            error.message || "No se pudo registrar el pago.",
            "No se pudo registrar"
        );
    }
});

    document.getElementById("closePaymentSuccessModalBtn")?.addEventListener("click", () => {
        closePaymentSuccessModal();
    });
}

async function init() {
    await loadConfig();
    requireAuth();

    const app = document.getElementById("app");

    app.innerHTML = renderAdminLayout({
        activeKey: "monthly-charges",
        pageTitle: "Cuotas",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;
            await loadPaymentMethods();
            await loadCoursesAndStudents();
            await loadCharges();
        }
    });

    company = layout.activeCompany;

    if (!hasModule(company, "payments")) {
        window.location.replace("/src/pages/admin/students/index.html");
        return;
    }

    bindEvents();

    await loadPaymentMethods();
    await loadCoursesAndStudents();
    await loadCharges();
}

init();