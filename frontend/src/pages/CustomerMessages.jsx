import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, MessageSquare, ChevronDown, Send } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetCustomerInbox, apiCustomerReply } from "@/lib/api";
import { toast } from "sonner";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";

const CustomerMessages = () => {
    const { token, user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [replyText, setReplyText] = useState({});
    const [sending, setSending] = useState(null);

    const load = () => {
        if (!token) return;
        apiGetCustomerInbox(token)
            .then(res => setMessages(res.messages || []))
            .catch(() => toast.error("Failed to load messages"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [token]);

    useRealtimeEvent("realtime:chat-message", () => { load(); });

    const handleReply = async (msgId) => {
        const text = replyText[msgId]?.trim();
        if (!text) { toast.error("Please type a message"); return; }
        if (text.length > 1000) { toast.error("Message cannot exceed 1000 characters"); return; }
        setSending(msgId);
        try {
            const res = await apiCustomerReply(msgId, text, token);
            setMessages(prev => prev.map(m => m._id === msgId ? res.message : m));
            setReplyText(prev => ({ ...prev, [msgId]: "" }));
            toast.success("Message sent!");
        } catch {
            toast.error("Failed to send message");
        } finally {
            setSending(null);
        }
    };

    const hasReplies = (msg) => msg.replies?.some((r) => r.from === "merchant");

    // Derive a short preview from the most recent message in the thread
    const getPreview = (msg) => {
        const allReplies = msg.replies || [];
        if (allReplies.length > 0) {
            const last = allReplies[allReplies.length - 1];
            return last.text || msg.message || "";
        }
        return msg.message || "";
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    };

    const listRef = useGsapStagger([messages.length, loading]);

    return (
        <CustomerLayout>
            <section className="py-2 sm:py-6">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>

                    {/* ── Page Header ───────────────────────────── */}
                    <div className="mb-5">
                        <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            My <span className="text-gradient">Messages</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Your conversations with event &amp; service organisers
                        </p>
                    </div>

                    {/* ── States ────────────────────────────────── */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="bg-card border border-border rounded-xl p-10 text-center">
                            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-25 text-muted-foreground" />
                            <p className="font-semibold text-base text-foreground">No messages yet</p>
                            <p className="text-sm mt-1 text-muted-foreground">
                                Contact an organiser from any event or service page
                            </p>
                        </div>
                    ) : (
                        <div ref={listRef} className="space-y-2">
                            {messages.map((msg, idx) => {
                                const isExpanded = expanded === msg._id;
                                const replied = hasReplies(msg);
                                const preview = getPreview(msg);

                                return (
                                    <motion.div
                                        key={msg._id}
                                        initial={{ opacity: 0, y: 8 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.15 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className={`rounded-xl border bg-card overflow-hidden transition-colors ${
                                            isExpanded
                                                ? "border-primary/30 bg-primary/[0.01]"
                                                : replied
                                                    ? "border-primary/25"
                                                    : "border-border"
                                        }`}
                                    >
                                        {/* ── Collapsed Header Row ──────────────────── */}
                                        <div
                                            className="flex items-center gap-3 px-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                                            style={{ minHeight: "68px", padding: "10px 16px" }}
                                            onClick={() => setExpanded(isExpanded ? null : msg._id)}
                                        >
                                            {/* Icon */}
                                            <div
                                                className={`flex shrink-0 items-center justify-center rounded-full ${
                                                    replied ? "bg-primary/15" : "bg-secondary"
                                                }`}
                                                style={{ width: "36px", height: "36px" }}
                                            >
                                                <Mail className={`h-[15px] w-[15px] ${replied ? "text-primary" : "text-muted-foreground"}`} />
                                            </div>

                                            {/* Title + Merchant info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-[14px] font-semibold text-foreground truncate leading-tight">
                                                        {msg.itemTitle}
                                                    </p>
                                                    {replied && (
                                                        <span
                                                            className="inline-flex items-center bg-primary/12 text-primary border border-primary/20 font-semibold rounded-full whitespace-nowrap flex-shrink-0"
                                                            style={{ fontSize: "10px", padding: "2px 7px" }}
                                                        >
                                                            REPLY RECEIVED
                                                        </span>
                                                    )}
                                                </div>
                                                <p
                                                    className="text-muted-foreground mt-0.5 truncate"
                                                    style={{ fontSize: "12px" }}
                                                >
                                                    {msg.merchant?.name || "Organiser"}
                                                    {preview && (
                                                        <span className="text-muted-foreground/70">
                                                            {" · "}
                                                            <span
                                                                style={{
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap",
                                                                    display: "inline",
                                                                }}
                                                            >
                                                                {preview.length > 60 ? preview.slice(0, 60) + "…" : preview}
                                                            </span>
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            {/* Date */}
                                            <span
                                                className="text-muted-foreground shrink-0 hidden sm:block"
                                                style={{ fontSize: "12px", minWidth: "90px", textAlign: "right" }}
                                            >
                                                {formatDate(msg.createdAt)}
                                            </span>

                                            {/* Chevron with rotate animation */}
                                            <div
                                                className="shrink-0 flex items-center justify-center text-muted-foreground ml-1"
                                                style={{
                                                    width: "28px",
                                                    height: "28px",
                                                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                                    transition: "transform 0.2s ease",
                                                }}
                                            >
                                                <ChevronDown className="h-4 w-4" />
                                            </div>
                                        </div>

                                        {/* ── Expanded Thread ───────────────────────── */}
                                        {isExpanded && (
                                            <div
                                                className="border-t border-border bg-secondary/20 space-y-3"
                                                style={{ padding: "16px 20px 20px 20px" }}
                                            >
                                                {/* Date visible on mobile in expanded */}
                                                <p className="text-[11px] text-muted-foreground sm:hidden">
                                                    {formatDate(msg.createdAt)}
                                                </p>

                                                {/* Original customer message */}
                                                <div>
                                                    <div className="rounded-lg bg-card border border-border p-3 mr-8">
                                                        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">You</p>
                                                        <p className="text-[13.5px] text-foreground whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                                        <p className="text-[10.5px] text-muted-foreground mt-1.5">
                                                            {new Date(msg.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Reply thread */}
                                                {msg.replies?.map((r, i) => (
                                                    <div
                                                        key={i}
                                                        className={`rounded-lg p-3 text-sm ${
                                                            r.from === "merchant"
                                                                ? "bg-primary/8 border border-primary/20 ml-8"
                                                                : "bg-card border border-border mr-8"
                                                        }`}
                                                    >
                                                        <p className={`text-[11px] font-semibold mb-1.5 ${r.from === "merchant" ? "text-primary" : "text-muted-foreground"}`}>
                                                            {r.from === "merchant" ? (msg.merchant?.name || "Organiser") : "You"}
                                                        </p>
                                                        <p className="whitespace-pre-wrap text-foreground leading-relaxed">{r.text}</p>
                                                        <p className="text-[10.5px] text-muted-foreground mt-1.5">
                                                            {new Date(r.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                                                        </p>
                                                    </div>
                                                ))}

                                                {/* Reply input */}
                                                <div className="pt-3 border-t border-border">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className="text-[11px] text-muted-foreground font-medium">Reply to Organiser</span>
                                                        <span className={`text-[11px] ${((replyText[msg._id] || "").length >= 1000) ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                                                            {(replyText[msg._id] || "").length}/1000
                                                        </span>
                                                    </div>
                                                    <textarea
                                                        value={replyText[msg._id] || ""}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val.length <= 1000) {
                                                                setReplyText(prev => ({ ...prev, [msg._id]: val }));
                                                            }
                                                        }}
                                                        placeholder="Type your reply to the organiser..."
                                                        maxLength={1000}
                                                        rows={3}
                                                        className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                                    />
                                                    <div className="flex justify-end mt-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2"
                                                            onClick={() => handleReply(msg._id)}
                                                            disabled={sending === msg._id}
                                                        >
                                                            {sending === msg._id
                                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                : <Send className="h-3.5 w-3.5" />}
                                                            Send
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </section>
        </CustomerLayout>
    );
};

export default CustomerMessages;


