import { get, postForm, put, del } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

let company = null;
let sponsors = [];
let deletingSponsorId = null;
let movingSponsorId = null;
let isSaving = false;
let editingSponsorId = null;

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

function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function buildContent() {
    return `
        <section class="space-y-6">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Publicidad</p>
                        <h1 class="mt-2 text-3xl font-bold">Sponsors</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Administrá los sponsors que ven los alumnos en la app.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Total</p>
                            <p id="statTotal" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Activos</p>
                            <p id="statActive" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Con links</p>
                            <p id="statLinks" class="mt-2 text-2xl font-bold">0</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="space-y-5">
                <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="mb-5">
                        <h2 class="text-lg font-semibold text-slate-900">Crear sponsor</h2>
                        <p class="mt-1 text-sm text-slate-500">
                            La imagen es obligatoria. El texto corto se muestra arriba de la imagen.
                        </p>
                    </div>

                    <form id="sponsorForm" class="space-y-4">
                        <div class="grid gap-4 md:grid-cols-2">
                            <div>
                                <label for="sponsorName" class="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                                <input id="sponsorName" type="text" maxlength="120"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Ej: Pizzería Don José" />
                            </div>

                            <div>
                                <label for="displayOrder" class="mb-1 block text-sm font-medium text-slate-700">Orden</label>
                                <input id="displayOrder" type="number" value="0"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400" />
                            </div>
                        </div>

                        <div>
                            <label for="overlayText" class="mb-1 block text-sm font-medium text-slate-700">Texto sobre imagen</label>
                            <input id="overlayText" type="text" maxlength="80"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Ej: 10% off para socios" />
                        </div>

                        <div>
                            <label for="description" class="mb-1 block text-sm font-medium text-slate-700">Descripción para el detalle</label>
                            <textarea id="description" rows="4" maxlength="1500"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Información que verá el alumno al tocar el sponsor..."></textarea>
                            <p id="sponsorError" class="mt-1 hidden text-sm text-rose-600"></p>
                        </div>

                        <div class="grid gap-4 md:grid-cols-3">
                            <div>
                                <label for="websiteUrl" class="mb-1 block text-sm font-medium text-slate-700">Web</label>
                                <input id="websiteUrl" type="url"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="https://..." />
                            </div>

                            <div>
                                <label for="instagramUrl" class="mb-1 block text-sm font-medium text-slate-700">Instagram</label>
                                <input id="instagramUrl" type="url"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="https://instagram.com/..." />
                            </div>

                            <div>
                                <label for="whatsApp" class="mb-1 block text-sm font-medium text-slate-700">WhatsApp</label>
                                <input id="whatsApp" type="text"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="54911..." />
                            </div>
                        </div>

                        <div>
                            <label for="sponsorImage" class="mb-1 block text-sm font-medium text-slate-700">Imagen</label>
                            <input id="sponsorImage" type="file" accept="image/jpeg,image/png,image/webp"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                            <p class="mt-1 text-xs text-slate-500">Formatos permitidos: JPG, PNG o WEBP. Máximo 5 MB.</p>
                        </div>

                        <div class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                            <input id="sponsorIsActive" type="checkbox" checked class="h-4 w-4" />
                            <label for="sponsorIsActive" class="text-sm font-medium text-slate-700">
                                Sponsor activo
                            </label>
                        </div>

                        <div class="flex gap-3 pt-2">
                            <button id="saveBtn" type="submit"
                                class="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                                Guardar sponsor
                            </button>
                        </div>
                    </form>
                </div>

                <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="mb-5">
                        <h2 class="text-lg font-semibold text-slate-900">Listado de sponsors</h2>
                        <p class="mt-1 text-sm text-slate-500">
                            Usá las flechas para ordenar lo que verá el alumno.
                        </p>
                    </div>

                    <div id="sponsorsList"></div>

                    <div id="emptyState" class="hidden py-12 text-center">
                        <p class="text-sm text-slate-500">Todavía no hay sponsors cargados.</p>
                    </div>
                </div>
            </section>
        </section>

        <div id="modalRoot"></div>
    `;
}

function clearError() {
    qs("sponsorError").textContent = "";
    qs("sponsorError").classList.add("hidden");
}

function showError(message) {
    qs("sponsorError").textContent = message;
    qs("sponsorError").classList.remove("hidden");
}

function setSaving(loading) {
    isSaving = loading;

    qs("sponsorName").disabled = loading;
    qs("overlayText").disabled = loading;
    qs("description").disabled = loading;
    qs("websiteUrl").disabled = loading;
    qs("instagramUrl").disabled = loading;
    qs("whatsApp").disabled = loading;
    qs("displayOrder").disabled = loading;
    qs("sponsorImage").disabled = loading;
    qs("sponsorIsActive").disabled = loading;
    qs("saveBtn").disabled = loading;

    qs("saveBtn").textContent = loading ? "Guardando..." : "Guardar sponsor";
}

function validateCreateForm() {
    clearError();

    const name = qs("sponsorName").value.trim();
    const image = qs("sponsorImage").files?.[0] || null;
    const order = Number(qs("displayOrder").value || 0);

    if (!name) {
        showError("El nombre del sponsor es obligatorio.");
        return false;
    }

    if (!image) {
        showError("La imagen es obligatoria al crear un sponsor.");
        return false;
    }

    if (image.size > 5 * 1024 * 1024) {
        showError("La imagen no puede superar los 5 MB.");
        return false;
    }

    if (sponsors.some(x => Number(x.displayOrder || 0) === order)) {
                showError("Ya existe un sponsor con ese orden.");
        return false;
    }

    return true;
}

function resetCreateForm() {
    qs("sponsorForm").reset();
    qs("displayOrder").value = "0";
    qs("sponsorIsActive").checked = true;
    clearError();
}

function renderStats() {
    qs("statTotal").textContent = String(sponsors.length);
    qs("statActive").textContent = String(sponsors.filter(x => x.isActive).length);
    qs("statLinks").textContent = String(
        sponsors.filter(x => x.websiteUrl || x.instagramUrl || x.whatsApp).length
    );
}

function getSortedSponsors() {
    return [...sponsors].sort((a, b) => {
        const orderA = Number(a.displayOrder || 0);
        const orderB = Number(b.displayOrder || 0);

        if (orderA !== orderB) return orderA - orderB;

        return new Date(a.createdAtUtc) - new Date(b.createdAtUtc);
    });
}

function renderSponsors() {
    const list = qs("sponsorsList");
    const empty = qs("emptyState");

    renderStats();

    if (!sponsors.length) {
        list.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    const sorted = getSortedSponsors();

    list.innerHTML = `
        <div class="overflow-hidden rounded-2xl border border-slate-200">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                        <th class="px-4 py-3">Sponsor</th>
                        <th class="px-4 py-3">Imagen</th>
                        <th class="px-4 py-3">Orden</th>
                        <th class="px-4 py-3">Estado</th>
                        <th class="px-4 py-3 text-right">Acciones</th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-slate-100 bg-white">
                    ${sorted.map((item, index) => `
                        <tr>
                            <td class="px-4 py-3">
                                <div class="font-semibold text-slate-900">${escapeHtml(item.name)}</div>
                                <div class="mt-1 line-clamp-1 text-xs text-slate-500">
                                    ${item.overlayText ? escapeHtml(item.overlayText) : "Sin texto sobre imagen"}
                                </div>
                                <div class="mt-1 text-[11px] text-slate-400">
                                    ${formatDate(item.createdAtUtc)}
                                </div>
                            </td>

                            <td class="px-4 py-3">
                                <img
                                    src="${escapeHtml(item.imageUrl)}"
                                    class="h-12 w-20 rounded-xl border border-slate-200 object-cover"
                                    alt="${escapeHtml(item.name)}"
                                />
                            </td>

                            <td class="px-4 py-3">
                                <div class="flex items-center gap-2">
                                    <span class="w-6 text-slate-700">${Number(item.displayOrder || 0)}</span>

                                    <button
                                        type="button"
                                        data-id="${item.id}"
                                        class="move-up-btn rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                                        ${index === 0 || movingSponsorId === item.id ? "disabled" : ""}
                                    >
                                        ↑
                                    </button>

                                    <button
                                        type="button"
                                        data-id="${item.id}"
                                        class="move-down-btn rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                                        ${index === sorted.length - 1 || movingSponsorId === item.id ? "disabled" : ""}
                                    >
                                        ↓
                                    </button>
                                </div>
                            </td>

                            <td class="px-4 py-3">
                                ${
                                    item.isActive
                                        ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Activo</span>`
                                        : `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Inactivo</span>`
                                }
                            </td>

                            <td class="px-4 py-3 text-right">
                                <div class="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        data-id="${item.id}"
                                        class="edit-btn rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        type="button"
                                        data-id="${item.id}"
                                        class="delete-btn rounded-xl border border-rose-300 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;

    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => openDeleteModal(btn.dataset.id));
    });

    document.querySelectorAll(".move-up-btn").forEach(btn => {
        btn.addEventListener("click", () => moveSponsor(btn.dataset.id, -1));
    });

    document.querySelectorAll(".move-down-btn").forEach(btn => {
        btn.addEventListener("click", () => moveSponsor(btn.dataset.id, 1));
    });
}

function buildSponsorFormDataFromPrefix(prefix, includeImage = true) {
    const formData = new FormData();

    formData.append("name", qs(`${prefix}Name`).value.trim());
    formData.append("overlayText", qs(`${prefix}OverlayText`).value.trim());
    formData.append("description", qs(`${prefix}Description`).value.trim());
    formData.append("websiteUrl", qs(`${prefix}WebsiteUrl`).value.trim());
    formData.append("instagramUrl", qs(`${prefix}InstagramUrl`).value.trim());
    formData.append("whatsApp", qs(`${prefix}WhatsApp`).value.trim());
    formData.append("displayOrder", qs(`${prefix}DisplayOrder`).value || "0");
    formData.append("isActive", qs(`${prefix}IsActive`).checked ? "true" : "false");

    if (includeImage) {
        const image = qs(`${prefix}Image`).files?.[0] || null;
        if (image) formData.append("image", image);
    }

    return formData;
}

function buildSponsorUpdateFormData(item, newOrder = null) {
    const formData = new FormData();

    formData.append("name", item.name || "");
    formData.append("overlayText", item.overlayText || "");
    formData.append("description", item.description || "");
    formData.append("websiteUrl", item.websiteUrl || "");
    formData.append("instagramUrl", item.instagramUrl || "");
    formData.append("whatsApp", item.whatsApp || "");
    formData.append("displayOrder", String(newOrder ?? item.displayOrder ?? 0));
    formData.append("isActive", item.isActive ? "true" : "false");

    return formData;
}

async function saveSponsor(event) {
    event.preventDefault();

    if (isSaving) return;

    isSaving = true;
    setSaving(true);

    try {
        if (!validateCreateForm()) return;

        const formData = new FormData();

        formData.append("name", qs("sponsorName").value.trim());
        formData.append("overlayText", qs("overlayText").value.trim());
        formData.append("description", qs("description").value.trim());
        formData.append("websiteUrl", qs("websiteUrl").value.trim());
        formData.append("instagramUrl", qs("instagramUrl").value.trim());
        formData.append("whatsApp", qs("whatsApp").value.trim());
        formData.append("displayOrder", qs("displayOrder").value || "0");
        formData.append("isActive", qs("sponsorIsActive").checked ? "true" : "false");

        const image = qs("sponsorImage").files?.[0] || null;
        if (image) {
            formData.append("image", image);
        }

        await postForm(`/api/admin/${company.slug}/sponsors`, formData);

        resetCreateForm();
        await loadSponsors();
    } catch (error) {
        console.error(error);
        showError(error?.message || "No se pudo guardar el sponsor.");
    } finally {
        isSaving = false;
        setSaving(false);
    }
}

function setModal(html) {
    qs("modalRoot").innerHTML = html;
}

function closeModal() {
    editingSponsorId = null;
    setModal("");
}

function openEditModal(id) {
    const item = sponsors.find(x => x.id === id);
    if (!item) return;

    editingSponsorId = id;

    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div class="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h3 class="text-lg font-semibold text-slate-900">Editar sponsor</h3>
                        <p class="mt-1 text-sm text-slate-500">Modificá la información del sponsor.</p>
                    </div>

                    <button
                        id="closeEditModalBtn"
                        type="button"
                        class="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                        ✕
                    </button>
                </div>

                <form id="editSponsorForm" class="space-y-4">
                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                            <input id="editName" type="text" maxlength="120" value="${escapeHtml(item.name || "")}"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">Orden</label>
                            <input id="editDisplayOrder" type="number" value="${Number(item.displayOrder || 0)}"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                        </div>
                    </div>

                    <div>
                        <label class="mb-1 block text-sm font-medium text-slate-700">Texto sobre imagen</label>
                        <input id="editOverlayText" type="text" maxlength="80" value="${escapeHtml(item.overlayText || "")}"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                    </div>

                    <div>
                        <label class="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
                        <textarea id="editDescription" rows="4" maxlength="1500"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm">${escapeHtml(item.description || "")}</textarea>
                        <p id="editSponsorError" class="mt-1 hidden text-sm text-rose-600"></p>
                    </div>

                    <div class="grid gap-4 md:grid-cols-3">
                        <input id="editWebsiteUrl" type="url" value="${escapeHtml(item.websiteUrl || "")}" placeholder="Web"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                        <input id="editInstagramUrl" type="url" value="${escapeHtml(item.instagramUrl || "")}" placeholder="Instagram"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                        <input id="editWhatsApp" type="text" value="${escapeHtml(item.whatsApp || "")}" placeholder="WhatsApp"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                    </div>

                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p class="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Imagen actual</p>
                        <img src="${escapeHtml(item.imageUrl)}" class="h-24 w-32 rounded-2xl border border-slate-200 object-cover" />
                    </div>

                    <div>
                        <label class="mb-1 block text-sm font-medium text-slate-700">Cambiar imagen</label>
                        <input id="editImage" type="file" accept="image/jpeg,image/png,image/webp"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                    </div>

                    <label class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                        <input id="editIsActive" type="checkbox" ${item.isActive ? "checked" : ""} class="h-4 w-4" />
                        <span class="text-sm font-medium text-slate-700">Sponsor activo</span>
                    </label>

                    <div class="flex gap-3 pt-2">
                        <button id="editSaveBtn" type="submit"
                            class="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                            Guardar cambios
                        </button>

                        <button id="editCancelBtn" type="button"
                            class="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `);

    qs("closeEditModalBtn").addEventListener("click", closeModal);
    qs("editCancelBtn").addEventListener("click", closeModal);
    qs("editSponsorForm").addEventListener("submit", saveEditSponsor);
}

async function saveEditSponsor(event) {
    event.preventDefault();

    const item = sponsors.find(x => x.id === editingSponsorId);
    if (!item) return;

    const name = qs("editName").value.trim();
    const order = Number(qs("editDisplayOrder").value || 0);
    const image = qs("editImage").files?.[0] || null;
    const error = qs("editSponsorError");

    error.classList.add("hidden");
    error.textContent = "";

    if (!name) {
        error.textContent = "El nombre del sponsor es obligatorio.";
        error.classList.remove("hidden");
        return;
    }

    if (image && image.size > 5 * 1024 * 1024) {
        error.textContent = "La imagen no puede superar los 5 MB.";
        error.classList.remove("hidden");
        return;
    }

    if (sponsors.some(x => x.id !== editingSponsorId && Number(x.displayOrder || 0) === order)) {
        error.textContent = "Ya existe un sponsor con ese orden.";
        error.classList.remove("hidden");
        return;
    }

    const btn = qs("editSaveBtn");
    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {
        const formData = buildSponsorFormDataFromPrefix("edit");

        await put(`/api/admin/${company.slug}/sponsors/${editingSponsorId}`, formData);

        closeModal();
        await loadSponsors();
    } catch (errorResponse) {
        console.error(errorResponse);
        error.textContent = errorResponse?.message || "No se pudo guardar el sponsor.";
        error.classList.remove("hidden");
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar cambios";
    }
}
function openDeleteModal(id) {
    const item = sponsors.find(x => x.id === id);
    if (!item) return;

    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <h3 class="text-lg font-semibold text-slate-900">Eliminar sponsor</h3>
                <p class="mt-2 text-sm text-slate-500">
                    Vas a eliminar "${escapeHtml(item.name)}". Esta acción no se puede deshacer.
                </p>

                <div class="mt-6 flex gap-3">
                    <button
                        id="modalCancelBtn"
                        type="button"
                        class="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cancelar
                    </button>

                    <button
                        id="modalConfirmBtn"
                        type="button"
                        class="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-medium text-white hover:bg-rose-700"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    `);

    qs("modalCancelBtn").addEventListener("click", closeModal);
    qs("modalConfirmBtn").addEventListener("click", async () => {
        closeModal();
        await deleteSponsor(id);
    });
}

async function deleteSponsor(id) {
    try {
        deletingSponsorId = id;
        renderSponsors();

        await del(`/api/admin/${company.slug}/sponsors/${id}`);

        sponsors = sponsors.filter(x => x.id !== id);
        renderSponsors();
    } catch (error) {
        console.error(error);
        alert(error?.message || "No se pudo eliminar el sponsor.");
    } finally {
        deletingSponsorId = null;
        renderSponsors();
    }
}

async function moveSponsor(id, direction) {
    const sorted = getSortedSponsors();
    const currentIndex = sorted.findIndex(x => x.id === id);

    if (currentIndex < 0) return;

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const reordered = [...sorted];

    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    try {
        movingSponsorId = id;
        renderSponsors();

        // Paso 1: mandar todos a órdenes temporales únicos
        for (let i = 0; i < reordered.length; i++) {
            const sponsor = reordered[i];

            await put(
                `/api/admin/${company.slug}/sponsors/${sponsor.id}`,
                buildSponsorUpdateFormData(sponsor, 10000 + i)
            );
        }

        // Paso 2: asignar orden final limpio: 1, 2, 3...
        for (let i = 0; i < reordered.length; i++) {
            const sponsor = reordered[i];

            await put(
                `/api/admin/${company.slug}/sponsors/${sponsor.id}`,
                buildSponsorUpdateFormData(sponsor, i + 1)
            );
        }

        await loadSponsors();
    } catch (error) {
        console.error(error);
        alert(error?.message || "No se pudo cambiar el orden.");
    } finally {
        movingSponsorId = null;
        renderSponsors();
    }
}

async function loadSponsors() {
    sponsors = await get(`/api/admin/${company.slug}/sponsors`);
    renderSponsors();
}

async function init() {
    await loadConfig();
    requireAuth();

    const app = qs("app");

    app.innerHTML = renderAdminLayout({
        activeKey: "sponsors",
        pageTitle: "Sponsors",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;
            resetCreateForm();
            await loadSponsors();
        }
    });

    company = layout.activeCompany;

    qs("sponsorForm").addEventListener("submit", saveSponsor);

    await loadSponsors();
}

init();