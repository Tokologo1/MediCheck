"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, SearchX } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import MedicationCard from "@/components/MedicationCard";

interface SearchResult {
  id: string;
  name: string;
  category: string;
  dosage: string | null;
  manufacturer: string | null;
  description: string | null;
  requiresPrescription: boolean;
  availableAt: {
    dispensaryId: string;
    dispensaryName: string;
    dispensaryAddress: string;
    dispensaryPhone?: string | null;
    operatingHours?: string | null;
    quantityInStock: number;
    price: number;
    inStock: boolean;
    lastRestocked?: Date;
  }[];
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotal(0);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();

      if (res.ok) {
        setResults(data.results || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial query load on mount
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    performSearch(newQuery);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Search Medications</h1>
        <p className="mt-1 text-gray-600">
          Find medication availability across all partner dispensaries
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <SearchBar onSearch={handleSearch} defaultValue={initialQuery} isLoading={loading} />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
          <p className="text-sm font-medium">Searching medications...</p>
        </div>
      )}

      {/* Results */}
      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <SearchX className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No medications found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try searching with a different name, category, or manufacturer.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Found <strong className="text-gray-900">{total}</strong> medication
            {total !== 1 ? "s" : ""} matching &quot;{query}&quot;
          </p>

          <div className="space-y-6">
            {results.map((medication) => (
              <MedicationCard key={medication.id} medication={medication} />
            ))}
          </div>
        </div>
      )}

      {/* Initial State */}
      {!loading && !searched && (
        <div className="text-center py-16">
          <SearchX className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Start searching</h3>
          <p className="mt-1 text-sm text-gray-500">
            Enter a medication name above to check availability
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["Paracetamol", "Amoxicillin", "Ibuprofen", "Vitamin D"].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSearch(suggestion)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
          <p className="text-sm font-medium">Loading search...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
