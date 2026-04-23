import { get, post } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

let company = null;

let charges = [];
let filters = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    status: "",
    search: ""
};
let selectedChargeId = null;

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
            <span class="px-2 py-1 text-xs rounded-full
                bg-amber-100 text-amber-700">
                Pendiente
            </span>
        `;
    }

    if (status == 2) {
        return `
            <span class="px-2 py-1 text-xs rounded-full
                bg-emerald-100 text-emerald-700">
                Pagada
            </span>
        `;
    }

    if (status == 3) {
        return `
            <span class="px-2 py-1 text-xs rounded-full
                bg-red-100 text-red-700">
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
        const studentName = c.studentFullName || "Sin nombre";
        const studentDni = c.studentDni || "-";
        const courseName = c.courseName || "-";
        const basePrice = Number(c.basePrice || 0);
        const siblingDiscountAmount = Number(c.siblingDiscountAmount || 0);
        const siblingDiscountPercent = Number(c.siblingDiscountPercent || 0);
        const lateChargeAmount = Number(c.lateChargeAmount || 0);
        const finalAmount = Number(c.finalAmount || 0);
        const dueDate = formatDate(c.dueDateUtc);

        return `
            <div class="${getCardClasses(c)}">

    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

        <!-- izquierda -->
        <div class="space-y-1 text-sm">

            <div class="font-semibold text-slate-900 text-base">
                ${c.studentFullName}
            </div>

            <div class="text-slate-500">
                DNI: ${c.studentDni ?? "-"}
            </div>

            <div class="text-slate-600">
                ${c.courseName}
            </div>

            <div class="pt-2 text-slate-600 space-y-1">

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

                <div class="${c.lateChargeAmount > 0 ? "text-red-600 font-medium" : ""}">
                    Recargo mora:
                    ${formatMoney(c.lateChargeAmount)}
                </div>

                <div class="text-slate-500">
                    Vencimiento:
                    ${formatDate(c.dueDateUtc)}
                </div>

            </div>

            <div class="flex gap-2 pt-3">

                <button
                    onclick="showChargeDetail('${c.id}')"
                    class="text-sm border rounded-lg px-3 py-1.5 hover:bg-slate-50">
                    Ver detalle
                </button>

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


        <!-- derecha -->
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

function renderActions(c) {
    if (c.status == 2) {
        return `
            <button class="text-xs text-slate-400 border border-slate-200 px-3 py-2 rounded-lg cursor-default">
                Pagado
            </button>
        `;
    }

    return `
        <button
            onclick="openPayModal('${c.id}')"
            class="text-sm bg-slate-900 text-white rounded-lg px-3 py-1.5 hover:bg-black">
            Registrar pago
        </button>
    `;
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

function getPaymentMethodText(paymentMethod) {
    if (paymentMethod == 1) return "Efectivo";
    if (paymentMethod == 2) return "Transferencia";
    return "-";
}

function closePaymentSuccessModal() {
    const modal = document.getElementById("paymentSuccessModal");

    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
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

window.payCharge = async function (id) {
    const charge = getChargeById(id);

    if (!charge)
        return;

    if (Number(charge.status) === 2) {
        return;
    }

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
            alert(error.message || "No se pudo registrar el pago.");
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
        activeKey: "monthlyCharges",
        pageTitle: "Cuotas",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;
            await loadCharges();
        }
    });

    company = layout.activeCompany;

    bindEvents();

    await loadCharges();
}

init();