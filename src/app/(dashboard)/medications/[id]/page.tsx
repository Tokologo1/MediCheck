"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pill,
  Building2,
  MapPin,
  Phone,
  Clock,
  Package,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";

interface InventoryEntry {
  dispensaryId: string;
  dispensaryName: string;
  dispensaryAddress: string;
  dispensaryPhone?: string | null;
  operatingHours?: string | null;
  quantityInStock: number;
  price: number;
  inStock: boolean;
}

interface MedicationDetail {
  id: string;
  name: string;
  description: string | null;
  category: string;
  dosage: string | null;
  manufacturer: string | null;
  requiresPrescription: boolean;
  availableAt: InventoryEntry[];
}

export default function MedicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [medication, setMedication] = useState<MedicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        // Use search API for rich availability data
        const res = await api.get(`/api/search?q=${encodeURIComponent(id)}&id=${id}`);
        if (res.ok) {
          const data = await res.json();
          // Find exact match by id from results
          const found = data.results?.find((r: MedicationDetail) => r.id === id);
          if (found) {
            setMedication(found);
          } else {
            // Fallback: fetch directly
            const fallback = await api.get(`/api/medications/${id}`);
            if (fallback.ok) {
              const fd = await fallback.json();
              const med = fd.medication;
              setMedication({
                ...med,
                availableAt: (med.inventory || []).map((inv: {
                  dispensary: { id: string; name: string; address: string; phone?: string | null; operatingHours?: string | null };
                  quantityInStock: number;
                  price: number;
                }) => ({
                  dispensaryId: inv.dispensary.id,
                  dispensaryName: inv.dispensary.name,
                  dispensaryAddress: inv.dispensary.address,
                  dispensaryPhone: inv.dispensary.phone,
                  operatingHours: inv.dispensary.operatingHours,
                  quantityInStock: inv.quantityInStock,
                  price: inv.price,
                  inStock: inv.quantityInStock > 0,
                })),
              });
            } else {
              setError("Medication not found");
            }
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load medication details");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !medication) {
    return (
      <div className="text-center py-24">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">{error || "Not found"}</h2>
        <Link href="/search" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
          ← Back to Search
        </Link>
      </div>
    );
  }

  const inStockCount = medication.availableAt.filter((a) => a.inStock).length;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Medication Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <Pill className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{medication.name}</h1>
              {medication.requiresPrescription && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                  Prescription Required
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1">{medication.category}</p>
            {medication.description && (
              <p className="text-gray-600 mt-3 text-sm leading-relaxed">{medication.description}</p>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {medication.dosage && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Dosage</p>
              <p className="text-sm font-semibold text-gray-900">{medication.dosage}</p>
            </div>
          )}
          {medication.manufacturer && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Manufacturer</p>
              <p className="text-sm font-semibold text-gray-900">{medication.manufacturer}</p>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Available At</p>
            <p className="text-sm font-semibold text-gray-900">
              {inStockCount} of {medication.availableAt.length} dispensaries
            </p>
          </div>
        </div>
      </div>

      {/* Dispensary Availability */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-gray-400" />
        Dispensary Availability
      </h2>

      {medication.availableAt.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Not available at any dispensary yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {medication.availableAt.map((entry) => (
            <div
              key={entry.dispensaryId}
              className={`bg-white rounded-xl border p-5 transition-shadow hover:shadow-md ${
                entry.inStock ? "border-gray-200" : "border-red-100 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{entry.dispensaryName}</h3>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    entry.quantityInStock === 0
                      ? "bg-red-100 text-red-700"
                      : entry.quantityInStock < 10
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {entry.quantityInStock === 0
                    ? "Out of Stock"
                    : entry.quantityInStock < 10
                    ? `Low Stock (${entry.quantityInStock})`
                    : `In Stock (${entry.quantityInStock})`}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-gray-500">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{entry.dispensaryAddress}</span>
                </div>
                {entry.dispensaryPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{entry.dispensaryPhone}</span>
                  </div>
                )}
                {entry.operatingHours && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>{entry.operatingHours}</span>
                  </div>
                )}
              </div>

              {entry.inStock && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Price</span>
                  <span className="text-lg font-bold text-emerald-700">
                    R {entry.price.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
