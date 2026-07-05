export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
        </div>
        <p className="text-sm text-gray-500 font-medium">Loading MediCheck...</p>
      </div>
    </div>
  );
}
