let appConfig = null;

export async function loadConfig() {
  if (appConfig) return appConfig;

  const response = await fetch("/public/config.json", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("No se pudo cargar public/config.json");
  }

  appConfig = await response.json();
  return appConfig;
}

export function getConfig() {
  if (!appConfig) {
    throw new Error("La configuración todavía no fue cargada. Ejecutá loadConfig() primero.");
  }

  return appConfig;
}

export function getApiBaseUrl() {
  return getConfig().apiBaseUrl;
}

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "CLASSCLICK_FORCE_RELOAD") {
            if (sessionStorage.getItem("sw_reloaded_v11") !== "true") {
                sessionStorage.setItem("sw_reloaded_v11", "true");
                window.location.reload();
            }
        }
    });

    navigator.serviceWorker.register("/service-worker.js").then((registration) => {
        registration.update();
    });
}