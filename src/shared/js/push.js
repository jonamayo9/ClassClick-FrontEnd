import { getConfig } from "/src/shared/js/config.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function subscribeToPush(token) {
  const config = getConfig();

  if (!("serviceWorker" in navigator))
    throw new Error("Este dispositivo no soporta service worker.");

  if (!("PushManager" in window))
    throw new Error("Este dispositivo no soporta notificaciones push.");

  const registration = await navigator.serviceWorker.ready;

  let permission = Notification.permission;

  if (permission !== "granted") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    throw new Error("Necesitás habilitar notificaciones para continuar.");
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey)
    });
  }

  const json = subscription.toJSON();

  const response = await fetch(`${config.apiBaseUrl}/api/notifications/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth
      }
    })
  });

  if (!response.ok) {
    throw new Error("No se pudo registrar la suscripción push.");
  }

  return true;
}