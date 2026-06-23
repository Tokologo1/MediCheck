import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const medicationSearchSchema = z.object({
  query: z.string().min(1, "Search query is required").max(200),
  category: z.string().optional(),
});

export const medicationCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required").max(100),
  dosage: z.string().optional(),
  manufacturer: z.string().optional(),
  requiresPrescription: z.boolean().default(false),
});

export const dispensaryCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  address: z.string().min(1, "Address is required").max(500),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  operatingHours: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const inventoryUpdateSchema = z.object({
  dispensaryId: z.string().min(1),
  medicationId: z.string().min(1),
  quantityInStock: z.number().int().min(0),
  price: z.number().min(0),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type MedicationSearchInput = z.infer<typeof medicationSearchSchema>;
export type MedicationCreateInput = z.infer<typeof medicationCreateSchema>;
export type DispensaryCreateInput = z.infer<typeof dispensaryCreateSchema>;
export type InventoryUpdateInput = z.infer<typeof inventoryUpdateSchema>;
