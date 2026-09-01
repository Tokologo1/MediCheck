"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Package, MapPin, Phone, Clock, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Order, OrderStatus } from "@/types";

const STATUS_STEPS: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "READY_FOR_COLLECTION", "COLLECTED"];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting Payment",
  PAID: "Payment Confirmed",
  READY_FOR_COLLECTION: "Ready for Collection",
  COLLECTED: "Collected",
  CANCELLED: "Cancelled",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.order) setOrder(d.order);
        else setError(d.error || "Order not found");
      })
      .catch(() => setError("Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    </div>
  );

  if (error || !order) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">{error || "Order not found"}</p>
        <Link href="/orders" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">Back to orders</Link>
      </div>
    </div>
  );

  const isCancelled = order.status === "CANCELLED";
  const currentStep = isCancelled ? -1 : STATUS_STEPS.indexOf(order.status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Order #{order.id.slice(-8).toUpperCase()}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <span className="text-xl font-bold text-gray-900">R{order.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Status</h2>
          {isCancelled ? (
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-red-700">Order Cancelled</span>
            </div>
          ) : (
            <div className="flex items-center gap-0">
              {STATUS_STEPS.map((step, idx) => {
                const done = idx <= currentStep;
                const active = idx === currentStep;
                return (
                  <div key={step} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${done ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-gray-300'}`}>
                        {done ? <CheckCircle className="h-5 w-5 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                      </div>
                      <span className={`text-xs mt-1 text-center max-w-16 leading-tight ${active ? 'text-emerald-700 font-semibold' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                        {STATUS_LABELS[step]}
                      </span>
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mb-5 ${idx < currentStep ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Items</h2>
          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.medication.name}</p>
                  <p className="text-xs text-gray-500">{item.medication.category}{item.medication.dosage ? ` · ${item.medication.dosage}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">R{(item.unitPrice * item.quantity).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">x{item.quantity} · R{item.unitPrice.toFixed(2)} each</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">R{order.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Collection Info */}
        <div className="p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Collection Details</h2>
          <div className="bg-emerald-50 rounded-lg p-4 space-y-2">
            <p className="font-medium text-emerald-900">{order.dispensary.name}</p>
            {order.dispensary.address && (
              <p className="text-sm text-emerald-700 flex items-start gap-2"><MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />{order.dispensary.address}</p>
            )}
            {order.dispensary.phone && (
              <p className="text-sm text-emerald-700 flex items-center gap-2"><Phone className="h-4 w-4" />{order.dispensary.phone}</p>
            )}
            {order.dispensary.operatingHours && (
              <p className="text-sm text-emerald-700 flex items-center gap-2"><Clock className="h-4 w-4" />{order.dispensary.operatingHours}</p>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3">Please bring your order confirmation (#{order.id.slice(-8).toUpperCase()}) and a valid ID when collecting.</p>
        </div>
      </div>
    </div>
  );
}
