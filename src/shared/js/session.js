import {
  getToken,
  getRefreshToken,
  getAccessTokenExpiresAtUtc,
  getUser,
  getActiveCompanySlug,
  getActiveRole,
  clearSession
} from "./storage.js";

export function getSession() {
  return {
    token: getToken(),
    refreshToken: getRefreshToken(),
    accessTokenExpiresAtUtc: getAccessTokenExpiresAtUtc(),
    user: getUser(),
    activeCompanySlug: getActiveCompanySlug(),
    activeRole: getActiveRole()
  };
}

export function requireAuth() {
  const session = getSession();

  if (!session.token) {
    console.warn("SIN TOKEN - NO REDIRIJO PARA DEBUG");
    return null;
  }

  return session;
}

export function logoutAndRedirect() {
  clearSession();
  console.warn("LOGOUT - NO REDIRIJO PARA DEBUG");
}