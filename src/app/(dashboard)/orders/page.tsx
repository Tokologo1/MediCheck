"use client";
import { useEffect, useState } from "react";
import { Package, Clock, CheckCircle, XCircle, ShoppingBag, ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { Order, OrderStatus } from "@/types";

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  PENDING_PAYMENT: { label: "Pending Payment", icon: Clock, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  PAID: { label: "Paid", icon: CheckCircle, color: "text-blue-600 bg-blue-50 border-blue-200" },
  READY_FOR_COLLECTION: { label: "Ready for Collection", icon: Package, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  COLLECTED: { label: "Collected", icon: CheckCircle, color: "text-gray-600 bg-gray-50 border-gray-200" },
  CANCELLED: { label: "Cancelled", icon: XCircle, color: "text-red-600 bg-red-50 border-red-200" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then(r => r.json())
      .then(d => setOrders(d.orders ?? []))
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-40" />
        {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}
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

  if (orders.length === 0) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center py-16">
        <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h2>
        <p className="text-gray-500 mb-6">Your order history will appear here.</p>
        <Link href="/search" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
          Browse Medications <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>
      <div className="space-y-3">
        {orders.map((order: Order) => {
          const cfg = STATUS_CONFIG[order.status];
          const Icon = cfg.icon;
          return (
            <Link key={order.id} href={`/orders/${order.id}`} className="block bg-white rounded-xl border border-gray-200 hover:border-emerald-200 hover:shadow-sm transition-all p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                      <Icon className="h-3 w-3" />{cfg.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{order.dispensary.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{order.items.length} item{order.items.length !== 1 ? 's' : ''} · {new Date(order.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">R{order.totalAmount.toFixed(2)}</p>
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto mt-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
