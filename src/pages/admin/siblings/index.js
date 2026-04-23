import { get, post } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

let currentCompany = null;

let selectedStudentA = null;
let selectedStudentB = null;
let familyGroup = [];
let allFamilyGroups = [];
let groupedStudentIds = new Set();
let requests = [];
let selectedRequestDetail = null;
let selectedRequestDocuments = [];
let currentRequestFilter = "";

let searchResultsA = [];
let searchResultsB = [];

let searchTimeoutA = null;
let searchTimeoutB = null;

let selectedDocumentPreview = null;
let selectedDocumentPreviewMeta = null;

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value) {
    if (!value) return "-";

    try {
        return new Date(value).toLocaleString("es-AR");
    } catch {
        return "-";
    }
}

function normalizeCompany(company) {
    if (!company) return null;

    return {
        ...company,
        id: company.id || company.companyId || null,
        name: company.name || company.companyName || "",
        slug: company.slug || company.companySlug || "",
        logoUrl: company.logoUrl || ""
    };
}

function getCompanySlug() {
    return currentCompany?.slug || currentCompany?.companySlug || "";
}

function getRequestStatusLabel(status) {
    switch (Number(status)) {
        case 1:
            return "Pendiente";
        case 2:
            return "Documentación solicitada";
        case 3:
            return "En revisión";
        case 4:
            return "Aprobada";
        case 5:
            return "Rechazada";
        case 6:
            return "Cancelada";
        default:
            return "Desconocido";
    }
}

function getRequestStatusClasses(status) {
    switch (Number(status)) {
        case 1:
            return "bg-amber-50 text-amber-700";
        case 2:
            return "bg-orange-50 text-orange-700";
        case 3:
            return "bg-sky-50 text-sky-700";
        case 4:
            return "bg-emerald-50 text-emerald-700";
        case 5:
            return "bg-rose-50 text-rose-700";
        case 6:
            return "bg-slate-100 text-slate-700";
        default:
            return "bg-slate-100 text-slate-700";
    }
}

function rebuildGroupedStudentIds() {
    groupedStudentIds = new Set();

    for (const group of allFamilyGroups) {
        for (const member of group.members || []) {
            if (member?.studentId) {
                groupedStudentIds.add(String(member.studentId));
            }
        }
    }
}

function buildContent() {
    return `
        <section class="space-y-6">

            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 class="text-xl font-semibold">Hermanos</h1>
<p class="text-sm text-slate-500">
    Si no seleccionás un alumno, se muestran todos los grupos familiares de la empresa.
</p>
                </div>

                <div class="flex flex-wrap gap-2">
                    <select
                        id="requestStatusFilter"
                        class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
                    >
                        <option value="">Todos los estados</option>
                        <option value="1">Pendiente</option>
                        <option value="2">Documentación solicitada</option>
                        <option value="3">En revisión</option>
                        <option value="4">Aprobada</option>
                        <option value="5">Rechazada</option>
                        <option value="6">Cancelada</option>
                    </select>

                    <button
                        id="reloadBtn"
                        class="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            <div class="rounded-2xl border bg-white p-5 space-y-5">
                <div>
                    <h2 class="text-base font-semibold text-slate-900">Vincular hermanos</h2>
                    <p class="text-sm text-slate-500">
                        Seleccioná un alumno base y agregá otro alumno a su grupo familiar.
                    </p>
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div class="space-y-2">
                        <label for="searchStudentA" class="block text-sm font-medium text-slate-700">
                            Alumno base
                        </label>

                        <input
                            id="searchStudentA"
                            type="text"
                            class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
                            placeholder="Buscar por DNI, mail o nombre"
                        />

                        <div id="selectedStudentABox" class="hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div class="text-sm font-medium text-slate-900" id="selectedStudentAName"></div>
                            <div class="text-xs text-slate-500" id="selectedStudentADetail"></div>
                        </div>

                        <div
                            id="searchResultsA"
                            class="hidden overflow-hidden rounded-xl border border-slate-200 bg-white"
                        ></div>
                    </div>

                    <div class="space-y-2">
                        <label for="searchStudentB" class="block text-sm font-medium text-slate-700">
                            Agregar al grupo
                        </label>

                        <input
                            id="searchStudentB"
                            type="text"
                            class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
                            placeholder="Buscar por DNI, mail o nombre"
                        />

                        <div id="selectedStudentBBox" class="hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div class="text-sm font-medium text-slate-900" id="selectedStudentBName"></div>
                            <div class="text-xs text-slate-500" id="selectedStudentBDetail"></div>
                        </div>

                        <div
                            id="searchResultsB"
                            class="hidden overflow-hidden rounded-xl border border-slate-200 bg-white"
                        ></div>
                    </div>
                </div>

                <div class="flex flex-wrap gap-2">
                    <button
                        id="linkBtn"
                        type="button"
                        class="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Agregar hermano
                    </button>

                    <button
                        id="clearSelectionBtn"
                        type="button"
                        class="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700"
                    >
                        Limpiar selección
                    </button>
                </div>

                <div id="linkMessage" class="hidden rounded-xl px-4 py-3 text-sm"></div>
            </div>

            <div class="rounded-2xl border bg-white p-5 space-y-4">
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 class="text-base font-semibold text-slate-900">Grupo familiar</h2>
                        <p class="text-sm text-slate-500">
                            Seleccioná un alumno base para ver y administrar su grupo actual.
                        </p>
                    </div>

                    <div id="familyGroupActions" class="hidden">
                        <button
                            id="breakGroupBtn"
                            type="button"
                            class="rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                        >
                            Romper grupo
                        </button>
                    </div>
                </div>

                <div id="familyGroupContent" class="text-sm text-slate-500">
                    Seleccioná un alumno para ver su grupo familiar.
                </div>
            </div>

            <div class="rounded-2xl border bg-white p-5 space-y-4">
                <div>
                    <h2 class="text-base font-semibold text-slate-900">Solicitudes</h2>
                    <p class="text-sm text-slate-500">
                        Revisá y procesá solicitudes de vinculación.
                    </p>
                </div>

                <div id="requestsContent" class="text-sm text-slate-500">
                    Cargando...
                </div>
            </div>

        </section>

    ${renderConfirmModal()}
    ${renderRequestDetailModal()}
    ${renderDocumentPreviewModal()}
    ${renderReviewModal()}
    `;
}

function renderDocumentPreviewModal() {
    return `
        <div id="documentPreviewModal" class="fixed inset-0 z-[95] hidden">
            <div class="absolute inset-0 bg-slate-950/70"></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
                        <div class="min-w-0">
                            <h3 class="truncate text-lg font-semibold text-slate-900">Vista previa de documento</h3>
                            <p id="documentPreviewTitle" class="truncate text-sm text-slate-500">-</p>
                        </div>

                        <div class="flex items-center gap-2">
                            <a
                                id="downloadDocumentBtn"
                                href="#"
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                class="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Descargar
                            </a>

                            <button
                                id="closeDocumentPreviewModalBtn"
                                type="button"
                                class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <div id="documentPreviewModalBody" class="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
                        <div class="flex h-full items-center justify-center text-sm text-slate-500">
                            Cargando documento...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderConfirmModal() {
    return `
        <div id="confirmModal" class="fixed inset-0 z-[70] hidden">
            <div class="absolute inset-0 bg-slate-950/60"></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div class="border-b border-slate-200 px-6 py-5">
                        <h3 id="confirmModalTitle" class="text-lg font-semibold text-slate-900">
                            Confirmar acción
                        </h3>

                        <p id="confirmModalMessage" class="mt-2 text-sm leading-6 text-slate-500">
                            ¿Querés continuar?
                        </p>
                    </div>

                    <div class="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
                        <button
                            id="confirmModalCancelBtn"
                            type="button"
                            class="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>

                        <button
                            id="confirmModalConfirmBtn"
                            type="button"
                            class="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderRequestDetailModal() {
    return `
        <div id="requestDetailModal" class="fixed inset-0 z-[80] hidden">
            <div class="absolute inset-0 bg-slate-950/60"></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                        <div>
                            <h3 class="text-lg font-semibold text-slate-900">Detalle de solicitud</h3>
                            <p class="mt-1 text-sm text-slate-500">
                                Revisá participantes, notas y documentación adjunta.
                            </p>
                        </div>

                        <button
                            id="closeRequestDetailModalBtn"
                            type="button"
                            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                            ✕
                        </button>
                    </div>

                    <div id="requestDetailModalBody" class="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-500">
                        Cargando...
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderReviewModal() {
    return `
        <div id="reviewModal" class="fixed inset-0 z-[90] hidden">
            <div class="absolute inset-0 bg-slate-950/60"></div>

            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div class="border-b border-slate-200 px-6 py-5">
                        <h3 id="reviewModalTitle" class="text-lg font-semibold text-slate-900">Procesar solicitud</h3>
                        <p id="reviewModalDescription" class="mt-1 text-sm text-slate-500"></p>
                    </div>

                    <div class="px-6 py-5">
                        <label for="reviewNote" class="mb-2 block text-sm font-medium text-slate-700">
                            Nota
                        </label>

                        <textarea
                            id="reviewNote"
                            rows="5"
                            class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                            placeholder="Escribí una nota para esta acción."
                        ></textarea>

                        <p id="reviewError" class="mt-3 hidden text-sm text-rose-600"></p>
                    </div>

                    <div class="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
                        <button
                            id="reviewModalCancelBtn"
                            type="button"
                            class="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>

                        <button
                            id="reviewModalConfirmBtn"
                            type="button"
                            class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function openConfirmModal({
    title,
    message,
    confirmText = "Confirmar",
    confirmVariant = "danger"
}) {
    return new Promise((resolve) => {
        const modal = document.getElementById("confirmModal");
        const titleEl = document.getElementById("confirmModalTitle");
        const messageEl = document.getElementById("confirmModalMessage");
        const cancelBtn = document.getElementById("confirmModalCancelBtn");
        const confirmBtn = document.getElementById("confirmModalConfirmBtn");

        if (!modal || !titleEl || !messageEl || !cancelBtn || !confirmBtn) {
            resolve(false);
            return;
        }

        titleEl.textContent = title || "Confirmar acción";
        messageEl.textContent = message || "¿Querés continuar?";
        confirmBtn.textContent = confirmText;

        confirmBtn.className =
            "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white";

        if (confirmVariant === "danger") {
            confirmBtn.classList.add("bg-rose-600", "hover:bg-rose-700");
        } else {
            confirmBtn.classList.add("bg-slate-900", "hover:bg-black");
        }

        const close = (result) => {
            modal.classList.add("hidden");
            document.body.classList.remove("overflow-hidden");
            cancelBtn.onclick = null;
            confirmBtn.onclick = null;
            resolve(result);
        };

        cancelBtn.onclick = () => close(false);
        confirmBtn.onclick = () => close(true);

        modal.classList.remove("hidden");
        document.body.classList.add("overflow-hidden");
    });
}

function openReviewModal({
    title,
    description,
    confirmText,
    confirmVariant = "primary",
    requireNote = false,
    defaultNote = ""
}) {
    return new Promise((resolve) => {
        const modal = document.getElementById("reviewModal");
        const titleEl = document.getElementById("reviewModalTitle");
        const descriptionEl = document.getElementById("reviewModalDescription");
        const noteEl = document.getElementById("reviewNote");
        const errorEl = document.getElementById("reviewError");
        const cancelBtn = document.getElementById("reviewModalCancelBtn");
        const confirmBtn = document.getElementById("reviewModalConfirmBtn");

        if (!modal || !titleEl || !descriptionEl || !noteEl || !errorEl || !cancelBtn || !confirmBtn) {
            resolve(null);
            return;
        }

        titleEl.textContent = title || "Procesar solicitud";
        descriptionEl.textContent = description || "";
        noteEl.value = defaultNote || "";
        errorEl.classList.add("hidden");
        errorEl.textContent = "";
        confirmBtn.textContent = confirmText || "Confirmar";

        confirmBtn.className =
            "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white";

        if (confirmVariant === "danger") {
            confirmBtn.classList.add("bg-rose-600", "hover:bg-rose-700");
        } else if (confirmVariant === "warning") {
            confirmBtn.classList.add("bg-orange-600", "hover:bg-orange-700");
        } else {
            confirmBtn.classList.add("bg-slate-900", "hover:bg-black");
        }

        const close = (result) => {
            modal.classList.add("hidden");
            document.body.classList.remove("overflow-hidden");
            cancelBtn.onclick = null;
            confirmBtn.onclick = null;
            resolve(result);
        };

        cancelBtn.onclick = () => close(null);
        confirmBtn.onclick = () => {
            const note = noteEl.value.trim();

            if (requireNote && !note) {
                errorEl.textContent = "Debés completar una nota.";
                errorEl.classList.remove("hidden");
                return;
            }

            close({ note });
        };

        modal.classList.remove("hidden");
        document.body.classList.add("overflow-hidden");
    });
}

function showLinkMessage(message, type = "info") {
    const box = document.getElementById("linkMessage");
    if (!box) return;

    box.classList.remove(
        "hidden",
        "bg-emerald-50",
        "text-emerald-700",
        "bg-rose-50",
        "text-rose-700",
        "bg-slate-100",
        "text-slate-700"
    );

    if (type === "success") {
        box.classList.add("bg-emerald-50", "text-emerald-700");
    } else if (type === "error") {
        box.classList.add("bg-rose-50", "text-rose-700");
    } else {
        box.classList.add("bg-slate-100", "text-slate-700");
    }

    box.textContent = message;
}

function clearLinkMessage() {
    const box = document.getElementById("linkMessage");
    if (!box) return;

    box.className = "hidden rounded-xl px-4 py-3 text-sm";
    box.textContent = "";
}

function renderSelectedStudents() {
    const aBox = document.getElementById("selectedStudentABox");
    const aName = document.getElementById("selectedStudentAName");
    const aDetail = document.getElementById("selectedStudentADetail");

    const bBox = document.getElementById("selectedStudentBBox");
    const bName = document.getElementById("selectedStudentBName");
    const bDetail = document.getElementById("selectedStudentBDetail");

    if (aBox && aName && aDetail) {
        if (selectedStudentA) {
            aBox.classList.remove("hidden");
            aName.textContent = selectedStudentA.fullName || "-";
            aDetail.textContent = `${selectedStudentA.dni || "-"}${selectedStudentA.email ? " · " + selectedStudentA.email : ""}`;
        } else {
            aBox.classList.add("hidden");
            aName.textContent = "";
            aDetail.textContent = "";
        }
    }

    if (bBox && bName && bDetail) {
        if (selectedStudentB) {
            bBox.classList.remove("hidden");
            bName.textContent = selectedStudentB.fullName || "-";
            bDetail.textContent = `${selectedStudentB.dni || "-"}${selectedStudentB.email ? " · " + selectedStudentB.email : ""}`;
        } else {
            bBox.classList.add("hidden");
            bName.textContent = "";
            bDetail.textContent = "";
        }
    }

    const linkBtn = document.getElementById("linkBtn");
    if (linkBtn) {
        linkBtn.disabled = !selectedStudentA || !selectedStudentB;
    }
}

function renderSearchResults(target) {
    const container = document.getElementById(target === "A" ? "searchResultsA" : "searchResultsB");
    const data = target === "A" ? searchResultsA : searchResultsB;

    if (!container) return;

    if (!data.length) {
        container.classList.add("hidden");
        container.innerHTML = "";
        return;
    }

    container.classList.remove("hidden");
    container.innerHTML = data.map(item => `
        <button
            type="button"
            class="search-result-item flex w-full flex-col border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
            data-target="${target}"
            data-id="${item.studentId}"
        >
            <span class="text-sm font-medium text-slate-900">${escapeHtml(item.fullName)}</span>
            <span class="text-xs text-slate-500">
                ${escapeHtml(item.dni || "-")}
                ${item.email ? ` · ${escapeHtml(item.email)}` : ""}
            </span>
        </button>
    `).join("");

    container.querySelectorAll(".search-result-item").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            const list = btn.dataset.target === "A" ? searchResultsA : searchResultsB;
            const item = list.find(x => String(x.studentId) === String(id));
            if (!item) return;

            if (btn.dataset.target === "A") {
                selectedStudentA = item;

                const searchInputA = document.getElementById("searchStudentA");
                if (searchInputA) {
                    searchInputA.value = item.fullName || "";
                }

                searchResultsA = [];
                selectedStudentB = null;
                searchResultsB = [];
                familyGroup = [];

                const searchInputB = document.getElementById("searchStudentB");
                if (searchInputB) {
                    searchInputB.value = "";
                }

                renderSearchResults("A");
                renderSearchResults("B");
                renderSelectedStudents();
                renderFamilyGroup();
                clearLinkMessage();

                await loadFamilyGroup(item.studentId);
            } else {
                selectedStudentB = item;

                const searchInputB = document.getElementById("searchStudentB");
                if (searchInputB) {
                    searchInputB.value = item.fullName || "";
                }

                searchResultsB = [];
                renderSearchResults("B");
                renderSelectedStudents();
                clearLinkMessage();
            }
        });
    });
}

async function searchStudents(query, target) {
    const value = String(query || "").trim();

    if (value.length < 2) {
        if (target === "A") {
            searchResultsA = [];
        } else {
            searchResultsB = [];
        }

        renderSearchResults(target);
        return;
    }

    const excludeStudentId =
        target === "A"
            ? selectedStudentB?.studentId
            : selectedStudentA?.studentId;

    const params = new URLSearchParams();
    params.set("q", value);

    if (excludeStudentId) {
        params.set("excludeStudentId", excludeStudentId);
    }

    const result = await get(
        `/api/admin/${getCompanySlug()}/students/sibling-links/search-students?${params.toString()}`
    );

    if (target === "A") {
        searchResultsA = result || [];
    } else {
        searchResultsB = result || [];
    }

    renderSearchResults(target);
}

function renderFamilyGroup() {
    const container = document.getElementById("familyGroupContent");
    const actions = document.getElementById("familyGroupActions");

    if (!container || !actions) return;

    actions.classList.add("hidden");

if (!selectedStudentA) {
    if (!allFamilyGroups.length) {
        container.innerHTML = `
            <div class="text-sm text-slate-500">
                No hay grupos familiares creados.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="space-y-4">
            ${allFamilyGroups.map(group => `
                <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div class="mb-3 text-sm font-semibold text-slate-900">
                        Grupo familiar
                    </div>

                    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-50">
                                <tr>
                                    <th class="px-4 py-3 text-left">Alumno</th>
                                    <th class="px-4 py-3 text-left">DNI</th>
                                    <th class="px-4 py-3 text-left">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(group.members || []).map(member => `
                                    <tr class="border-t">
                                        <td class="px-4 py-3">
                                            <div class="font-medium text-slate-900">${escapeHtml(member.fullName)}</div>
                                        </td>
                                        <td class="px-4 py-3">${escapeHtml(member.dni || "-")}</td>
                                        <td class="px-4 py-3">
                                            ${member.isActive
                                                ? `<span class="text-emerald-600">Activo</span>`
                                                : `<span class="text-rose-600">Inactivo</span>`
                                            }
                                        </td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            `).join("")}
        </div>
    `;

    return;
}

    if (!familyGroup.length) {
        container.innerHTML = `
            <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                El alumno no tiene hermanos vinculados.
            </div>
        `;
        return;
    }

    actions.classList.remove("hidden");

    container.innerHTML = `
        <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div class="mb-4 flex flex-col gap-1">
                <div class="text-sm font-semibold text-slate-900">
                    Grupo familiar actual
                </div>
                <div class="text-xs text-slate-500">
                    Integrantes del mismo grupo. Podés quitar un integrante o romper el grupo completo.
                </div>
            </div>

            <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-50">
                        <tr>
                            <th class="px-4 py-3 text-left">Alumno</th>
                            <th class="px-4 py-3 text-left">DNI</th>
                            <th class="px-4 py-3 text-left">Estado</th>
                            <th class="px-4 py-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${familyGroup.map(member => `
                            <tr class="border-t ${selectedStudentA && member.studentId === selectedStudentA.studentId ? "bg-amber-50/50" : ""}">
                                <td class="px-4 py-3">
                                    <div class="font-medium text-slate-900">${escapeHtml(member.fullName)}</div>
                                    ${selectedStudentA && member.studentId === selectedStudentA.studentId
                                        ? `<div class="text-xs text-amber-700">Alumno base</div>`
                                        : ""
                                    }
                                </td>
                                <td class="px-4 py-3">${escapeHtml(member.dni || "-")}</td>
                                <td class="px-4 py-3">
                                    ${member.isActive
                                        ? `<span class="text-emerald-600">Activo</span>`
                                        : `<span class="text-rose-600">Inactivo</span>`
                                    }
                                </td>
                                <td class="px-4 py-3 text-right">
                                    ${selectedStudentA && member.studentId !== selectedStudentA.studentId
                                        ? `
                                            <button
                                                type="button"
                                                class="unlinkBtn rounded-lg border border-rose-300 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                                                data-id="${member.studentId}"
                                            >
                                                Quitar del grupo
                                            </button>
                                        `
                                        : `
                                            <span class="text-xs text-slate-400">-</span>
                                        `
                                    }
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.querySelectorAll(".unlinkBtn").forEach(btn => {
        btn.addEventListener("click", async () => {
            await unlinkStudent(btn.dataset.id);
        });
    });

    document.getElementById("breakGroupBtn")?.addEventListener("click", async () => {
        await breakFamilyGroup();
    });
}

function renderRequests() {
    const container = document.getElementById("requestsContent");
    if (!container) return;

    if (!requests.length) {
        container.innerHTML = `
            <div class="text-sm text-slate-500">
                No hay solicitudes para mostrar.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="overflow-hidden rounded-2xl border border-slate-200">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50">
                    <tr>
                        <th class="px-4 py-3 text-left">Solicita</th>
                        <th class="px-4 py-3 text-left">Destino</th>
                        <th class="px-4 py-3 text-left">Estado</th>
                        <th class="px-4 py-3 text-left">Fecha</th>
                        <th class="px-4 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${requests.map(item => `
                        <tr class="border-t">
                            <td class="px-4 py-3">
                                <div class="font-medium text-slate-900">${escapeHtml(item.requestedByStudentFullName)}</div>
                                <div class="text-xs text-slate-500">${escapeHtml(item.requestedByDni || "-")}</div>
                            </td>
                            <td class="px-4 py-3">
                                <div class="font-medium text-slate-900">${escapeHtml(item.targetStudentFullName)}</div>
                                <div class="text-xs text-slate-500">${escapeHtml(item.targetDni || "-")}</div>
                            </td>
                            <td class="px-4 py-3">
                                <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRequestStatusClasses(item.status)}">
                                    ${escapeHtml(getRequestStatusLabel(item.status))}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-slate-600">
                                ${item.createdAtUtc ? new Date(item.createdAtUtc).toLocaleString("es-AR") : "-"}
                            </td>
                            <td class="px-4 py-3">
                            <div class="flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    class="viewRequestBtn rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                    data-id="${item.id}"
                                >
                                    Ver detalle
                                </button>

                                ${
                                    groupedStudentIds.has(String(item.requestedByStudentId)) || groupedStudentIds.has(String(item.targetStudentId))
                                        ? `
                                            <button
                                                type="button"
                                                class="viewGroupBtn rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                                data-requested-id="${item.requestedByStudentId || ""}"
                                                data-target-id="${item.targetStudentId || ""}"
                                            >
                                                Ver grupo
                                            </button>
                                        `
                                        : ""
                                }

                                    ${
                                        Number(item.status) !== 4 && Number(item.status) !== 5
                                            ? `
                                                <button
                                                    type="button"
                                                    class="requestDocumentsBtn rounded-lg border border-orange-300 px-3 py-1.5 text-xs text-orange-700 hover:bg-orange-50"
                                                    data-id="${item.id}"
                                                >
                                                    Pedir docs
                                                </button>

                                                <button
                                                    type="button"
                                                    class="approveRequestBtn rounded-lg border border-emerald-300 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
                                                    data-id="${item.id}"
                                                >
                                                    Aprobar
                                                </button>

                                                <button
                                                    type="button"
                                                    class="rejectRequestBtn rounded-lg border border-rose-300 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                                                    data-id="${item.id}"
                                                >
                                                    Rechazar
                                                </button>
                                            `
                                            : ""
                                    }
                                </div>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;

    container.querySelectorAll(".viewRequestBtn").forEach(btn => {
        btn.addEventListener("click", async () => {
            await openRequestDetail(btn.dataset.id);
        });
    });

    container.querySelectorAll(".viewGroupBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
        const requestedId = btn.dataset.requestedId;
        const targetId = btn.dataset.targetId;

        const studentIdToLoad = groupedStudentIds.has(String(requestedId))
            ? requestedId
            : targetId;

        if (!studentIdToLoad) return;

        const groups = await loadFamilyGroups(studentIdToLoad);
        const members = groups?.[0]?.members || [];

        const baseStudent =
            members.find(x => String(x.studentId) === String(studentIdToLoad))
            || members[0]
            || null;

        selectedStudentA = baseStudent;
        familyGroup = members;

        const searchInputA = document.getElementById("searchStudentA");
        if (searchInputA) {
            searchInputA.value = baseStudent?.fullName || "";
        }

        renderSelectedStudents();
        renderFamilyGroup();
        clearLinkMessage();
    });
});

    container.querySelectorAll(".requestDocumentsBtn").forEach(btn => {
        btn.addEventListener("click", async () => {
            await requestDocuments(btn.dataset.id);
        });
    });

    container.querySelectorAll(".approveRequestBtn").forEach(btn => {
        btn.addEventListener("click", async () => {
            await approveRequest(btn.dataset.id);
        });
    });

    container.querySelectorAll(".rejectRequestBtn").forEach(btn => {
        btn.addEventListener("click", async () => {
            await rejectRequest(btn.dataset.id);
        });
    });
}

function renderRequestDetailBody() {
    const container = document.getElementById("requestDetailModalBody");
    if (!container) return;

    if (!selectedRequestDetail) {
        container.innerHTML = `<div class="text-sm text-slate-500">No se pudo cargar el detalle.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="space-y-6">
            <section class="grid gap-4 lg:grid-cols-2">
                <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Solicita</div>
                    <div class="mt-3 text-sm font-semibold text-slate-900">${escapeHtml(selectedRequestDetail.requestedByStudentFullName || "-")}</div>
                    <div class="mt-1 text-xs text-slate-500">DNI: ${escapeHtml(selectedRequestDetail.requestedByDni || "-")}</div>
                </article>

                <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Destino</div>
                    <div class="mt-3 text-sm font-semibold text-slate-900">${escapeHtml(selectedRequestDetail.targetStudentFullName || "-")}</div>
                    <div class="mt-1 text-xs text-slate-500">DNI: ${escapeHtml(selectedRequestDetail.targetDni || "-")}</div>
                </article>
            </section>

            <section class="grid gap-4 md:grid-cols-3">
                <article class="rounded-2xl border border-slate-200 bg-white p-4">
                    <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Estado</div>
                    <div class="mt-3">
                        <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRequestStatusClasses(selectedRequestDetail.status)}">
                            ${escapeHtml(getRequestStatusLabel(selectedRequestDetail.status))}
                        </span>
                    </div>
                </article>

                <article class="rounded-2xl border border-slate-200 bg-white p-4">
                    <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Creada</div>
                    <div class="mt-3 text-sm font-medium text-slate-900">
                        ${escapeHtml(formatDate(selectedRequestDetail.createdAtUtc))}
                    </div>
                </article>

                <article class="rounded-2xl border border-slate-200 bg-white p-4">
                    <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Revisada</div>
                    <div class="mt-3 text-sm font-medium text-slate-900">
                        ${escapeHtml(formatDate(selectedRequestDetail.reviewedAtUtc))}
                    </div>
                </article>
            </section>

            ${
                selectedRequestDetail.note
                    ? `
                        <section class="rounded-2xl border border-slate-200 bg-white p-4">
                            <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Nota original</div>
                            <div class="mt-3 text-sm leading-6 text-slate-700">
                                ${escapeHtml(selectedRequestDetail.note)}
                            </div>
                        </section>
                    `
                    : ""
            }

            ${
                selectedRequestDetail.documentsRequestNote
                    ? `
                        <section class="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                            <div class="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">Documentación solicitada</div>
                            <div class="mt-3 text-sm leading-6 text-orange-800">
                                ${escapeHtml(selectedRequestDetail.documentsRequestNote)}
                            </div>
                        </section>
                    `
                    : ""
            }

            ${
                selectedRequestDetail.adminReviewNote
                    ? `
                        <section class="rounded-2xl border border-slate-200 bg-white p-4">
                            <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Nota del administrador</div>
                            <div class="mt-3 text-sm leading-6 text-slate-700">
                                ${escapeHtml(selectedRequestDetail.adminReviewNote)}
                            </div>
                        </section>
                    `
                    : ""
            }

            <section class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <div class="text-sm font-semibold text-slate-900">Documentos adjuntos</div>
                        <div class="text-xs text-slate-500">
                            ${selectedRequestDocuments.length} archivo(s)
                        </div>
                    </div>
                </div>

                ${
                    !selectedRequestDocuments.length
                        ? `
                            <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                                No hay documentación cargada.
                            </div>
                        `
                        : `
                            <div class="space-y-3">
                                ${selectedRequestDocuments.map(doc => `
                                    <div class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div class="min-w-0">
                                            <div class="truncate text-sm font-medium text-slate-900">${escapeHtml(doc.fileName || "-")}</div>
                                            <div class="mt-1 text-xs text-slate-500">
                                                ${doc.isPdf ? "PDF" : doc.isImage ? "Imagen" : "Archivo"} · ${escapeHtml(formatDate(doc.uploadedAtUtc))}
                                            </div>
                                        </div>

                                        <div class="flex shrink-0 gap-2">
                                            <button
                                                type="button"
                                                class="viewDocumentBtn rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-white"
                                                data-id="${doc.id}"
                                            >
                                                Ver
                                            </button>
                                        </div>
                                    </div>
                                `).join("")}
                            </div>
                        `
                }
            </section>
        </div>
    `;

    container.querySelectorAll(".viewDocumentBtn").forEach(btn => {
        btn.addEventListener("click", async () => {
            await viewRequestDocument(btn.dataset.id);
        });
    });
}

async function loadFamilyGroups(studentId = null) {
    let url = `/api/admin/${getCompanySlug()}/students/sibling-links/family-groups`;

    if (studentId) {
        url += `?studentId=${encodeURIComponent(studentId)}`;
    }

    const result = await get(url);

    return result?.groups || [];
}

async function loadFamilyGroup(studentId) {
    if (!studentId) {
        familyGroup = [];
        renderFamilyGroup();
        return;
    }

    const groups = await loadFamilyGroups(studentId);
    familyGroup = groups?.[0]?.members || [];
    renderFamilyGroup();
}

async function loadRequests() {
    const query = currentRequestFilter
        ? `?status=${encodeURIComponent(currentRequestFilter)}`
        : "";

    requests = await get(
        `/api/admin/${getCompanySlug()}/students/sibling-links/requests${query}`
    );

    renderRequests();
}

async function loadRequestDetail(requestId) {
    selectedRequestDetail = await get(
        `/api/admin/${getCompanySlug()}/students/sibling-links/requests/${requestId}`
    );
}

async function loadRequestDocuments(requestId) {
    selectedRequestDocuments = await get(
        `/api/admin/${getCompanySlug()}/students/sibling-links/requests/${requestId}/documents`
    );
}

async function openRequestDetail(requestId) {
    const modal = document.getElementById("requestDetailModal");
    const body = document.getElementById("requestDetailModalBody");

    if (!modal || !body) return;

    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    body.innerHTML = `<div class="text-sm text-slate-500">Cargando detalle...</div>`;

    try {
        await Promise.all([
            loadRequestDetail(requestId),
            loadRequestDocuments(requestId)
        ]);

        renderRequestDetailBody();
    } catch (error) {
        body.innerHTML = `
            <div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                ${escapeHtml(error?.message || "No se pudo cargar el detalle de la solicitud.")}
            </div>
        `;
    }
}

function closeRequestDetail() {
    const modal = document.getElementById("requestDetailModal");
    if (!modal) return;

    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    selectedRequestDetail = null;
    selectedRequestDocuments = [];
}

function openDocumentPreviewModal() {
    const modal = document.getElementById("documentPreviewModal");
    if (!modal) return;

    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

function closeDocumentPreviewModal() {
    const modal = document.getElementById("documentPreviewModal");
    const body = document.getElementById("documentPreviewModalBody");
    const title = document.getElementById("documentPreviewTitle");
    const downloadBtn = document.getElementById("downloadDocumentBtn");

    if (modal) {
        modal.classList.add("hidden");
    }

    if (body) {
        body.innerHTML = `
            <div class="flex h-full items-center justify-center text-sm text-slate-500">
                Cargando documento...
            </div>
        `;
    }

    if (title) {
        title.textContent = "-";
    }

    if (downloadBtn) {
        downloadBtn.href = "#";
    }

    selectedDocumentPreview = null;
    selectedDocumentPreviewMeta = null;
    document.body.classList.remove("overflow-hidden");
}

function renderDocumentPreviewContent(url, doc) {
    const body = document.getElementById("documentPreviewModalBody");
    const title = document.getElementById("documentPreviewTitle");
    const downloadBtn = document.getElementById("downloadDocumentBtn");

    if (!body || !title || !downloadBtn) return;

    title.textContent = doc?.fileName || "Documento";
    downloadBtn.href = url;

    if (doc?.isImage) {
        body.innerHTML = `
            <div class="flex h-full items-center justify-center">
                <img
                    src="${escapeHtml(url)}"
                    alt="${escapeHtml(doc?.fileName || "Documento")}"
                    class="max-h-full max-w-full rounded-xl object-contain shadow-sm"
                />
            </div>
        `;
        return;
    }

    if (doc?.isPdf) {
        body.innerHTML = `
            <iframe
                src="${escapeHtml(url)}"
                class="h-full w-full rounded-xl bg-white"
                title="${escapeHtml(doc?.fileName || "PDF")}"
            ></iframe>
        `;
        return;
    }

    body.innerHTML = `
        <div class="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div class="text-sm text-slate-600">
                No hay vista previa disponible para este archivo.
            </div>

            <a
                href="${escapeHtml(url)}"
                target="_blank"
                rel="noopener noreferrer"
                download
                class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
            >
                Descargar archivo
            </a>
        </div>
    `;
}

async function viewRequestDocument(documentId) {
    if (!selectedRequestDetail?.id) return;

    const doc = selectedRequestDocuments.find(x => String(x.id) === String(documentId));

    try {
        openDocumentPreviewModal();

        const body = document.getElementById("documentPreviewModalBody");
        if (body) {
            body.innerHTML = `
                <div class="flex h-full items-center justify-center text-sm text-slate-500">
                    Cargando documento...
                </div>
            `;
        }

        const result = await get(
            `/api/admin/${getCompanySlug()}/students/sibling-links/requests/${selectedRequestDetail.id}/documents/${documentId}/view`
        );

        if (!result?.url) {
            throw new Error("No se pudo obtener el documento.");
        }

        selectedDocumentPreview = result.url;
        selectedDocumentPreviewMeta = doc || null;

        renderDocumentPreviewContent(result.url, doc);
    } catch (error) {
        closeDocumentPreviewModal();
        showLinkMessage(error?.message || "No se pudo abrir el documento.", "error");
    }
}

async function linkStudents() {
    clearLinkMessage();

    if (!selectedStudentA || !selectedStudentB) {
        showLinkMessage("Seleccioná ambos alumnos.", "error");
        return;
    }

    if (selectedStudentA.studentId === selectedStudentB.studentId) {
        showLinkMessage("No podés vincular el mismo alumno con sí mismo.", "error");
        return;
    }

    try {
        await post(
            `/api/admin/${getCompanySlug()}/students/sibling-links/link`,
            {
                studentId: selectedStudentA.studentId,
                siblingStudentId: selectedStudentB.studentId
            }
        );

        const linkedStudentName = selectedStudentB.fullName || "el alumno seleccionado";

        await loadFamilyGroup(selectedStudentA.studentId);
        await loadRequests();

        allFamilyGroups = await loadFamilyGroups();
        rebuildGroupedStudentIds();

        selectedStudentB = null;
        searchResultsB = [];

        const searchInputB = document.getElementById("searchStudentB");
        if (searchInputB) {
            searchInputB.value = "";
        }

        renderSearchResults("B");
        renderSelectedStudents();

        showLinkMessage(`Hermano agregado correctamente: ${linkedStudentName}.`, "success");
    } catch (error) {
        showLinkMessage(error?.message || "No se pudo vincular a los alumnos.", "error");
    }
}

async function unlinkStudent(studentId) {
    if (!selectedStudentA?.studentId) return;

    const member = familyGroup.find(x => x.studentId === studentId);
    const memberName = member?.fullName || "el alumno seleccionado";

    if (familyGroup.length <= 2) {
        const confirmedBreak = await openConfirmModal({
            title: "Romper grupo",
            message: `Este grupo tiene 2 integrantes. Si quitás a ${memberName}, se rompe el grupo completo. ¿Querés continuar?`,
            confirmText: "Romper grupo"
        });

        if (!confirmedBreak) return;

        await breakFamilyGroup();
        return;
    }

    const confirmed = await openConfirmModal({
        title: "Quitar del grupo",
        message: `¿Querés quitar a ${memberName} del grupo familiar?`,
        confirmText: "Quitar",
        confirmVariant: "danger"
    });

    if (!confirmed) return;

    try {
        await post(
            `/api/admin/${getCompanySlug()}/students/sibling-links/student/unlink`,
            {
                studentId
            }
        );

        await loadFamilyGroup(selectedStudentA.studentId);

        allFamilyGroups = await loadFamilyGroups();
rebuildGroupedStudentIds();
renderRequests();

        showLinkMessage(`${memberName} fue quitado del grupo familiar.`, "success");
    } catch (error) {
        showLinkMessage(error?.message || "No se pudo quitar al alumno del grupo.", "error");
    }
}

async function breakFamilyGroup() {
    if (!selectedStudentA?.studentId || !familyGroup.length) return;

    const confirmed = await openConfirmModal({
        title: "Romper grupo",
        message: "Se van a desvincular todos los integrantes del grupo. ¿Querés continuar?",
        confirmText: "Romper grupo",
        confirmVariant: "danger"
    });

    if (!confirmed) return;

    try {
        await post(
            `/api/admin/${getCompanySlug()}/students/sibling-links/family-group/break`,
            {
                studentId: selectedStudentA.studentId
            }
        );

        await loadFamilyGroup(selectedStudentA.studentId);

        allFamilyGroups = await loadFamilyGroups();
rebuildGroupedStudentIds();
renderRequests();

        showLinkMessage("El grupo familiar fue eliminado correctamente.", "success");
    } catch (error) {
        showLinkMessage(error?.message || "No se pudo eliminar el grupo familiar.", "error");
    }
}

async function requestDocuments(requestId) {
    const result = await openReviewModal({
        title: "Solicitar documentación",
        description: "Indicá qué documentación debe presentar el alumno para continuar con la revisión.",
        confirmText: "Solicitar documentación",
        confirmVariant: "warning",
        requireNote: true
    });

    if (!result) return;

    try {
        await post(
            `/api/admin/${getCompanySlug()}/students/sibling-links/requests/${requestId}/request-documents`,
            {
                note: result.note
            }
        );

        await loadRequests();

        allFamilyGroups = await loadFamilyGroups();
rebuildGroupedStudentIds();
renderRequests();

        if (selectedRequestDetail?.id === requestId) {
            await Promise.all([
                loadRequestDetail(requestId),
                loadRequestDocuments(requestId)
            ]);
            renderRequestDetailBody();
        }

        showLinkMessage("Se solicitó documentación correctamente.", "success");
    } catch (error) {
        showLinkMessage(error?.message || "No se pudo solicitar documentación.", "error");
    }
}

async function approveRequest(requestId) {
    const result = await openReviewModal({
        title: "Aprobar solicitud",
        description: "Podés dejar una nota opcional para registrar la aprobación.",
        confirmText: "Aprobar",
        confirmVariant: "primary",
        requireNote: false
    });

    if (!result) return;

    try {
        await post(
            `/api/admin/${getCompanySlug()}/students/sibling-links/requests/${requestId}/approve`,
            {
                note: result.note || null
            }
        );

        await loadRequests();

        allFamilyGroups = await loadFamilyGroups();
rebuildGroupedStudentIds();

        if (selectedStudentA?.studentId) {
            await loadFamilyGroup(selectedStudentA.studentId);
        }

        if (selectedRequestDetail?.id === requestId) {
            await Promise.all([
                loadRequestDetail(requestId),
                loadRequestDocuments(requestId)
            ]);
            renderRequestDetailBody();
        }
renderRequests();
        showLinkMessage("Solicitud aprobada correctamente.", "success");
    } catch (error) {
        showLinkMessage(error?.message || "No se pudo aprobar la solicitud.", "error");
    }
}

async function rejectRequest(requestId) {
    const result = await openReviewModal({
        title: "Rechazar solicitud",
        description: "Podés dejar una nota explicando el rechazo.",
        confirmText: "Rechazar",
        confirmVariant: "danger",
        requireNote: false
    });

    if (!result) return;

    try {
        await post(
            `/api/admin/${getCompanySlug()}/students/sibling-links/requests/${requestId}/reject`,
            {
                note: result.note || null
            }
        );

        await loadRequests();

        allFamilyGroups = await loadFamilyGroups();
rebuildGroupedStudentIds();
renderRequests();

        if (selectedRequestDetail?.id === requestId) {
            await Promise.all([
                loadRequestDetail(requestId),
                loadRequestDocuments(requestId)
            ]);
            renderRequestDetailBody();
        }

        showLinkMessage("Solicitud rechazada correctamente.", "success");
    } catch (error) {
        showLinkMessage(error?.message || "No se pudo rechazar la solicitud.", "error");
    }
}

function clearSelections(options = {}) {
    const clearStudentA = options.clearStudentA ?? false;
    const clearStudentB = options.clearStudentB ?? true;
    const clearFamilyGroup = options.clearFamilyGroup ?? clearStudentA;

    if (clearStudentA) {
        selectedStudentA = null;
        searchResultsA = [];
        familyGroup = [];

        const searchInputA = document.getElementById("searchStudentA");
        if (searchInputA) {
            searchInputA.value = "";
        }

        renderSearchResults("A");
    }

    if (clearStudentB) {
        selectedStudentB = null;
        searchResultsB = [];

        const searchInputB = document.getElementById("searchStudentB");
        if (searchInputB) {
            searchInputB.value = "";
        }

        renderSearchResults("B");
    }

    if (clearFamilyGroup) {
        familyGroup = [];
    }

    renderSelectedStudents();
    clearLinkMessage();
}

async function applyCompanyContext(company) {
    currentCompany = normalizeCompany(company);

    clearSelections({
        clearStudentA: true,
        clearStudentB: true,
        clearFamilyGroup: true
    });

    currentRequestFilter = "";

    const filter = document.getElementById("requestStatusFilter");
    if (filter) {
        filter.value = "";
    }

    await Promise.all([
        loadRequests(),
        (async () => {
            allFamilyGroups = await loadFamilyGroups();
            rebuildGroupedStudentIds();
        })()
    ]);

    renderSelectedStudents();
    renderFamilyGroup();
    renderRequests();
}

function bindEvents() {
document.getElementById("reloadBtn")?.addEventListener("click", async () => {
    clearLinkMessage();

    await Promise.all([
        loadRequests(),
        (async () => {
            allFamilyGroups = await loadFamilyGroups();
            rebuildGroupedStudentIds();
        })()
    ]);

    if (selectedStudentA?.studentId) {
        await loadFamilyGroup(selectedStudentA.studentId);
    } else {
        renderFamilyGroup();
    }

    renderRequests();
});

    document.getElementById("requestStatusFilter")?.addEventListener("change", async (e) => {
        currentRequestFilter = e.target.value || "";
        await loadRequests();
    });

document.getElementById("clearSelectionBtn")?.addEventListener("click", () => {
    clearSelections({
        clearStudentA: true,
        clearStudentB: true,
        clearFamilyGroup: true
    });

    renderFamilyGroup();
    renderRequests();
});

    document.getElementById("linkBtn")?.addEventListener("click", linkStudents);

    document.getElementById("searchStudentA")?.addEventListener("input", async (e) => {
    const value = e.target.value || "";
    const normalizedValue = value.trim().toLowerCase();
    const selectedName = String(selectedStudentA?.fullName || "").trim().toLowerCase();

    if (!value.trim()) {
        selectedStudentA = null;
        familyGroup = [];
        renderSelectedStudents();
        renderFamilyGroup();
        clearLinkMessage();
        return;
    }

    if (selectedStudentA && normalizedValue !== selectedName) {
        selectedStudentA = null;
        familyGroup = [];
        renderSelectedStudents();
        renderFamilyGroup();
    }

    clearTimeout(searchTimeoutA);
    searchTimeoutA = setTimeout(() => {
        searchStudents(value, "A");
    }, 300);
});

    document.getElementById("searchStudentB")?.addEventListener("input", (e) => {
        const value = e.target.value || "";

        if (!value.trim()) {
            selectedStudentB = null;
            searchResultsB = [];
            renderSelectedStudents();
            renderSearchResults("B");
            return;
        }

        clearTimeout(searchTimeoutB);
        searchTimeoutB = setTimeout(() => {
            searchStudents(value, "B");
        }, 300);
    });

    document.getElementById("closeRequestDetailModalBtn")?.addEventListener("click", closeRequestDetail);
    document.getElementById("closeDocumentPreviewModalBtn")?.addEventListener("click", closeDocumentPreviewModal);

    document.getElementById("documentPreviewModal")?.addEventListener("click", (e) => {
    if (e.target?.id === "documentPreviewModal") return;
});

document.querySelector("#documentPreviewModal > .absolute.inset-0.bg-slate-950\\/70")?.addEventListener("click", closeDocumentPreviewModal);
}

async function init() {
    await loadConfig();
    requireAuth();

    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = renderAdminLayout({
        activeKey: "siblings",
        pageTitle: "Hermanos",
        contentHtml: buildContent()
    });

    bindEvents();

    const layout = await setupAdminLayout({
        onCompanyChanged: async (company) => {
            await applyCompanyContext(company);
        }
    });

    await applyCompanyContext(layout.activeCompany);
}

init();