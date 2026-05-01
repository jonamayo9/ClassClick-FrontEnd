import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

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
                    href: "/src/pages/admin/Clothing/Categories/index.html",
                    emoji: "🏷️",
                    enabled: false
                })}

                ${buildModuleCard({
                    title: "Productos",
                    description: "Cargá prendas, precios, variantes, talles e imágenes.",
                    href: "/src/pages/admin/clothing/products/index.html",
                    emoji: "👕",
                    enabled: false
                })}

                ${buildModuleCard({
                    title: "Pedidos",
                    description: "Revisá reservas, aprobá pedidos y marcá entregas.",
                    href: "/src/pages/admin/Clothing/Orders/index.html",
                    emoji: "🧾",
                    enabled: false
                })}

                ${buildModuleCard({
                    title: "Comprobantes",
                    description: "Validá comprobantes manuales enviados por alumnos.",
                    href: "/src/pages/admin/Clothing/PaymentProofs/index.html",
                    emoji: "💳",
                    enabled: false
                })}

                ${buildModuleCard({
                    title: "Cancelaciones",
                    description: "Aprobá o rechazá solicitudes de cancelación y devoluciones.",
                    href: "/src/pages/admin/Clothing/Cancellations/index.html",
                    emoji: "↩️",
                    enabled: false
                })}

                ${buildModuleCard({
                    title: "Stock",
                    description: "Controlá disponibilidad por producto o variante.",
                    href: "/src/pages/admin/Clothing/Stock/index.html",
                    emoji: "📦",
                    enabled: false
                })}
            </section>
        </section>
    `;
}

async function init() {
    await loadConfig();
    requireAuth();

    qs("app").innerHTML = renderAdminLayout({
        activeKey: "clothing",
        pageTitle: "Indumentaria",
        contentHtml: buildContent()
    });

    await setupAdminLayout();
}

init();