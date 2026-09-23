import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, BarChart3, BriefcaseBusiness, Check, ClipboardCheck, RefreshCw, Users, X } from "lucide-react";
import { request } from "../api";
import Loading from "../components/Loading";
import StatusBadge from "../components/StatusBadge";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard(){
 const { user } = useAuth();
 const [d,setD]=useState(null);
 const [reviewQueue,setReviewQueue]=useState([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState("");
 const load=async()=>{
  setError("");
  try {
   const [bookings,providers,disputes,pendingProviders,rejectedProviders]=await Promise.all([
	request({url:"/analytics/bookings-summary"}), request({url:"/analytics/provider-performance"}),
	request({url:"/analytics/disputes-summary"}), request({url:"/providers?verificationStatus=pending"}),
	request({url:"/providers?verificationStatus=rejected"})
   ]);
   setD({b:bookings.data||[],p:providers.data||[],s:disputes.data||[]});
   setReviewQueue([...(pendingProviders.data||[]), ...(rejectedProviders.data||[])]);
  } catch { setError("Dashboard data could not be loaded."); setD({b:[],p:[],s:[]}); }
 };
 useEffect(()=>{const timer=setTimeout(load,0);return()=>clearTimeout(timer);},[]);
 if(!d)return <Loading/>;
 const total=(arr)=>arr.reduce((sum,item)=>sum+item.count,0);
 const review=async(id,verificationStatus)=>{
  setBusy(id);
   try { await request({url:`/providers/${id}/verify`,method:"PATCH",data:{verificationStatus}}); setReviewQueue(reviewQueue.filter(provider=>provider._id!==id)); }
  catch { setError("Provider review could not be saved."); }
  finally { setBusy(""); }
 };
 return <div>
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
   <div><div className="text-sm font-semibold text-blue-600">Operations command center</div><h1 className="page-title mt-1">Platform overview</h1><p className="mt-2 muted">Monitor service health, provider onboarding and escalations.</p></div>
   <button className="btn-secondary" onClick={load}><RefreshCw size={16}/>Refresh</button>
  </div>
  {error&&<div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
  <div className="mt-7 grid gap-4 sm:grid-cols-3"><Metric icon={BriefcaseBusiness} n={total(d.b)} l="Total bookings"/><Metric icon={Users} n={d.p.length} l="Providers tracked"/><Metric icon={AlertTriangle} n={total(d.s)} l="Total disputes"/></div>
  <div className="mt-7 grid gap-4 md:grid-cols-3"><QuickLink to="/analytics" icon={BarChart3} title="Open analytics" text="Compare platform trends"/><QuickLink to="/disputes" icon={AlertTriangle} title="Review disputes" text="Resolve customer escalations"/><QuickLink to="/providers" icon={Users} title="Browse providers" text="Inspect the provider directory"/></div>
  <div className="mt-7 grid gap-6 lg:grid-cols-2"><StatusPanel title="Booking status" data={d.b}/><StatusPanel title="Dispute status" data={d.s}/></div>
   <div className="card mt-6 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 font-bold"><ClipboardCheck size={18} className="text-blue-600"/>Provider verification queue</div><p className="mt-1 text-sm text-slate-500">Review pending profiles and reconsider rejected providers.</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{reviewQueue.length} to review</span></div>{reviewQueue.length?<div className="mt-5 divide-y">{reviewQueue.map(provider=><div key={provider._id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold">{provider.user?.name||"Unnamed provider"}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500"><span>{provider.skills?.slice(0,3).join(", ")||"No skills listed"}</span><StatusBadge status={provider.verificationStatus}/></div></div><div className="flex gap-2">{user?.role==="admin"&&<><button disabled={busy===provider._id} className="btn-primary px-3 py-2" onClick={()=>review(provider._id,"verified")}><Check size={15}/>Approve</button><button disabled={busy===provider._id} className="btn-danger px-3 py-2" onClick={()=>review(provider._id,"rejected")}><X size={15}/>Reject</button></>}<Link className="btn-secondary px-3 py-2" to={`/providers/${provider._id}`}>View</Link></div></div>)}</div>:<div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No providers need review.</div>}</div>
  <div className="card mt-6 p-6"><div className="flex items-center gap-2 font-bold"><BarChart3 size={18} className="text-blue-600"/>Provider performance</div><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs text-slate-500"><tr><th className="py-3">Provider</th><th>Rating</th><th>Experience</th><th>Verification</th></tr></thead><tbody className="divide-y">{d.p.map(p=><tr key={p._id}><td className="py-3 font-semibold">{p.user?.name||"Unknown"}</td><td>{p.ratingAvg?.toFixed?.(1)||"0.0"}</td><td>{p.experienceYears||0} yrs</td><td><StatusBadge status={p.verificationStatus}/></td></tr>)}</tbody></table></div></div>
 </div>
}
function Metric({icon:Icon,n,l}){return <div className="card p-5"><Icon size={19} className="text-blue-600"/><div className="mt-3 text-2xl font-bold">{n}</div><div className="text-sm text-slate-500">{l}</div></div>}
function QuickLink({to,icon:Icon,title,text}){return <Link to={to} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:border-emerald-200"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={19}/></span><span className="min-w-0"><b className="block">{title}</b><span className="mt-1 block text-sm text-slate-500">{text}</span></span><ArrowRight className="ml-auto shrink-0 text-slate-400" size={17}/></Link>}
function StatusPanel({title,data}){return <div className="card p-6"><h2 className="font-bold">{title}</h2>{data.length?<div className="mt-5 space-y-3">{data.map(x=><div key={x._id} className="flex items-center justify-between"><StatusBadge status={x._id}/><b>{x.count}</b></div>)}</div>:<p className="mt-5 text-sm text-slate-500">No data available.</p>}</div>}