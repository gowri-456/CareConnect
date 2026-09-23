import { useEffect, useState } from "react";
import { LocateFixed, Save } from "lucide-react";
import { request } from "../api";
import Loading from "../components/Loading";
import LocationPicker from "../components/LocationPicker";

export default function ProviderLocation() {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { request({ url: "/providers/me" }).then((result) => setLocation(result.data.location || { latitude: null, longitude: null })).catch(() => setMessage("Provider profile could not be loaded.")); }, []);
  const useCurrentLocation = () => navigator.geolocation?.getCurrentPosition((position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }), () => setMessage("Location permission was not available."));
  const save = async () => { setBusy(true); setMessage(""); try { await request({ url: "/providers/me", method: "PATCH", data: { location } }); setMessage("Map location saved."); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  if (!location) return <Loading />;
  return <div className="mx-auto max-w-3xl"><h1 className="page-title">Provider map location</h1><p className="mt-2 muted">Set the location customers can see and use this pin to prepare for a booking.</p><div className="card mt-6 overflow-hidden"><LocationPicker value={location} onChange={setLocation} height="h-96" /><div className="space-y-4 p-6"><div className="flex flex-wrap gap-3"><button type="button" className="btn-secondary" onClick={useCurrentLocation}><LocateFixed size={17} />Use my current location</button><button type="button" className="btn-primary" disabled={busy || !location.latitude || !location.longitude} onClick={save}><Save size={17} />{busy ? "Saving..." : "Save location"}</button></div><p className="text-sm text-slate-500">Latitude: {location.latitude || "Not set"} | Longitude: {location.longitude || "Not set"}</p>{message && <p className="text-sm text-emerald-600">{message}</p>}</div></div></div>;
}
