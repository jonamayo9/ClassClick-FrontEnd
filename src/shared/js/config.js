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