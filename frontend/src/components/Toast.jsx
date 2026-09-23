export default function Toast({ message, type = "success", onClose }) {
  if (!message) return null;
  return (
    <div className={`fixed right-4 top-4 z-[100] max-w-sm rounded-2xl border bg-white px-4 py-3 shadow-2xl ${type === "error" ? "border-red-200" : "border-emerald-200"}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-1 h-2.5 w-2.5 rounded-full ${type === "error" ? "bg-red-500" : "bg-emerald-500"}`} />
        <div className="flex-1 text-sm font-medium text-slate-800">{message}</div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">×</button>
      </div>
    </div>
  );
}