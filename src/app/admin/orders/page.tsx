"use client";
import { useEffect, useState, useCallback } from "react";
import { Package, Clock, CheckCircle, XCircle, ChevronDown, RefreshCw, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

const ALL_STATUSES: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "READY_FOR_COLLECTION", "COLLECTED", "CANCELLED"];

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "Pending Payment", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Paid", color: "bg-blue-100 text-blue-800" },
  READY_FOR_COLLECTION: { label: "Ready to Collect", color: "bg-emerald-100 text-emerald-800" },
  COLLECTED: { label: "Collected", color: "bg-gray-100 text-gray-700" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: "READY_FOR_COLLECTION",
  READY_FOR_COLLECTION: "COLLECTED",
};

interface AdminOrder extends Order {
  user: { id: string; name: string; email: string };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const url = filter === "ALL" ? "/api/admin/orders" : `/api/admin/orders?status=${filter}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await api.patch("/api/admin/orders", { orderId, status });
      if (res.ok) await fetchOrders();
      else {
        const d = await res.json();
        alert(d.error || "Failed to update status");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <button onClick={fetchOrders} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["ALL", ...ALL_STATUSES] as (OrderStatus | "ALL")[]).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
              filter === s ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            )}>
            {s === "ALL" ? "All Orders" : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No orders found.</div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const cfg = STATUS_CONFIG[order.status];
            const next = NEXT_STATUS[order.status];
            return (
              <div key={order.id} className={cn("bg-white rounded-xl border border-gray-200 p-4", updatingId === order.id && "opacity-60")}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono text-gray-500">#{order.id.slice(-8).toUpperCase()}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", cfg.color)}>{cfg.label}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">{order.user.name} <span className="text-gray-400 font-normal">({order.user.email})</span></p>
                    <p className="text-xs text-gray-500">{order.dispensary.name} · {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {new Date(order.createdAt).toLocaleDateString('en-ZA')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">R{order.totalAmount.toFixed(2)}</p>
                    {next && (
                      <button onClick={() => updateStatus(order.id, next)}
                        disabled={updatingId === order.id}
                        className="mt-2 text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                        Mark as {STATUS_CONFIG[next].label}
                      </button>
                    )}
                    {order.status === "PENDING_PAYMENT" && (
                      <button onClick={() => updateStatus(order.id, "CANCELLED")}
                        disabled={updatingId === order.id}
                        className="mt-2 block text-xs text-red-600 hover:text-red-700">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">{order.items.map(i => `${i.medication.name} ×${i.quantity}`).join(", ")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
