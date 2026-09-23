import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, ClipboardList, Plus, Sparkles } from "lucide-react";
import { request } from "../api";
import Loading from "../components/Loading";
import StatusBadge from "../components/StatusBadge";

export default function CustomerDashboard(){
  const [items,setItems]=useState(null);
  useEffect(()=>{Promise.all([request({url:"/service-requests/mine"}),request({url:"/bookings"})]).then(([r,b])=>setItems({r:r.data||[],b:b.data||[]})).catch(()=>setItems({r:[],b:[]}))},[]);
  if(!items)return <Loading/>;
  const active=items.r.filter(x=>!["completed","cancelled"].includes(x.status));
  return <div>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-sm font-semibold text-blue-600">Customer workspace</div><h1 className="page-title mt-1">Your service dashboard</h1><p className="mt-2 muted">Track requests, compare quotes and manage your bookings.</p></div><Link to="/requests/new" className="btn-primary"><Plus size={18}/>New service request</Link></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-3"><Metric icon={ClipboardList} n={items.r.length} l="Total requests"/><Metric icon={Sparkles} n={active.length} l="Active requests"/><Metric icon={CalendarDays} n={items.b.length} l="Bookings"/></div>
    <div className="mt-7 grid gap-6 lg:grid-cols-3"><div className="card p-5 lg:col-span-2"><div className="flex items-center justify-between"><h2 className="font-bold">Recent requests</h2><Link to="/requests" className="text-sm font-semibold text-blue-600">View all</Link></div><div className="mt-4 divide-y">{items.r.slice(0,5).map(x=><Link to={"/requests/"+x._id} key={x._id} className="flex items-center justify-between gap-4 py-4 hover:bg-slate-50"><div className="min-w-0"><div className="truncate font-semibold">{x.descriptionText}</div><div className="mt-1 text-xs text-slate-500">{x.category?.name||x.aiClassification?.category||"Awaiting classification"}</div></div><StatusBadge status={x.status}/></Link>)}{!items.r.length&&<Empty text="No requests yet. Create your first one."/>}</div></div><div className="card bg-slate-950 p-6 text-white"><Sparkles className="text-blue-400"/><h2 className="mt-5 text-xl font-bold">Let AI understand the problem</h2><p className="mt-2 text-sm leading-6 text-slate-300">Describe the issue naturally. The backend classifies it and suggests providers with matching skills.</p><Link to="/requests/new" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-300">Describe a service <ArrowRight size={16}/></Link></div></div>
    <div className="mt-6 card p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Upcoming bookings</h2><Link to="/bookings" className="text-sm font-semibold text-blue-600">Manage</Link></div><div className="mt-4 grid gap-3 md:grid-cols-2">{items.b.slice(0,4).map(b=><div key={b._id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between"><span className="text-xs text-slate-500">{new Date(b.scheduledDate).toLocaleString()}</span><StatusBadge status={b.status}/></div><div className="mt-2 font-semibold">{b.provider?.user?.name||"Service provider"}</div></div>)}</div></div>
  </div>
}
function Metric({icon:Icon,n,l}){return <div className="card p-5"><Icon size={19} className="text-blue-600"/><div className="mt-3 text-2xl font-bold">{n}</div><div className="text-sm text-slate-500">{l}</div></div>}
function Empty({text}){return <div className="py-8 text-center text-sm text-slate-500">{text}</div>}