import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";
import { hasModule } from "../../../shared/js/modules.js";

let company = null;

function qs(id) {
    return document.getElementById(id);
}

function buildModuleCard({ title, description, href, emoji, enabled }) {
    return `
        <a
            href="${enabled ? href : "#"}"
            class="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${enabled ? "" : "pointer-events-none opacity-60"}"
        >
            <div class="flex items-start justify-between gap-4">
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                    ${emoji}
                </div>

                ${
                    enabled
                        ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Activo</span>`
                        : `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Próximamente</span>`
                }
            </div>

            <h3 class="mt-5 text-lg font-bold text-slate-900">
                ${title}
            </h3>

            <p class="mt-2 text-sm leading-6 text-slate-500">
                ${description}
            </p>

            <div class="mt-5 text-sm font-semibold text-orange-600">
                ${enabled ? "Administrar →" : "Disponible pronto"}
            </div>
        </a>
    `;
}

function buildContent() {
    return `
        <section class="space-y-6">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div>
                    <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Módulo</p>
                    <h1 class="mt-2 text-3xl font-bold">Indumentaria</h1>
                    <p class="mt-2 max-w-2xl text-sm text-slate-300">
                        Administrá categorías, productos, stock, pedidos y pagos de indumentaria desde un solo lugar.
                    </p>
                </div>
            </section>

            <section class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                ${buildModuleCard({
                    title: "Categorías",
                    description: "Creá categorías y subcategorías para organizar los productos.",
                    href: "/src/pages/admin/clothing/categories/index.html",
                    emoji: "🏷️",
                    enabled: true
                })}

                ${buildModuleCard({
                    title: "Productos",
                    description: "Cargá prendas, precios, variantes, talles e imágenes.",
                    href: "/src/pages/admin/clothing/products/index.html",
                    emoji: "👕",
                    enabled: true
                })}

                ${buildModuleCard({
                    title: "Pedidos",
                    description: "Revisá reservas, aprobá pedidos y marcá entregas.",
                    href: "/src/pages/admin/clothing/orders/index.html",
                    emoji: "🧾",
                    enabled: true
                })}

                ${buildModuleCard({
                    title: "Comprobantes",
                    description: "Validá comprobantes manuales enviados por alumnos.",
                    href: "/src/pages/admin/clothing/paymentProofs/index.html",
                    emoji: "💳",
                    enabled: true
                })}

                ${buildModuleCard({
                    title: "Cancelaciones",
                    description: "Aprobá o rechazá solicitudes de cancelación y devoluciones.",
                    href: "/src/pages/admin/clothing/cancellations/index.html",
                    emoji: "↩️",
                    enabled: true
                })}

                ${buildModuleCard({
                    title: "Stock",
                    description: "Controlá disponibilidad por producto o variante.",
                    href: "/src/pages/admin/clothing/stock/index.html",
                    emoji: "📦",
                    enabled: true
                })}
            </section>
        </section>
    `;
}

function debugBox(step, data = null) {
    const boxId = "debugProductsBox";
    let box = document.getElementById(boxId);

    if (!box) {
        box = document.createElement("pre");
        box.id = boxId;
        box.style.cssText = `
            position: fixed;
            left: 12px;
            bottom: 12px;
            z-index: 99999;
            max-width: 90vw;
            max-height: 45vh;
            overflow: auto;
            background: #020617;
            color: #22c55e;
            padding: 12px;
            border-radius: 12px;
            font-size: 12px;
            white-space: pre-wrap;
        `;
        document.body.appendChild(box);
    }

    box.textContent += `\n[${new Date().toLocaleTimeString()}] ${step}`;

    if (data) {
        box.textContent += `\n${JSON.stringify(data, null, 2)}`;
    }

    console.log("[PRODUCTS DEBUG]", step, data);
}

async function init() {
    try {
        debugBox("INIT START", {
            href: window.location.href,
            path: window.location.pathname
        });

        await loadConfig();
        debugBox("loadConfig OK");

        requireAuth();
        debugBox("requireAuth OK");

        qs("app").innerHTML = renderAdminLayout({
            activeKey: "clothing",
            pageTitle: "Indumentaria",
            contentHtml: buildContent()
        });

        debugBox("renderAdminLayout OK");

        const layout = await setupAdminLayout();

        debugBox("setupAdminLayout OK", layout);

        company = layout.activeCompany;

        debugBox("activeCompany", company);

        if (!company?.slug) {
            debugBox("ERROR: company slug vacío", company);
            qs("app").innerHTML = `<div class="p-6">No se pudo resolver la empresa activa.</div>`;
            return;
        }

        const clothingEnabled = hasModule(company, "clothing");

        debugBox("hasModule clothing", {
            clothingEnabled,
            modules: company.modules,
            isClothingEnabled: company.isClothingEnabled
        });

        if (!clothingEnabled) {
            debugBox("STOP: clothing deshabilitado");

            qs("app").innerHTML = renderAdminLayout({
                activeKey: "clothing",
                pageTitle: "Módulo no disponible",
                contentHtml: `
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
                            Volver al dashboard
                        </a>
                    </section>
                `
            });

            return;
        }

        debugBox("INIT FINISHED OK");
    } catch (error) {
        debugBox("INIT ERROR", {
            message: error?.message,
            stack: error?.stack
        });

        qs("app").innerHTML = `
            <div style="padding:24px;font-family:Arial">
                <h1>Error cargando Indumentaria</h1>
                <p>${error?.message || "Error desconocido"}</p>
            </div>
        `;
    }
}

init();
