import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { getBrowserLocation } from '../utils/format';
import { DEFAULT_LOCATION } from '../utils/options';
import { TILE_ATTRIBUTION, TILE_URL, shelterIcon } from './mapIcons';
import { MapPinIcon } from './Icons';

function ClickToSet({ onChange }) {
  useMapEvents({ click: (e) => onChange({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) }) });
  return null;
}

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== undefined && !Number.isNaN(lat)) map.setView([lat, lng], Math.max(map.getZoom(), 12));
  }, [lat, lng, map]);
  return null;
}

export default function LocationPicker({ value, onChange, height = 240 }) {
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState('');
  const position = value?.lat !== undefined && value?.lat !== '' ? { lat: Number(value.lat), lng: Number(value.lng) } : null;
  const center = position || DEFAULT_LOCATION;

  const useMyLocation = async () => {
    setLocating(true);
    setNote('');
    const loc = await getBrowserLocation();
    setLocating(false);
    if (loc) onChange({ lat: +loc.lat.toFixed(5), lng: +loc.lng.toFixed(5) });
    else {
      setNote('Could not get your location, so we used Hyderabad. Click the map to adjust.');
      onChange({ lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng });
    }
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={useMyLocation} className="btn-outline !py-1.5 !text-xs" disabled={locating}>
          <MapPinIcon size={14} /> {locating ? 'Locating…' : 'Use my location'}
        </button>
        <span className="text-xs text-muted">{position ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}` : 'Or click on the map'}</span>
      </div>
      {note && <p className="mb-2 text-xs text-amber-700">{note}</p>}
      <div className="overflow-hidden rounded-2xl border border-black/10" style={{ height }}>
        <MapContainer center={[center.lat, center.lng]} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <ClickToSet onChange={onChange} />
          <Recenter lat={position?.lat} lng={position?.lng} />
          {position && <Marker position={[position.lat, position.lng]} icon={shelterIcon} />}
        </MapContainer>
      </div>
    </div>
  );
}
