import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, BriefcaseBusiness, ClipboardList, LayoutDashboard, LogOut, Menu, Search, Settings, UserRound, Users, X, ShieldCheck, BarChart3, LifeBuoy, ArrowLeft, Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { request } from "../api";
import { normalizeRole, roleLabel } from "../utils/roles";

function navFor(role) {
  const normalized = normalizeRole(role);
  if (normalized === "customer") return [
    ["Dashboard", "/dashboard", LayoutDashboard], ["Care assistant", "/assistant", Bot], ["Find Providers", "/providers", Search],
    ["My Requests", "/requests", ClipboardList], ["Bookings", "/bookings", BriefcaseBusiness]
  ];
  if (normalized === "provider") return [
    ["Dashboard", "/dashboard", LayoutDashboard], ["Requests", "/requests", ClipboardList],
    ["My Bookings", "/bookings", BriefcaseBusiness], ["Provider Profile", "/profile/provider", UserRound], ["Map location", "/profile/provider/location", Search]
  ];
  if (normalized === "support_agent") return [
    ["Dashboard", "/dashboard", LayoutDashboard], ["Requests", "/requests", ClipboardList],
    ["Bookings", "/bookings", BriefcaseBusiness], ["Providers", "/providers", Search],
    ["Disputes", "/disputes", LifeBuoy], ["Notifications", "/notifications", Bell],
    ["Profile", "/profile", Settings]
  ];
  if (normalized === "ops_manager") return [
    ["Dashboard", "/dashboard", LayoutDashboard], ["Requests", "/requests", ClipboardList],
    ["Bookings", "/bookings", BriefcaseBusiness], ["Analytics", "/analytics", BarChart3],
    ["Disputes", "/disputes", ShieldCheck], ["Notifications", "/notifications", Bell],
    ["Profile", "/profile", Settings]
  ];
  return [
    ["Dashboard", "/dashboard", LayoutDashboard], ["Providers", "/providers", Search],
    ["Users", "/users", Users], ["Analytics", "/analytics", BarChart3],
    ["Disputes", "/disputes", ShieldCheck], ["Notifications", "/notifications", Bell],
    ["Profile", "/profile", Settings]
  ];
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    const refreshUnread = () => request({ url: "/notifications/mine?limit=1" }).then(d => setUnread(d.unread ?? (d.data || []).filter(n => !n.isRead).length)).catch(() => {});
    refreshUnread();
    const timer = window.setInterval(refreshUnread, 30000);
    return () => window.clearInterval(timer);
  }, [user]);

  const links = navFor(user?.role);
  const displayRole = roleLabel(user?.role);
  const goBack = () => location.key === "default" ? navigate("/dashboard", { replace: true }) : navigate(-1);

  return (
    <div className="min-h-screen bg-transparent">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-emerald-950/10 bg-[#12352d] p-5 text-white shadow-2xl transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#b8edcf] text-[#12352d] shadow-lg shadow-emerald-950/20"><BriefcaseBusiness size={21}/></div>
            <div><div className="font-bold tracking-tight text-white">CareConnect</div><div className="text-xs text-emerald-100/60">Service operations platform</div></div>
          </Link>
          <button aria-label="Close navigation" className="rounded-lg p-2 text-emerald-100/70 hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)}><X size={20}/></button>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[#b8edcf] font-bold text-[#12352d]">{user?.profilePicture ? <img src={user.profilePicture} alt="" className="h-full w-full object-cover" /> : user?.name?.[0]?.toUpperCase()}</div>
            <div className="min-w-0"><div className="truncate text-sm font-semibold text-white">{user?.name}</div><div className="truncate text-xs capitalize text-emerald-100/60">{displayRole}</div></div>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {links.map(([label, to, Icon]) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({isActive}) => `flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${isActive ? "border-white/10 bg-[#b8edcf] text-[#12352d] shadow-lg shadow-emerald-950/10" : "border-transparent text-emerald-50/70 hover:bg-white/10 hover:text-white"}`}><Icon size={18}/>{label}</NavLink>)}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 space-y-1">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-emerald-50/70 hover:bg-white/10 hover:text-white" onClick={() => { logout(); navigate("/login"); }}><LogOut size={18}/>Sign out</button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-[#12352d]/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-emerald-950/10 bg-[#f4f7f5]/85 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-2"><button aria-label="Open navigation" className="rounded-xl p-2 text-[#385149] hover:bg-white lg:hidden" onClick={() => setOpen(true)}><Menu size={22}/></button><button aria-label="Go back" className="hidden rounded-xl p-2 text-[#6b7b72] hover:bg-white sm:block" onClick={goBack}><ArrowLeft size={19}/></button></div>
          <div className="hidden text-sm text-[#6b7b72] sm:block">Workspace / <span className="font-semibold text-[#18332c]">{displayRole}</span></div>
          <div className="ml-auto flex items-center gap-2">
            <button aria-label="Notifications" onClick={() => navigate("/notifications")} className="relative rounded-xl p-2.5 text-[#6b7b72] hover:bg-white"><Bell size={19}/>{unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#d85c4f]" />}</button>
            <button aria-label="Profile settings" onClick={() => navigate("/profile")} className="hidden rounded-xl p-2.5 text-[#6b7b72] hover:bg-white sm:block"><Settings size={19}/></button>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 sm:p-7">{children}</div>
      </main>
    </div>
  );
}
