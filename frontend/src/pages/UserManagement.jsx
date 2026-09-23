import { useEffect, useState } from "react";
import { RefreshCw, Trash2, UserRound, UserRoundCheck, UserRoundX } from "lucide-react";
import { request } from "../api";
import Loading from "../components/Loading";
import StatusBadge from "../components/StatusBadge";
import { roleLabel } from "../utils/roles";

export default function UserManagement() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = () => {
    setError("");
    request({ url: "/users" })
      .then((response) => setUsers(response.data || []))
      .catch((loadError) => {
        setUsers([]);
        setError(loadError.message);
      });
  };

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleStatus = async (user) => {
    setBusy(user._id);
    setError("");
    try {
      await request({ url: `/users/${user._id}/status`, method: "PATCH", data: { isActive: !user.isActive } });
      load();
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setBusy("");
    }
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}'s account?`)) return;
    setBusy(user._id);
    setError("");
    try {
      await request({ url: `/users/${user._id}`, method: "DELETE" });
      load();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusy("");
    }
  };

  if (users === null) return <Loading />;

  return <div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="text-sm font-semibold text-blue-600">Administration</div><h1 className="page-title mt-1">User management</h1><p className="mt-2 muted">Review accounts and control platform access.</p></div>
      <button className="btn-secondary" onClick={load}><RefreshCw size={16} />Refresh</button>
    </div>
    {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="card mt-7 overflow-hidden"><div className="divide-y">{users.map((user) => <div key={user._id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-100 text-emerald-800">{user.profilePicture?<img src={user.profilePicture} alt="" className="h-full w-full object-cover"/>:<UserRound size={18}/>}</div><div className="min-w-0"><div className="truncate font-semibold">{user.name}</div><div className="truncate text-sm text-slate-500">{user.email}</div><div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500">{roleLabel(user.role)}</span><StatusBadge status={user.isActive ? "active" : "inactive"} /></div></div></div><div className="flex gap-2"><button disabled={busy === user._id || user.role === "admin"} className={user.isActive ? "btn-danger" : "btn-primary"} onClick={() => toggleStatus(user)}>{user.isActive ? <UserRoundX size={16} /> : <UserRoundCheck size={16} />}{user.isActive ? "Deactivate" : "Activate"}</button><button disabled={busy === user._id || user.role === "admin"} className="btn-danger" onClick={() => removeUser(user)}><Trash2 size={16}/>Delete</button></div></div>)}{!users.length && <div className="p-12 text-center text-sm text-slate-500">No users found.</div>}</div></div>
  </div>;
}
