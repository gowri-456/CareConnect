import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Auth({ mode }) {
  const isLogin = mode === "login";
  const [form, setForm] = useState({ name:"", email:"", password:"", phone:"", role:"customer" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { login, register } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form);
      nav(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#12352d]">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-[#12352d] p-12 text-white lg:flex">
          <Link to="/" className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#b8edcf] text-[#12352d]"><BriefcaseBusiness/></div><span className="text-xl font-bold">CareConnect</span></Link>
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#b8edcf]/25 bg-white/10 px-3 py-1.5 text-sm text-[#b8edcf]"><Sparkles size={15}/> AI-powered service matching</div>
            <h1 className="max-w-lg text-5xl font-black leading-[1.02] tracking-tight">The right professional is closer than you think.</h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-emerald-50/65">Describe your problem in plain language. CareConnect classifies the request and helps surface providers with matching skills.</p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-emerald-50/75"><span className="rounded-full border border-white/10 px-3 py-1.5">Smart classification</span><span className="rounded-full border border-white/10 px-3 py-1.5">Verified providers</span><span className="rounded-full border border-white/10 px-3 py-1.5">End-to-end tracking</span></div>
          </div>
          <div className="text-sm text-slate-500">Secure role-based access · MERN backend</div>
        </div>

        <div className="flex items-center justify-center bg-[#f4f7f5] p-5 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden"><Link to="/" className="flex items-center gap-2 font-bold text-[#18332c]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#147d64] text-white"><BriefcaseBusiness size={18}/></span>CareConnect</Link></div>
            <h2 className="text-3xl font-black tracking-tight text-[#18332c]">{isLogin ? "Welcome back" : "Create your account"}</h2>
            <p className="mt-2 text-sm text-[#6b7b72]">{isLogin ? "Sign in to manage services, bookings and more." : "Choose how you will use the platform."}</p>
            {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <form onSubmit={submit} className="mt-7 space-y-4">
              {!isLogin && <><div><label className="label">Full name</label><input className="input" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
                <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
                <div><label className="label">Account type</label><select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="customer">Customer</option><option value="provider">Service Provider</option><option value="support_agent">Support Agent</option></select></div></>}
              <div><label className="label">Email</label><input type="email" className="input" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
              <div><label className="label">Password</label><div className="relative"><input type={show?"text":"password"} className="input pr-11" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-2.5 text-slate-400">{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></div>
              <button disabled={busy} className="btn-primary w-full py-3">{busy ? "Please wait..." : isLogin ? "Sign in" : "Create account"}</button>
            </form>
            <div className="mt-6 text-center text-sm text-[#6b7b72]">{isLogin ? "New to CareConnect?" : "Already have an account?"} <Link className="font-semibold text-[#147d64]" to={isLogin?"/register":"/login"}>{isLogin?"Create one":"Sign in"}</Link></div>
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#91a49b]"><ShieldCheck size={14}/>Your access is protected by role-based authentication</div>
          </div>
        </div>
      </div>
    </div>
  );
}