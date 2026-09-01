"use client";

import { Pill, FileText, Building2, Clock, Phone, FlaskConical, ArrowRight, ShoppingCart, Loader2 } from "lucide-react";
import AvailabilityBadge from "./AvailabilityBadge";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";

interface DispensaryAvailability {
  dispensaryId: string;
  dispensaryName: string;
  dispensaryAddress: string;
  dispensaryPhone?: string | null;
  operatingHours?: string | null;
  quantityInStock: number;
  price: number;
  inStock: boolean;
  lastRestocked?: Date;
}

interface MedicationCardProps {
  medication: {
    id: string;
    name: string;
    category: string;
    dosage?: string | null;
    manufacturer?: string | null;
    description?: string | null;
    requiresPrescription: boolean;
    availableAt: DispensaryAvailability[];
  };
}

export default function MedicationCard({ medication }: MedicationCardProps) {
  const availableCount = medication.availableAt.filter((d) => d.inStock).length;
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddToCart = async (disp: DispensaryAvailability) => {
    setAddingTo(disp.dispensaryId);
    setAddError(null);
    try {
      const res = await api.post("/api/cart", {
        medicationId: medication.id,
        dispensaryId: disp.dispensaryId,
        quantity: 1,
      });
      const data = await res.json();
      if (res.ok) {
        setAddedTo(disp.dispensaryId);
        setTimeout(() => setAddedTo(null), 2000);
      } else if (data.code === "DISPENSARY_MISMATCH") {
        setAddError("Cart has items from a different dispensary. Clear your cart first.");
      } else {
        setAddError(data.error || "Failed to add to cart");
      }
    } catch {
      setAddError("Failed to add to cart");
    } finally {
      setAddingTo(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Medication Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Pill className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{medication.name}</h3>
              <p className="text-sm text-gray-500">{medication.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {medication.requiresPrescription && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <FlaskConical className="h-3 w-3" />
                Rx
              </span>
            )}
            <Link
              href={`/medications/${medication.id}`}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              Details
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Medication Details */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {medication.dosage && (
            <div className="flex items-center gap-2 text-gray-600">
              <FileText className="h-4 w-4 text-gray-400" />
              <span>{medication.dosage}</span>
            </div>
          )}
          {medication.manufacturer && (
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span>{medication.manufacturer}</span>
            </div>
          )}
        </div>

        {medication.description && (
          <p className="mt-3 text-sm text-gray-500 line-clamp-2">{medication.description}</p>
        )}

        {/* Add error banner */}
        {addError && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {addError}
          </div>
        )}

        {/* Availability Summary */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              Available at {availableCount} of {medication.availableAt.length} dispensary
              {medication.availableAt.length !== 1 ? "ies" : "y"}
            </h4>
          </div>

          {/* Dispensary List */}
          <div className="space-y-2">
            {medication.availableAt.map((disp) => {
              const isAdding = addingTo === disp.dispensaryId;
              const isAdded = addedTo === disp.dispensaryId;
              return (
                <div
                  key={disp.dispensaryId}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    disp.inStock ? "border-emerald-200 bg-emerald-50/50" : "border-gray-200 bg-gray-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {disp.dispensaryName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{disp.dispensaryAddress}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {disp.operatingHours && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {disp.operatingHours}
                          </span>
                        )}
                        {disp.dispensaryPhone && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Phone className="h-3 w-3" />
                            {disp.dispensaryPhone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <AvailabilityBadge quantity={disp.quantityInStock} />
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        R{disp.price.toFixed(2)}
                      </p>
                      {disp.inStock && (
                        <button
                          onClick={() => handleAddToCart(disp)}
                          disabled={isAdding || !!addingTo}
                          className={cn(
                            "mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                            isAdded
                              ? "bg-emerald-600 text-white"
                              : "bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          )}
                        >
                          {isAdding ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-3 w-3" />
                          )}
                          {isAdded ? "Added!" : "Add to cart"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
