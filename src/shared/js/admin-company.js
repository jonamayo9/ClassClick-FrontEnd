import { get } from "./api.js";
import {
  getActiveCompanySlug,
  setActiveCompanySlug,
  setActiveCompany,
  getActiveCompany,
  removeActiveCompany,
  removeActiveCompanySlug
} from "./storage.js";

function normalizeCompany(item) {
  if (!item) return null;

  return {
    id: item.id ?? item.companyId ?? null,
    slug: item.slug ?? item.companySlug ?? "",
    name: item.name ?? item.companyName ?? "Empresa",
    logoUrl: item.logoUrl ?? "",
    isActive: item.isActive ?? true,
    roles: Array.isArray(item.roles) ? item.roles : []
  };
}

export async function fetchAdminCompanies() {
  const response = await get("/api/admin/companies");
  const companies = Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.data)
        ? response.data
        : [];

  return companies.map(normalizeCompany).filter(Boolean);
}

export function getStoredActiveAdminCompany() {
  return getActiveCompany();
}

export function clearActiveAdminCompany() {
  removeActiveCompany();
  removeActiveCompanySlug();
}

export function setStoredActiveAdminCompany(company) {
  if (!company?.slug) return null;

  setActiveCompany(company);
  setActiveCompanySlug(company.slug);
  return company;
}

export async function resolveActiveAdminCompany() {
  const companies = await fetchAdminCompanies();
  const storedSlug = getActiveCompanySlug();

  if (!companies.length) {
    clearActiveAdminCompany();
    return {
      companies: [],
      activeCompany: null
    };
  }

  let activeCompany = null;

  if (storedSlug) {
    activeCompany = companies.find(x => x.slug === storedSlug) || null;
  }

  if (!activeCompany && companies.length === 1) {
    activeCompany = companies[0];
  }

  if (!activeCompany) {
    activeCompany = companies[0];
  }

  setStoredActiveAdminCompany(activeCompany);

  return {
    companies,
    activeCompany
  };
}

export function getRequiredActiveCompanySlug() {
  const slug = getActiveCompanySlug();
  if (!slug) {
    throw new Error("No hay empresa activa seleccionada.");
  }
  return slug;
}

export function findCompanyBySlug(companies, slug) {
  return companies.find(x => x.slug === slug) || null;
}

export function changeActiveAdminCompany(companies, slug) {
  const company = findCompanyBySlug(companies, slug);
  if (!company) return null;

  setStoredActiveAdminCompany(company);
  return company;
}