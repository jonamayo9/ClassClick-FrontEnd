import { get, post, del } from "./api.js";

function tryParseJson(value) {
  if (!value) return null;

  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toAbsoluteNotificationUrl(url) {
  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return url;
}

export function normalizeNotificationItem(item) {
  const data = tryParseJson(item.dataJson || item.DataJson);

  const id = item.id ?? item.Id;
  const type = item.type ?? item.Type ?? "";
  const title = item.title ?? item.Title ?? "Notificación";
  const message = item.message ?? item.Message ?? "";
  const isRead = item.isRead ?? item.IsRead ?? false;
  const createdAtUtc = item.createdAtUtc ?? item.CreatedAtUtc ?? null;

  const url =
    toAbsoluteNotificationUrl(
      data?.url ||
      data?.Url ||
      item.url ||
      item.Url ||
      null
    );

  return {
    id,
    type,
    title,
    message,
    isRead,
    createdAtUtc,
    data,
    url
  };
}

export async function getNotifications() {
  const data = await get("/api/notifications");

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(normalizeNotificationItem);
}

const UNREAD_COUNT_CACHE_MS = 60000;
let unreadCountPromise = null;

function getUnreadCountCacheKey() {
  const rawUser = localStorage.getItem("classclick_user");

  let userId = "anonymous";

  try {
    const user = rawUser ? JSON.parse(rawUser) : null;
    userId = user?.id || user?.userId || "anonymous";
  } catch {
  }

  return `classclick_unread_count:${userId}`;
}

export async function getUnreadCount(force = false) {
  const cacheKey = getUnreadCountCacheKey();

  if (!force) {
    const raw = sessionStorage.getItem(cacheKey);

    if (raw) {
      try {
        const cached = JSON.parse(raw);

        if (Date.now() - cached.at < UNREAD_COUNT_CACHE_MS) {
          return Number(cached.count || 0);
        }
      } catch {
      }
    }
  }

  if (!unreadCountPromise) {
    unreadCountPromise = get("/api/notifications/unread-count")
      .then((data) => {
        const count = typeof data === "number"
          ? Number(data)
          : Number(data?.count ?? data?.unreadCount ?? data?.unread ?? 0);

        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            count,
            at: Date.now()
          })
        );

        return count;
      })
      .finally(() => {
        unreadCountPromise = null;
      });
  }

  return unreadCountPromise;
}

export async function markAsRead(id) {
  await post(`/api/notifications/${id}/read`);
  return true;
}

export async function markAllAsRead() {
  await post("/api/notifications/read-all");
  return true;
}

export async function deleteNotification(id) {
  await del(`/api/notifications/${id}`);
  return true;
}

export async function deleteAllNotifications() {
  await del("/api/notifications/mine");
  return true;
}

export function formatNotificationDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}