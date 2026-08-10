import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiListEvents, apiSuspendEvent, apiCancelEvent, apiFeatureEvent } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, AlertCircle, Calendar, PowerOff, Ban, Star, PlayCircle, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";
import { useGsapReveal } from "@/lib/gsapAnimations";
const AdminEventMonitoring = () => {
    const { token } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [processingId, setProcessingId] = useState(null);
    const loadEvents = async () => {
        try {
            setLoading(true);
            const res = await apiListEvents(token);
            setEvents(res.events || []);
        }
        catch {
            toast.error("Failed to load events");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { loadEvents(); }, []);
    const handleAction = async (id, action) => {
        if (!token)
            return;
        setProcessingId(id);
        try {
            if (action === "suspend")
                await apiSuspendEvent(id, true, token);
            else if (action === "unsuspend")
                await apiSuspendEvent(id, false, token);
            else if (action === "cancel")
                await apiCancelEvent(id, token);
            else if (action === "feature")
                await apiFeatureEvent(id, true, token);
            else if (action === "unfeature")
                await apiFeatureEvent(id, false, token);
            toast.success(`Event ${action} successful`);
            loadEvents();
        }
        catch (e) {
            toast.error(e?.message || `Failed to ${action} event`);
        }
        finally {
            setProcessingId(null);
        }
    };
    const filteredEvents = events.filter(ev => {
        if (filter === "all")
            return true;
        if (filter === "active")
            return ev.status === "upcoming" || ev.status === "ongoing";
        if (filter === "completed")
            return ev.status === "completed";
        if (filter === "cancelled")
            return ev.status === "cancelled";
        return true;
    });
    const stats = {
        total: events.length,
        active: events.filter(e => e.status === "upcoming" || e.status === "ongoing").length,
        completed: events.filter(e => e.status === "completed").length,
        cancelled: events.filter(e => e.status === "cancelled").length,
    };
    const tableRef = useGsapReveal();
    return (<AdminLayout>
            <section className="py-2 sm:py-8 lg:py-10">
                <div className="mb-6 sm:mb-8">
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">
                        Events
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Real-time overview and management of all platform events</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                    <StatCard index={0} title="Total Events" value={stats.total} icon={<Calendar />} />
                    <StatCard index={1} title="Active Events" value={stats.active} icon={<PlayCircle />} />
                    <StatCard index={2} title="Completed" value={stats.completed} icon={<CheckCircle />} />
                    <StatCard index={3} title="Cancelled" value={stats.cancelled} icon={<XCircle />} />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-6 p-1 bg-secondary rounded-lg w-max">
                    {["all", "active", "completed", "cancelled"].map(f => (<button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${filter === f ? "bg-gradient-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                            <span className="capitalize">{f}</span>
                        </button>))}
                </div>

                {/* Event List */}
                {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin"/> Loading Events...
                    </div>) : filteredEvents.length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
                        No events found for this filter.
                    </div>) : (<div ref={tableRef} className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[720px]">
                                <thead className="bg-secondary text-muted-foreground text-xs uppercase tracking-wide">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Event</th>
                                        <th className="px-4 py-3 font-medium">Date & Time</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Flags</th>
                                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredEvents.map(ev => {
                const isProcessing = processingId === ev._id;
                return (<motion.tr initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.15 }} key={ev._id} className="hover:bg-secondary/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-foreground">{ev.title}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">{ev.category}</div>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                    {new Date(ev.datetime).toLocaleDateString()} at {new Date(ev.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${ev.status === "upcoming" ? "bg-tint-blue text-tint-blue-fg" :
                        ev.status === "ongoing" ? "bg-tint-mint text-tint-mint-fg" :
                            ev.status === "cancelled" ? "bg-destructive/15 text-destructive" :
                                "bg-secondary text-muted-foreground"}`}>
                                                        {ev.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {ev.isFeatured && <span className="flex items-center gap-1 text-xs text-tint-orange-fg bg-tint-orange px-2 py-1 rounded-full"><Star className="h-3 w-3"/> Featured</span>}
                                                        {ev.isSuspended && <span className="flex items-center gap-1 text-xs text-tint-orange-fg bg-tint-orange px-2 py-1 rounded-full"><PowerOff className="h-3 w-3"/> Suspended</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button disabled={isProcessing} onClick={() => handleAction(ev._id, ev.isFeatured ? "unfeature" : "feature")} className={`h-11 w-11 flex items-center justify-center rounded-md transition-colors ${ev.isFeatured ? "text-tint-orange-fg bg-tint-orange" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`} title={ev.isFeatured ? "Unfeature Event" : "Feature Event"}>
                                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <Star className="h-4 w-4"/>}
                                                        </button>

                                                        <button disabled={isProcessing} onClick={() => handleAction(ev._id, ev.isSuspended ? "unsuspend" : "suspend")} className={`h-11 w-11 flex items-center justify-center rounded-md transition-colors ${ev.isSuspended ? "text-tint-orange-fg bg-tint-orange" : "text-muted-foreground hover:bg-secondary hover:text-tint-orange-fg"}`} title={ev.isSuspended ? "Unsuspend Event" : "Suspend Event"}>
                                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <PowerOff className="h-4 w-4"/>}
                                                        </button>

                                                        <button disabled={isProcessing || ev.status === "cancelled"} onClick={() => {
                        if (confirm("Are you sure you want to cancel this event? This action cannot be fully undone through the UI.")) {
                            handleAction(ev._id, "cancel");
                        }
                    }} className={`h-11 w-11 flex items-center justify-center rounded-md transition-colors ${ev.status === "cancelled" ? "opacity-50 cursor-not-allowed" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"}`} title="Cancel Event">
                                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <Ban className="h-4 w-4"/>}
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>);
            })}
                                </tbody>
                            </table>
                        </div>
                    </div>)}
            </section>
        </AdminLayout>);
};
export default AdminEventMonitoring;
