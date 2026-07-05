"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, FileText, Pencil } from "lucide-react";
import { api } from "@/lib/api";

interface Medication {
  id: string;
  name: string;
  description: string | null;
  category: string;
  dosage: string | null;
  manufacturer: string | null;
  requiresPrescription: boolean;
}

export default function AdminMedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Medication>>({});
  const [editLoading, setEditLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    dosage: "",
    manufacturer: "",
    requiresPrescription: false,
  });

  const fetchMedications = async () => {
    try {
      const res = await api.get("/api/medications");
      if (res.ok) {
        const data = await res.json();
        setMedications(data.medications || []);
      }
    } catch (err) {
      console.error("Failed to fetch medications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    fetchMedications();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const res = await api.post("/api/medications", formData);

      if (res.ok) {
        setFormData({
          name: "",
          description: "",
          category: "",
          dosage: "",
          manufacturer: "",
          requiresPrescription: false,
        });
        setShowForm(false);
        fetchMedications();
      } else {
        const data = await res.json();
        setFormError(data.error || "Failed to create medication");
      }
    } catch {
      setFormError("An unexpected error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this medication?")) return;

    try {
      const res = await api.delete(`/api/medications/${id}`);
      if (res.ok) {
        fetchMedications();
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleEdit = (med: Medication) => {
    setEditingId(med.id);
    setEditData({ ...med });
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setEditLoading(true);
    try {
      const res = await api.put(`/api/medications/${editingId}`, editData);
      if (res.ok) {
        setEditingId(null);
        fetchMedications();
      }
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medications</h1>
          <p className="mt-1 text-gray-600">Manage all medications in the system</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Medication
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Medication</h2>

          {formError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rx"
                checked={formData.requiresPrescription}
                onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="rx" className="text-sm text-gray-700">Requires Prescription</label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Medication
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading medications...
        </div>
      ) : medications.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No medications yet</h3>
          <p className="text-sm text-gray-500 mt-1">Add your first medication to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Dosage</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Manufacturer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Rx</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {medications.map((med) =>
                  editingId === med.id ? (
                    <tr key={med.id} className="bg-emerald-50">
                      <td className="px-4 py-2">
                        <input value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="w-full px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editData.category || ""} onChange={(e) => setEditData({ ...editData, category: e.target.value })} className="w-full px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editData.dosage || ""} onChange={(e) => setEditData({ ...editData, dosage: e.target.value })} className="w-full px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editData.manufacturer || ""} onChange={(e) => setEditData({ ...editData, manufacturer: e.target.value })} className="w-full px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={editData.requiresPrescription || false} onChange={(e) => setEditData({ ...editData, requiresPrescription: e.target.checked })} className="rounded border-gray-300 text-emerald-600" />
                      </td>
                      <td className="px-4 py-2 text-right space-x-1">
                        <button onClick={handleEditSave} disabled={editLoading} className="px-2 py-1 text-xs font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50">
                          {editLoading ? "Saving..." : "Save"}
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200">
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={med.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{med.name}</td>
                      <td className="px-4 py-3 text-gray-600">{med.category}</td>
                      <td className="px-4 py-3 text-gray-600">{med.dosage || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{med.manufacturer || "—"}</td>
                      <td className="px-4 py-3">
                        {med.requiresPrescription ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Rx</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button onClick={() => handleEdit(med)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(med.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
