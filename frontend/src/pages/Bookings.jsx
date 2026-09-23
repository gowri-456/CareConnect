import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { request } from "../api";
import Loading from "../components/Loading";
import StatusBadge from "../components/StatusBadge";

export default function Bookings(){
 const [data,setData]=useState(null);const [filter,setFilter]=useState("");
 const load=()=>request({url:`/bookings${filter?`?status=${filter}`:""}`}).then(d=>setData(d.data||[])).catch(()=>setData([]));
 useEffect(()=>{load()},[filter]);
 if(data===null)return <Loading/>;
 return <div><h1 className="page-title">Bookings</h1><p className="mt-2 muted">Track scheduled work, progress and completion.</p><div className="mt-6 flex gap-2 overflow-auto pb-1">{["","scheduled","in_progress","completed","cancelled","disputed"].map(s=><button key={s} onClick={()=>setFilter(s)} className={`rounded-full px-3 py-2 text-xs font-semibold ${filter===s?"bg-blue-600 text-white":"bg-white border border-slate-200 text-slate-600"}`}>{s||"All"}</button>)}</div><div className="mt-5 grid gap-4 md:grid-cols-2">{data.map(b=><Link to={"/bookings/"+b._id} key={b._id} className="card p-5 hover:shadow-md"><div className="flex justify-between gap-3"><div className="flex gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><CalendarDays size={19}/></div><div><div className="font-semibold">{b.provider?.user?.name||"Provider"}</div><div className="mt-1 text-xs text-slate-500">{new Date(b.scheduledDate).toLocaleString()}</div></div></div><StatusBadge status={b.status}/></div><div className="mt-4 text-sm text-slate-600">Booking ID: <span className="font-mono text-xs">{b._id}</span></div></Link>)}</div>{!data.length&&<div className="card mt-5 py-14 text-center text-sm text-slate-500">No bookings found.</div>}</div>
}