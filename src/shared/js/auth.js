import { post, get, apiFetch } from "./api.js";

import {
  setToken,
  setRefreshToken,
  setAccessTokenExpiresAtUtc,
  setUser,
  setActiveCompanySlug,
  setActiveRole,
  setMe,
  clearSession
} from "./storage.js";

function normalizeLoginResponse(data) {
  const token =
    data?.token ||
    data?.jwt ||
    data?.accessToken ||
    data?.access_token;

  const refreshToken =
    data?.refreshToken ||
    data?.refresh_token ||
    "";

  const accessTokenExpiresAtUtc =
    data?.accessTokenExpiresAtUtc ||
    data?.access_token_expires_at_utc ||
    "";

  const user =
    data?.user ||
    data?.me ||
    data;

  const companies =
    user?.companies ||
    data?.companies ||
    [];

  return {
    token,
    refreshToken,
    accessTokenExpiresAtUtc,
    user,
    companies
  };
}

async function clearClientCache() {
  try {
    const keysToRemove = [
      "classclick_student_me",
      "classclick_admin_me",
      "classclick_me",
      "classclick_notifications",
      "classclick_matches",
      "classclick_courses",
      "classclick_payments",
      "classclick_profile"
    ];

    keysToRemove.forEach(k => localStorage.removeItem(k));

    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(n => n.includes("classclick"))
          .map(n => caches.delete(n))
      );
    }
  } catch (e) {
    console.warn("Error limpiando cache cliente", e);
  }
}

function resolveFirstCompany(companies) {
  if (!Array.isArray(companies) || companies.length === 0) return null;
  return companies[0];
}

function resolveRole(company) {
  if (!company) return null;

  if (company.activeRole) return company.activeRole;
  if (company.role) return company.role;

  if (Array.isArray(company.roles) && company.roles.length > 0) {
    return company.roles[0];
  }

  return null;
}

function resolveCompanySlug(company) {
  if (!company) return null;
  return company.slug || company.companySlug || null;
}

export async function login(email, password) {
  clearSession();
  await clearClientCache();

  const data = await post("/api/auth/login", {
    email,
    password
  });

  const normalized = normalizeLoginResponse(data);

  if (!normalized.token) {
    throw new Error("El login no devolvió token.");
  }

  if (!normalized.refreshToken) {
    throw new Error("El login no devolvió refresh token.");
  }

  setToken(normalized.token);
  setRefreshToken(normalized.refreshToken);
  setAccessTokenExpiresAtUtc(normalized.accessTokenExpiresAtUtc);
  setUser(normalized.user);
try {
  const me = await get("/api/admin/me");
  setMe(me);
} catch (error) {
  console.warn("No se pudo guardar me en cache:", error);
}

  const firstCompany = resolveFirstCompany(normalized.companies);
  const companySlug = resolveCompanySlug(firstCompany);
  const role = resolveRole(firstCompany);

  if (companySlug) {
    setActiveCompanySlug(companySlug);
  }

  if (role) {
    setActiveRole(role);
  }

  return normalized;
}

export async function logout() {
  await unsubscribePushCurrentDevice();
  clearSession();
}

async function unsubscribePushCurrentDevice() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return;
    }

    await apiFetch("/api/notifications/unsubscribe", {
      method: "POST",
      body: {
        endpoint: subscription.endpoint
      }
    });

    await subscription.unsubscribe();
  } catch (error) {
    console.warn("No se pudo desuscribir push del dispositivo:", error);
  }
}