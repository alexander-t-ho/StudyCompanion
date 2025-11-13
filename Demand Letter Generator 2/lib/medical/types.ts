export interface MedicalProvider {
  id: string
  providerName: string
  amount: number | null
  chronology: string | null
  summary: string | null
  isSelected: boolean
}

export interface MedicalProviderData {
  providerName: string
  amount?: number
  chronology: string
  summary: string
}

