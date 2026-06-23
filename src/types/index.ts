export type { LoginInput, RegisterInput, MedicationSearchInput, MedicationCreateInput, DispensaryCreateInput, InventoryUpdateInput } from "@/lib/validators";

export interface MedicationWithInventory {
  id: string;
  name: string;
  description: string | null;
  category: string;
  dosage: string | null;
  manufacturer: string | null;
  requiresPrescription: boolean;
  inventory?: {
    dispensaryId: string;
    dispensaryName?: string;
    quantityInStock: number;
    price: number;
    lastRestocked: Date;
  }[];
}

export interface DispensaryWithInventory {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  operatingHours: string | null;
  latitude: number | null;
  longitude: number | null;
  inventory: {
    medicationId: string;
    medicationName?: string;
    quantityInStock: number;
    price: number;
  }[];
}

export interface SearchResults {
  medications: {
    id: string;
    name: string;
    category: string;
    dosage: string | null;
    manufacturer: string | null;
    requiresPrescription: boolean;
    availableAt: {
      dispensaryId: string;
      dispensaryName: string;
      dispensaryAddress: string;
      quantityInStock: number;
      price: number;
      inStock: boolean;
    }[];
  }[];
  total: number;
}
