import { loadConfig } from "../../../../shared/js/config.js";
import { get, put } from "../../../../shared/js/api.js";
import { requireAuth } from "../../../../shared/js/session.js";
import {
    renderAdminLayout,
    setupAdminLayout
} from "../../../../shared/js/admin-layout.js";
import { hasModule } from "../../../../shared/js/modules.js";

let companySlug = null;
let company = null;

let loading = true;
let saving = false;
let editing = false;
let error = "";
let success = "";

let form = {
    paymentAlias: "",
    paymentAliasHolder: ""
};

let originalForm = {
    paymentAlias: "",
    paymentAliasHolder: ""
};

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
    if (loading) {
        return `
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Configuración</p>
                <h1 class="mt-2 text-3xl font-bold">Pagos de indumentaria</h1>
                <p class="mt-2 text-sm text-slate-300">Cargando configuración...</p>
            </section>

            <section class="rounded-3xl bg-white p-6 shadow-sm">
                <p class="text-sm font-medium text-slate-500">Cargando datos...</p>
            </section>
        `;
    }

    const alias = form.paymentAlias?.trim();
    const holder = form.paymentAliasHolder?.trim();

    return `
        <section class="space-y-6">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Configuración</p>
                        <h1 class="mt-2 text-3xl font-bold">Pagos de indumentaria</h1>
                        <p class="mt-2 max-w-2xl text-sm text-slate-300">
                            Configurá el alias y titular que verán los alumnos al subir comprobantes de indumentaria.
                        </p>

                        <a
                            href="/src/pages/admin/clothing/index.html"
                            class="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                        >
                            ← Volver a indumentaria
                        </a>
                    </div>

                    <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Empresa</p>
                        <p class="mt-2 text-lg font-bold">${escapeHtml(company?.name || company?.companyName || companySlug || "-")}</p>
                    </div>
                </div>
            </section>

            ${error ? `
                <section class="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                    ${escapeHtml(error)}
                </section>
            ` : ""}

            ${success ? `
                <section class="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
                    ${escapeHtml(success)}
                </section>
            ` : ""}

            <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 class="text-xl font-bold text-slate-900">Datos bancarios</h2>
                        <p class="mt-1 text-sm text-slate-500">
                            Estos datos aparecen cuando el alumno carga comprobante de seña, restante o pago total.
                        </p>
                    </div>

                    ${!editing ? `
                        <button
                            id="editBtn"
                            type="button"
                            class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                        >
                            Editar configuración
                        </button>
                    ` : ""}
                </div>

                ${!editing ? `
                    <div class="rounded-3xl border border-violet-200 bg-violet-50 p-5">
                        <p class="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                            Alias para transferir
                        </p>

                        <p class="mt-3 break-all text-3xl font-black text-slate-900">
                            ${alias ? escapeHtml(alias) : "Sin alias configurado"}
                        </p>

                        <p class="mt-2 text-sm font-bold text-slate-500">
                            ${holder ? escapeHtml(holder) : "Sin titular configurado"}
                        </p>
                    </div>
                ` : `
                    <div class="grid gap-5">
                        <div>
                            <label class="mb-1 block text-sm font-semibold text-slate-700">
                                Alias
                            </label>

                            <input
                                id="paymentAliasInput"
                                type="text"
                                value="${escapeHtml(form.paymentAlias)}"
                                placeholder="Ej: club.indumentaria"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                            />
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-semibold text-slate-700">
                                Titular / referencia
                            </label>

                            <input
                                id="paymentAliasHolderInput"
                                type="text"
                                value="${escapeHtml(form.paymentAliasHolder)}"
                                placeholder="Ej: Club Atlético..."
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                            />
                        </div>

                        <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                            <button
                                id="cancelEditBtn"
                                type="button"
                                class="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancelar
                            </button>

                            <button
                                id="saveBtn"
                                type="button"
                                class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                ${saving ? "disabled" : ""}
                            >
                                ${saving ? "Guardando..." : "Guardar cambios"}
                            </button>
                        </div>
                    </div>
                `}
            </section>
        </section>
    `;
}

function bindEvents() {
    qs("editBtn")?.addEventListener("click", () => {
        editing = true;
        error = "";
        success = "";
        renderContent();
    });

    qs("cancelEditBtn")?.addEventListener("click", () => {
        form = { ...originalForm };
        editing = false;
        error = "";
        success = "";
        renderContent();
    });

    qs("paymentAliasInput")?.addEventListener("input", e => {
        form.paymentAlias = e.target.value;
    });

    qs("paymentAliasHolderInput")?.addEventListener("input", e => {
        form.paymentAliasHolder = e.target.value;
    });

    qs("saveBtn")?.addEventListener("click", save);
}

function renderContent() {
    const root = qs("settingsContentRoot");
    if (!root) return;

    root.innerHTML = buildContent();
    bindEvents();
}

async function loadSettings() {
    const data = await get(`/api/admin/${companySlug}/clothing/settings`);

    form = {
        paymentAlias: data.paymentAlias || "",
        paymentAliasHolder: data.paymentAliasHolder || ""
    };

    originalForm = { ...form };
}

async function save() {
    try {
        saving = true;
        error = "";
        success = "";
        renderContent();

        await put(`/api/admin/${companySlug}/clothing/settings/payment`, {
            paymentAlias: form.paymentAlias?.trim() || null,
            paymentAliasHolder: form.paymentAliasHolder?.trim() || null
        });

        form.paymentAlias = form.paymentAlias?.trim() || "";
        form.paymentAliasHolder = form.paymentAliasHolder?.trim() || "";
        originalForm = { ...form };

        editing = false;
        success = "Configuración guardada correctamente.";
    } catch (err) {
        error = err?.message || "No se pudo guardar la configuración.";
    } finally {
        saving = false;
        renderContent();
    }
}

async function init() {
    await loadConfig();

    const session = requireAuth();
    if (!session) return;

    qs("app").innerHTML = renderAdminLayout({
        activeKey: "clothing",
        pageTitle: "Configuración de indumentaria",
        contentHtml: `<div id="settingsContentRoot">${buildContent()}</div>`
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async (selectedCompany) => {
            company = selectedCompany;
            companySlug = company?.slug || company?.companySlug;

            loading = true;
            editing = false;
            error = "";
            success = "";
            renderContent();

            try {
                await loadSettings();
            } catch (err) {
                error = err?.message || "Error cargando configuración.";
            } finally {
                loading = false;
                renderContent();
            }
        }
    });

    company = layout.activeCompany;
    companySlug = company?.slug || company?.companySlug;

    if (!companySlug) {
        error = "No se pudo resolver la empresa activa.";
        loading = false;
        renderContent();
        return;
    }

    if (!hasModule(company, "clothing")) {
        qs("settingsContentRoot").innerHTML = `
            <section class="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <h1 class="text-xl font-black text-slate-900">
                    Indumentaria no está habilitado
                </h1>

                <p class="mt-2 text-sm text-slate-600">
                    Este módulo no está disponible para la empresa activa.
                </p>

                <a
                    href="/src/pages/admin/dashboard/index.html"
                    class="mt-5 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
                >
                    Volver al inicio
                </a>
            </section>
        `;
        return;
    }

    try {
        await loadSettings();
    } catch (err) {
        error = err?.message || "Error cargando configuración.";
    } finally {
        loading = false;
        renderContent();
    }
}

init();