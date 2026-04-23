import { get, post, put, del, postForm } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

let currentCompany = null;
let matches = [];
let editingMatchId = null;
let currentLogoUrl = null;
let currentLogoPreview = null;
let isSaving = false;
let currentLogoFile = null;
let courses = [];
let currentLogoPath = null;

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

async function loadCourses() {

    courses = await get(
        `/api/admin/${currentCompany.slug}/courses`
    );

    qs("courseIds").innerHTML =
        courses.map(x => `
            <option value="${x.id}">
                ${escapeHtml(x.name)}
            </option>
        `).join("");

}

function formatDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);

    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(date);
}

function toLocalDateTimeInputValue(dateUtc) {
    if (!dateUtc) return "";

    const date = new Date(dateUtc);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildContent() {
    return `
        <section class="space-y-6">

            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-xl font-semibold">Partidos</h1>
                    <p class="text-sm text-slate-500">
                        Configurá partidos y mostrálos luego en el inicio del alumno.
                    </p>
                </div>

                <button
                    id="reloadBtn"
                    class="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
                >
                    Actualizar
                </button>
            </div>

            <div class="rounded-2xl border bg-white p-5 space-y-4">
                <div>
                    <h2 id="formTitle" class="text-base font-semibold">Crear partido</h2>
                    <p class="text-sm text-slate-500">
                        Cargá rival, logo, fecha, hora y ubicación.
                    </p>
                </div>

                <form id="matchForm" class="space-y-4">
                    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">Rival</label>
                            <input
                                id="opponentName"
                                type="text"
                                class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Ej: Club Atlético Rival"
                            />
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">Fecha y hora</label>
                            <input
                                id="matchDateUtc"
                                type="datetime-local"
                                class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
                            />
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">Lugar</label>
                            <input
                                id="locationName"
                                type="text"
                                class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Ej: Cancha principal"
                            />
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">Dirección</label>
                            <input
                                id="address"
                                type="text"
                                class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Ej: Calle 123, Berazategui"
                            />
                        </div>

                        <div class="lg:col-span-2">
                            <label class="mb-1 block text-sm font-medium text-slate-700">Link Google Maps</label>
                            <input
                                id="googleMapsUrl"
                                type="text"
                                class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Pegá el link validado por el admin"
                            />
                        </div>

                        <div class="lg:col-span-2">
                            <label class="mb-1 block text-sm font-medium text-slate-700">Notas</label>
                            <textarea
                                id="notes"
                                rows="3"
                                class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Ej: Presentarse 30 minutos antes"
                            ></textarea>
                        </div>

                        <div class="rounded-xl border border-slate-200 p-4 space-y-3">

    <div class="text-sm font-medium text-slate-700">
        Alcance del partido
    </div>

    <label class="flex items-center gap-2">
        <input type="radio" name="scope" value="global" checked />
        Global (lo ven todos los alumnos)
    </label>

    <label class="flex items-center gap-2">
        <input type="radio" name="scope" value="courses" />
        Solo algunos cursos
    </label>

    <div id="coursesWrap" class="hidden">
        <select
            id="courseIds"
            multiple
            class="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        ></select>

        <p class="text-xs text-slate-400 mt-1">
            Podés seleccionar más de un curso
        </p>
    </div>

</div>

<div class="rounded-xl border border-slate-200 p-4 space-y-3">

    <label class="flex items-center gap-2">
        <input id="hasTicketSale" type="checkbox" />
        Tiene entrada paga
    </label>

    <div id="ticketFields" class="hidden space-y-2">

        <div>
            <label class="text-sm text-slate-700">Precio</label>
            <input
                id="ticketPrice"
                type="number"
                class="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Ej: 3500"
            />
        </div>

        <div>
            <label class="text-sm text-slate-700">Info adicional</label>
            <input
                id="ticketInfo"
                type="text"
                class="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Ej: menores de 10 no pagan"
            />
        </div>

    </div>

</div>

                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">Logo rival</label>
                            <input
                                id="opponentLogoFile"
                                type="file"
                                accept="image/*"
                                class="block w-full text-sm"
                            />
                            <p class="mt-1 text-xs text-slate-500">
                                La imagen se optimiza antes de guardarse.
                            </p>
                        </div>

                        <div class="flex items-end">
                            <div id="logoPreviewWrap" class="hidden rounded-xl border border-slate-200 p-3">
                                <img
                                    id="logoPreview"
                                    src=""
                                    alt="Preview logo"
                                    class="h-20 w-20 object-contain"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <label class="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                            <input id="isActive" type="checkbox" checked class="h-4 w-4" />
                            <span class="text-sm text-slate-700">Partido activo</span>
                        </label>

                        <label class="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                            <input id="showInHome" type="checkbox" checked class="h-4 w-4" />
                            <span class="text-sm text-slate-700">Mostrar en inicio</span>
                        </label>
                    </div>

                    <div class="flex gap-2">
                        <button
                            id="saveBtn"
                            type="submit"
                            class="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
                        >
                            Guardar
                        </button>

                        <button
                            id="cancelEditBtn"
                            type="button"
                            class="hidden rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>

            <div class="rounded-2xl border bg-white overflow-hidden">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-50">
                        <tr>
                            <th class="px-4 py-3 text-left">Rival</th>
                            <th class="px-4 py-3 text-left">Fecha</th>
                            <th class="px-4 py-3 text-left">Lugar</th>
                            <th class="px-4 py-3 text-left">Estado</th>
                            <th class="px-4 py-3 text-left">Inicio</th>
                            <th class="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody id="matchesTable"></tbody>
                </table>
            </div>

        </section>
    `;
}

function renderTable() {
    const tbody = qs("matchesTable");

    if (!matches.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-10 text-center text-slate-400">
                    No hay partidos cargados
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = matches.map(item => `
        <tr class="border-t">
            <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                    ${item.opponentLogoUrl
                        ? `<img src="${escapeHtml(item.opponentLogoUrl)}" class="h-10 w-10 rounded-lg object-contain border border-slate-200 bg-white p-1" />`
                        : `<div class="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-400">Sin logo</div>`
                    }
                    <div>
                        <div class="font-medium">${escapeHtml(item.opponentName)}</div>
                        ${item.isGlobal
    ? `<div class="text-xs text-slate-400">
            Global
       </div>`
    : `<div class="text-xs text-slate-400">
            ${item.courseNames?.join(", ") || ""}
       </div>`
}
                        <div class="text-xs text-slate-500">${escapeHtml(item.address || "-")}</div>
                    </div>
                </div>
            </td>

            <td class="px-4 py-3">${formatDateTime(item.matchDateUtc)}</td>
            <td class="px-4 py-3">${escapeHtml(item.locationName || "-")}</td>
            <td class="px-4 py-3">
                ${item.isActive
                    ? `<span class="text-emerald-600">Activo</span>`
                    : `<span class="text-rose-600">Inactivo</span>`
                }
            </td>
            <td class="px-4 py-3">
                ${item.showInHome
                    ? `<span class="text-emerald-600">Sí</span>`
                    : `<span class="text-slate-500">No</span>`
                }
            </td>
            <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-2">
                    <button data-id="${item.id}" class="editBtn rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700">
                        Editar
                    </button>
                    <button data-id="${item.id}" class="deleteBtn rounded-lg border border-rose-300 px-3 py-1.5 text-xs text-rose-600">
                        Eliminar
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".editBtn").forEach(btn => {
        btn.addEventListener("click", () => openEdit(btn.dataset.id));
    });

    tbody.querySelectorAll(".deleteBtn").forEach(btn => {
        btn.addEventListener("click", () => removeMatch(btn.dataset.id));
    });
}

function resetForm() {
    editingMatchId = null;
    currentLogoFile = null;
    currentLogoUrl = null;
currentLogoPath = null;

    if (currentLogoPreview && currentLogoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(currentLogoPreview);
    }

    currentLogoPreview = null;

    qs("formTitle").textContent = "Crear partido";
    qs("matchForm").reset();
    qs("isActive").checked = true;
    qs("showInHome").checked = true;
    qs("cancelEditBtn").classList.add("hidden");
    qs("saveBtn").textContent = "Guardar";
    qs("logoPreviewWrap").classList.add("hidden");
    qs("logoPreview").src = "";
    qs("opponentLogoFile").value = "";
    document.querySelector(
    "input[value='global']"
).checked = true;

qs("coursesWrap").classList.add("hidden");

qs("hasTicketSale").checked = false;
qs("ticketFields").classList.add("hidden");

qs("ticketPrice").value = "";
qs("ticketInfo").value = "";
}

function fillForm(item) {
    editingMatchId = item.id;
    currentLogoFile = null;
    currentLogoUrl = item.opponentLogoUrl || null;
currentLogoPath = item.opponentLogoPath || null;

    if (currentLogoPreview && currentLogoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(currentLogoPreview);
    }

    currentLogoPreview = item.opponentLogoUrl || null;

    qs("formTitle").textContent = "Editar partido";
    qs("opponentName").value = item.opponentName || "";
    qs("matchDateUtc").value = toLocalDateTimeInputValue(item.matchDateUtc);
    qs("locationName").value = item.locationName || "";
    qs("address").value = item.address || "";
    qs("googleMapsUrl").value = item.googleMapsUrl || "";
    qs("notes").value = item.notes || "";
    qs("isActive").checked = !!item.isActive;
    qs("showInHome").checked = !!item.showInHome;
    qs("cancelEditBtn").classList.remove("hidden");
    qs("saveBtn").textContent = "Guardar cambios";
if (item.isGlobal) {

    document.querySelector(
        "input[value='global']"
    ).checked = true;

    qs("coursesWrap")
        .classList.add("hidden");

}
else {

    document.querySelector(
        "input[value='courses']"
    ).checked = true;

    qs("coursesWrap")
        .classList.remove("hidden");

    const selectedIds =
        new Set(
            (item.courseIds || [])
            .map(String)
        );

    Array.from(
        qs("courseIds").options
    ).forEach(option => {

        option.selected =
            selectedIds.has(
                String(option.value)
            );

    });

}


qs("hasTicketSale").checked =
    item.hasTicketSale;

qs("ticketFields")
    .classList.toggle(
        "hidden",
        !item.hasTicketSale
    );

qs("ticketPrice").value =
    item.ticketPrice || "";

qs("ticketInfo").value =
    item.ticketInfo || "";

    if (item.opponentLogoUrl) {
        qs("logoPreviewWrap").classList.remove("hidden");
        qs("logoPreview").src = item.opponentLogoUrl;
    } else {
        qs("logoPreviewWrap").classList.add("hidden");
        qs("logoPreview").src = "";
    }
}

function openEdit(matchId) {
    const item = matches.find(x => x.id === matchId);
    if (!item) return;

    fillForm(item);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeMatch(matchId) {
    await del(`/api/admin/${currentCompany.slug}/matches/${matchId}`);
    await loadMatches();
}

async function loadMatches() {
    matches = await get(`/api/admin/${currentCompany.slug}/matches`);
    renderTable();
}

async function resizeImageToBlob(file, maxSize = 400, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement("canvas");
                let { width, height } = img;

                if (width > height && width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(blob => {
                    if (!blob) {
                        reject(new Error("No se pudo optimizar la imagen."));
                        return;
                    }

                    resolve(blob);
                }, "image/webp", quality);
            };

            img.onerror = reject;
            img.src = reader.result;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleLogoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const blob = await resizeImageToBlob(file);
    currentLogoFile = blob;

    if (currentLogoPreview && currentLogoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(currentLogoPreview);
    }

    currentLogoPreview = URL.createObjectURL(blob);

    qs("logoPreviewWrap").classList.remove("hidden");
    qs("logoPreview").src = currentLogoPreview;
}

async function uploadMatchLogo(blob) {
    const formData = new FormData();
    formData.append("file", blob, "match-logo.webp");

    return await postForm(
        `/api/admin/${currentCompany.slug}/matches/logo`,
        formData
    );
}

async function saveMatch(event) {
    event.preventDefault();

    if (isSaving) return;

    const opponentName = qs("opponentName").value.trim();
    if (!opponentName) return;

    try {
        isSaving = true;
        qs("saveBtn").disabled = true;
        qs("saveBtn").textContent = editingMatchId ? "Guardando..." : "Creando...";

        let opponentLogoUrl = currentLogoUrl;
let opponentLogoPath = currentLogoPath;

if (currentLogoFile) {
    const uploadResult = await uploadMatchLogo(currentLogoFile);
    opponentLogoUrl = uploadResult.url;
    opponentLogoPath = uploadResult.path;
    currentLogoUrl = opponentLogoUrl;
    currentLogoFile = null;
}
        const isGlobal =
    document.querySelector(
        "input[name='scope']:checked"
    ).value === "global";

const courseIds = isGlobal
    ? []
    : Array.from(
        qs("courseIds").selectedOptions
      ).map(x => x.value);

const hasTicketSale =
    qs("hasTicketSale").checked;

        const payload = {
    opponentName,
    opponentLogoUrl,
    opponentLogoPath,
    matchDateUtc: qs("matchDateUtc").value ? new Date(qs("matchDateUtc").value).toISOString() : null,
    locationName: qs("locationName").value.trim(),
    address: qs("address").value.trim(),
    googleMapsUrl: qs("googleMapsUrl").value.trim(),
    notes: qs("notes").value.trim(),
    isActive: qs("isActive").checked,
    showInHome: qs("showInHome").checked,
    isGlobal,
    courseIds,
    hasTicketSale,
    ticketPrice: hasTicketSale ? Number(qs("ticketPrice").value) : null,
    ticketInfo: hasTicketSale ? qs("ticketInfo").value.trim() : null
};

        if (editingMatchId) {
            await put(`/api/admin/${currentCompany.slug}/matches/${editingMatchId}`, payload);
        } else {
            await post(`/api/admin/${currentCompany.slug}/matches`, payload);
        }

        resetForm();
        await loadMatches();
    } catch (error) {
        console.error(error);
        alert(error.message || "No se pudo guardar el partido.");
    } finally {
        isSaving = false;
        qs("saveBtn").disabled = false;
        qs("saveBtn").textContent = editingMatchId ? "Guardar cambios" : "Guardar";
    }
}

function bindEvents() {
    qs("reloadBtn")?.addEventListener("click", loadMatches);
    qs("matchForm")?.addEventListener("submit", saveMatch);
    qs("cancelEditBtn")?.addEventListener("click", resetForm);
    qs("opponentLogoFile")?.addEventListener("change", handleLogoChange);
    document.querySelectorAll(
    "input[name='scope']"
).forEach(radio => {

    radio.addEventListener("change", () => {

        const isGlobal =
            document.querySelector(
                "input[name='scope']:checked"
            ).value === "global";

        qs("coursesWrap")
            .classList.toggle("hidden", isGlobal);

    });

});

qs("hasTicketSale")
.addEventListener("change", () => {

    qs("ticketFields")
        .classList.toggle(
            "hidden",
            !qs("hasTicketSale").checked
        );

});
}

async function init() {
    await loadConfig();

    const session = requireAuth();
    if (!session) return;

    const app = qs("app");

    app.innerHTML = renderAdminLayout({
        activeKey: "matches",
        pageTitle: "Partidos",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
onCompanyChanged: async (company) => {
    currentCompany = company;
    resetForm();
    await loadCourses();
    await loadMatches();
}
    });


currentCompany = layout.activeCompany;

bindEvents();
resetForm();
await loadCourses();
await loadMatches();
}

init();