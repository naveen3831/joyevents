/**
 * Centralized Geocoding and Reverse Geocoding service for Eventoza.
 * Uses Photon (OpenStreetMap-based autocomplete engine) with Nominatim fallback.
 * Includes geographic biasing towards India, token-based relevance scoring,
 * locality matching, and intelligent multi-stage search fallbacks.
 */

// Generic venue/location words that shouldn't be penalized if missing individually,
// but specific locality names (e.g., "gachibowli", "kanteerava", "madhapur") are heavily weighted.
const VENUE_GENERIC_WORDS = new Set([
    "indoor", "outdoor", "stadium", "sports", "complex", "center", "centre", 
    "hall", "arena", "park", "ground", "grounds", "road", "street", "avenue", 
    "building", "hotel", "plaza", "tower", "towers", "garden", "gardens", 
    "auditorium", "club", "resort", "convention", "exhibition", "international",
    "st", "rd", "ave", "blvd", "dr"
]);

/**
 * Score location result based on query match, locality tokens, country preference, etc.
 */
export function scoreLocationResult(item, rawQuery) {
    if (!item || !rawQuery) return 0;
    
    const queryClean = rawQuery.toLowerCase().trim();
    // Split into alphanumeric tokens
    const queryTokens = queryClean.split(/[\s,/\-\.\'\"]+/).filter(t => t.length > 1);
    if (queryTokens.length === 0) return 0;

    const nameLower = (item.name || "").toLowerCase();
    const addressLower = (item.address || "").toLowerCase();
    const fullLower = (item.fullAddress || `${item.name} ${item.address}`).toLowerCase();
    const countryLower = (item.country || addressLower).toLowerCase();

    let score = 0;

    // 1. Country Preference (India boost)
    const isIndia = countryLower.includes("india") || countryLower.includes("in");
    if (isIndia) {
        score += 120;
    }

    // 2. Separate specific tokens from generic words
    const specificTokens = queryTokens.filter(t => !VENUE_GENERIC_WORDS.has(t));
    const genericTokens = queryTokens.filter(t => VENUE_GENERIC_WORDS.has(t));

    // 3. Specific Locality / Name Token Matching
    let specificMatches = 0;
    for (const token of specificTokens) {
        if (fullLower.includes(token)) {
            specificMatches++;
            if (nameLower.includes(token)) {
                score += 90;
            } else {
                score += 60;
            }
        }
    }

    // If query has specific tokens (e.g. "gachibowli"), but result has ZERO specific token matches:
    if (specificTokens.length > 0) {
        if (specificMatches === 0) {
            score -= 250; // Heavy penalty for missing key locality tokens (e.g. Singapore stadium for Gachibowli query)
        } else if (specificMatches === specificTokens.length) {
            score += 150; // Full specific token match bonus!
        }
    }

    // 4. Generic Token Matching
    for (const token of genericTokens) {
        if (nameLower.includes(token)) {
            score += 30;
        } else if (fullLower.includes(token)) {
            score += 15;
        }
    }

    // 5. Total Token Coverage Ratio
    const matchedTotalTokens = queryTokens.filter(t => fullLower.includes(t)).length;
    const coverageRatio = matchedTotalTokens / queryTokens.length;
    score += Math.round(coverageRatio * 70);

    // 6. Exact or Phrase Match Bonus
    if (nameLower.includes(queryClean)) {
        score += 100;
    } else if (fullLower.includes(queryClean)) {
        score += 60;
    }

    return score;
}

/**
 * Deduplicate results by lat/lng proximity or matching full address
 */
function deduplicateLocations(locations) {
    const seen = new Set();
    const result = [];

    for (const loc of locations) {
        if (!loc || loc.lat === 0 || loc.lng === 0) continue;
        
        // Key based on rounded lat/lng and name
        const key = `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}:${(loc.name || "").toLowerCase()}`;
        const addressKey = (loc.fullAddress || "").toLowerCase();

        if (!seen.has(key) && !seen.has(addressKey)) {
            seen.add(key);
            seen.add(addressKey);
            result.push(loc);
        }
    }

    return result;
}

/**
 * Fetch locations from Photon API with geographic bias towards India
 */
async function fetchPhoton(query, signal = null, biasIndia = true) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const onAbort = () => controller.abort();
        if (signal) {
            signal.addEventListener("abort", onAbort, { once: true });
        }

        // Apply India geographic center bias (lat=20.5937, lon=78.9629) or Hyderabad (17.3850, 78.4867)
        const biasParams = biasIndia ? "&lat=20.5937&lon=78.9629&location_bias_scale=0.2" : "";
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10${biasParams}`;

        const res = await fetch(url, {
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
                    const name = p.name || p.street || p.city || query;
                    const country = p.country || "";
                    const parts = [
                        p.street && p.street !== name ? p.street : null,
                        p.locality && p.locality !== name ? p.locality : null,
                        p.district && p.district !== name ? p.district : null,
                        p.city || p.county,
                        p.state,
                        country
                    ].filter(Boolean);

                    const addressParts = Array.from(new Set(parts));
                    const address = addressParts.join(", ");
                    const fullAddress = name ? (address && !address.toLowerCase().includes(name.toLowerCase()) ? `${name}, ${address}` : address || name) : address;
                    const [lng, lat] = f.geometry?.coordinates || [0, 0];

                    return {
                        name: name || address || query,
                        address: address || name,
                        fullAddress: fullAddress.slice(0, 150),
                        country,
                        lat: Number(lat),
                        lng: Number(lng)
                    };
                }).filter((item) => item.lat !== 0 && item.lng !== 0);
            }
        }
    } catch (e) {
        // Fallback
    }
    return [];
}

/**
 * Fetch locations from Nominatim API with countrycodes=in filter
 */
async function fetchNominatim(query, signal = null, countryFilter = "in") {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const onAbort = () => controller.abort();
        if (signal) {
            signal.addEventListener("abort", onAbort, { once: true });
        }

        const countryParam = countryFilter ? `&countrycodes=${countryFilter}` : "";
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=8${countryParam}`;

        const res = await fetch(url, {
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
                    const country = addr.country || "";
                    const parts = [
                        addr.road && addr.road !== name ? addr.road : null,
                        addr.suburb || addr.neighbourhood,
                        addr.city || addr.town || addr.county,
                        addr.state,
                        country
                    ].filter(Boolean);

                    const address = Array.from(new Set(parts)).join(", ") || item.display_name;
                    const fullAddress = name ? (address && !address.toLowerCase().includes(name.toLowerCase()) ? `${name}, ${address}` : address) : address;

                    return {
                        name,
                        address,
                        fullAddress: (fullAddress || item.display_name).slice(0, 150),
                        country,
                        lat: parseFloat(item.lat),
                        lng: parseFloat(item.lon)
                    };
                }).filter((item) => !isNaN(item.lat) && !isNaN(item.lng));
            }
        }
    } catch (e) {
        // Fallback
    }
    return [];
}

/**
 * Primary multi-stage location search with relevance ranking & fallbacks
 */
export async function searchLocations(query, signal = null) {
    if (!query || typeof query !== "string" || query.trim().length < 3) {
        return [];
    }

    const trimmed = query.trim();

    // Stage 1: Fetch from Photon (with India bias) & Nominatim (India filtered) concurrently
    const [photonResults, nominatimIndiaResults] = await Promise.all([
        fetchPhoton(trimmed, signal, true),
        fetchNominatim(trimmed, signal, "in")
    ]);

    let rawCandidates = deduplicateLocations([...photonResults, ...nominatimIndiaResults]);

    // Score and rank Stage 1 candidates
    let scoredCandidates = rawCandidates.map(item => ({
        ...item,
        score: scoreLocationResult(item, trimmed)
    })).sort((a, b) => b.score - a.score);

    // Check if we have strong local results (score > 100)
    const hasStrongLocalResults = scoredCandidates.length > 0 && scoredCandidates[0].score >= 100;

    // Stage 2: Fallback queries if Stage 1 yields weak or no local results
    if (!hasStrongLocalResults) {
        // Fallback 1: Append "India" or city context to query
        const enrichedQuery = `${trimmed} India`;
        const [fallbackPhoton, fallbackNominatimGlobal] = await Promise.all([
            fetchPhoton(enrichedQuery, signal, true),
            fetchNominatim(trimmed, signal, null) // Global Nominatim search
        ]);

        const additionalCandidates = deduplicateLocations([...fallbackPhoton, ...fallbackNominatimGlobal]);
        const allCandidates = deduplicateLocations([...rawCandidates, ...additionalCandidates]);

        scoredCandidates = allCandidates.map(item => ({
            ...item,
            score: scoreLocationResult(item, trimmed)
        })).sort((a, b) => b.score - a.score);
    }

    // Filter out items with very negative score (e.g. -200 irrelevance penalty) unless no better options exist
    const positiveScored = scoredCandidates.filter(item => item.score > 0);
    const finalResults = positiveScored.length > 0 ? positiveScored : scoredCandidates;

    // Return top 8 results sorted by score
    return finalResults.slice(0, 8);
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
                const country = p.country || "";
                const parts = [
                    p.street && p.street !== name ? p.street : null,
                    p.locality,
                    p.district,
                    p.city || p.county,
                    p.state,
                    country
                ].filter(Boolean);

                const address = Array.from(new Set(parts)).join(", ");
                const fullAddress = name ? (address && !address.toLowerCase().includes(name.toLowerCase()) ? `${name}, ${address}` : address || name) : address;

                return {
                    name: name || address || fallbackCoord,
                    address: address || name || fallbackCoord,
                    fullAddress: (fullAddress || fallbackCoord).slice(0, 150),
                    country,
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
                const country = addr.country || "";
                const parts = [
                    addr.road && addr.road !== name ? addr.road : null,
                    addr.suburb || addr.neighbourhood,
                    addr.city || addr.town || addr.county,
                    addr.state,
                    country
                ].filter(Boolean);

                const address = Array.from(new Set(parts)).join(", ") || data.display_name;
                const fullAddress = name ? (address && !address.toLowerCase().includes(name.toLowerCase()) ? `${name}, ${address}` : address) : address;

                return {
                    name: name || address,
                    address,
                    fullAddress: (fullAddress || data.display_name).slice(0, 150),
                    country,
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
        country: "",
        lat: Number(lat),
        lng: Number(lng)
    };
}
