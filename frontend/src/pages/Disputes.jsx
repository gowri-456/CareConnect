import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { request } from "../api";
import Loading from "../components/Loading";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { normalizeRole } from "../utils/roles";
import BackButton from "../components/BackButton";

export default function Disputes() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const canResolve = ["admin", "ops_manager", "support_agent"].includes(role);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const load = () => request({ url: "/disputes" }).then((d) => setData(d.data || [])).catch(() => setData([]));
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => ({
    active: (data || []).filter((d) => d.status !== "resolved"),
    resolved: (data || []).filter((d) => d.status === "resolved"),
  }), [data]);

  if (data === null) return <Loading />;

  const resolve = async () => {
    setError("");
    try {
      await request({ url: `/disputes/${selected._id}/resolve`, method: "PATCH", data: { outcome, notes, refundAmount: 0 } });
      setSelected(null);
      setOutcome("");
      setNotes("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <BackButton />
      <h1 className="page-title">Disputes</h1>
      <p className="mt-2 muted">Review escalations and record outcomes.</p>
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <DisputeList title="Active escalations" data={grouped.active} onSelect={setSelected} />
      <DisputeList title="Resolved history" data={grouped.resolved} onSelect={setSelected} />

      {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">{canResolve ? "Resolve dispute" : "Dispute details"}</h2>
              <div className="mt-1"><StatusBadge status={selected.status} /></div>
            </div>
            <button onClick={() => setSelected(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
          </div>
          <p className="mt-4 text-sm text-slate-600">{selected.description}</p>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
            <div><b>Raised by:</b> {selected.raisedBy?.name || "User"}</div>
            <div className="mt-1"><b>Assigned:</b> {selected.assignedAgent?.name || "Unassigned"}</div>
          </div>
          {canResolve && selected.status !== "resolved" ? <>
            <label className="label mt-5">Outcome</label>
            <input className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Partial refund approved" />
            <label className="label mt-4">Resolution notes</label>
            <textarea className="input" rows="4" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button disabled={!outcome} onClick={resolve} className="btn-primary mt-4 w-full">Resolve dispute</button>
          </> : <p className="mt-5 text-sm text-slate-500">{selected.resolution?.outcome || "This role can review disputes but cannot resolve them."}</p>}
        </div>
      </div>}
    </div>
  );
}

function DisputeList({ title, data, onSelect }) {
  return <div className="card mt-6 divide-y"><div className="p-5 font-bold">{title}</div>{data.map((d) => <button key={d._id} onClick={() => onSelect(d)} className="block w-full p-5 text-left hover:bg-slate-50"><div className="flex justify-between gap-4"><div><div className="font-semibold">{d.type || "Service issue"}</div><p className="mt-1 line-clamp-2 text-sm text-slate-500">{d.description}</p><div className="mt-2 text-xs text-slate-400">{d.raisedBy?.name || "User"} - {new Date(d.createdAt).toLocaleString()}</div></div><StatusBadge status={d.status} /></div></button>)}{!data.length && <div className="p-12 text-center text-sm text-slate-500">No disputes found.</div>}</div>;
}
