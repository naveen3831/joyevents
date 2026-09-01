import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Loader2, MapPin } from "lucide-react";
import { reverseGeocode } from "@/lib/geocoding";

// Fix for default marker icon issue in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function MapViewController({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.flyTo(center, zoom || 15, { duration: 0.8 });
        }
    }, [center, zoom, map]);
    return null;
}

function LocationMarker({ onLocationSelect, initialLat, initialLng, onGeocodingChange }) {
    const [position, setPosition] = useState(
        initialLat && initialLng ? [Number(initialLat), Number(initialLng)] : null
    );

    useEffect(() => {
        if (initialLat && initialLng) {
            setPosition([Number(initialLat), Number(initialLng)]);
        }
    }, [initialLat, initialLng]);

    const map = useMapEvents({
        async click(e) {
            const { lat, lng } = e.latlng;
            setPosition([lat, lng]);
            if (onGeocodingChange) onGeocodingChange(true);
            try {
                const geo = await reverseGeocode(lat, lng);
                const address = geo?.fullAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                onLocationSelect(lat, lng, address);
            } catch (err) {
                onLocationSelect(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            } finally {
                if (onGeocodingChange) onGeocodingChange(false);
            }
        },
        locationfound(e) {
            if (!initialLat || !initialLng) {
                const { lat, lng } = e.latlng;
                setPosition([lat, lng]);
            }
        }
    });

    useEffect(() => {
        if (!initialLat || !initialLng) {
            map.locate();
        }
    }, [map, initialLat, initialLng]);

    return position ? <Marker position={position} /> : null;
}

const LocationPicker = ({ onLocationSelect, initialLat, initialLng }) => {
    const [isResolving, setIsResolving] = useState(false);
    const hasCoordinates = Boolean(initialLat && initialLng && !isNaN(initialLat) && !isNaN(initialLng));

    const defaultCenter = [20.5937, 78.9629]; // India center
    const centerPosition = hasCoordinates
        ? [Number(initialLat), Number(initialLng)]
        : defaultCenter;
    const targetZoom = hasCoordinates ? 15 : 5;

    return (
        <div className="relative w-full rounded-xl overflow-hidden border border-border">
            <MapContainer
                center={centerPosition}
                zoom={targetZoom}
                style={{ height: "360px", width: "100%", borderRadius: "12px" }}
                scrollWheelZoom={true}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapViewController center={centerPosition} zoom={targetZoom} />
                <LocationMarker
                    onLocationSelect={onLocationSelect}
                    initialLat={initialLat}
                    initialLng={initialLng}
                    onGeocodingChange={setIsResolving}
                />
            </MapContainer>

            {/* Status bar */}
            <div className="absolute bottom-3 left-3 right-3 bg-card/95 backdrop-blur-md rounded-lg px-3.5 py-2.5 shadow-md border border-border/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-foreground font-medium truncate">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">
                        {hasCoordinates
                            ? `Pinned: ${Number(initialLat).toFixed(4)}, ${Number(initialLng).toFixed(4)}`
                            : "Click anywhere on the map to pin your venue"}
                    </span>
                </div>
                {isResolving && (
                    <span className="flex items-center gap-1.5 text-primary text-[11px] shrink-0 font-medium">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Resolving address…
                    </span>
                )}
            </div>
        </div>
    );
};

export default LocationPicker;
