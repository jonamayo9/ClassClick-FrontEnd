import { createElement, Fragment } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/stores/auth'

// Contexto de empresa para el módulo Clothing.
// Deportivo: usa activeCompanySlug (auth store).
// Educativo Admin: el slug viene del path `/educativa/:companySlug/clothing`.
// Educativo Student: usa activeCompanySlug (el alumno tiene una empresa activa).
let pathSlug: string | null = null

export function setClothingPathSlug(slug: string | null) {
  pathSlug = slug
}

export function clothingCompanySlug(): string {
  return pathSlug ?? useAuth.getState().activeCompanySlug ?? ''
}

/** Vincula el slug del path (si existe) al contexto Clothing durante el render. */
export function ClothingSlugBinder({ children }: { children: React.ReactNode }) {
  const { companySlug } = useParams<{ companySlug: string }>()
  setClothingPathSlug(companySlug ?? null)
  return createElement(Fragment, null, children)
}

export type ClothingVertical = 'sports' | 'educational'

/** BasePath de la tienda según la vertical y el rol (se usa para navegación/retornos). */
export function clothingBasePath(vertical: ClothingVertical, role: 'admin' | 'student'): string {
  if (vertical === 'educational') {
    return role === 'admin'
      ? `/educativa/${clothingCompanySlug()}/clothing`
      : '/estudiante/tienda'
  }
  return role === 'admin' ? '/admin/clothing' : '/student/clothing'
}

export function clothingStudentOrderPath(vertical: ClothingVertical): string {
  return vertical === 'educational' ? '/estudiante/tienda/pedido' : '/student/clothing/order'
}

export function clothingStudentOrdersPath(vertical: ClothingVertical): string {
  return vertical === 'educational' ? '/estudiante/tienda/pedidos' : '/student/clothing/orders'
}

/** Detecta la vertical por la ruta actual (no requiere contexto adicional). */
export function isEducationalContext(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/estudiante')
}

export function studentClothingHomePath(): string {
  return isEducationalContext() ? '/estudiante/tienda' : '/student/clothing'
}

export function studentClothingOrdersPath(): string {
  return isEducationalContext() ? '/estudiante/tienda/pedidos' : '/student/clothing/orders'
}

export function studentClothingOrderPath(): string {
  return isEducationalContext() ? '/estudiante/tienda/pedido' : '/student/clothing/order'
}