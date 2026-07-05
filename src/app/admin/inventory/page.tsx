"use client";

import { useEffect, useState } from "react";
import { Package, Loader2, Save, Plus } from "lucide-react";
import { api } from "@/lib/api";

interface Dispensary {
  id: string;
  name: string;
  address: string;
}

interface Medication {
  id: string;
  name: string;
  category: string;
  dosage: string | null;
}

interface InventoryItem {
  medicationId: string;
  medicationName: string;
  medicationCategory: string;
  quantityInStock: number;
  price: number;
  lastRestocked: string;
}

export default function AdminInventoryPage() {
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedDispensary, setSelectedDispensary] = useState<string>("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Form for adding new inventory entry
  const [addMedId, setAddMedId] = useState("");
  const [addQty, setAddQty] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [dispRes, medRes] = await Promise.all([
        api.get("/api/dispensaries"),
        api.get("/api/medications?limit=200"),
      ]);
      if (dispRes.ok) {
        const d = await dispRes.json();
        setDispensaries(d.dispensaries || []);
      }
      if (medRes.ok) {
        const m = await medRes.json();
        setMedications(m.medications || []);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedDispensary) {
      setInventory([]);
      return;
    }
    async function loadInventory() {
      setLoading(true);
      try {
        const res = await api.get(`/api/dispensaries/${selectedDispensary}`);
        if (res.ok) {
          const data = await res.json();
          const items: InventoryItem[] = (data.dispensary.inventory || []).map(
            (inv: {
              medicationId: string;
              medication: { name: string; category: string };
              quantityInStock: number;
              price: number;
              lastRestocked: string;
            }) => ({
              medicationId: inv.medicationId,
              medicationName: inv.medication.name,
              medicationCategory: inv.medication.category,
              quantityInStock: inv.quantityInStock,
              price: inv.price,
              lastRestocked: inv.lastRestocked,
            })
          );
          setInventory(items);
        }
      } catch (err) {
        console.error("Failed to load inventory:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInventory();
  }, [selectedDispensary]);

  const handleUpdate = async (medicationId: string, qty: number, price: number) => {
    setSaving(medicationId);
    try {
      const res = await api.put("/api/inventory", {
        dispensaryId: selectedDispensary,
        medicationId,
        quantityInStock: qty,
        price,
      });
      if (res.ok) {
        setSaveSuccess(medicationId);
        setTimeout(() => setSaveSuccess(null), 2000);
        setInventory((prev) =>
          prev.map((item) =>
            item.medicationId === medicationId
              ? { ...item, quantityInStock: qty, price }
              : item
          )
        );
      }
    } catch (err) {
      console.error("Failed to update inventory:", err);
    } finally {
      setSaving(null);
    }
  };

  const handleAdd = async () => {
    if (!addMedId || !addQty || !addPrice) return;
    setAdding(true);
    try {
      const res = await api.put("/api/inventory", {
        dispensaryId: selectedDispensary,
        medicationId: addMedId,
        quantityInStock: parseInt(addQty),
        price: parseFloat(addPrice),
      });
      if (res.ok) {
        const med = medications.find((m) => m.id === addMedId);
        if (med) {
          setInventory((prev) => [
            ...prev.filter((i) => i.medicationId !== addMedId),
            {
              medicationId: addMedId,
              medicationName: med.name,
              medicationCategory: med.category,
              quantityInStock: parseInt(addQty),
              price: parseFloat(addPrice),
              lastRestocked: new Date().toISOString(),
            },
          ]);
        }
        setAddMedId("");
        setAddQty("");
        setAddPrice("");
        setShowAddForm(false);
      }
    } catch (err) {
      console.error("Failed to add inventory:", err);
    } finally {
      setAdding(false);
    }
  };

  const selectedDispensaryName =
    dispensaries.find((d) => d.id === selectedDispensary)?.name || "";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="mt-1 text-gray-600">
            Assign medications to dispensaries with stock levels and pricing
          </p>
        </div>
      </div>

      {/* Dispensary Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Dispensary
        </label>
        <select
          value={selectedDispensary}
          onChange={(e) => setSelectedDispensary(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">— Choose a dispensary —</option>
          {dispensaries.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedDispensary && (
        <div className="text-center py-16 text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Select a dispensary to manage its inventory</p>
        </div>
      )}

      {selectedDispensary && (
        <>
          {/* Header + Add button */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {selectedDispensaryName} — Stock
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Medication
            </button>
          </div>

          {/* Add medication form */}
          {showAddForm && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Add / Update Medication Stock
              </h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-48">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Medication
                  </label>
                  <select
                    value={addMedId}
                    onChange={(e) => setAddMedId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">— Select medication —</option>
                    {medications.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-28 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Price (R)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                    placeholder="e.g. 29.99"
                    className="w-28 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={handleAdd}
                  disabled={adding || !addMedId || !addQty || !addPrice}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {adding ? "Adding..." : "Add"}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Inventory table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading inventory...
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No medications in stock</h3>
              <p className="text-sm text-gray-500 mt-1">
                Click &quot;Add Medication&quot; to assign medications to this dispensary
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Medication</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Stock</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Price (R)</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Save</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventory.map((item) => (
                      <InventoryRow
                        key={item.medicationId}
                        item={item}
                        saving={saving === item.medicationId}
                        saved={saveSuccess === item.medicationId}
                        onSave={handleUpdate}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InventoryRow({
  item,
  saving,
  saved,
  onSave,
}: {
  item: InventoryItem;
  saving: boolean;
  saved: boolean;
  onSave: (medicationId: string, qty: number, price: number) => void;
}) {
  const [qty, setQty] = useState(item.quantityInStock);
  const [price, setPrice] = useState(item.price);

  const stockStatus =
    qty === 0
      ? { label: "Out of Stock", cls: "bg-red-100 text-red-700" }
      : qty < 10
      ? { label: "Low Stock", cls: "bg-amber-100 text-amber-700" }
      : { label: "In Stock", cls: "bg-emerald-100 text-emerald-700" };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">{item.medicationName}</td>
      <td className="px-4 py-3 text-gray-500">{item.medicationCategory}</td>
      <td className="px-4 py-3">
        <input
          type="number"
          min="0"
          value={qty}
          onChange={(e) => setQty(parseInt(e.target.value) || 0)}
          className="w-20 px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
          className="w-24 px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${stockStatus.cls}`}>
          {stockStatus.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onSave(item.medicationId, qty, price)}
          disabled={saving}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg ml-auto transition-colors ${
            saved
              ? "bg-emerald-100 text-emerald-700"
              : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          }`}
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          {saved ? "Saved!" : saving ? "Saving..." : "Save"}
        </button>
      </td>
    </tr>
  );
}
