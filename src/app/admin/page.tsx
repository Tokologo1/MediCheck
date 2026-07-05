"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pill, Building2, AlertTriangle, ArrowRight, Package } from "lucide-react";
import { api } from "@/lib/api";

interface OverviewData {
  totalMedications: number;
  totalDispensaries: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<OverviewData>({
    totalMedications: 0,
    totalDispensaries: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get("/api/admin/stats");
        if (res.ok) {
          const stats = await res.json();
          setData(stats);
        }
      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
      }
    }

    fetchData();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-gray-600">Manage medications, dispensaries, and inventory</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Medications</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalMedications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dispensaries</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalDispensaries}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{data.lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 rounded-lg text-red-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">{data.outOfStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/admin/medications"
          className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:border-emerald-200 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-100 transition-colors">
            <Pill className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Manage Medications</h3>
            <p className="text-sm text-gray-500">Add, edit, or remove medications</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
        </Link>

        <Link
          href="/admin/dispensaries"
          className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Manage Dispensaries</h3>
            <p className="text-sm text-gray-500">Add, edit, or remove dispensaries</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
