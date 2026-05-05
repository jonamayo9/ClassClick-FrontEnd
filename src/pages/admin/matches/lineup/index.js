import { get, post } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth } from "../../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../../shared/js/admin-layout.js";

let currentCompany = null;
let matchId = null;

let fieldFormats = [];
let formations = [];
let students = [];
let lineup = null;

let selectedFieldFormatId = "";
let selectedFormationId = "";
let selectedPosition = null;

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

function buildContent() {
    return `
        <section class="space-y-5">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 class="text-xl font-semibold">Organización del partido</h1>
                    <p class="text-sm text-slate-500">
                        Armá la formación visual, titulares y suplentes.
                    </p>
                </div>

                <div class="flex gap-2">
                    <a
                        href="/src/pages/admin/matches/index.html"
                        class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700"
                    >
                        Volver
                    </a>

                    <button
                        id="saveLineupBtn"
                        class="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
                    >
                        Guardar formación
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr_320px]">
                <aside class="space-y-4">
                    <div class="rounded-2xl border bg-white p-4">
                        <h2 class="font-semibold">Configuración</h2>

                        <div class="mt-4 space-y-3">
                            <div>
                                <label class="mb-1 block text-sm font-medium text-slate-700">Tipo de cancha</label>
                                <select id="fieldFormatSelect" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"></select>
                            </div>

                            <div>
                                <label class="mb-1 block text-sm font-medium text-slate-700">Formación</label>
                                <select id="formationSelect" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"></select>
                            </div>
                        </div>
                    </div>

                    <div class="rounded-2xl border bg-white p-4">
                        <h2 class="font-semibold">Alumnos</h2>

                        <input
                            id="studentSearchInput"
                            type="text"
                            placeholder="Buscar alumno..."
                            class="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />

                        <div id="studentsList" class="mt-3 max-h-[520px] space-y-2 overflow-auto pr-1"></div>
                    </div>
                </aside>

                <main class="rounded-2xl border bg-white p-3 md:p-4">
                    <div id="fieldCanvasWrap"></div>
                </main>

                <aside class="rounded-2xl border bg-white p-4">
                    <h2 class="font-semibold">Suplentes</h2>
                    <p class="mt-1 text-xs text-slate-500">
                        Tocá un alumno para mandarlo al banco.
                    </p>

                    <div id="substitutesList" class="mt-4 space-y-2"></div>
                </aside>
            </div>
        </section>
    `;
}

function getCurrentFormation() {
    return formations.find(x => String(x.id) === String(selectedFormationId)) || null;
}

function getAssignedStudentIds() {
    const ids = new Set();

    (lineup?.starters || []).forEach(x => ids.add(String(x.studentId)));
    (lineup?.substitutes || []).forEach(x => ids.add(String(x.studentId)));

    return ids;
}

function findStudent(studentId) {
    return students.find(x => String(x.studentId) === String(studentId));
}

function renderSelectors() {
    qs("fieldFormatSelect").innerHTML = fieldFormats.map(x => `
        <option value="${x.id}" ${String(x.id) === String(selectedFieldFormatId) ? "selected" : ""}>
            ${escapeHtml(x.name)}
        </option>
    `).join("");

    qs("formationSelect").innerHTML = formations.map(x => `
        <option value="${x.id}" ${String(x.id) === String(selectedFormationId) ? "selected" : ""}>
            ${escapeHtml(x.name)}
        </option>
    `).join("");
}

function renderStudents() {
    const assignedIds = getAssignedStudentIds();
    const container = qs("studentsList");

    const available = students.filter(x => !assignedIds.has(String(x.studentId)));

    if (!available.length) {
        container.innerHTML = `
            <div class="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                No hay alumnos disponibles
            </div>
        `;
        return;
    }

    container.innerHTML = available.map(x => studentCardHtml(x, "assignStudentBtn")).join("");

    container.querySelectorAll(".assignStudentBtn").forEach(btn => {
        btn.addEventListener("click", () => assignStudentToSelectedPosition(btn.dataset.id));
    });
}

function studentCardHtml(student, className) {
    const initials = getInitials(student.fullName);

    return `
        <button
            type="button"
            data-id="${student.studentId}"
            class="${className} flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 text-left hover:bg-slate-50"
        >
            ${student.imageUrl
                ? `<img src="${escapeHtml(student.imageUrl)}" class="h-10 w-10 rounded-full object-cover" />`
                : `<div class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">${escapeHtml(initials)}</div>`
            }

            <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-slate-800">${escapeHtml(student.fullName)}</div>
                <div class="text-xs text-slate-400">${escapeHtml(student.memberNumber || student.dni || "")}</div>
            </div>
        </button>
    `;
}

function getInitials(name) {
    const parts = String(name || "").trim().split(" ").filter(Boolean);
    return parts.slice(0, 2).map(x => x[0]).join("").toUpperCase() || "?";
}

function renderField() {
    const formation = getCurrentFormation();

    if (!formation) {
        qs("fieldCanvasWrap").innerHTML = `
            <div class="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
                Seleccioná una formación
            </div>
        `;
        return;
    }

    const positions = formation.positions || [];

    qs("fieldCanvasWrap").innerHTML = `
        <div class="relative mx-auto h-[680px] max-w-[460px] overflow-hidden rounded-[28px] border-4 border-emerald-900 bg-emerald-700 shadow-inner">
            <div class="absolute inset-4 rounded-[24px] border-2 border-white/80"></div>
            <div class="absolute left-4 right-4 top-1/2 border-t-2 border-white/70"></div>
            <div class="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70"></div>

            <div class="absolute left-1/2 top-4 h-20 w-36 -translate-x-1/2 rounded-b-2xl border-x-2 border-b-2 border-white/70"></div>
            <div class="absolute bottom-4 left-1/2 h-20 w-36 -translate-x-1/2 rounded-t-2xl border-x-2 border-t-2 border-white/70"></div>

            ${positions.map(positionHtml).join("")}
        </div>
    `;

    qs("fieldCanvasWrap").querySelectorAll(".positionSlot").forEach(btn => {
        btn.addEventListener("click", () => selectPosition(btn.dataset.key));
    });

    qs("fieldCanvasWrap").querySelectorAll(".removeStarterBtn").forEach(btn => {
        btn.addEventListener("click", event => {
            event.stopPropagation();
            removeStarter(btn.dataset.id);
        });
    });
}

function positionHtml(pos) {
    const starter = (lineup?.starters || []).find(x => x.positionKey === pos.positionKey);
    const isSelected = selectedPosition?.positionKey === pos.positionKey;

    return `
        <button
            type="button"
            data-key="${escapeHtml(pos.positionKey)}"
            class="positionSlot absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style="left:${Number(pos.xPercent)}%; top:${Number(pos.yPercent)}%;"
        >
            ${starter ? starterBubbleHtml(starter) : emptyPositionHtml(pos, isSelected)}
        </button>
    `;
}

function starterBubbleHtml(starter) {
    const initials = getInitials(starter.fullName);

    return `
        <div class="relative flex w-[92px] flex-col items-center">
            <button
                type="button"
                data-id="${starter.studentId}"
                class="removeStarterBtn absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs text-white shadow"
                title="Quitar"
            >
                ×
            </button>

            ${starter.profileImageUrl || starter.imageUrl
                ? `<img src="${escapeHtml(starter.profileImageUrl || starter.imageUrl)}" class="h-14 w-14 rounded-full border-2 border-white object-cover shadow" />`
                : `<div class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-slate-800 text-sm font-bold text-white shadow">${escapeHtml(initials)}</div>`
            }

            <div class="mt-1 max-w-[96px] rounded-lg bg-white/95 px-2 py-1 text-[10px] font-bold leading-tight text-slate-900 shadow">
                ${escapeHtml(starter.fullName)}
            </div>
        </div>
    `;
}

function emptyPositionHtml(pos, isSelected) {
    return `
        <div class="flex w-[92px] flex-col items-center">
            <div class="flex h-12 w-12 items-center justify-center rounded-full border-2 ${isSelected ? "border-yellow-300 bg-yellow-100 text-yellow-900" : "border-white bg-white/20 text-white"} text-xs font-black shadow">
                +
            </div>
            <div class="mt-1 rounded-lg bg-black/25 px-2 py-1 text-[10px] font-semibold text-white">
                ${escapeHtml(pos.positionLabel)}
            </div>
        </div>
    `;
}

function renderSubstitutes() {
    const container = qs("substitutesList");
    const substitutes = lineup?.substitutes || [];

    if (!substitutes.length) {
        container.innerHTML = `
            <div class="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                Sin suplentes
            </div>
        `;
        return;
    }

    container.innerHTML = substitutes.map(x => {
        const student = findStudent(x.studentId) || x;
        return `
            <div class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-2">
                ${studentCardMiniHtml(student)}
                <button data-id="${x.studentId}" class="removeSubBtn rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600">
                    Quitar
                </button>
            </div>
        `;
    }).join("");

    container.querySelectorAll(".removeSubBtn").forEach(btn => {
        btn.addEventListener("click", () => removeSubstitute(btn.dataset.id));
    });
}

function studentCardMiniHtml(student) {
    const initials = getInitials(student.fullName);

    return `
        <div class="flex min-w-0 items-center gap-2">
            ${student.imageUrl || student.profileImageUrl
                ? `<img src="${escapeHtml(student.imageUrl || student.profileImageUrl)}" class="h-9 w-9 rounded-full object-cover" />`
                : `<div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">${escapeHtml(initials)}</div>`
            }
            <div class="truncate text-sm font-semibold text-slate-800">
                ${escapeHtml(student.fullName)}
            </div>
        </div>
    `;
}

function renderAll() {
    renderSelectors();
    renderField();
    renderStudents();
    renderSubstitutes();
}

function selectPosition(positionKey) {
    const formation = getCurrentFormation();
    selectedPosition = formation?.positions?.find(x => x.positionKey === positionKey) || null;
    renderField();
}

function assignStudentToSelectedPosition(studentId) {
    if (!selectedPosition) {
        addSubstitute(studentId);
        return;
    }

    const student = findStudent(studentId);
    if (!student) return;

    lineup.starters = (lineup.starters || []).filter(x => x.positionKey !== selectedPosition.positionKey);
    lineup.substitutes = (lineup.substitutes || []).filter(x => String(x.studentId) !== String(studentId));

    lineup.starters.push({
        studentId: student.studentId,
        fullName: student.fullName,
        imageUrl: student.imageUrl,
        positionKey: selectedPosition.positionKey,
        positionLabel: selectedPosition.positionLabel,
        xPercent: selectedPosition.xPercent,
        yPercent: selectedPosition.yPercent
    });

    selectedPosition = null;
    renderAll();
}

function addSubstitute(studentId) {
    const student = findStudent(studentId);
    if (!student) return;

    lineup.starters = (lineup.starters || []).filter(x => String(x.studentId) !== String(studentId));

    const exists = (lineup.substitutes || []).some(x => String(x.studentId) === String(studentId));
    if (!exists) {
        lineup.substitutes.push({
            studentId: student.studentId,
            fullName: student.fullName,
            imageUrl: student.imageUrl
        });
    }

    renderAll();
}

function removeStarter(studentId) {
    lineup.starters = (lineup.starters || []).filter(x => String(x.studentId) !== String(studentId));
    renderAll();
}

function removeSubstitute(studentId) {
    lineup.substitutes = (lineup.substitutes || []).filter(x => String(x.studentId) !== String(studentId));
    renderAll();
}

async function loadFieldFormats() {
    fieldFormats = await get(`/api/admin/${currentCompany.slug}/match-setup/field-formats`);

    if (!selectedFieldFormatId && fieldFormats.length) {
        selectedFieldFormatId = fieldFormats[0].id;
    }
}

async function loadFormations() {
    if (!selectedFieldFormatId) {
        formations = [];
        return;
    }

    formations = await get(`/api/admin/${currentCompany.slug}/match-setup/field-formats/${selectedFieldFormatId}/formations`);

    if (!selectedFormationId && formations.length) {
        selectedFormationId = formations[0].id;
    }

    if (!formations.some(x => String(x.id) === String(selectedFormationId))) {
        selectedFormationId = formations[0]?.id || "";
    }
}

async function loadStudents(search = "") {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    students = await get(`/api/admin/${currentCompany.slug}/match-setup/students${query}`);
}

async function loadLineup() {
    lineup = await get(`/api/admin/${currentCompany.slug}/matches/${matchId}/lineup`);

    if (lineup.fieldFormatId) {
        selectedFieldFormatId = lineup.fieldFormatId;
    }

    if (lineup.formationTemplateId) {
        selectedFormationId = lineup.formationTemplateId;
    }

    lineup.starters = lineup.starters || [];
    lineup.substitutes = lineup.substitutes || [];
}

async function saveLineup() {
    const players = [
        ...(lineup.starters || []).map((x, index) => ({
            studentId: x.studentId,
            role: 1,
            positionKey: x.positionKey,
            positionLabel: x.positionLabel,
            xPercent: x.xPercent,
            yPercent: x.yPercent,
            sortOrder: index + 1
        })),
        ...(lineup.substitutes || []).map((x, index) => ({
            studentId: x.studentId,
            role: 2,
            positionKey: null,
            positionLabel: null,
            xPercent: null,
            yPercent: null,
            sortOrder: index + 1
        }))
    ];

    qs("saveLineupBtn").disabled = true;
    qs("saveLineupBtn").textContent = "Guardando...";

    try {
        await post(`/api/admin/${currentCompany.slug}/matches/${matchId}/lineup`, {
            formationTemplateId: selectedFormationId || null,
            players
        });

        qs("saveLineupBtn").textContent = "Guardado";
        setTimeout(() => {
            qs("saveLineupBtn").textContent = "Guardar formación";
            qs("saveLineupBtn").disabled = false;
        }, 900);
    } catch (error) {
        console.error(error);
        alert(error.message || "No se pudo guardar la formación.");
        qs("saveLineupBtn").disabled = false;
        qs("saveLineupBtn").textContent = "Guardar formación";
    }
}

function bindEvents() {
    qs("saveLineupBtn").addEventListener("click", saveLineup);

    qs("fieldFormatSelect").addEventListener("change", async event => {
        selectedFieldFormatId = event.target.value;
        selectedFormationId = "";
        selectedPosition = null;

        await loadFormations();

        lineup.starters = [];
        renderAll();
    });

    qs("formationSelect").addEventListener("change", event => {
        selectedFormationId = event.target.value;
        selectedPosition = null;
        lineup.starters = [];
        renderAll();
    });

    let searchTimer = null;
    qs("studentSearchInput").addEventListener("input", event => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(async () => {
            await loadStudents(event.target.value);
            renderStudents();
        }, 350);
    });
}

function showLineupError(error) {
    const message = error?.message || "No se pudo cargar la organización del partido.";

    qs("fieldCanvasWrap").innerHTML = `
        <div class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <div class="font-bold">No se pudo cargar la cancha</div>
            <div class="mt-1">${escapeHtml(message)}</div>
        </div>
    `;
}

async function init() {
    try {
        await loadConfig();

        const session = requireAuth();
        if (!session) return;

        const params = new URLSearchParams(window.location.search);
        matchId =
    params.get("matchId") ||
    sessionStorage.getItem("selectedMatchLineupId");

        const app = qs("app");

        app.innerHTML = renderAdminLayout({
            activeKey: "matches",
            pageTitle: "Organización de partido",
            contentHtml: buildContent()
        });

        if (!matchId || matchId === "undefined" || matchId === "null") {
            qs("fieldCanvasWrap").innerHTML = `
                <div class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                    No llegó el ID del partido. Volvé a Partidos y tocá Organizar nuevamente.
                </div>
            `;
            return;
        }

        const layout = await setupAdminLayout({
            onCompanyChanged: async company => {
                currentCompany = company;

                try {
                    await loadLineup();
                    await loadFieldFormats();
                    await loadFormations();
                    await loadStudents();

                    renderAll();
                } catch (error) {
                    console.error("Error cargando organización:", error);
                    showLineupError(error);
                }
            }
        });

        currentCompany = layout.activeCompany;

        await loadLineup();
        await loadFieldFormats();
        await loadFormations();
        await loadStudents();

        bindEvents();
        renderAll();
    } catch (error) {
        console.error("Error inicializando lineup:", error);

        const app = qs("app");
        if (app) {
            app.innerHTML = `
                <div class="min-h-screen bg-slate-100 p-6">
                    <div class="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-6">
                        <h1 class="text-lg font-bold text-rose-700">Error al abrir organización</h1>
                        <p class="mt-2 text-sm text-slate-600">
                            ${escapeHtml(error?.message || "Error desconocido")}
                        </p>
                        <a href="/src/pages/admin/matches/index.html" class="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
                            Volver a partidos
                        </a>
                    </div>
                </div>
            `;
        }
    }
}

init();