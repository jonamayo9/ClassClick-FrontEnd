import { create } from 'zustand'
import type { Company } from '@/types/auth'

interface CompanyState {
  companies: Company[]
  setCompanies: (companies: Company[]) => void
}

export const useCompany = create<CompanyState>((set) => ({
  companies: [],
  setCompanies: (companies) => set({ companies }),
}))
