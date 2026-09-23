import { useEffect, useState } from "react";
import { AlertTriangle, BriefcaseBusiness, ClipboardList, RefreshCw, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { request } from "../api";
import Loading from "../components/Loading";
import StatusBadge from "../components/StatusBadge";

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const [requests, bookings, disputes, payments] = await Promise.all([
        request({ url: "/service-requests" }),
        request({ url: "/bookings" }),
        request({ url: "/disputes" }),
        request({ url: "/analytics/payments-summary" }),
      ]);
      setData({
        requests: requests.data || [],
        bookings: bookings.data || [],
        disputes: disputes.data || [],
        payments: payments.data || { totals: {}, providers: [] },
      });
    } catch (loadError) {
      setError(loadError.message || "Operations data could not be loaded.");
      setData({ requests: [], bookings: [], disputes: [], payments: { totals: {}, providers: [] } });
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!data) return <Loading />;

  const openRequests = data.requests.filter((item) => ["pending_classification", "open_for_quotes", "quoted"].includes(item.status));
  const activeBookings = data.bookings.filter((item) => !["completed", "cancelled"].includes(item.status));
  const openDisputes = data.disputes.filter((item) => item.status !== "resolved");
  const totals = data.payments.totals || {};

  return <div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="text-sm font-semibold text-blue-600">Operations workspace</div><h1 className="page-title mt-1">Daily operations</h1><p className="mt-2 muted">Coordinate requests, bookings, disputes and provider collections.</p></div>
      <button className="btn-secondary" onClick={load}><RefreshCw size={16} />Refresh</button>
    </div>
    {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric icon={ClipboardList} value={openRequests.length} label="Open requests" />
      <Metric icon={BriefcaseBusiness} value={activeBookings.length} label="Active bookings" />
      <Metric icon={AlertTriangle} value={openDisputes.length} label="Open disputes" />
      <Metric icon={WalletCards} value={`Rs. ${totals.totalCollected || 0}`} label="Total collected" />
    </div>

    <div className="mt-7 grid gap-6 lg:grid-cols-2">
      <section className="card p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Requests needing operations</h2><Link to="/requests" className="text-sm font-semibold text-blue-600">View all</Link></div><div className="mt-4 divide-y">{openRequests.slice(0, 5).map((item) => <Link key={item._id} to={`/requests/${item._id}`} className="flex items-center justify-between gap-4 py-4 hover:bg-slate-50"><div className="min-w-0"><div className="truncate font-semibold">{item.descriptionText}</div><div className="mt-1 text-xs text-slate-500">{item.category?.name || item.aiClassification?.category || "Awaiting classification"}</div></div><StatusBadge status={item.status} /></Link>)}{!openRequests.length && <Empty text="No open requests." />}</div></section>
      <section className="card p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Recent disputes</h2><Link to="/disputes" className="text-sm font-semibold text-blue-600">Review all</Link></div><div className="mt-4 divide-y">{data.disputes.slice(0, 5).map((item) => <Link key={item._id} to="/disputes" className="block py-4 hover:bg-slate-50"><div className="flex items-center justify-between gap-3"><b className="capitalize">{item.type || "Other"}</b><StatusBadge status={item.status} /></div><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p></Link>)}{!data.disputes.length && <Empty text="No disputes recorded." />}</div></section>
    </div>

    <section className="card mt-6 p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Provider collections</h2><Link to="/analytics" className="text-sm font-semibold text-blue-600">Full analytics</Link></div><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="pb-3">Provider</th><th className="pb-3">Collected</th><th className="pb-3">Earnings</th><th className="pb-3">Paid invoices</th></tr></thead><tbody>{data.payments.providers.slice(0, 8).map((provider) => <tr key={provider._id} className="border-b last:border-0"><td className="py-3 font-semibold">{provider.providerName}</td><td>Rs. {provider.totalCollected}</td><td>Rs. {provider.providerEarnings}</td><td>{provider.paidInvoices}</td></tr>)}</tbody></table>{!data.payments.providers.length && <Empty text="No provider collections yet." />}</div></section>
  </div>;
}

function Metric({ icon: Icon, value, label }) { return <div className="card p-5"><Icon size={19} className="text-blue-600" /><div className="mt-3 text-2xl font-bold">{value}</div><div className="text-sm text-slate-500">{label}</div></div>; }
function Empty({ text }) { return <div className="py-8 text-center text-sm text-slate-500">{text}</div>; }
