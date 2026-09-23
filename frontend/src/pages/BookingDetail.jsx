import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, MessageSquare, ShieldAlert, Star, WalletCards } from "lucide-react";
import { request } from "../api";
import Loading from "../components/Loading";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { normalizeRole } from "../utils/roles";
import LocationMap from "../components/LocationMap";

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const [b, setB] = useState(null);
  const [job, setJob] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [dispute, setDispute] = useState("");
  const [disputeType, setDisputeType] = useState("other");
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("demo_card");
  const [invoiceDescription, setInvoiceDescription] = useState("Service completed");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceTax, setInvoiceTax] = useState("0");
  const [hoursWorked, setHoursWorked] = useState("");
  const [error, setError] = useState("");

  const load = () => Promise.all([
    request({ url: `/bookings/${id}` }),
    request({ url: `/bookings/${id}/job` }).catch(() => ({ data: null })),
    request({ url: `/bookings/${id}/invoice` }).catch(() => ({ data: null })),
    request({ url: `/bookings/${id}/messages` }).catch(() => ({ data: [] })),
  ]).then(([a, j, i, m]) => {
    setB(a.data);
    setJob(j.data);
    setInvoice(i.data);
    setMessages(m.data || []);
  });

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    const timer = window.setInterval(() => request({ url: `/bookings/${id}/messages` }).then((result) => setMessages(result.data || [])).catch(() => {}), 10000);
    return () => window.clearInterval(timer);
  }, [id]);

  if (!b) return <Loading />;

  const isCustomer = role === "customer";
  const isProvider = role === "provider";
  const isOps = ["admin", "ops_manager"].includes(role);
  const canAddNotes = isProvider || isOps;
  const canRaiseDispute = isCustomer || isProvider;
  const status = job?.status;

  const act = async (url, method = "PATCH", data = {}) => {
    setBusy(true);
    setError("");
    try {
      await request({ url, method, data });
      await load();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (!rating) return;
    setBusy(true);
    setError("");
    try {
      await request({ url: `/bookings/${id}/review`, method: "POST", data: { rating, comment: reviewComment } });
      setReviewSubmitted(true);
    } catch (reviewError) {
      setError(reviewError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm text-blue-600">Booking</div>
          <h1 className="page-title">{b.provider?.user?.name || "Service provider"}</h1>
          <p className="mt-1 muted">{new Date(b.scheduledDate).toLocaleString()}</p>
        </div>
        <StatusBadge status={b.status} />
      </div>
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <h2 className="font-bold">Service</h2>
            <p className="mt-3 text-slate-600">{b.serviceRequest?.descriptionText || "Service request"}</p>
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={16} />Scheduled</div>
              <div className="mt-1 text-sm text-slate-600">{new Date(b.scheduledDate).toLocaleString()}</div>
            </div>
          </div>

          {(isCustomer || isProvider) && b.status === "completed" && !reviewSubmitted && <div className="card p-6"><div className="flex items-center gap-2 font-bold"><Star size={18} />Rate this {isCustomer ? "provider" : "customer"}</div><p className="mt-2 text-sm text-slate-500">Share a quick rating for this completed booking.</p><div className="mt-4 flex gap-2" aria-label="Choose a rating">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value} star${value === 1 ? "" : "s"}`} onClick={() => setRating(value)} className={value <= rating ? "text-amber-500" : "text-slate-300"}><Star size={25} fill="currentColor" /></button>)}</div><textarea className="input mt-4" rows="3" placeholder="Write an optional comment..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} /><button disabled={busy || !rating} className="btn-primary mt-4" onClick={submitReview}>Submit rating</button></div>}
          {isCustomer && reviewSubmitted && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Thank you. Your rating has been submitted.</div>}

          <div className="card p-6">
            <div className="flex items-center justify-between"><h2 className="font-bold">Job progress</h2><StatusBadge status={status || "not_started"} /></div>
            <div className="mt-6 flex items-center gap-2">{["not_started", "in_progress", "completed", "customer_confirmed"].map((s, i) => <div key={s} className="flex flex-1 items-center gap-2"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${["not_started", "in_progress", "completed", "customer_confirmed"].indexOf(status) >= i ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>{i + 1}</div>{i < 3 && <div className="h-1 flex-1 rounded bg-slate-100" />}</div>)}</div>
            {isProvider && <div className="mt-6 space-y-3"><div className="flex flex-wrap gap-2">{["not_started", "in_progress"].map((s) => <button disabled={busy} key={s} onClick={() => act(`/bookings/${id}/job/status`, "PATCH", { status: s })} className="btn-secondary capitalize">{s.replaceAll("_", " ")}</button>)}</div><div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><label className="label">Hours worked</label><input type="number" min="0.25" step="0.25" className="input" placeholder="Example: 2.5" value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} /><button disabled={busy || !hoursWorked} onClick={() => act(`/bookings/${id}/job/status`, "PATCH", { status: "completed", hoursWorked: Number(hoursWorked) })} className="btn-primary mt-3">Mark completed</button></div></div>}
            {job?.hoursWorked > 0 && <p className="mt-4 text-sm text-slate-600">Hours worked: <b>{job.hoursWorked}</b></p>}
            {isCustomer && status === "completed" && <button disabled={busy} onClick={() => act(`/bookings/${id}/job/confirm`)} className="btn-primary mt-6"><CheckCircle2 size={17} />Confirm work completed</button>}
            {isCustomer && status === "completed" && <p className="mt-3 text-sm text-slate-500">Confirm the completed work to unlock payment. You cannot change the progress numbers directly.</p>}
            {isCustomer && status === "customer_confirmed" && <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Work confirmed. Payment is now available in the Invoice panel.</p>}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 font-bold"><MessageSquare size={18} />Job notes</div>
            {job?.notes?.map((n, i) => <div key={i} className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><div>{n.text}</div><div className="mt-1 text-xs text-slate-400">{n.author?.name || "Team"} - {n.createdAt ? new Date(n.createdAt).toLocaleString() : "Time unavailable"}</div></div>)}
            {canAddNotes && <div className="mt-4 flex gap-2"><input className="input" placeholder="Add a note..." value={note} onChange={(e) => setNote(e.target.value)} /><button className="btn-primary" disabled={!note || busy} onClick={async () => { await act(`/bookings/${id}/job/notes`, "POST", { text: note }); setNote(""); }}>Add</button></div>}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 font-bold"><MessageSquare size={18} />Booking messages</div>
            <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">{messages.map((message) => <div key={message._id} className={`rounded-xl p-3 text-sm ${String(message.sender?._id) === String(user?._id) ? "ml-8 bg-blue-50" : "mr-8 bg-slate-50"}`}><div>{message.body}</div><div className="mt-1 text-xs text-slate-400">{message.sender?.name || "Participant"} - {new Date(message.createdAt).toLocaleString()}</div></div>)}{!messages.length && <p className="text-sm text-slate-500">Start a private conversation about this booking.</p>}</div>
            <div className="mt-4 flex gap-2"><input className="input" placeholder="Write a message..." value={messageText} onChange={(e) => setMessageText(e.target.value)} /><button className="btn-primary" disabled={!messageText.trim() || busy} onClick={async () => { setBusy(true); try { await request({ url: `/bookings/${id}/messages`, method: "POST", data: { body: messageText } }); setMessageText(""); const result = await request({ url: `/bookings/${id}/messages` }); setMessages(result.data || []); } catch (messageError) { setError(messageError.message); } finally { setBusy(false); } }}>Send</button></div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card overflow-hidden"><div className="border-b p-5"><h2 className="font-bold">Service locations</h2><p className="mt-1 text-sm text-slate-500">Customer and provider pins for this booking.</p></div><LocationMap locations={[{ label: "Customer job location", ...b.serviceRequest?.location }, { label: "Provider location", ...b.provider?.location }]} /></div>
          <div className="card p-5">
            <h2 className="font-bold">Invoice</h2>
            {invoice ? <>
              <div className="mt-4 flex justify-between"><span className="text-sm text-slate-500">Total</span><b>Rs. {invoice.total}</b></div>
              <div className="mt-3"><StatusBadge status={invoice.status} /></div>
              {isCustomer && invoice.status === "issued" && status === "customer_confirmed" && <div className="mt-4 space-y-3"><label className="label">Payment method</label><select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="demo_card">Card payment (demo)</option><option value="cash">Cash payment</option></select><button className="btn-primary w-full" disabled={busy} onClick={() => act(`/invoices/${invoice._id}/pay`, "PATCH", { paymentMethod })}><WalletCards size={17} />Pay Rs. {invoice.total}</button><p className="text-xs text-slate-500">Payment is available after you confirm the completed job.</p></div>}
              {isCustomer && invoice.status === "issued" && status !== "customer_confirmed" && <p className="mt-4 text-sm text-slate-500">Payment will unlock after you confirm the provider completed the job.</p>}
              {invoice.status === "paid" && <div className="mt-3 text-xs text-slate-500">Transaction: {invoice.transactionId || "Recorded"}</div>}
            </> : <>
              <p className="mt-3 text-sm text-slate-500">Invoice not issued yet.</p>
              {(isProvider || isOps) && ["completed", "customer_confirmed"].includes(status) && <div className="mt-4 space-y-3"><input className="input" placeholder="Line item description" value={invoiceDescription} onChange={(e) => setInvoiceDescription(e.target.value)} /><input required type="number" min="0" className="input" placeholder="Amount" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} /><input type="number" min="0" className="input" placeholder="Tax" value={invoiceTax} onChange={(e) => setInvoiceTax(e.target.value)} /><button className="btn-primary w-full" disabled={busy || !invoiceAmount} onClick={() => act(`/bookings/${id}/invoice`, "POST", { lineItems: [{ description: invoiceDescription, amount: Number(invoiceAmount) }], tax: Number(invoiceTax) })}>Issue invoice</button></div>}
            </>}
          </div>

          {canRaiseDispute && <div className="card p-5">
            <div className="flex items-center gap-2 font-bold"><ShieldAlert size={18} />Need help?</div>
            <p className="mt-2 text-sm text-slate-500">Raise a dispute if something went wrong with this booking.</p>
            <select className="input mt-3" value={disputeType} onChange={(e) => setDisputeType(e.target.value)}><option value="quality">Quality problem</option><option value="no_show">Provider did not show</option><option value="pricing">Pricing problem</option><option value="damage">Property damage</option><option value="other">Other</option></select>
            <textarea className="input mt-3" rows="3" placeholder="Describe the issue..." value={dispute} onChange={(e) => setDispute(e.target.value)} />
            <button disabled={!dispute || busy} className="btn-danger mt-3 w-full" onClick={async () => { await act("/disputes", "POST", { bookingId: id, type: disputeType, description: dispute }); setDispute(""); }}>Raise dispute</button>
          </div>}
        </aside>
      </div>
    </div>
  );
}
