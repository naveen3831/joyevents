import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, MessageSquare, ChevronDown, ChevronUp, Send } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetCustomerInbox, apiCustomerReply } from "@/lib/api";
import { toast } from "sonner";
import { useGsapStagger } from "@/lib/gsapAnimations";
const CustomerMessages = () => {
    const { token, user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [replyText, setReplyText] = useState({});
    const [sending, setSending] = useState(null);
    const load = () => {
        if (!token)
            return;
        apiGetCustomerInbox(token)
            .then(res => setMessages(res.messages || []))
            .catch(() => toast.error("Failed to load messages"))
            .finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, [token]);
    const handleReply = async (msgId) => {
        const text = replyText[msgId]?.trim();
        if (!text) {
            toast.error("Please type a message");
            return;
        }
        if (text.length > 1000) {
            toast.error("Message cannot exceed 1000 characters");
            return;
        }
        setSending(msgId);
        try {
            const res = await apiCustomerReply(msgId, text, token);
            setMessages(prev => prev.map(m => m._id === msgId ? res.message : m));
            setReplyText(prev => ({ ...prev, [msgId]: "" }));
            toast.success("Message sent!");
        }
        catch {
            toast.error("Failed to send message");
        }
        finally {
            setSending(null);
        }
    };
    const hasReplies = (msg) => msg.replies?.some((r) => r.from === "merchant");
    const listRef = useGsapStagger([messages.length, loading]);
    return (<CustomerLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>
          <div className="mb-6 sm:mb-8">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary"/> My <span className="text-gradient">Messages</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Your conversations with event & service organisers</p>
          </div>

          {loading ? (<div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading…
            </div>) : messages.length === 0 ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
              <MessageSquare className="h-14 w-14 mx-auto mb-4 opacity-30 text-muted-foreground"/>
              <p className="font-medium text-lg text-foreground">No messages yet</p>
              <p className="text-sm mt-1 text-muted-foreground">Contact an organiser from any event or service page</p>
            </div>) : (<div ref={listRef} className="space-y-3">
              {messages.map((msg, idx) => (<motion.div key={msg._id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: idx * 0.04 }} className={`rounded-xl border bg-card overflow-hidden ${hasReplies(msg) ? "border-primary/40" : "border-border"}`}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => setExpanded(expanded === msg._id ? null : msg._id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${hasReplies(msg) ? "bg-primary/15" : "bg-secondary"}`}>
                        <Mail className={`h-4 w-4 ${hasReplies(msg) ? "text-primary" : "text-muted-foreground"}`}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {msg.itemTitle}
                          {hasReplies(msg) && (<span className="ml-2 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold">REPLY RECEIVED</span>)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          With: {msg.merchant?.name || "Organiser"} · {new Date(msg.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {expanded === msg._id
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0"/>
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0"/>}
                  </div>

                  {/* Expanded thread */}
                  {expanded === msg._id && (<div className="px-5 pb-5 border-t border-border space-y-3">
                      {/* Original message */}
                      <div className="mt-4">
                        <div className="rounded-lg bg-secondary/40 p-3 mr-8">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">You</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(msg.createdAt).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Reply thread */}
                      {msg.replies?.map((r, i) => (<div key={i} className={`rounded-lg p-3 text-sm ${r.from === "merchant"
                            ? "bg-primary/10 border border-primary/20 ml-8"
                            : "bg-secondary/40 mr-8"}`}>
                          <p className={`text-xs font-semibold mb-1 ${r.from === "merchant" ? "text-primary" : "text-muted-foreground"}`}>
                            {r.from === "merchant" ? msg.merchant?.name || "Organiser" : "You"}
                          </p>
                          <p className="whitespace-pre-wrap text-foreground">{r.text}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                        </div>))}

                      {/* Customer reply box */}
                      <div className="pt-3 border-t border-border">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-muted-foreground">Reply to Organiser</span>
                          <span className={`text-[10px] ${((replyText[msg._id] || "").length >= 1000) ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                            {(replyText[msg._id] || "").length}/1000
                          </span>
                        </div>
                        <textarea value={replyText[msg._id] || ""} onChange={e => {
                        const val = e.target.value;
                        if (val.length <= 1000) {
                            setReplyText(prev => ({ ...prev, [msg._id]: val }));
                        }
                    }} placeholder="Type your reply to the organiser..." maxLength={1000} rows={3} className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"/>
                        <div className="flex justify-end mt-2">
                          <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2" onClick={() => handleReply(msg._id)} disabled={sending === msg._id}>
                            {sending === msg._id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                        : <Send className="h-3.5 w-3.5"/>}
                            Send
                          </Button>
                        </div>
                      </div>
                    </div>)}
                </motion.div>))}
            </div>)}
        </motion.div>
      </section>
    </CustomerLayout>);
};
export default CustomerMessages;
