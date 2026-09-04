import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, Globe, Check, X, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { searchLocations } from "@/lib/geocoding";
import LocationPicker from "@/components/LocationPicker";

/**
 * Shared reusable Location Autocomplete + Map Synchronization component.
 * Used across the entire Eventoza website for real-time location typeahead suggestions.
 * 
 * Supports free-text fallback, map synchronization, keyboard navigation,
 * debounced requests with race condition protection, and clean address formatting.
 */
const LocationAutocomplete = ({
    value = "",
    onChange,
    onSelect,
    onCoordinatesSelect,
    coordinates = null,
    latitude = null,
    longitude = null,
    error = "",
    placeholder = "Enter venue, city, or address",
    maxLength = 150,
    required = false,
    disabled = false,
    className = "",
    inputClassName = "",
    showMapButton = false,
    mapButtonLabel = "Select Location on Map",
    label = "",
    id = "",
    name = "location",
    autoFocus = false,
    showPinIcon = false,
}) => {
    const [query, setQuery] = useState(value || "");
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [showMap, setShowMap] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const debounceTimerRef = useRef(null);
    const abortControllerRef = useRef(null);
    const searchSeqRef = useRef(0);
    const isSelectionRef = useRef(false);

    // Compute active coordinates from either coordinates object or separate lat/lng props
    const activeCoords = coordinates || (latitude != null && longitude != null && !isNaN(Number(latitude)) && !isNaN(Number(longitude))
        ? { lat: Number(latitude), lng: Number(longitude) }
        : null);

    // Sync external value changes to local query when not actively typing
    useEffect(() => {
        if (!hasInteracted || isSelectionRef.current) {
            setQuery(value || "");
            isSelectionRef.current = false;
        }
    }, [value, hasInteracted]);

    // Handle debounced search with race condition prevention
    const performSearch = useCallback(async (searchTerm) => {
        const trimmed = (searchTerm || "").trim();
        if (trimmed.length < 3) {
            setSuggestions([]);
            setLoading(false);
            setIsOpen(false);
            setSearchError(false);
            return;
        }

        // Cancel previous pending HTTP request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const currentController = new AbortController();
        abortControllerRef.current = currentController;

        const currentSeq = ++searchSeqRef.current;
        setLoading(true);
        setSearchError(false);

        try {
            const results = await searchLocations(trimmed, currentController.signal);
            // Only update state if this is the newest search request
            if (currentSeq === searchSeqRef.current) {
                setSuggestions(results);
                setIsOpen(true);
                setHighlightedIndex(-1);
                setLoading(false);
            }
        } catch (err) {
            if (currentSeq === searchSeqRef.current) {
                setSuggestions([]);
                setSearchError(true);
                setLoading(false);
            }
        }
    }, []);

    const handleInputChange = (e) => {
        const nextValue = e.target.value;
        setQuery(nextValue);
        setHasInteracted(true);
        setSearchError(false);
        if (onChange) onChange(nextValue);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (nextValue.trim().length >= 3) {
            setLoading(true);
            debounceTimerRef.current = setTimeout(() => {
                performSearch(nextValue);
            }, 350);
        } else {
            setSuggestions([]);
            setIsOpen(false);
            setLoading(false);
        }
    };

    const handleSelectSuggestion = (item) => {
        isSelectionRef.current = true;
        const selectedAddress = item.fullAddress || item.name;
        setQuery(selectedAddress);
        setSuggestions([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
        setSearchError(false);

        if (onChange) onChange(selectedAddress);
        const payload = {
            lat: item.lat,
            lng: item.lng,
            address: selectedAddress,
            name: item.name
        };
        if (onSelect) onSelect(payload);
        if (onCoordinatesSelect) onCoordinatesSelect(payload);
    };

    const handleSelectManual = () => {
        isSelectionRef.current = true;
        const manualAddress = query.trim();
        setQuery(manualAddress);
        setSuggestions([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
        setSearchError(false);

        if (onChange) onChange(manualAddress);
        const payload = {
            lat: null,
            lng: null,
            address: manualAddress,
            name: manualAddress,
            isManual: true
        };
        if (onSelect) onSelect(payload);
        if (onCoordinatesSelect) onCoordinatesSelect(payload);
    };

    const handleKeyDown = (e) => {
        if (!isOpen || suggestions.length === 0) {
            if (e.key === "Escape") {
                setIsOpen(false);
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === "Enter") {
            if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                e.preventDefault();
                handleSelectSuggestion(suggestions[highlightedIndex]);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            setIsOpen(false);
        } else if (e.key === "Tab") {
            setIsOpen(false);
        }
    };

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, []);

    // Handle map selection callback
    const handleMapLocationSelect = (lat, lng, address) => {
        isSelectionRef.current = true;
        setQuery(address);
        if (onChange) onChange(address);
        const payload = { lat, lng, address, name: address };
        if (onSelect) onSelect(payload);
        if (onCoordinatesSelect) onCoordinatesSelect(payload);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setQuery("");
        setSuggestions([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
        setSearchError(false);
        if (onChange) onChange("");
        if (onSelect) onSelect(null);
        if (onCoordinatesSelect) onCoordinatesSelect(null);
        if (inputRef.current) inputRef.current.focus();
    };

    return (
        <div ref={containerRef} className={`space-y-2 ${className}`}>
            {label && (
                <Label htmlFor={id || undefined} className="text-xs font-semibold text-muted-foreground block">
                    {label} {required && <span className="text-destructive">*</span>}
                </Label>
            )}

            {/* Input with autocomplete anchor */}
            <div className="relative">
                <div className="relative flex items-center">
                    {showPinIcon && (
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                    )}
                    <Input
                        ref={inputRef}
                        id={id || undefined}
                        name={name}
                        value={query}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (query.trim().length >= 3 && (suggestions.length > 0 || searchError)) {
                                setIsOpen(true);
                            }
                        }}
                        maxLength={maxLength}
                        placeholder={placeholder}
                        required={required}
                        disabled={disabled}
                        autoComplete="off"
                        autoFocus={autoFocus}
                        className={`bg-card border-border pr-16 text-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
                            showPinIcon ? "pl-10" : ""
                        } ${inputClassName || "h-11 rounded-xl"}`}
                        aria-invalid={Boolean(error)}
                    />

                    {/* Right side indicators */}
                    <div className="absolute right-3 flex items-center gap-1.5 z-10">
                        {loading && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {!loading && query && !disabled && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer transition-colors"
                                title="Clear location"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Suggestions Dropdown */}
                {isOpen && !disabled && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-xl p-1 animate-in fade-in-50 zoom-in-95 duration-150">
                        {suggestions.length > 0 ? (
                            suggestions.map((item, index) => {
                                const isHighlighted = index === highlightedIndex;
                                return (
                                    <button
                                        key={`${item.lat}-${item.lng}-${index}`}
                                        type="button"
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                        onClick={() => handleSelectSuggestion(item)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer ${
                                            isHighlighted
                                                ? "bg-primary/10 text-foreground"
                                                : "hover:bg-muted/60 text-foreground"
                                        }`}
                                    >
                                        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <MapPin className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-foreground truncate leading-tight">
                                                {item.name}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-tight">
                                                {item.address}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        ) : query.trim().length >= 3 && !loading ? (
                            <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                                {searchError ? (
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                        <AlertCircle className="h-4 w-4 text-muted-foreground/60" />
                                        <span>Unable to load location suggestions</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <MapPin className="h-4 w-4 text-muted-foreground/50" />
                                        <span>No exact places found for "{query}"</span>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Manual Location Option */}
                        {query.trim().length >= 3 && (
                            <button
                                type="button"
                                onClick={handleSelectManual}
                                className="w-full text-left px-3 py-2.5 rounded-lg border-t border-border flex items-center gap-2.5 hover:bg-primary/5 text-primary transition-colors cursor-pointer mt-1"
                            >
                                <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                    <Check className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">
                                        Use <span className="text-primary font-bold">"{query}"</span> as entered
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">Save as custom venue name / manual location</p>
                                </div>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {error && <p className="text-xs text-destructive font-medium">{error}</p>}

            {/* Map Toggle & Sync Section */}
            {showMapButton && (
                <div className="space-y-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={() => setShowMap(!showMap)}
                        className="w-full h-9 text-xs font-semibold rounded-lg border-border hover:bg-secondary/70 gap-2 cursor-pointer transition-all"
                    >
                        <Globe className="h-4 w-4 text-primary" />
                        {showMap ? "Hide Map" : mapButtonLabel}
                    </Button>

                    {showMap && (
                        <div className="rounded-xl overflow-hidden border border-border shadow-md animate-in fade-in-50 duration-200">
                            <LocationPicker
                                onLocationSelect={handleMapLocationSelect}
                                initialLat={activeCoords?.lat}
                                initialLng={activeCoords?.lng}
                            />
                        </div>
                    )}

                    {activeCoords && activeCoords.lat && activeCoords.lng && !showMap && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Check className="h-3.5 w-3.5 shrink-0" />
                                Coordinates: {Number(activeCoords.lat).toFixed(4)}, {Number(activeCoords.lng).toFixed(4)}
                            </span>
                            <span className="text-[10px] opacity-75">Synced with map</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LocationAutocomplete;
