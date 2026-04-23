import { getConfig } from "./config.js";

function getKeys() {
  return getConfig().storageKeys;
}

export function setToken(token) {
  localStorage.setItem(getKeys().token, token);
}

export function getToken() {
  return localStorage.getItem(getKeys().token);
}

export function removeToken() {
  localStorage.removeItem(getKeys().token);
}

export function setRefreshToken(refreshToken) {
  localStorage.setItem(getKeys().refreshToken, refreshToken);
}

export function getRefreshToken() {
  return localStorage.getItem(getKeys().refreshToken);
}

export function removeRefreshToken() {
  localStorage.removeItem(getKeys().refreshToken);
}

export function setAccessTokenExpiresAtUtc(value) {
  localStorage.setItem(getKeys().accessTokenExpiresAtUtc, value);
}

export function getAccessTokenExpiresAtUtc() {
  return localStorage.getItem(getKeys().accessTokenExpiresAtUtc);
}

export function removeAccessTokenExpiresAtUtc() {
  localStorage.removeItem(getKeys().accessTokenExpiresAtUtc);
}

export function setUser(user) {
  localStorage.setItem(getKeys().user, JSON.stringify(user));
}

export function getUser() {
  const raw = localStorage.getItem(getKeys().user);
  return raw ? JSON.parse(raw) : null;
}

export function removeUser() {
  localStorage.removeItem(getKeys().user);
}

export function setActiveCompanySlug(companySlug) {
  localStorage.setItem(getKeys().activeCompanySlug, companySlug);
}

export function getActiveCompanySlug() {
  return localStorage.getItem(getKeys().activeCompanySlug);
}

export function removeActiveCompanySlug() {
  localStorage.removeItem(getKeys().activeCompanySlug);
}

export function setActiveRole(role) {
  localStorage.setItem(getKeys().activeRole, role);
}

export function getActiveRole() {
  return localStorage.getItem(getKeys().activeRole);
}

export function removeActiveRole() {
  localStorage.removeItem(getKeys().activeRole);
}

export function setActiveCompany(company) {
  localStorage.setItem("classclick_active_company", JSON.stringify(company));
}

export function getActiveCompany() {
  const raw = localStorage.getItem("classclick_active_company");
  return raw ? JSON.parse(raw) : null;
}

export function removeActiveCompany() {
  localStorage.removeItem("classclick_active_company");
}

export function clearSession() {
  removeToken();
  removeRefreshToken();
  removeAccessTokenExpiresAtUtc();
  removeUser();
  removeActiveCompanySlug();
  removeActiveRole();
  removeActiveCompany();
}