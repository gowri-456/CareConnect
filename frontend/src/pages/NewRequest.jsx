import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, ImagePlus, Sparkles, X } from "lucide-react";
import { request } from "../api";
import Toast from "../components/Toast";

const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function NewRequest() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [f, setF] = useState({ descriptionText: "", address: "", city: "", preferredDate: "", urgency: "normal", attachments: [], location: { latitude: null, longitude: null } });

  const addImages = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.some((file) => !file.type.startsWith("image/"))) return setError("Please select image files only.");
    if (files.some((file) => file.size > 1 * 1024 * 1024)) return setError("Each request image must be 1 MB or smaller.");
    if (f.attachments.length + files.length > 5) return setError("You can add up to 5 images.");
    try {
      const attachments = await Promise.all(files.map(readFile));
      setF((current) => ({ ...current, attachments: [...current.attachments, ...attachments] }));
    } catch { setError("The selected image could not be read."); }
    event.target.value = "";
  };

  const addImageUrl = () => {
    const url = imageUrl.trim();
    if (!/^https?:\/\//i.test(url)) return setError("Enter a valid image URL starting with http:// or https://.");
    if (f.attachments.length >= 5) return setError("You can add up to 5 images.");
    if (f.attachments.includes(url)) return setError("That image URL is already added.");
    setF((current) => ({ ...current, attachments: [...current.attachments, url] }));
    setImageUrl("");
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const d = await request({ url: "/service-requests", method: "POST", data: { descriptionText: f.descriptionText, location: { address: f.address, city: f.city, ...f.location }, preferredDate: f.preferredDate || undefined, urgency: f.urgency, attachments: f.attachments } });
      nav(`/requests/${d.data._id}`);
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-3xl"><button onClick={() => nav(-1)} className="mb-5 flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16} />Back</button><div className="card overflow-hidden"><div className="bg-slate-950 p-7 text-white"><div className="flex items-center gap-2 text-sm font-semibold text-blue-300"><Bot size={18} />AI-powered intake</div><h1 className="mt-3 text-3xl font-bold">What do you need help with?</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Describe the problem in your own words. You do not need to know the exact service category.</p></div><form onSubmit={submit} className="space-y-5 p-6 sm:p-8">{error && <Toast message={error} type="error" onClose={() => setError("")} />}<div><label className="label">Describe your requirement *</label><textarea required rows="6" className="input resize-none" placeholder="Example: My AC is making a strange noise and is not cooling the bedroom..." value={f.descriptionText} onChange={(e) => setF({ ...f, descriptionText: e.target.value })} /><div className="mt-2 flex items-center gap-2 text-xs text-slate-400"><Sparkles size={13} />AI will classify this description and suggest skills.</div></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="label">City</label><input className="input" placeholder="Hyderabad" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div><div><label className="label">Address</label><input className="input" placeholder="Area / street" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Preferred date</label><input type="datetime-local" className="input" value={f.preferredDate} onChange={(e) => setF({ ...f, preferredDate: e.target.value })} /></div><div><label className="label">Urgency</label><select className="input" value={f.urgency} onChange={(e) => setF({ ...f, urgency: e.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="urgent">Urgent</option></select></div></div><div className="rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-3"><ImagePlus className="text-slate-400" /><div><div className="text-sm font-semibold">Add images</div><div className="text-xs text-slate-500">Choose files or add image URLs. Up to 5 images, 1 MB each for files.</div></div></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><label className="btn-secondary inline-flex cursor-pointer"><ImagePlus size={16} />Choose images<input type="file" accept="image/*" multiple className="hidden" onChange={addImages} /></label><input className="input flex-1" placeholder="https://example.com/image.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); } }} /><button type="button" className="btn-secondary" onClick={addImageUrl}>Add URL</button></div>{f.attachments.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{f.attachments.map((image, index) => <div key={image} className="group relative aspect-square overflow-hidden rounded-lg border"><img src={image} alt={`Request image ${index + 1}`} className="h-full w-full object-cover" /><button type="button" aria-label="Remove image" className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-1 text-white" onClick={() => setF({ ...f, attachments: f.attachments.filter((_, imageIndex) => imageIndex !== index) })}><X size={14} /></button></div>)}</div>}</div><button disabled={busy} className="btn-primary w-full justify-center">{busy ? "Submitting..." : "Submit request"}</button></form></div></div>;
}
