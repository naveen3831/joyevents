import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issue in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

function LocationMarker({ onLocationSelect, initialLat, initialLng }: { 
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );

  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      // For demo, we'll use coordinates as address
      // In production, you'd use reverse geocoding API
      const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      onLocationSelect(lat, lng, address);
    },
    locationfound(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      onLocationSelect(e.latlng.lat, e.latlng.lng, `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
    },
  });

  // Try to get user's location on mount
  useEffect(() => {
    if (!initialLat || !initialLng) {
      map.locate();
    }
  }, [map, initialLat, initialLng]);

  return position ? <Marker position={position} /> : null;
}

const LocationPicker = ({ onLocationSelect, initialLat, initialLng }: LocationPickerProps) => {
  const defaultCenter: [number, number] = [20.5937, 78.9629]; // India center
  const centerPosition: [number, number] = initialLat && initialLng 
    ? [initialLat, initialLng] 
    : defaultCenter;

  return (
    <div className="relative">
      <MapContainer
        center={centerPosition}
        zoom={5}
        style={{ height: '400px', width: '100%', borderRadius: '12px' }}
        scrollWheelZoom={true}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker 
          onLocationSelect={onLocationSelect}
          initialLat={initialLat}
          initialLng={initialLng}
        />
      </MapContainer>
      <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border">
        <p className="text-sm text-muted-foreground">
          📍 Click anywhere on the map to select your event location
        </p>
      </div>
    </div>
  );
};

export default LocationPicker;
