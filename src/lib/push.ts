import { config } from './config'

const SUBSCRIBED_KEY = 'classclick_push_subscribed'

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer
}

export async function subscribeToPush(token: string): Promise<boolean> {
  // Ya nos subscribimos antes, no repetir
  if (localStorage.getItem(SUBSCRIBED_KEY) === 'true') return true

  if (!('serviceWorker' in navigator)) return false
  if (!('PushManager' in window)) return false

  const registration = await navigator.serviceWorker.ready

  // Pide permiso al usuario (si ya denegó, el browser decide si muestra el prompt de nuevo)
  let permission = Notification.permission
  if (permission !== 'granted') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') return false

  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(config.vapidPublicKey),
    })
  }

  const json = subscription.toJSON()

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
      }),
    })
    if (!response.ok) return false
  } catch {
    return false
  }

  localStorage.setItem(SUBSCRIBED_KEY, 'true')
  return true
}
