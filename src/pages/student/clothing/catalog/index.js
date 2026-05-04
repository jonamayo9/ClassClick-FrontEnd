import { get, post } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth, logoutAndRedirect } from "../../../../shared/js/session.js";
import {
    buildStudentMobileMenu,
    buildStudentMobileBottomNav,
    bindStudentMobileShellEvents,
    syncStudentMobileShellScrollLock,
    enableStudentSoftNavigation
} from "../../../../shared/js/student-mobile-shell.js";
import { initNotificationsBell } from "../../../../shared/js/notifications-bell.js";
import {
    getMe,
    setMe,
    getStudentMe,
    setStudentMe
} from "../../../../shared/js/storage.js";

let companySlug = null;
let company = null;
let products = [];
let student = null;
let loading = true;
let pageError = "";
let mobileMenuOpen = false;
let selectedPaymentOption = 1;
let searchText = "";
let selectedParentCategory = "";
let selectedChildCategory = "";
let cartOpen = false;

let detailProductId = null;
let selectedDetailVariantId = null;
let detailPersonalizationText = "";

const CART_KEY_PREFIX = "classclick_clothing_cart_";

function qs(id) {
    return document.getElementById(id);
}

function getCompanyName() {
    return (
        company?.companyName?.trim() ||
        company?.name?.trim() ||
        company?.displayName?.trim() ||
        companySlug ||
        ""
    );
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function getStudentFullName() {
    const fullName = student?.fullName?.trim();
    if (fullName) return fullName;

    return [student?.firstName, student?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
}

function getStudentEmail() {
    return student?.email?.trim() || "";
}

async function loadStudentProfile() {
    const cachedStudent = getStudentMe(companySlug);

    if (cachedStudent && !isSasUrlExpired(cachedStudent.profileImageUrl)) {
        return cachedStudent;
    }

    const result = await get(`/api/student/${companySlug}/me`);
    setStudentMe(companySlug, result);

    return result;
}

function money(value) {
    return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function getCartKey() {
    return `${CART_KEY_PREFIX}${companySlug}`;
}

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(getCartKey()) || "[]");
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(getCartKey(), JSON.stringify(cart));
}

function getMainImage(product) {
    return product.images?.find(x => x.isMain)?.imageUrl
        || product.images?.[0]?.imageUrl
        || "";
}

function isProductAvailable(product) {
    if (product.hasVariants) {
        return product.variants?.some(v => v.isAvailable) === true;
    }

    return product.isAvailable === true;
}

function isVariantAvailable(variant) {
    return variant?.isAvailable === true;
}

function getVariantStockLabel(variant) {
    if (!variant) return "";

    if (!variant.tracksStock) {
        return "Disponible siempre";
    }

    const qty = Number(variant.stockQuantity ?? 0);

    if (qty <= 0) {
        return "Sin stock";
    }

    return `Stock: ${qty}`;
}

function getParentCategoryName(product) {
    return product.parentCategoryName || product.categoryName || "Otros";
}

function getChildCategoryName(product) {
    if (product.parentCategoryName && product.categoryName) return product.categoryName;
    return "";
}

function getParentCategories() {
    const names = [...new Set(products.map(getParentCategoryName).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b));
}

function getChildCategories() {
    if (!selectedParentCategory) return [];

    const names = [...new Set(
        products
            .filter(p => getParentCategoryName(p) === selectedParentCategory)
            .map(getChildCategoryName)
            .filter(Boolean)
    )];

    return names.sort((a, b) => a.localeCompare(b));
}

function getFilteredProducts() {
    const text = searchText.trim().toLowerCase();

    return products.filter(product => {
        const parentName = getParentCategoryName(product);
        const childName = getChildCategoryName(product);

        if (selectedParentCategory && parentName !== selectedParentCategory) return false;
        if (selectedChildCategory && childName !== selectedChildCategory) return false;

        if (!text) return true;

        return product.name?.toLowerCase().includes(text)
            || product.description?.toLowerCase().includes(text)
            || parentName.toLowerCase().includes(text)
            || childName.toLowerCase().includes(text)
            || product.variants?.some(v => v.name?.toLowerCase().includes(text));
    });
}

function getGroupedProducts() {
    const filtered = getFilteredProducts();
    const groups = {};

    filtered.forEach(product => {
        const key = getChildCategoryName(product) || getParentCategoryName(product);
        if (!groups[key]) groups[key] = [];
        groups[key].push(product);
    });

    return groups;
}

function getCartTotals() {
    const cart = getCart();

    return {
        count: cart.reduce((acc, item) => acc + item.quantity, 0),
        total: cart.reduce((acc, item) => acc + item.quantity * item.price, 0)
    };
}

function addToCart(product, variant = null, personalizationText = "") {
    const cart = getCart();
    const cleanPersonalization = personalizationText.trim();
    const key = `${product.id}_${variant?.id || "no-variant"}_${cleanPersonalization.toLowerCase() || "no-custom"}`;
    const existing = cart.find(x => x.key === key);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            key,
            productId: product.id,
            variantId: variant?.id || null,
            name: product.name,
            variantName: variant?.name || null,
            price: Number(product.price || 0),
            quantity: 1,
            imageUrl: getMainImage(product),
            isReservation: product.isReservation,
            requiresDeposit: product.requiresDeposit,
            depositAmount: product.depositAmount,
            personalizationText: cleanPersonalization,
            personalizationLabel: product.personalizationLabel || "Personalización",
        });
    }

    saveCart(cart);
}

function updateCartQuantity(key, quantity) {
    let cart = getCart();

    if (quantity <= 0) {
        cart = cart.filter(x => x.key !== key);
    } else {
        cart = cart.map(x => x.key === key ? { ...x, quantity } : x);
    }

    saveCart(cart);
    rerender();
}

function clearCart() {
    saveCart([]);
    cartOpen = false;
    rerender();
}

function closeDetailModal() {
    detailProductId = null;
    selectedDetailVariantId = null;
    detailPersonalizationText = "";
    rerender();
}

function openDetailModal(productId) {
    const product = products.find(x => x.id === productId);
    if (!product) return;

    detailProductId = productId;
    selectedDetailVariantId = null;
    detailPersonalizationText = "";
    rerender();
}

function addDetailProductAndMaybeFinish(finish) {
    const product = products.find(x => x.id === detailProductId);
    if (!product) return;

    let variant = null;

    if (product.hasVariants) {
        variant = product.variants?.find(x => x.id === selectedDetailVariantId);

        if (!variant || !isVariantAvailable(variant)) {
            return;
        }
    }

    if (!product.hasVariants && !isProductAvailable(product)) {
        return;
    }
    const personalizationText = detailPersonalizationText.trim();

    if (product.allowsPersonalization) {
        const maxLength = Number(product.personalizationMaxLength || 30);

        if (!personalizationText) {
            alert(`Completá ${product.personalizationLabel || "la personalización"}.`);
            return;
        }

        if (personalizationText.length > maxLength) {
            alert(`La personalización no puede superar ${maxLength} caracteres.`);
            return;
        }
    }

    addToCart(product, variant, personalizationText);

    detailProductId = null;
    selectedDetailVariantId = null;

    cartOpen = true;

    if (finish) {
        cartOpen = true;
    }

    rerender();
}

function buildImageOrFallback(image, className = "h-full w-full object-cover") {
    if (image) {
        return `<img src="${image}" class="${className}" />`;
    }

    return `
        <div class="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M6 7l6-4 6 4v10a2 2 0 01-2 2H8a2 2 0 01-2-2V7z"/>
            </svg>
            <span class="mt-1 text-xs">Sin imagen</span>
        </div>
    `;
}

function buildHeader() {
    return `
        <section class="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-6 text-white shadow-sm">
            <p class="text-xs uppercase tracking-[0.28em] text-slate-300">
                ${escapeHtml(getCompanyName())}
            </p>

            <p class="text-xs uppercase tracking-[0.28em] text-slate-400">
                Indumentaria
            </p>

            <h1 class="mt-2 text-3xl font-black">
                Tienda del club
            </h1>
            <p class="mt-2 text-sm text-slate-300">
                Elegí tus productos, filtrá por categoría y armá tu pedido.
            </p>

            <div class="mt-5 rounded-2xl bg-white/10 p-2">
                <input
                    id="searchInput"
                    value="${escapeHtml(searchText)}"
                    placeholder="Buscar producto, categoría o talle..."
                    class="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                />
            </div>
            <div class="mt-4">
                <a
                    href="/src/pages/student/clothing/orders/index.html"
                    class="flex w-full items-center justify-center rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white"
                >
                    Ver mis pedidos
                </a>
            </div>
        </section>
    `;
}

function buildCategories() {
    const parents = getParentCategories();

    return `
        <section class="space-y-3">
            <div class="flex gap-2 overflow-x-auto pb-1">
                <button
                    data-parent-category=""
                    class="parent-category-btn shrink-0 rounded-full px-4 py-2 text-sm font-bold ${!selectedParentCategory ? "bg-slate-900 text-white" : "bg-white text-slate-700"}"
                >
                    Todos
                </button>

                ${parents.map(name => `
                    <button
                        data-parent-category="${escapeHtml(name)}"
                        class="parent-category-btn shrink-0 rounded-full px-4 py-2 text-sm font-bold ${selectedParentCategory === name ? "bg-slate-900 text-white" : "bg-white text-slate-700"}"
                    >
                        ${escapeHtml(name)}
                    </button>
                `).join("")}
            </div>

            ${buildSubcategories()}
        </section>
    `;
}

function buildSubcategories() {
    const children = getChildCategories();

    if (!children.length) return "";

    return `
        <div class="flex gap-2 overflow-x-auto pb-1">
            <button
                data-child-category=""
                class="child-category-btn shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${!selectedChildCategory ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600"}"
            >
                Todas
            </button>

            ${children.map(name => `
                <button
                    data-child-category="${escapeHtml(name)}"
                    class="child-category-btn shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${selectedChildCategory === name ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600"}"
                >
                    ${escapeHtml(name)}
                </button>
            `).join("")}
        </div>
    `;
}

function buildProductCard(product) {
    const image = getMainImage(product);
    const available = isProductAvailable(product);

    return `
        <article class="flex h-[330px] md:h-[360px] flex-col overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm">
            <button type="button" data-open-detail="${product.id}" class="flex min-h-0 flex-1 flex-col text-left">
                <div class="h-[150px] shrink-0 bg-slate-100">
                    ${buildImageOrFallback(image)}
                </div>

                <div class="flex min-h-0 flex-1 flex-col p-3">
                    <h3 class="line-clamp-2 text-sm font-black leading-5 text-slate-900 md:text-base">
                        ${escapeHtml(product.name)}
                    </h3>

                    <p class="mt-1 text-sm font-bold text-slate-700">
                        ${money(product.price)}
                    </p>

                    <div class="mt-2">
                        ${
                            available
                                ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Disponible</span>`
                                : `<span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Sin stock</span>`
                        }
                    </div>

                    <p class="mt-2 min-h-[18px] text-xs text-slate-400">
                        ${product.hasVariants ? `${product.variants?.length || 0} variante(s)` : "&nbsp;"}
                    </p>
                </div>
            </button>

            <div class="shrink-0 px-3 pb-3">
                <button
                    type="button"
                    data-open-detail="${product.id}"
                    ${available ? "" : "disabled"}
                    class="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                    ${product.hasVariants ? "Elegir" : "Agregar"}
                </button>
            </div>
        </article>
    `;
}

function buildProductsSection() {
    const grouped = getGroupedProducts();
    const keys = Object.keys(grouped);

    if (!keys.length) {
        return `
            <section class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p class="text-sm font-semibold text-slate-500">No hay productos para mostrar.</p>
            </section>
        `;
    }

    return `
        <section class="space-y-6">
            ${keys.map(groupName => `
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-black text-slate-900">${escapeHtml(groupName)}</h2>
                        <span class="text-xs font-bold text-slate-400">${grouped[groupName].length} producto(s)</span>
                    </div>

                    <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                        ${grouped[groupName].map(buildProductCard).join("")}
                    </div>
                </div>
            `).join("")}
        </section>
    `;
}

function buildCartButton() {
    const { count, total } = getCartTotals();

    if (!count) return "";

    return `
        <button
            id="floatingCartBtn"
            type="button"
            class="fixed bottom-[140px] left-4 right-4 z-[999] rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-2xl
                   md:bottom-8 md:left-auto md:right-8 md:w-[320px]
                   md:rounded-[22px] md:border md:border-slate-200 md:bg-white
                   md:px-4 md:py-3 md:text-slate-900 md:shadow-xl md:hover:shadow-2xl md:transition"
        >
            <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                    <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-sm
                                 md:h-11 md:w-11 md:bg-slate-900 md:text-white md:relative">
                        🛒
                        <span class="hidden md:flex absolute -top-2 -right-2 h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
                            ${count}
                        </span>
                    </span>

                    <div class="text-left">
                        <p class="text-sm font-black md:text-slate-900">Ver carrito</p>
                        <p class="text-[11px] text-slate-300 md:text-slate-500">
                            ${count} producto(s)
                        </p>
                    </div>
                </div>

                <div class="text-right">
                    <p class="text-sm font-black md:text-slate-900">
                        ${money(total)}
                    </p>
                    <p class="text-[11px] text-slate-300 md:text-slate-400">
                        Continuar Pedido →
                    </p>
                </div>
            </div>
        </button>
    `;
}

async function createOrderFromCart() {
    const cart = getCart();

    if (!cart.length) {
        alert("El carrito está vacío.");
        return;
    }

    try {
        const payload = {
            paymentOption: selectedPaymentOption,
            items: cart.map(item => ({
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: item.quantity,
                personalizationText: item.personalizationText || null
            }))
        };

        const order = await post(`/api/student/${companySlug}/clothing/orders`, payload);

        saveCart([]);
        cartOpen = false;
        sessionStorage.setItem("lastClothingOrderId", order.id);

        window.location.href = `/src/pages/student/clothing/order/detail/index.html?id=${encodeURIComponent(order.id)}`;
    } catch (err) {
        alert(err?.message || "No se pudo crear el pedido.");
    }
}

function buildCartDrawer() {
    if (!cartOpen) return "";

    const cart = getCart();
    const { total } = getCartTotals();

    const hasDeposit = cart.some(x => x.requiresDeposit && Number(x.depositAmount || 0) > 0);

    const depositTotal = cart.reduce((acc, item) => {
        if (!item.requiresDeposit) return acc;
        return acc + Number(item.depositAmount || 0) * Number(item.quantity || 0);
    }, 0);

    if (!hasDeposit) {
        selectedPaymentOption = 2;
    }

    const amountToPay = hasDeposit && selectedPaymentOption === 1
        ? depositTotal
        : total;

    const remainingAmount = hasDeposit && selectedPaymentOption === 1
        ? total - depositTotal
        : 0;

    return `
        <div class="fixed inset-0 z-50 bg-slate-950/60 p-4 backdrop-blur-sm">
            <div class="ml-auto flex h-full w-full max-w-md flex-col rounded-[28px] bg-white shadow-2xl">

                <!-- HEADER -->
                <div class="border-b border-slate-200 p-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-xl font-black text-slate-900">Tu carrito</h3>
                            <p class="mt-1 text-xs font-semibold text-slate-400">
                                ${cart.length} producto(s)
                            </p>
                        </div>

                        <button id="closeCartBtn" type="button"
                            class="rounded-full bg-slate-100 px-3 py-2 text-sm font-black">
                            ×
                        </button>
                    </div>
                </div>

                <!-- ITEMS -->
                <div class="flex-1 space-y-3 overflow-y-auto p-5">
                    ${
                        cart.length
                            ? cart.map(item => `
                                <div class="flex gap-3 rounded-2xl border border-slate-200 p-3">

                                    <div class="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                        ${buildImageOrFallback(item.imageUrl)}
                                    </div>

                                    <div class="min-w-0 flex-1">
                                        <p class="font-black text-slate-900">${escapeHtml(item.name)}</p>

                                        ${
                                            item.variantName
                                                ? `<p class="text-xs text-slate-500">Variante: ${escapeHtml(item.variantName)}</p>`
                                                : ""
                                        }

${
    item.personalizationText
        ? `<p class="text-xs font-bold text-sky-700">
            ${escapeHtml(item.personalizationLabel || "Personalización")}: ${escapeHtml(item.personalizationText)}
           </p>`
        : ""
}
                                        ${
                                            item.requiresDeposit
                                                ? `<p class="mt-1 text-xs font-bold text-orange-600">
                                                    Permite seña: ${money(item.depositAmount)}
                                                </p>`
                                                : ""
                                        }

                                        <p class="mt-1 text-sm font-bold text-slate-700">
                                            ${money(item.price)}
                                        </p>

                                        <div class="mt-2 flex items-center gap-2">
                                            <button data-dec="${item.key}" class="h-8 w-8 rounded-full bg-slate-100 font-black">−</button>
                                            <span class="w-8 text-center text-sm font-black">${item.quantity}</span>
                                            <button data-inc="${item.key}" class="h-8 w-8 rounded-full bg-slate-900 font-black text-white">+</button>
                                        </div>
                                    </div>
                                </div>
                            `).join("")
                            : `<p class="text-sm text-slate-500">Tu carrito está vacío.</p>`
                    }
                </div>

                <!-- FOOTER -->
                <div class="border-t border-slate-200 p-5">

                    ${
                        hasDeposit
                            ? `
                                <div class="mb-4 rounded-2xl bg-slate-50 p-3">
                                    <p class="mb-2 text-sm font-black text-slate-900">
                                        ¿Cómo querés pagar?
                                    </p>

                                    <div class="grid grid-cols-2 gap-2">

                                        <button
                                            id="payDepositBtn"
                                            type="button"
                                            class="rounded-xl px-3 py-3 text-sm font-black ${
                                                selectedPaymentOption === 1
                                                    ? "bg-slate-950 text-white"
                                                    : "border border-slate-200 bg-white text-slate-700"
                                            }"
                                        >
                                            Seña
                                            <span class="block text-xs font-bold opacity-75">
                                                ${money(depositTotal)}
                                            </span>
                                        </button>

                                        <button
                                            id="payFullBtn"
                                            type="button"
                                            class="rounded-xl px-3 py-3 text-sm font-black ${
                                                selectedPaymentOption === 2
                                                    ? "bg-slate-950 text-white"
                                                    : "border border-slate-200 bg-white text-slate-700"
                                            }"
                                        >
                                            Total
                                            <span class="block text-xs font-bold opacity-75">
                                                ${money(total)}
                                            </span>
                                        </button>

                                    </div>
                                </div>
                            `
                            : ""
                    }

                    <div class="mb-4 space-y-2 rounded-2xl border border-slate-200 p-4">

                        <div class="flex items-center justify-between">
                            <span class="text-sm font-bold text-slate-500">Total productos</span>
                            <span class="text-sm font-black text-slate-900">${money(total)}</span>
                        </div>

                        <div class="flex items-center justify-between">
                            <span class="text-sm font-bold text-slate-500">Pagás ahora</span>
                            <span class="text-lg font-black text-slate-900">${money(amountToPay)}</span>
                        </div>

                        ${
                            hasDeposit && selectedPaymentOption === 1
                                ? `
                                <div class="flex items-center justify-between text-slate-400">
                                    <span class="text-sm font-bold">Restante</span>
                                    <span class="text-sm font-black">${money(remainingAmount)}</span>
                                </div>
                                `
                                : ""
                        }

                    </div>

                    <button
                        id="checkoutBtn"
                        type="button"
                        ${cart.length ? "" : "disabled"}
                        class="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:opacity-40"
                    >
                        Confirmar Pedido
                    </button>

                    <button
                        id="clearCartBtn"
                        type="button"
                        class="mt-3 w-full rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700"
                    >
                        Vaciar carrito
                    </button>

                </div>
            </div>
        </div>
    `;
}

function buildDetailModal() {
    if (!detailProductId) return "";

    const product = products.find(x => x.id === detailProductId);
    if (!product) return "";

    const image = getMainImage(product);
    const available = isProductAvailable(product);
    const selectedVariant = product.variants?.find(x => x.id === selectedDetailVariantId) || null;

    const canAdd = product.hasVariants
        ? selectedVariant && isVariantAvailable(selectedVariant)
        : available;

    return `
        <div class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div class="max-h-[82vh] w-full max-w-md overflow-y-auto rounded-[30px] bg-white shadow-2xl">
                <div class="relative h-64 bg-slate-100">
                    ${buildImageOrFallback(image)}

                    <button
                        id="closeDetailModalBtn"
                        type="button"
                        class="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-2 text-sm font-black text-slate-900 shadow-sm"
                    >
                        ×
                    </button>
                </div>

                <div class="space-y-5 p-5">
                    <div>
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <h3 class="text-2xl font-black leading-7 text-slate-900">
                                    ${escapeHtml(product.name)}
                                </h3>
                                <p class="mt-1 text-lg font-black text-slate-800">
                                    ${money(product.price)}
                                </p>
                            </div>

                            ${
                                available
                                    ? `<span class="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Disponible</span>`
                                    : `<span class="shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Sin stock</span>`
                            }
                        </div>

                        ${
                            product.description
                                ? `<p class="mt-4 text-sm leading-6 text-slate-500">${escapeHtml(product.description)}</p>`
                                : `<p class="mt-4 text-sm leading-6 text-slate-400">Sin descripción cargada.</p>`
                        }
                    </div>

                    ${
                        product.hasVariants
                            ? `
                                <div>
                                    <p class="mb-3 text-sm font-black text-slate-900">Elegí una variante</p>

                                    <div class="flex flex-wrap gap-2">
                                        ${(product.variants || []).map(variant => {
                                            const active = selectedDetailVariantId === variant.id;
                                            const enabled = isVariantAvailable(variant);

                                            return `
                                                <button
                                                    type="button"
                                                    data-select-detail-variant="${variant.id}"
                                                    ${enabled ? "" : "disabled"}
                                                    class="rounded-full border px-4 py-2 text-xs font-black transition ${
                                                        active
                                                            ? "border-slate-950 bg-slate-950 text-white"
                                                            : enabled
                                                                ? "border-slate-200 bg-white text-slate-700"
                                                                : "border-slate-200 bg-slate-100 text-slate-400 opacity-60"
                                                    }"
                                                >
                                                    ${escapeHtml(variant.name)}
                                                </button>
                                            `;
                                        }).join("")}
                                    </div>

                                    <div class="mt-3 min-h-[22px] text-xs font-semibold text-slate-500">
                                        ${
                                            selectedVariant
                                                ? escapeHtml(getVariantStockLabel(selectedVariant))
                                                : "Seleccioná una variante para continuar."
                                        }
                                    </div>
                                </div>
                            `
                            : ""
                    }

                    ${
    product.allowsPersonalization
        ? `
            <div class="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                <label class="mb-2 block text-sm font-black text-slate-900">
                    ${escapeHtml(product.personalizationLabel || "Personalización")}
                </label>

                <input
                    id="detailPersonalizationInput"
                    type="text"
                    maxlength="${Number(product.personalizationMaxLength || 30)}"
                    value="${escapeHtml(detailPersonalizationText)}"
                    class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    placeholder="Ej: Santi"
                />

                <p class="mt-2 text-xs text-slate-500">
                    Máximo ${Number(product.personalizationMaxLength || 30)} caracteres.
                </p>
            </div>
        `
        : ""
}

                    ${
                        product.requiresDeposit
                            ? `
                                <div class="rounded-2xl bg-orange-50 p-4">
                                    <p class="text-sm font-black text-orange-800">Este producto requiere seña</p>
                                    <p class="mt-1 text-sm text-orange-700">Seña: ${money(product.depositAmount)}</p>
                                </div>
                            `
                            : ""
                    }

                    <div class="grid gap-3">
                        <button
                            id="detailAddBtn"
                            type="button"
                            ${canAdd ? "" : "disabled"}
                            class="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Agregar al carrito
                        </button>

                        <button
                            id="detailFinishBtn"
                            type="button"
                            ${canAdd ? "" : "disabled"}
                            class="rounded-2xl border border-slate-300 px-5 py-4 text-sm font-black text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Agregar y finalizar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}



function buildSidebar() {
    return `
        <aside class="hidden md:flex md:w-[220px] md:flex-col md:border-r md:border-slate-200 md:bg-white">
            <div class="border-b border-slate-200 px-5 py-5">
                <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Alumno
                </div>

                <div class="mt-2 truncate text-base font-semibold text-slate-900">
                    ${escapeHtml(getStudentFullName() || "—")}
                </div>

                ${
                    getStudentEmail()
                        ? `<div class="mt-1 truncate text-xs text-slate-500">${escapeHtml(getStudentEmail())}</div>`
                        : ""
                }
            </div>

            <nav class="flex-1 space-y-2 px-4 py-4">
                <a href="/src/pages/student/home/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">Inicio</a>
                <a href="/src/pages/student/courses/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">Cursos</a>
                <a href="/src/pages/student/payments/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">Pagos</a>
                <a href="/src/pages/student/documents/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">Documentos</a>
                <a href="/src/pages/student/profile/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">Perfil</a>
                <a href="/src/pages/student/siblings/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">Hermanos</a>
                <a href="/src/pages/student/clothing/catalog/index.html" class="flex items-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm">Indumentaria</a>
            </nav>

            <div class="mt-auto border-t border-slate-200 px-4 py-4">
                <button
                    id="logoutBtn"
                    type="button"
                    class="flex w-full items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    Cerrar sesión
                </button>
            </div>
        </aside>
    `;
}

function buildLoading() {
    return `<div class="p-6">Cargando productos...</div>`;
}

function buildError() {
    return `<div class="p-6 text-red-500">${escapeHtml(pageError)}</div>`;
}

function render() {
    if (loading) return buildLoading();
    if (pageError) return buildError();

    return `
        <div class="min-h-screen bg-slate-100">

            ${buildStudentMobileMenu({
                mobileMenuOpen,
                studentFullName: getStudentFullName(),
                studentEmail: getStudentEmail(),
                activeItem: "clothing"
            })}

            <div class="flex min-h-screen">
                ${buildSidebar()}

                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 pb-[260px] space-y-4">
                        ${buildHeader()}
                        ${buildCategories()}
                        ${buildProductsSection()}
                    </div>
                </main>
            </div>

            ${cartOpen || detailProductId || mobileMenuOpen ? "" : buildCartButton()}
            ${buildCartDrawer()}
            ${buildDetailModal()}

            ${detailProductId || cartOpen ? "" : buildStudentMobileBottomNav({
                activeItem: "clothing"
            })}
        </div>
    `;
}

function rerender() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = render();

    syncStudentMobileShellScrollLock({
        mobileMenuOpen
    });

    bindEvents();
}

function bindEvents() {
bindStudentMobileShellEvents({
    setMobileMenuOpen: (value) => {
        if (mobileMenuOpen === value) return;

        mobileMenuOpen = value;
        rerender();
    },
    onLogout: logoutAndRedirect
});

    initNotificationsBell({ rootId: "studentNotificationsBellMobile" });
    initNotificationsBell({ rootId: "studentNotificationsBellDesktop" });

    qs("searchInput")?.addEventListener("input", event => {
        searchText = event.target.value || "";
        rerender();
    });

    document.querySelectorAll(".parent-category-btn").forEach(button => {
        button.addEventListener("click", () => {
            selectedParentCategory = button.dataset.parentCategory || "";
            selectedChildCategory = "";
            rerender();
        });
    });

    document.querySelectorAll(".child-category-btn").forEach(button => {
        button.addEventListener("click", () => {
            selectedChildCategory = button.dataset.childCategory || "";
            rerender();
        });
    });

    qs("payDepositBtn")?.addEventListener("click", () => {
    selectedPaymentOption = 1;
    rerender();
});

qs("payFullBtn")?.addEventListener("click", () => {
    selectedPaymentOption = 2;
    rerender();
});
document.querySelectorAll("#logoutBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        logoutAndRedirect();
    });
});

    document.querySelectorAll("[data-open-detail]").forEach(button => {
        button.addEventListener("click", () => {
            openDetailModal(button.dataset.openDetail);
        });
    });

    document.querySelectorAll("[data-select-detail-variant]").forEach(button => {
        button.addEventListener("click", () => {
            selectedDetailVariantId = button.dataset.selectDetailVariant;
            rerender();
        });
    });

    qs("closeDetailModalBtn")?.addEventListener("click", closeDetailModal);

    qs("detailAddBtn")?.addEventListener("click", () => {
        addDetailProductAndMaybeFinish(false);
    });

    qs("detailFinishBtn")?.addEventListener("click", () => {
        addDetailProductAndMaybeFinish(true);
    });

    qs("floatingCartBtn")?.addEventListener("click", () => {
        cartOpen = true;
        rerender();
    });

    qs("closeCartBtn")?.addEventListener("click", () => {
        cartOpen = false;
        rerender();
    });

    qs("clearCartBtn")?.addEventListener("click", clearCart);

    qs("detailPersonalizationInput")?.addEventListener("input", event => {
        detailPersonalizationText = event.target.value || "";
    });

    document.querySelectorAll("[data-inc]").forEach(button => {
        button.addEventListener("click", () => {
            const cart = getCart();
            const item = cart.find(x => x.key === button.dataset.inc);
            if (!item) return;
            updateCartQuantity(item.key, item.quantity + 1);
        });
    });

    document.querySelectorAll("[data-dec]").forEach(button => {
        button.addEventListener("click", () => {
            const cart = getCart();
            const item = cart.find(x => x.key === button.dataset.dec);
            if (!item) return;
            updateCartQuantity(item.key, item.quantity - 1);
        });
    });

qs("checkoutBtn")?.addEventListener("click", createOrderFromCart);
}

async function loadProducts() {
    return await get(`/api/student/${companySlug}/clothing/products`);
}

async function init() {
    try {
        await loadConfig();
        enableStudentSoftNavigation();

        const session = requireAuth();
        if (!session) return;

        companySlug = session.activeCompanySlug;

        student = await loadStudentProfile();

        if (!student) {
            throw new Error("No se pudo obtener el perfil del alumno.");
        }

        let me = getMe();
        const companyFromMe = me?.companies?.find(x => x.companySlug === companySlug);
        const logoUrl = companyFromMe?.logoUrl;

        if (!me || isSasUrlExpired(logoUrl)) {
            me = await get("/api/admin/me");
            setMe(me);
        }

        company = (me.companies || []).find(x => x.companySlug === companySlug);

        if (!company) {
            throw new Error("Empresa no encontrada");
        }

        products = await loadProducts();

        if (!Array.isArray(products)) {
            products = [];
        }
    } catch (err) {
        pageError = err?.message || "Error cargando productos";
    } finally {
        loading = false;
        rerender();
    }
}

function isSasUrlExpired(url) {
    if (!url) return true;

    try {
        const parsedUrl = new URL(url);
        const expires = parsedUrl.searchParams.get("se");

        if (!expires) return false;

        return Date.now() > new Date(expires).getTime() - 5 * 60 * 1000;
    } catch {
        return true;
    }
}

init();