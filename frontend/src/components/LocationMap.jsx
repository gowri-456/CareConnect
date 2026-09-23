import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function LocationMap({ locations = [], height = "h-64" }) {
  const visible = locations.filter((item) => item?.latitude && item?.longitude);
  const center = visible[0] ? [visible[0].latitude, visible[0].longitude] : [17.385, 78.4867];
  return <MapContainer center={center} zoom={visible.length ? 13 : 5} className={`${height} w-full`}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{visible.map((item) => <Marker key={`${item.label}-${item.latitude}-${item.longitude}`} position={[item.latitude, item.longitude]}><Popup>{item.label}</Popup></Marker>)}</MapContainer>;
}
