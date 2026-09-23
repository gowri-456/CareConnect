import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Sparkles } from "lucide-react";
import { request } from "../api";
import Loading from "../components/Loading";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { normalizeRole } from "../utils/roles";

export default function Requests() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const url = role === "customer" ? "/service-requests/mine" : "/service-requests";
    request({ url })
      .then((d) => setData(Array.isArray(d.data) ? d.data : []))
      .catch((requestError) => {
        setData([]);
        setError(requestError.message);
      });
  }, [role]);

  const filtered = useMemo(() => {
    return (data || []).filter((x) => {
      const text = `${x.descriptionText || ""} ${x.category?.name || x.aiClassification?.category || ""}`.toLowerCase();
      return text.includes(q.toLowerCase());
    });
  }, [data, q]);

  if (data === null) return <Loading />;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Service requests</h1>
          <p className="mt-2 muted">{role === "customer" ? "Everything you have requested in one place." : "Monitor incoming service requests."}</p>
        </div>
        {role === "customer" && <Link to="/requests/new" className="btn-primary"><Plus size={18} />New request</Link>}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input className="input pl-10" placeholder="Search requests..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Unable to load requests</p>
          <p className="mt-1">{error}</p>
          <button type="button" className="mt-3 font-semibold underline" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {filtered.map((x) => (
          <Link to={`/requests/${x._id}`} key={x._id} className="card block p-5 hover:border-blue-200 hover:shadow-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="shrink-0 text-blue-500" />
                  <span className="truncate font-semibold">{x.descriptionText}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{x.category?.name || x.aiClassification?.category || "Pending classification"}</span>
                  <span>-</span>
                  <span>{new Date(x.createdAt).toLocaleDateString()}</span>
                  {x.aiClassification?.confidence > 0 && <>
                    <span>-</span>
                    <span>AI confidence {Math.round(x.aiClassification.confidence * 100)}%</span>
                  </>}
                </div>
              </div>
              <StatusBadge status={x.status} />
            </div>
          </Link>
        ))}
        {!filtered.length && <div className="card py-14 text-center text-sm text-slate-500">No matching requests.</div>}
      </div>
    </div>
  );
}
