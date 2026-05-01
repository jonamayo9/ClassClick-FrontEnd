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
let selectedGenerateStudentIds = [];
let selectedGenerateStudents = [];

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
                            Generación automática mensual
                        </p>
                    </div>

                    <div class="flex flex-wrap gap-2">

                        <button
                            id="openGenerateChargeModalBtn"
                            type="button"
                            class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                        >
                            Generar cuota
                        </button>

                        <select id="yearFilter" class="rounded-xl text-black px-3 py-2">
                            ${buildYearOptions()}
                        </select>

                        <select id="monthFilter" class="rounded-xl text-black px-3 py-2">
                            ${buildMonthOptions()}
                        </select>

                    </div>

                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">

                    <div class="bg-white/10 rounded-xl p-4">
                        <div class="text-xs text-slate-300">Total</div>
                        <div id="totalAmount" class="text-xl font-bold">$0</div>
                    </div>

                    <div class="bg-white/10 rounded-xl p-4">
                        <div class="text-xs text-slate-300">Pagado</div>
                        <div id="paidAmount" class="text-xl font-bold">$0</div>
                    </div>

                    <div class="bg-white/10 rounded-xl p-4">
                        <div class="text-xs text-slate-300">Pendiente</div>
                        <div id="pendingAmount" class="text-xl font-bold">$0</div>
                    </div>

                    <div class="bg-white/10 rounded-xl p-4">
                        <div class="text-xs text-slate-300">Vencido</div>
                        <div id="overdueAmount" class="text-xl font-bold">$0</div>
                    </div>

                </div>

            </section>

            <section class="bg-white rounded-2xl border p-4">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div class="w-full lg:max-w-xs">
                        <label class="block text-xs font-medium text-slate-500 mb-1">
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
                        <label class="block text-xs font-medium text-slate-500 mb-1">
                            Buscar alumno
                        </label>

                        <input
                            id="searchFilter"
                            type="text"
                            placeholder="Buscar por nombre, apellido o DNI"
                            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                    </div>
                </div>
            </section>

            <section id="chargesList" class="space-y-3"></section>

        </section>

        ${renderGenerateChargeModal()}
        ${renderEditChargeModal()}

        <div
            id="chargeDetailModal"
            class="fixed inset-0 z-50 hidden p-4"
        >
            <div
                class="absolute inset-0 bg-slate-950/60"
                data-close-charge-detail="true"
            ></div>

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
    if (c.status == 3) {
        return `
            border border-red-200
            bg-red-50/40
            rounded-xl
            p-5
            transition
            hover:shadow-md
            hover:border-red-300
        `;
    }

    if (c.status == 2) {
        return `
            border border-emerald-200
            bg-emerald-50/30
            rounded-xl
            p-5
            transition
            hover:shadow-md
        `;
    }

    return `
        border
        bg-white
        rounded-xl
        p-5
        transition
        hover:shadow-md
    `;
}

function formatDate(value) {
    if (!value)
        return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime()))
        return "-";

    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
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
    return String(status ?? "-");
}

function renderStatus(status) {
    if (status == 1) {
        return `
            <span class="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">
                Pendiente
            </span>
        `;
    }

    if (status == 2) {
        return `
            <span class="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">
                Pagada
            </span>
        `;
    }

    if (status == 3) {
        return `
            <span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                Vencida
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

function renderCharges() {
    const container = document.getElementById("chargesList");
    const filteredCharges = getFilteredCharges();

    if (!filteredCharges.length) {
        container.innerHTML = `
            <div class="bg-white p-6 rounded-xl text-center text-slate-500 border">
                No hay cuotas para los filtros seleccionados
            </div>
        `;
        return;
    }

    container.innerHTML = filteredCharges.map(c => {
        return `
            <div class="${getCardClasses(c)}">

                <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

                    <div class="space-y-1 text-sm">

                        <div class="font-semibold text-slate-900 text-base">
                            ${c.studentFullName || "Sin nombre"}
                        </div>

                        <div class="text-slate-500">
                            DNI: ${c.studentDni ?? "-"}
                        </div>

                        <div class="text-slate-600">
                            ${c.courseName || "-"}
                        </div>

                        <div class="pt-2 text-slate-600 space-y-1">

                            <div>
                                Clases por semana:
                                <span class="font-medium">${c.classesPerWeek ?? "-"}</span>
                            </div>

                            <div>
                                Precio base:
                                ${formatMoney(c.basePrice)}
                            </div>

                            <div>
                                Descuento hermano:
                                - ${formatMoney(c.siblingDiscountAmount)}
                                (${c.siblingDiscountPercent || 0}%)
                            </div>

                            <div class="${c.lateChargeAmount > 0 ? "text-red-600 font-medium" : ""}">
                                Recargo mora:
                                ${formatMoney(c.lateChargeAmount)}
                            </div>

                            <div class="text-slate-500">
                                Vencimiento:
                                ${formatDate(c.dueDateUtc)}
                            </div>

                        </div>

                        <div class="flex flex-wrap gap-2 pt-3">

                            <button
                                onclick="showChargeDetail('${c.id}')"
                                class="text-sm border rounded-lg px-3 py-1.5 hover:bg-slate-50">
                                Ver detalle
                            </button>

${c.status == 2
    ? ``
    : `
        <button
            onclick="openEditChargeModal('${c.id}')"
            class="text-sm border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50">
            Editar
        </button>
    `
}

                            ${c.status == 2
                                ? `
                                    <button
                                        type="button"
                                        class="text-sm border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg px-3 py-1.5 cursor-default">
                                        Pagada
                                    </button>
                                `
                                : `
                                    <button
                                        onclick="openPayModal('${c.id}')"
                                        class="text-sm bg-slate-900 text-white rounded-lg px-3 py-1.5 hover:bg-black">
                                        Registrar pago
                                    </button>
                                `
                            }

                        </div>

                    </div>

                    <div class="text-left md:text-right md:min-w-[180px]">

                        <div class="text-xs uppercase tracking-wide text-slate-500">
                            Total cuota
                        </div>

                        <div class="
                            font-extrabold
                            text-3xl md:text-4xl
                            leading-none
                            mt-1
                            ${c.status == 3 ? "text-red-700" : "text-slate-900"}
                        ">
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
}

function renderSummary() {
    const filteredCharges = getFilteredCharges();

    let total = 0;
    let paid = 0;
    let pending = 0;
    let overdue = 0;

    filteredCharges.forEach(c => {
        const finalAmount = Number(c.finalAmount || 0);

        total += finalAmount;

        if (c.status == 2)
            paid += finalAmount;

        if (c.status == 1)
            pending += finalAmount;

        if (c.status == 3)
            overdue += finalAmount;
    });

    document.getElementById("totalAmount").innerText = formatMoney(total);
    document.getElementById("paidAmount").innerText = formatMoney(paid);
    document.getElementById("pendingAmount").innerText = formatMoney(pending);
    document.getElementById("overdueAmount").innerText = formatMoney(overdue);
}

function renderPayModal() {
    return `
    <div id="payModal"
         class="fixed inset-0 z-50 hidden">

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

                <div class="p-5 space-y-3">
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
    if (paymentMethod == 1) return "Efectivo";
    if (paymentMethod == 2) return "Transferencia";
    return "-";
}

function buildChargeDetailHtml(c) {
    const studentName = c.studentFullName || "Sin nombre";
    const studentDni = c.studentDni || "-";
    const courseName = c.courseName || "-";

    const basePrice = Number(c.basePrice || 0);
    const siblingDiscountAmount = Number(c.siblingDiscountAmount || 0);
    const siblingDiscountPercent = Number(c.siblingDiscountPercent || 0);
    const lateChargeAmount = Number(c.lateChargeAmount || 0);
    const finalAmount = Number(c.finalAmount || 0);


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

                    <div class="flex items-center justify-between px-4 py-3 text-sm">
                        <span class="text-slate-500">Recargo por mora</span>
                        <span class="font-medium text-slate-900">${formatMoney(lateChargeAmount)}</span>
                    </div>

                    <div class="flex items-center justify-between px-4 py-3 text-sm bg-slate-50">
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
    document.getElementById("payModal").classList.remove("hidden");
};

window.closePayModal = function () {
    document.getElementById("payModal").classList.add("hidden");
    selectedChargeId = null;
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

async function loadCharges() {
    charges = await get(
        `/api/admin/${company.slug}/monthly-charges?year=${filters.year}&month=${filters.month}`
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

    document.getElementById("statusFilter").addEventListener("change", () => {
        filters.status = document.getElementById("statusFilter").value;
        renderSummary();
        renderCharges();
    });

    document.getElementById("searchFilter").addEventListener("input", () => {
        filters.search = document.getElementById("searchFilter").value;
        renderSummary();
        renderCharges();
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

document.getElementById("generateStudentSearchInput")?.addEventListener("input", async e => {
    const search = e.target.value.trim();

    if (search.length < 2) {
        students = [];
        renderGenerateStudentResults();
        return;
    }

    try {
        const result = await get(`/api/admin/${company.slug}/students?search=${encodeURIComponent(search)}`);

        const rawStudents = unwrapList(result);

        students = filterStudentsBySearch(rawStudents, search)
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
        if (e.target.id === "payCashBtn") {
            if (!selectedChargeId) return;

            try {
                await post(
                    `/api/admin/${company.slug}/monthly-charges/${selectedChargeId}/pay-manual`,
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
                closePayModal();
                openPaymentSuccessModal(
                    error.message || "No se pudo registrar el pago.",
                    "No se pudo registrar"
                );
            }
        }

        if (e.target.id === "payTransferBtn") {
            if (!selectedChargeId) return;

            try {
                await post(
                    `/api/admin/${company.slug}/monthly-charges/${selectedChargeId}/pay-manual`,
                    {
                        paymentMethod: 2,
                        paymentReference: null,
                        notes: null
                    }
                );

                closePayModal();
                await loadCharges();
                openPaymentSuccessModal("El pago por transferencia fue registrado correctamente.");
            } catch (error) {
                alert(error.message || "No se pudo registrar el pago.");
            }
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
            await loadCoursesAndStudents();
            await loadCharges();
        }
    });

    company = layout.activeCompany;

    bindEvents();

    await loadCoursesAndStudents();
    await loadCharges();
}

init();