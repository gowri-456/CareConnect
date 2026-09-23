import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, LifeBuoy, RefreshCw } from "lucide-react";
import { request } from "../api";
import Loading from "../components/Loading";
import StatusBadge from "../components/StatusBadge";

export default function SupportDashboard() {
  const [disputes, setDisputes] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    request({ url: "/disputes" })
      .then((d) => setDisputes(d.data || []))
      .catch(() => {
        setError("Support queue could not be loaded.");
        setDisputes([]);
      });
  };

  useEffect(() => { const timer = setTimeout(load, 0); return () => clearTimeout(timer); }, []);

  if (disputes === null) return <Loading />;

  const open = disputes.filter((d) => d.status !== "resolved");
  const resolved = disputes.filter((d) => d.status === "resolved");

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-blue-600">Support workspace</div>
          <h1 className="page-title mt-1">Escalation queue</h1>
          <p className="mt-2 muted">Review customer and provider issues, then record clear outcomes.</p>
        </div>
        <button className="btn-secondary" onClick={load}><RefreshCw size={16} />Refresh</button>
      </div>

      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Metric icon={LifeBuoy} n={disputes.length} l="Total disputes" />
        <Metric icon={AlertCircle} n={open.length} l="Needs attention" />
        <Metric icon={CheckCircle2} n={resolved.length} l="Resolved" />
      </div>

      <div className="card mt-7 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Priority escalations</h2>
          <Link to="/disputes" className="text-sm font-semibold text-blue-600">Open all</Link>
        </div>
        <div className="mt-4 divide-y">
          {open.slice(0, 6).map((d) => (
            <Link key={d._id} to="/disputes" className="block py-4 hover:bg-slate-50">
              <div className="flex justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{d.type || "Service issue"}</div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{d.description}</p>
                  <div className="mt-2 text-xs text-slate-400">{d.raisedBy?.name || "User"} - {new Date(d.createdAt).toLocaleString()}</div>
                </div>
                <StatusBadge status={d.status} />
              </div>
            </Link>
          ))}
          {!open.length && <div className="py-8 text-center text-sm text-slate-500">No open escalations right now.</div>}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, n, l }) {
  return <div className="card p-5"><Icon size={19} className="text-blue-600" /><div className="mt-3 text-2xl font-bold">{n}</div><div className="text-sm text-slate-500">{l}</div></div>;
}
