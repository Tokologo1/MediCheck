export type { LoginInput, RegisterInput, MedicationSearchInput, MedicationCreateInput, DispensaryCreateInput, InventoryUpdateInput, CartAddInput, CartUpdateInput, OrderStatusInput } from "@/lib/validators";

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

// ─── Cart & Order Types ───────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  medicationId: string;
  dispensaryId: string;
  quantity: number;
  priceAtAdd: number;
  createdAt: string;
  medication: {
    id: string;
    name: string;
    category: string;
    requiresPrescription: boolean;
    dosage: string | null;
  };
  dispensary: {
    id: string;
    name: string;
    address: string;
    operatingHours: string | null;
  };
}

export interface CartData {
  id: string | null;
  items: CartItem[];
  total: number;
  itemCount: number;
}

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "READY_FOR_COLLECTION" | "COLLECTED" | "CANCELLED";

export interface OrderItem {
  id: string;
  medicationId: string;
  quantity: number;
  unitPrice: number;
  medication: {
    id: string;
    name: string;
    category: string;
    dosage?: string | null;
  };
}

export interface Order {
  id: string;
  userId: string;
  dispensaryId: string;
  status: OrderStatus;
  totalAmount: number;
  stripePaymentId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  dispensary: {
    id: string;
    name: string;
    address: string;
    phone?: string | null;
    operatingHours?: string | null;
  };
  items: OrderItem[];
}

