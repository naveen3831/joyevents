import { formatCurrency } from "@/lib/utils";
import { ImageIcon, Loader2, AlertCircle, Ticket, MapPin, CalendarDays, Store, Search, Filter, RotateCcw } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiListEvents } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { Input } from "@/components/ui/input";

const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;

const getEventTickets = (ev) => ev.hasMultipleSessions
    ? [...(ev.sessions?.day?.tickets || []), ...(ev.sessions?.night?.tickets || [])]
    : (ev.tickets || []);

const getEventPriceLabel = (ev) => {
    if (ev.eventType !== "ticketed")
        return formatCurrency(ev.price);
    const prices = getEventTickets(ev).map((t) => t.price).filter((p) => p > 0);
    if (prices.length === 0)
        return "Free";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};

const STATUS_STYLES = {
    upcoming: "bg-blue-500/15 text-blue-400",
    ongoing: "bg-green-500/15 text-green-400",
    completed: "bg-gray-500/15 text-gray-400",
    cancelled: "bg-red-500/15 text-red-400",
};

const AdminEvents = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialFilter = queryParams.get("filter") || queryParams.get("status") || (queryParams.get("live") === "true" ? "live" : "all");

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState(initialFilter);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const f = params.get("filter") || params.get("status") || (params.get("live") === "true" ? "live" : "all");
        if (f) setFilter(f);
    }, [location.search]);

    const loadEvents = async () => {
        try {
            const eventsRes = await apiListEvents().catch(() => ({ events: [] }));
            setEvents(eventsRes.events || []);
        }
        catch {
            toast.error("Failed to load events");
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadEvents(); }, []);

    const filteredEvents = events.filter((ev) => {
        const title = ev.title || "";
        const locationStr = ev.location || "";
        const category = ev.category || "";
        const merchant = ev.createdBy?.name || ev.createdBy?.email || "";
        const matchSearch = [title, locationStr, category, merchant].some(s => s.toLowerCase().includes(search.toLowerCase()));

        let matchFilter = true;
        if (filter === "live") {
            matchFilter = ev.live === true;
        } else if (filter !== "all") {
            matchFilter = ev.status === filter;
        }

        return matchSearch && matchFilter;
    });

    const gridRef = useGsapStagger([loading, filteredEvents.length]);
    const hasActiveFilters = filter !== "all" || search.trim() !== "";

    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">
              {filter === "live" ? "🔴 Live Events" : "Events"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {filter === "live" ? "Showing events currently broadcasted live by merchants" : "View all events across every merchant on the platform"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input
              placeholder="Search by title, location, category, merchant..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground"/>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              <option value="all">All Events</option>
              <option value="live">🔴 Live Events Only</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => { setFilter("all"); setSearch(""); }}
              className="flex items-center gap-1 text-xs text-primary hover:underline self-center font-medium px-2 py-1.5 rounded-lg border border-primary/20 bg-primary/5"
            >
              <RotateCcw className="h-3 w-3"/> Clear Filters
            </button>
          )}
          <div className="flex items-center text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-lg">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin"/> Loading…
          </div>) : filteredEvents.length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
            No events match your current filter.
          </div>) : (<div ref={gridRef} className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            {filteredEvents.map((ev) => {
                const allTickets = getEventTickets(ev);
                return (<button key={ev._id} type="button" onClick={() => navigate(`/admin-dashboard/events/${ev._id}`)} className="group text-left rounded-2xl border border-border bg-card overflow-hidden hover-lift flex flex-col h-full cursor-pointer transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {/* Image - fixed height */}
                <div className="relative h-40 sm:h-44 flex-shrink-0 overflow-hidden bg-secondary">
                  {imgSrc(ev.image) ? (<img src={imgSrc(ev.image)} alt={ev.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center bg-gradient-mesh text-primary/30">
                      <ImageIcon className="h-12 w-12 opacity-30"/>
                    </div>)}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"/>
                  <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {ev.category}
                  </span>
                  {ev.live && (
                    <span className="absolute top-3 left-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white animate-pulse">
                      🔴 LIVE
                    </span>
                  )}
                  <span className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-semibold capitalize backdrop-blur-sm ${STATUS_STYLES[ev.status] || "bg-gray-500/15 text-gray-400"}`}>
                    {ev.status}
                  </span>
                </div>

                {/* Info - flex-grow so all cards stretch to same height */}
                <div className="p-3.5 sm:p-4 flex flex-col flex-1">
                  <h3 className="font-display font-semibold text-sm sm:text-base leading-tight line-clamp-2">{ev.title}</h3>

                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Store className="h-3 w-3 shrink-0"/>
                    <span className="truncate">{ev.createdBy?.name || "Unknown merchant"}</span>
                  </div>

                  {allTickets.length > 0 && (<div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Ticket className="h-3 w-3 shrink-0"/>
                      <span>{allTickets.length} ticket tier{allTickets.length > 1 ? "s" : ""}</span>
                    </div>)}

                  {/* Spacer pushes footer to bottom */}
                  <div className="flex-1 flex flex-col justify-end mt-2 gap-0.5">
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0"/>{ev.location}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3 shrink-0"/>{new Date(ev.datetime).toLocaleString()}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">{getEventPriceLabel(ev)}</span>
                      <span className="text-xs font-medium text-primary/80 opacity-0 group-hover:opacity-100 transition-opacity">View details →</span>
                    </div>
                  </div>
                </div>
              </button>);
            })}
          </div>)}
      </section>
    </AdminLayout>);
};

export default AdminEvents;
