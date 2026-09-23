import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { request } from "../api";
import Loading from "../components/Loading";
import BackButton from "../components/BackButton";

export default function Notifications(){
 const [data,setData]=useState(null); const [error,setError]=useState("");
 const load=()=>request({url:"/notifications/mine"}).then(d=>setData(d.data||[])).catch(e=>{setError(e.message);setData([])});
 useEffect(() => { load(); }, []);
 if(data===null)return <Loading/>;
 return <div className="mx-auto max-w-3xl"><BackButton/><h1 className="page-title">Notifications</h1><p className="mt-2 muted">Updates about your requests, bookings and support.</p>{error&&<div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}<div className="mt-6 card divide-y">{data.map(n=><div key={n._id} className={`flex gap-4 p-5 ${n.isRead?"":"bg-blue-50/40"}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600"><Bell size={17}/></div><div className="flex-1"><div className="font-semibold capitalize">{n.type?.replaceAll("_"," ")||"Notification"}</div><p className="mt-1 text-sm text-slate-500">{n.message}</p><div className="mt-2 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</div></div>{!n.isRead&&<button aria-label="Mark notification as read" className="self-start rounded-lg p-2 text-blue-600 hover:bg-white" onClick={async()=>{await request({url:`/notifications/${n._id}/read`,method:"PATCH"});load()}}><Check size={17}/></button>}</div>)}{!data.length&&<div className="p-12 text-center text-sm text-slate-500">You're all caught up.</div>}</div></div>
}
