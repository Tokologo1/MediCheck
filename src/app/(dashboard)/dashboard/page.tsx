"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Building2, Pill, ArrowRight, TrendingUp } from "lucide-react";

interface Stats {
  totalMedications: number;
  totalDispensaries: number;
  lowStockItems: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalMedications: 0,
    totalDispensaries: 0,
    lowStockItems: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [medRes, dispRes] = await Promise.all([
          fetch("/api/medications"),
          fetch("/api/dispensaries"),
          fetch("/api/search?q="),
        ]);

        if (medRes.ok) {
          const medData = await medRes.json();
          setStats((prev) => ({ ...prev, totalMedications: medData.pagination?.total || 0 }));
        }
        if (dispRes.ok) {
          const dispData = await dispRes.json();
          setStats((prev) => ({ ...prev, totalDispensaries: dispData.dispensaries?.length || 0 }));
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    }

    fetchStats();
  }, []);

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to MediCheck</h1>
        <p className="mt-1 text-gray-600">
          Check medication availability across all partner dispensaries.
        </p>
      </div>

      {/* Quick Search */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 lg:p-8 text-white mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Search className="h-6 w-6" />
          <h2 className="text-xl font-semibold">Quick Search</h2>
        </div>
        <p className="text-emerald-100 mb-4">
          Find out if your medication is available at a dispensary near you.
        </p>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-50 transition-colors"
        >
          Search Medications
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Pill className="h-5 w-5" />}
          label="Total Medications"
          value={stats.totalMedications}
          color="emerald"
        />
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          label="Partner Dispensaries"
          value={stats.totalDispensaries}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Real-time Updates"
          value="Live"
          color="purple"
        />
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/search"
          className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:border-emerald-200 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-100 transition-colors">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Search Medications</h3>
            <p className="text-sm text-gray-500">Find availability across all dispensaries</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 ml-auto group-hover:text-emerald-600 transition-colors" />
        </Link>

        <Link
          href="/search?q=paracetamol"
          className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
            <Pill className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Popular: Paracetamol</h3>
            <p className="text-sm text-gray-500">Quick check for common pain relief</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 ml-auto group-hover:text-blue-600 transition-colors" />
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
  }[color] || "bg-gray-50 text-gray-600";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colorClasses}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
