import { get } from "./api.js";

/**
 * Este archivo queda preparado para conectar el endpoint real.
 * Apenas confirmemos la ruta verdadera, cambiamos SOLO esta constante.
 */
const COMPANY_ENDPOINTS = {
  list: "/api/superadmin/companies"
};

export async function getCompanies() {
  return await get(COMPANY_ENDPOINTS.list);
}

/**
 * Normaliza distintas formas posibles del backend.
 * Así evitamos romper la UI si la respuesta viene como:
 * - []
 * - { items: [] }
 * - { companies: [] }
 * - { data: [] }
 */
export function normalizeCompaniesResponse(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.companies)) return response.companies;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

export function mapCompany(company) {
  return {
    id: company?.id || "",
    name: company?.name || "-",
    slug: company?.slug || "-",
    email: company?.email || "-",
    phone: company?.phone || "-",
    isActive: company?.isActive ?? false,
    createdAtUtc: company?.createdAtUtc || null
  };
}