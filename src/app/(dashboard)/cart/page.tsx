"use client";
import { useEffect, useState, useCallback } from "react";
import { ShoppingCart, Trash2, Plus, Minus, FlaskConical, AlertTriangle, Package, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CartData, CartItem } from "@/types";

export default function CartPage() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      setCart(data.cart);
    } catch {
      setError("Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const updateQuantity = async (itemId: string, quantity: number) => {
    setUpdatingItemId(itemId);
    try {
      const res = await api.patch(`/api/cart/${itemId}`, { quantity });
      if (res.ok) await fetchCart();
      else {
        const data = await res.json();
        alert(data.error || "Failed to update quantity");
      }
    } finally {
      setUpdatingItemId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdatingItemId(itemId);
    try {
      const res = await api.delete(`/api/cart/${itemId}`);
      if (res.ok) await fetchCart();
    } finally {
      setUpdatingItemId(null);
    }
  };

  const clearCart = async () => {
    try {
      const res = await api.delete("/api/cart");
      if (res.ok) await fetchCart();
    } catch {
      alert("Failed to clear cart");
    }
  };

  const hasPrescriptionItems = cart?.items.some(i => i.medication.requiresPrescription) ?? false;
  const dispensaryName = cart?.items[0]?.dispensary.name ?? "";

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        {[1,2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">{error}</p>
      </div>
    </div>
  );

  if (!cart || cart.items.length === 0) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center py-16">
        <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Search for medications and add them to your cart.</p>
        <Link href="/search" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
          Browse Medications <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''} · {dispensaryName}</p>
        </div>
        <button onClick={clearCart} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 className="h-4 w-4" /> Clear cart
        </button>
      </div>

      {/* Prescription Warning */}
      {hasPrescriptionItems && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl flex gap-3">
          <FlaskConical className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-900">Prescription required</p>
            <p className="text-xs text-purple-700 mt-0.5">Some items require a valid prescription. Checkout is disabled. Please contact the dispensary directly.</p>
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="space-y-3 mb-6">
        {cart.items.map((item: CartItem) => (
          <div key={item.id} className={cn("bg-white rounded-xl border p-4", updatingItemId === item.id && "opacity-60 pointer-events-none")}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 truncate">{item.medication.name}</h3>
                  {item.medication.requiresPrescription && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                      <FlaskConical className="h-3 w-3" /> Rx
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{item.medication.category}{item.medication.dosage ? ` · ${item.medication.dosage}` : ''}</p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Package className="h-3 w-3" />{item.dispensary.name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">R{(item.priceAtAdd * item.quantity).toFixed(2)}</p>
                <p className="text-xs text-gray-500">R{item.priceAtAdd.toFixed(2)} each</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {item.quantity === 1 ? <Trash2 className="h-3.5 w-3.5 text-red-500" /> : <Minus className="h-3.5 w-3.5 text-gray-600" />}
                </button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <Plus className="h-3.5 w-3.5 text-gray-600" />
                </button>
              </div>
              <button onClick={() => removeItem(item.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors">Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600">Subtotal ({cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''})</span>
          <span className="text-lg font-bold text-gray-900">R{cart.total.toFixed(2)}</span>
        </div>
        <div className="text-xs text-gray-500 mb-4">Click &amp; Collect from <span className="font-medium">{dispensaryName}</span></div>
        {hasPrescriptionItems ? (
          <button disabled className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-400 py-3 rounded-lg font-medium cursor-not-allowed">
            Checkout unavailable — prescription required
          </button>
        ) : (
          <Link href="/checkout" className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
            Proceed to Checkout <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
