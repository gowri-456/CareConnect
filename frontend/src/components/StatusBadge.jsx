const map = {
  completed: "bg-emerald-50 text-emerald-700", verified: "bg-emerald-50 text-emerald-700", paid: "bg-emerald-50 text-emerald-700",
  scheduled: "bg-blue-50 text-blue-700", open_for_quotes: "bg-blue-50 text-blue-700", submitted: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700", investigating: "bg-amber-50 text-amber-700", pending: "bg-amber-50 text-amber-700",
  cancelled: "bg-red-50 text-red-700", rejected: "bg-red-50 text-red-700", disputed: "bg-red-50 text-red-700",
  quoted: "bg-violet-50 text-violet-700", accepted: "bg-emerald-50 text-emerald-700", withdrawn: "bg-slate-100 text-slate-600",
  pending_classification: "bg-slate-100 text-slate-600", issued: "bg-violet-50 text-violet-700"
};
export default function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-600"}`}>{String(status || "").replaceAll("_", " ")}</span>;
}