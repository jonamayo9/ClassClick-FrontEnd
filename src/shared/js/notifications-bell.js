import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  formatNotificationDate
} from "./notifications.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function initNotificationsBell(options = {}) {
  const {
    rootId = "notificationsBell",
    maxItems = 10,
    emptyText = "No tenés notificaciones.",
    onError = null
  } = options;

  const root = document.getElementById(rootId);
  if (!root) return null;

  root.className = "relative shrink-0";

  root.innerHTML = `
    <div class="relative overflow-visible">
      <button
        id="${rootId}Button"
        type="button"
        class="relative flex h-11 w-11 items-center justify-center overflow-visible rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        aria-label="Abrir notificaciones">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75v-.7C18 5.712 15.314 3 12 3S6 5.712 6 9.05v.7a8.967 8.967 0 0 1-2.311 6.022 23.848 23.848 0 0 0 5.454 1.31m5.714 0a3 3 0 1 1-5.714 0m5.714 0H9.143" />
        </svg>

        <span
          id="${rootId}Badge"
          style="
            display:none;
            position:absolute;
            top:-6px;
            right:-6px;
            z-index:9999;
            min-width:22px;
            height:22px;
            padding:0 6px;
            border-radius:9999px;
            background:#ef4444;
            color:#ffffff;
            border:2px solid #ffffff;
            font-size:11px;
            font-weight:700;
            line-height:18px;
            text-align:center;
            box-shadow:0 4px 10px rgba(0,0,0,.18);
            pointer-events:none;
          ">
          0
        </span>
      </button>

      <div
        id="${rootId}Panel"
        class="absolute right-0 z-[120] mt-3 hidden w-[92vw] max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p class="text-sm font-semibold text-slate-900">Notificaciones</p>
            <p class="text-xs text-slate-500">Últimas novedades</p>
          </div>

          <div class="flex items-center gap-2">
            <button
              id="${rootId}ReadAllButton"
              type="button"
              class="text-xs font-semibold text-sky-600 transition hover:text-sky-700">
              Marcar todas
            </button>

            <button
              id="${rootId}DeleteAllButton"
              type="button"
              class="text-xs font-semibold text-rose-600 transition hover:text-rose-700">
              Eliminar todas
            </button>
          </div>
        </div>

        <div id="${rootId}List" class="max-h-[60vh] overflow-y-auto"></div>
      </div>
    </div>
  `;

  const button = document.getElementById(`${rootId}Button`);
  const badge = document.getElementById(`${rootId}Badge`);
  const panel = document.getElementById(`${rootId}Panel`);
  const list = document.getElementById(`${rootId}List`);
  const readAllButton = document.getElementById(`${rootId}ReadAllButton`);
  const deleteAllButton = document.getElementById(`${rootId}DeleteAllButton`);

  let notifications = [];
  let refreshIntervalId = null;

  function setBadge(count) {
    const numericCount = Number(count || 0);

    if (numericCount <= 0) {
      badge.textContent = "0";
      badge.style.display = "none";
      return;
    }

    badge.textContent = numericCount > 99 ? "99+" : String(numericCount);
    badge.style.display = "inline-block";
  }

  function renderList() {
    if (!notifications.length) {
      list.innerHTML = `
        <div class="px-4 py-8 text-center text-sm text-slate-500">
          ${escapeHtml(emptyText)}
        </div>
      `;
      return;
    }

    list.innerHTML = notifications
      .slice(0, maxItems)
      .map(item => `
        <div class="border-b border-slate-100 last:border-b-0 ${item.isRead ? "bg-white" : "bg-sky-50/50"}">
          <div class="flex items-start gap-3 px-4 py-3">
            <button
              type="button"
              data-id="${item.id}"
              data-action="open"
              class="min-w-0 flex-1 text-left">
              <div class="flex items-start justify-between gap-3">
                <p class="line-clamp-2 text-sm font-semibold text-slate-900">
                  ${escapeHtml(item.title)}
                </p>
                ${item.isRead ? "" : `<span class="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-sky-500"></span>`}
              </div>

              <p class="mt-1 line-clamp-3 text-sm text-slate-600">
                ${escapeHtml(item.message)}
              </p>

              <p class="mt-2 text-xs text-slate-400">
                ${escapeHtml(formatNotificationDate(item.createdAtUtc))}
              </p>
            </button>

            <button
              type="button"
              data-id="${item.id}"
              data-action="delete"
              class="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Eliminar notificación">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      `)
      .join("");
  }

  async function refreshUnreadCount() {
    const count = await getUnreadCount();
    setBadge(count);
    return count;
  }

  async function refreshNotifications() {
    notifications = await getNotifications();
    renderList();
  }

  async function openNotification(itemId) {
    const item = notifications.find(x => String(x.id) === String(itemId));
    if (!item) return;

    if (!item.isRead) {
      try {
        await markAsRead(item.id);
        item.isRead = true;
      } catch {
      }
    }

    renderList();
    await refreshUnreadCount();

    if (item.url) {
      togglePanel(false);
      window.location.href = item.url;
    }
  }

  async function removeNotification(itemId) {
    try {
      await deleteNotification(itemId);
      notifications = notifications.filter(x => String(x.id) !== String(itemId));
      renderList();
      await refreshUnreadCount();
    } catch (error) {
      console.error("Error eliminando notificación:", error);
      if (typeof onError === "function") onError(error);
    }
  }

  function togglePanel(forceOpen = null) {
    const willOpen = forceOpen ?? panel.classList.contains("hidden");

    if (willOpen) {
      panel.classList.remove("hidden");
    } else {
      panel.classList.add("hidden");
    }
  }

  async function safeRefreshUnreadCount() {
    try {
      await refreshUnreadCount();
    } catch (error) {
      console.error("Error obteniendo unread-count:", error);
      if (typeof onError === "function") onError(error);
    }
  }

  button.addEventListener("click", async (e) => {
    e.stopPropagation();

    const isHidden = panel.classList.contains("hidden");
    togglePanel(isHidden);

    if (isHidden) {
      try {
        await refreshNotifications();
        await refreshUnreadCount();
      } catch (error) {
        console.error("Error cargando notificaciones:", error);
        if (typeof onError === "function") onError(error);
      }
    }
  });

  readAllButton.addEventListener("click", async () => {
    try {
      await markAllAsRead();
      notifications = notifications.map(x => ({ ...x, isRead: true }));
      renderList();
      setBadge(0);
    } catch (error) {
      console.error("Error marcando notificaciones:", error);
      if (typeof onError === "function") onError(error);
    }
  });

  deleteAllButton.addEventListener("click", async () => {
    try {
      await deleteAllNotifications();
      notifications = [];
      renderList();
      setBadge(0);
    } catch (error) {
      console.error("Error eliminando notificaciones:", error);
      if (typeof onError === "function") onError(error);
    }
  });

  list.addEventListener("click", async (e) => {
    const actionElement = e.target.closest("[data-action]");
    if (!actionElement) return;

    const action = actionElement.dataset.action;
    const id = actionElement.dataset.id;

    if (action === "open") {
      await openNotification(id);
      return;
    }

    if (action === "delete") {
      await removeNotification(id);
    }
  });

  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) {
      togglePanel(false);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      safeRefreshUnreadCount();
    }
  });

  refreshIntervalId = window.setInterval(() => {
    safeRefreshUnreadCount();
  }, 30000);

  try {
    await refreshUnreadCount();
  } catch (error) {
    console.error("Error obteniendo unread-count:", error);
    if (typeof onError === "function") onError(error);
  }

  return {
    refreshUnreadCount,
    refreshNotifications,
    open: () => togglePanel(true),
    close: () => togglePanel(false),
    destroy: () => {
      if (refreshIntervalId) {
        window.clearInterval(refreshIntervalId);
        refreshIntervalId = null;
      }
    }
  };
}