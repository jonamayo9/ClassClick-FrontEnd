import { getConfig } from "./config.js";
import {
  getToken,
  getRefreshToken,
  setToken,
  setRefreshToken,
  setAccessTokenExpiresAtUtc,
  setUser,
  clearSession
} from "./storage.js";

let refreshPromise = null;

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (response.status === 204) {
    return null;
  }

  if (contentType.includes("application/json")) {
    return await response.json();
  }

  return await response.text();
}

async function doFetch(endpoint, options = {}, tokenOverride = null) {
  const config = getConfig();
  const token = tokenOverride ?? getToken();

  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return await fetch(`${config.apiBaseUrl}${endpoint}`, {
    method: options.method || "GET",
    headers,
    body: options.body instanceof FormData
      ? options.body
      : options.body != null
        ? JSON.stringify(options.body)
        : undefined
  });
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return await refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    const config = getConfig();

    if (!refreshToken) {
      throw new Error("No hay refresh token.");
    }

    const response = await fetch(`${config.apiBaseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        refreshToken
      })
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      const message =
        typeof data === "string"
          ? data
          : data?.message || data?.title || "No se pudo refrescar la sesión.";

      throw new Error(message);
    }

    const newToken =
      data?.token ||
      data?.jwt ||
      data?.accessToken ||
      data?.access_token;

    const newRefreshToken =
      data?.refreshToken ||
      data?.refresh_token ||
      "";

    const accessTokenExpiresAtUtc =
      data?.accessTokenExpiresAtUtc ||
      data?.access_token_expires_at_utc ||
      "";

    if (!newToken || !newRefreshToken) {
      throw new Error("La API de refresh no devolvió tokens válidos.");
    }

    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setAccessTokenExpiresAtUtc(accessTokenExpiresAtUtc);

    if (data?.user) {
      setUser(data.user);
    }

    return newToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function apiFetch(endpoint, options = {}) {
  let response = await doFetch(endpoint, options);
  let data = await parseResponse(response);

  if (response.ok) {
    return data;
  }

  // if (response.status === 401) {
  //   try {
  //     const newToken = await refreshAccessToken();

  //     response = await doFetch(endpoint, options, newToken);
  //     data = await parseResponse(response);

  //     if (response.ok) {
  //       return data;
  //     }
  //   } catch {
  //     clearSession();
  //     window.location.href = "/src/pages/auth/login.html";
  //     throw new Error("Tu sesión expiró.");
  //   }

  //   if (response.status === 401) {
  //     clearSession();
  //     window.location.href = "/src/pages/auth/login.html";
  //     throw new Error("Tu sesión expiró.");
  //   }
  // }

  if (response.status === 401) {
  const text = await response.text();

  console.error("401 DETECTADO", {
    url: response.url,
    body: text
  });

  throw new Error(text || "No autorizado");
}

  const message =
    typeof data === "string"
      ? data
      : data?.message || data?.title || "Ocurrió un error en la solicitud.";

  throw new Error(message);
}

export function get(endpoint) {
  return apiFetch(endpoint, { method: "GET" });
}

export function post(endpoint, body) {
  return apiFetch(endpoint, { method: "POST", body });
}

export function put(endpoint, body) {
  return apiFetch(endpoint, { method: "PUT", body });
}

export function patch(endpoint, body) {
  return apiFetch(endpoint, { method: "PATCH", body });
}

export function del(endpoint) {
  return apiFetch(endpoint, { method: "DELETE" });
}

export function postForm(endpoint, formData) {
  return apiFetch(endpoint, { method: "POST", body: formData });
}