import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { Bot, CalendarDays, Check, Edit3, MapPin, RefreshCw, Sparkles, UserRound, X } from "lucide-react";
import { request } from "../api";
import Loading from "../components/Loading";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { normalizeRole } from "../utils/roles";
import BackButton from "../components/BackButton";

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const [item, setItem] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [providers, setProviders] = useState([]);
  const [busy, setBusy] = useState(false);
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const isCustomer = role === "customer";
  const isProvider = role === "provider";
  const isOps = ["admin", "ops_manager"].includes(role);
  const canInspectMatches = isCustomer || isOps;

  const load = () => {
    const extra = canInspectMatches
      ? [request({ url: `/service-requests/${id}/quotes` }), request({ url: `/service-requests/${id}/suggested-providers` })]
      : [];

    return Promise.all([request({ url: `/service-requests/${id}` }), ...extra])
      .then(([r, q, p]) => {
        setItem(r.data);
        setEditForm({ descriptionText: r.data.descriptionText || "", city: r.data.location?.city || "", address: r.data.location?.address || "", preferredDate: r.data.preferredDate ? new Date(r.data.preferredDate).toISOString().slice(0, 16) : "", urgency: r.data.urgency || "normal", attachments: r.data.attachments || [] });
        if (q) setQuotes(q.data || []);
        if (p) setProviders(p.data || []);
      })
      .catch((loadError) => setError(loadError.message));
  };

  useEffect(() => { load(); }, [id, role]);

  if (!item && error) return <div className="card mx-auto max-w-xl p-6 text-sm text-red-700"><b>Unable to load this request:</b> {error}<div className="mt-4"><BackButton fallback="/requests" /></div></div>;
  if (!item) return <Loading />;

  const createQuote = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request({ url: `/service-requests/${id}/quotes`, method: "POST", data: { price: Number(price), estimatedDurationMins: Number(duration), message } });
      setPrice("");
      setMessage("");
      await load();
    } catch (quoteError) {
      setError(quoteError.message);
    } finally {
      setBusy(false);
    }
  };

  const patch = async (url, data) => {
    setBusy(true);
    setError("");
    try {
      const result = await request({ url, method: "PATCH", data });
      await load();
      return result;
    } catch (patchError) {
      setError(patchError.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const reclassify = async () => {
    setBusy(true);
    try {
      await request({ url: `/service-requests/${id}/classify`, method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request({ url: `/service-requests/${id}`, method: "PATCH", data: { descriptionText: editForm.descriptionText, location: { city: editForm.city, address: editForm.address }, preferredDate: editForm.preferredDate || undefined, urgency: editForm.urgency, attachments: editForm.attachments } });
      setEditing(false);
      await load();
    } catch (editError) { setError(editError.message); }
    finally { setBusy(false); }
  };

  const deleteRequest = async () => {
    if (!window.confirm("Remove this service request? It will be marked cancelled.")) return;
    setBusy(true);
    try {
      await request({ url: `/service-requests/${id}`, method: "DELETE" });
      navigate("/requests");
    } catch (deleteError) { setError(deleteError.message); setBusy(false); }
  };

  return (
    <div>
      <BackButton fallback="/requests" />
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><b>Action failed:</b> {error}</div>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-600"><Sparkles size={15} />Service request</div>
                <h1 className="mt-2 text-2xl font-bold">{item.descriptionText}</h1>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Info icon={MapPin} title="Location" text={`${item.location?.city || "Not set"}${item.location?.address ? `, ${item.location.address}` : ""}`} />
              <Info icon={CalendarDays} title="Preferred" text={item.preferredDate ? new Date(item.preferredDate).toLocaleString() : "Flexible"} />
              <Info icon={Bot} title="Urgency" text={item.urgency || "normal"} />
            </div>
            {!!item.attachments?.length && <div className="mt-5 border-t pt-5"><div className="text-sm font-semibold">Customer images</div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{item.attachments.map((image) => <img key={image} src={image} alt="Customer request" className="aspect-square w-full rounded-lg border object-cover" />)}</div></div>}
            {isCustomer && ["pending_classification", "open_for_quotes"].includes(item.status) && <div className="mt-5 flex flex-wrap gap-2 border-t pt-5">
              <button disabled={busy} onClick={() => setEditing((value) => !value)} className="btn-secondary"><Edit3 size={16} />{editing ? "Close editor" : "Edit request"}</button>
              <button disabled={busy} onClick={deleteRequest} className="btn-danger"><X size={16} />Delete request</button>
            </div>}
            {isOps && <div className="mt-5 flex flex-wrap gap-2 border-t pt-5">
              <button disabled={busy} onClick={reclassify} className="btn-secondary"><RefreshCw size={16} />Reclassify</button>
              {!["booked", "completed", "cancelled"].includes(item.status) && <button disabled={busy} onClick={() => patch(`/service-requests/${id}/cancel`)} className="btn-danger"><X size={16} />Cancel request</button>}
            </div>}
          </div>

          {editing && <form onSubmit={saveEdit} className="card space-y-4 p-6"><h2 className="font-bold">Edit request</h2><div><label className="label">Description</label><textarea required rows="4" className="input" value={editForm.descriptionText} onChange={(event) => setEditForm({ ...editForm, descriptionText: event.target.value })} /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="label">City</label><input className="input" value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} /></div><div><label className="label">Address</label><input className="input" value={editForm.address} onChange={(event) => setEditForm({ ...editForm, address: event.target.value })} /></div><div><label className="label">Preferred date</label><input type="datetime-local" className="input" value={editForm.preferredDate} onChange={(event) => setEditForm({ ...editForm, preferredDate: event.target.value })} /></div><div><label className="label">Urgency</label><select className="input" value={editForm.urgency} onChange={(event) => setEditForm({ ...editForm, urgency: event.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="urgent">Urgent</option></select></div></div><div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button><button disabled={busy} className="btn-primary">{busy ? "Saving..." : "Save changes"}</button></div></form>}

          <WorkflowNotice role={role} status={item.status} hasQuotes={quotes.length > 0} />

          <div className="card p-6">
            <div className="flex items-center gap-2 font-bold"><Bot size={19} className="text-blue-600" />AI classification</div>
            <div className="mt-4 rounded-xl bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-900">{item.aiClassification?.category || "Not classified yet"}</div>
              <div className="mt-1 text-xs text-blue-700">Confidence: {Math.round((item.aiClassification?.confidence || 0) * 100)}%</div>
              <div className="mt-3 flex flex-wrap gap-2">{(item.aiClassification?.suggestedSkills || []).map((s) => <span key={s} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-blue-700">{s}</span>)}</div>
            </div>
          </div>

          {!!item.activity?.length && <div className="card p-6"><h2 className="font-bold">Activity</h2><div className="mt-4 space-y-4">{[...item.activity].reverse().map((event, index) => <div key={`${event.createdAt}-${index}`} className="flex gap-3"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" /><div><div className="text-sm font-semibold">{event.message}</div><div className="mt-1 text-xs text-slate-500">{event.actor?.name || "System"} - {new Date(event.createdAt).toLocaleString()}</div></div></div>)}</div></div>}

          {canInspectMatches && <Quotes quotes={quotes} busy={busy} canAccept={isCustomer} patch={patch} onAccepted={(bookingId) => navigate(`/bookings/${bookingId}`)} />}

          {isProvider && ["pending_classification", "open_for_quotes", "quoted"].includes(item.status) && <div className="card p-6">
            <h2 className="font-bold">Send a quote</h2>
            <form onSubmit={createQuote} className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><label className="label">Price (Rs.)</label><input required type="number" min="0" className="input" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
              <div><label className="label">Duration (minutes)</label><input type="number" className="input" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
              <div className="sm:col-span-2"><label className="label">Message</label><textarea className="input" rows="3" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Explain what you will provide..." /></div>
              <button disabled={busy} className="btn-primary sm:col-span-2">{busy ? "Sending..." : "Submit quote"}</button>
            </form>
          </div>}
        </div>

        <aside>
          <div className="card sticky top-24 p-5">
            <h2 className="font-bold">{canInspectMatches ? "Suggested providers" : "Request details"}</h2>
            {canInspectMatches ? <SuggestedProviders providers={providers} /> : <RequestMeta item={item} />}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Quotes({ quotes, busy, canAccept, patch, onAccepted }) {
  const accept = async (quoteId) => {
    const result = await patch(`/quotes/${quoteId}/accept`);
    if (result?.data?._id) onAccepted(result.data._id);
  };

  return <div className="card p-6"><h2 className="font-bold">Quotes</h2><div className="mt-4 space-y-3">{quotes.map((q) => <div key={q._id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold">{q.provider?.user?.name || "Provider"}</div><div className="mt-1 text-xs text-slate-500">{q.message || "No message"} - {q.estimatedDurationMins} mins</div></div><div className="text-xl font-bold">Rs. {q.price}</div></div>{canAccept && q.status === "submitted" && <div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => accept(q._id)} className="btn-primary"><Check size={16} />Accept</button><button disabled={busy} onClick={() => patch(`/quotes/${q._id}/reject`)} className="btn-danger"><X size={16} />Reject</button></div>}<div className="mt-2"><StatusBadge status={q.status} /></div></div>)}{!quotes.length && <div className="py-8 text-center text-sm text-slate-500">No quotes yet.</div>}</div></div>;
}

function SuggestedProviders({ providers }) {
  return <div className="mt-4 space-y-3">{providers.slice(0, 6).map((x) => <div key={x.provider?._id || x.provider} className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-700"><UserRound size={18} /></div><div><div className="font-semibold">{x.provider?.user?.name || "Provider"}</div><div className="text-xs text-slate-500">Match score {Math.round((x.score || 0) * 100)}%</div></div></div><div className="mt-3 flex flex-wrap gap-1">{(x.matchingSkills || []).map((s) => <span key={s} className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-600">{s}</span>)}</div></div>)}{!providers.length && <p className="mt-4 text-sm text-slate-500">No verified matching providers found yet.</p>}</div>;
}

function RequestMeta({ item }) {
  return <div className="mt-4 space-y-4 text-sm"><p><b>Customer:</b> {item.customer?.name}</p><p><b>Email:</b> {item.customer?.email}</p><p><b>Created:</b> {new Date(item.createdAt).toLocaleString()}</p></div>;
}

function WorkflowNotice({ role, status, hasQuotes }) {
  if (status === "booked") return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">This request is booked. Open the booking from the Bookings page to track the work.</div>;
  if (role === "provider") return <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">Submit your price and availability below. The customer will compare {hasQuotes ? "your quote with other quotes" : "your quote"} and choose a provider.</div>;
  if (role === "customer" && hasQuotes) return <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">Review the provider quotes below. Accept one quote to create a booking; the other quotes will be declined automatically.</div>;
  if (role === "customer") return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Providers can now review this request and send quotes. You will be able to create a booking after accepting one.</div>;
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Operations can monitor this request. Providers submit quotes, and the customer accepts one to create the booking.</div>;
}

function Info({ icon: Icon, title, text }) {
  return <div className="rounded-xl bg-slate-50 p-4"><Icon size={17} className="text-slate-400" /><div className="mt-2 text-xs text-slate-500">{title}</div><div className="mt-1 text-sm font-medium capitalize">{text}</div></div>;
}
