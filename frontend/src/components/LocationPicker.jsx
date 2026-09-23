import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function ClickHandler({ onChange }) {
  useMapEvents({ click: (event) => onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng }) });
  return null;
}

export default function LocationPicker({ value, onChange, height = "h-64" }) {
  const position = value?.latitude && value?.longitude ? [value.latitude, value.longitude] : null;
  return <MapContainer center={position || [17.385, 78.4867]} zoom={position ? 15 : 5} className={`${height} w-full`}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><ClickHandler onChange={onChange} />{position && <Marker position={position} />}</MapContainer>;
}