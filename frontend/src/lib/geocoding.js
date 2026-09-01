/**
 * Centralized Geocoding and Reverse Geocoding service for Eventoza.
 * Uses Photon (OpenStreetMap-based autocomplete engine) with Nominatim fallback.
 */

export async function searchLocations(query, signal = null) {
    if (!query || typeof query !== "string" || query.trim().length < 3) {
        return [];
    }

    const trimmed = query.trim();

    // 1. Try Photon (fast, optimized for typeahead autocomplete)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const onAbort = () => controller.abort();
        if (signal) {
            signal.addEventListener("abort", onAbort, { once: true });
        }

        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=7`, {
            headers: {
                "Accept-Language": "en",
                "User-Agent": "EventozaApp/1.0"
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (signal) {
            signal.removeEventListener("abort", onAbort);
        }

        if (res.ok) {
            const data = await res.json();
            if (data && data.features && data.features.length > 0) {
                return data.features.map((f) => {
                    const p = f.properties || {};
                    const name = p.name || p.street || p.city || trimmed;
                    const parts = [
                        p.street && p.street !== name ? p.street : null,
                        p.locality && p.locality !== name ? p.locality : null,
                        p.district && p.district !== name ? p.district : null,
                        p.city || p.county,
                        p.state,
                        p.country
                    ].filter(Boolean);

                    const addressParts = Array.from(new Set(parts));
                    const address = addressParts.join(", ");
                    const fullAddress = name ? (address && !address.toLowerCase().includes(name.toLowerCase()) ? `${name}, ${address}` : address || name) : address;
                    const [lng, lat] = f.geometry?.coordinates || [0, 0];

                    return {
                        name: name || address || trimmed,
                        address: address || name,
                        fullAddress: fullAddress.slice(0, 150),
                        lat: Number(lat),
                        lng: Number(lng)
                    };
                }).filter((item) => item.lat !== 0 && item.lng !== 0);
            }
        }
    } catch (e) {
        // Fall through to Nominatim fallback
    }

    // 2. Fallback to Nominatim if Photon fails or returns empty
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const onAbort = () => controller.abort();
        if (signal) {
            signal.addEventListener("abort", onAbort, { once: true });
        }

        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&addressdetails=1&limit=6`, {
            headers: {
                "Accept-Language": "en",
                "User-Agent": "EventozaApp/1.0"
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (signal) {
            signal.removeEventListener("abort", onAbort);
        }

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return data.map((item) => {
                    const name = item.name || item.display_name.split(",")[0].trim();
                    const addr = item.address || {};
                    const parts = [
                        addr.road && addr.road !== name ? addr.road : null,
                        addr.suburb || addr.neighbourhood,
                        addr.city || addr.town || addr.county,
                        addr.state,
                        addr.country
                    ].filter(Boolean);

                    const address = Array.from(new Set(parts)).join(", ") || item.display_name;
                    const fullAddress = name ? (address && !address.toLowerCase().includes(name.toLowerCase()) ? `${name}, ${address}` : address) : address;

                    return {
                        name,
                        address,
                        fullAddress: (fullAddress || item.display_name).slice(0, 150),
                        lat: parseFloat(item.lat),
                        lng: parseFloat(item.lon)
                    };
                }).filter((item) => !isNaN(item.lat) && !isNaN(item.lng));
            }
        }
    } catch (e) {
        // Handle gracefully
    }

    return [];
}

export async function reverseGeocode(lat, lng) {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return null;
    }

    const fallbackCoord = `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;

    // 1. Try Photon reverse geocode
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`, {
            headers: {
                "Accept-Language": "en",
                "User-Agent": "EventozaApp/1.0"
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                const p = data.features[0].properties || {};
                const name = p.name || p.street || "";
                const parts = [
                    p.street && p.street !== name ? p.street : null,
                    p.locality,
                    p.district,
                    p.city || p.county,
                    p.state,
                    p.country
                ].filter(Boolean);

                const address = Array.from(new Set(parts)).join(", ");
                const fullAddress = name ? (address && !address.toLowerCase().includes(name.toLowerCase()) ? `${name}, ${address}` : address || name) : address;

                return {
                    name: name || address || fallbackCoord,
                    address: address || name || fallbackCoord,
                    fullAddress: (fullAddress || fallbackCoord).slice(0, 150),
                    lat: Number(lat),
                    lng: Number(lng)
                };
            }
        }
    } catch (e) {
        // Fall through
    }

    // 2. Fallback to Nominatim reverse geocode
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: {
                "Accept-Language": "en",
                "User-Agent": "EventozaApp/1.0"
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
                const addr = data.address || {};
                const name = data.name || addr.amenity || addr.leisure || addr.building || addr.road || "";
                const parts = [
                    addr.road && addr.road !== name ? addr.road : null,
                    addr.suburb || addr.neighbourhood,
                    addr.city || addr.town || addr.county,
                    addr.state,
                    addr.country
                ].filter(Boolean);

                const address = Array.from(new Set(parts)).join(", ") || data.display_name;
                const fullAddress = name ? (address && !address.toLowerCase().includes(name.toLowerCase()) ? `${name}, ${address}` : address) : address;

                return {
                    name: name || address,
                    address,
                    fullAddress: (fullAddress || data.display_name).slice(0, 150),
                    lat: Number(lat),
                    lng: Number(lng)
                };
            }
        }
    } catch (e) {
        // Handle gracefully
    }

    return {
        name: fallbackCoord,
        address: fallbackCoord,
        fullAddress: fallbackCoord,
        lat: Number(lat),
        lng: Number(lng)
    };
}
