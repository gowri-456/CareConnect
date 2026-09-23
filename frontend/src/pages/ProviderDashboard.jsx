import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, CalendarDays, ClipboardList, RefreshCw, UserRound, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { request } from "../api";
import Loading from "../components/Loading";
import StatusBadge from "../components/StatusBadge";

export default function ProviderDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [earnings, setEarnings] = useState(null);

  const load = async () => {
    setError("");
    try {
      const [profile, requests, bookings, earningsResult] = await Promise.all([
        request({ url: "/providers/me" }),
        request({ url: "/service-requests" }),
        request({ url: "/bookings" }),
        request({ url: "/analytics/my-earnings" }),
      ]);
      setData({ profile: profile.data, requests: requests.data || [], bookings: bookings.data || [] });
      setEarnings(earningsResult.data);
    } catch (err) {
      setError(err.message || "Provider workspace could not be loaded.");
      setData({ profile: null, requests: [], bookings: [] });
    }
  };

  useEffect(() => { const timer = setTimeout(load, 0); return () => clearTimeout(timer); }, []);
  if (!data) return <Loading />;

  const activeBookings = data.bookings.filter((booking) => !["completed", "cancelled"].includes(booking.status));
  const pendingRequests = data.requests.filter((item) => ["pending_classification", "open_for_quotes"].includes(item.status));

  return <div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="text-sm font-semibold text-blue-600">Provider workspace</div><h1 className="page-title mt-1">Manage your work</h1><p className="mt-2 muted">Find opportunities, send quotes and keep customers updated.</p></div>
      <button className="btn-secondary" onClick={load}><RefreshCw size={16} />Refresh</button>
    </div>
    {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <div className="mt-7 grid gap-4 sm:grid-cols-4"><Metric icon={ClipboardList} n={pendingRequests.length} l="Open opportunities" /><Metric icon={BriefcaseBusiness} n={activeBookings.length} l="Active bookings" /><Metric icon={Wallet} n={`Rs. ${earnings?.providerEarnings || 0}`} l="Paid earnings" /><Metric icon={UserRound} n={data.profile?.verificationStatus === "verified" ? "Verified" : "Pending"} l="Profile status" /></div>

    <div className="mt-7 grid gap-6 lg:grid-cols-3">
      <section className="card p-6 lg:col-span-2"><div className="flex items-center justify-between"><h2 className="font-bold">Requests available for quotes</h2><Link to="/requests" className="text-sm font-semibold text-blue-600">View all</Link></div><div className="mt-4 divide-y">{pendingRequests.slice(0, 6).map((item) => <Link key={item._id} to={`/requests/${item._id}`} className="flex items-center justify-between gap-4 py-4 hover:bg-slate-50"><div className="min-w-0"><div className="truncate font-semibold">{item.descriptionText}</div><div className="mt-1 text-xs text-slate-500">{item.category?.name || item.aiClassification?.category || "Awaiting classification"} - {item.location?.city || "Location flexible"}</div></div><ArrowRight className="shrink-0 text-slate-400" size={17} /></Link>)}{!pendingRequests.length && <Empty text="No customer requests are waiting for quotes." />}</div></section>
      <section className="card p-6"><h2 className="font-bold">Profile health</h2><div className="mt-5 space-y-3"><Health label="Verification" value={data.profile?.verificationStatus === "verified" ? "Verified" : "Needs review"} /><Health label="Skills" value={`${data.profile?.skills?.length || 0} listed`} /><Health label="Service areas" value={`${data.profile?.serviceAreas?.length || 0} listed`} /></div><Link to="/profile/provider" className="btn-primary mt-6 w-full">Update profile</Link></section>
    </div>

    <section className="card mt-6 p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Upcoming bookings</h2><Link to="/bookings" className="text-sm font-semibold text-blue-600">Manage</Link></div><div className="mt-4 grid gap-3 md:grid-cols-2">{activeBookings.slice(0, 4).map((booking) => <Link key={booking._id} to={`/bookings/${booking._id}`} className="rounded-xl bg-slate-50 p-4 hover:bg-emerald-50"><div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500"><CalendarDays className="mr-1 inline" size={14} />{new Date(booking.scheduledDate).toLocaleString()}</span><StatusBadge status={booking.status} /></div><div className="mt-2 font-semibold">{booking.customer?.name || "Customer"}</div></Link>)}{!activeBookings.length && <Empty text="No active bookings yet." />}</div></section>
  </div>;
}

function Metric({ icon: Icon, n, l }) { return <div className="card p-5"><Icon size={19} className="text-blue-600" /><div className="mt-3 text-2xl font-bold">{n}</div><div className="text-sm text-slate-500">{l}</div></div>; }
function Health({ label, value }) { return <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">{label}</span><b>{value}</b></div>; }
function Empty({ text }) { return <div className="py-8 text-center text-sm text-slate-500">{text}</div>; }
