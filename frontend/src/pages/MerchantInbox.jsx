import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Trash2, MailOpen, Loader2, Inbox, RefreshCw, Send, ChevronDown, ChevronUp } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetInbox, apiMarkMessageRead, apiDeleteMessage, apiReplyToMessage } from "@/lib/api";
import { toast } from "sonner";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";

const MerchantInbox = () => {
    const { token } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [replyText, setReplyText] = useState({});
    const [sending, setSending] = useState(null);

    const load = () => {
        if (!token)
            return;
        setLoading(true);
        apiGetInbox(token)
            .then(res => setMessages(res.messages || []))
            .catch(() => toast.error("Failed to load inbox"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [token]);

    useRealtimeEvent("realtime:chat-message", () => {
        load();
    });
    const handleExpand = async (msg) => {
        if (expanded === msg._id) {
            setExpanded(null);
            return;
        }
        setExpanded(msg._id);
        if (!msg.read) {
            try {
                await apiMarkMessageRead(msg._id, token);
                setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, read: true } : m));
            }
            catch { }
        }
    };
    const handleDelete = async (id) => {
        try {
            await apiDeleteMessage(id, token);
            setMessages(prev => prev.filter(m => m._id !== id));
            toast.success("Message deleted");
        }
        catch {
            toast.error("Failed to delete");
        }
    };
    const handleReply = async (msgId) => {
        const text = replyText[msgId]?.trim();
        if (!text) {
            toast.error("Please type a reply");
            return;
        }
        if (text.length > 1000) {
            toast.error("Reply cannot exceed 1000 characters");
            return;
        }
        setSending(msgId);
        try {
            const res = await apiReplyToMessage(msgId, text, token);
            setMessages(prev => prev.map(m => m._id === msgId ? res.message : m));
            setReplyText(prev => ({ ...prev, [msgId]: "" }));
            toast.success("Reply sent!");
        }
        catch {
            toast.error("Failed to send reply");
        }
        finally {
            setSending(null);
        }
    };
    const unread = messages.filter(m => !m.read).length;
    const listRef = useGsapStagger([messages], { y: 14, stagger: 0.05 });
    return (<MerchantLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <Inbox className="h-6 w-6 text-primary"/> Customer <span className="text-gradient">Inbox</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Messages from customers about your events & services
                {unread > 0 && <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{unread} unread</span>}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={load} className="gap-2 w-full sm:w-auto min-h-[44px]">
              <RefreshCw className="h-4 w-4"/> Refresh
            </Button>
          </div>

          {loading ? (<div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading messages…
            </div>) : messages.length === 0 ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
              <Inbox className="h-14 w-14 mx-auto mb-4 opacity-30 text-muted-foreground"/>
              <p className="font-medium text-lg text-foreground">No messages yet</p>
              <p className="text-sm mt-1 text-muted-foreground">Customer enquiries will appear here</p>
            </div>) : (<div ref={listRef} className="space-y-3">
              {messages.map((msg, idx) => (<motion.div key={msg._id} className={`rounded-xl border bg-card overflow-hidden transition-colors ${msg.read ? "border-border" : "border-primary/40 bg-primary/5"}`}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleExpand(msg)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${msg.read ? "bg-secondary" : "bg-primary/15"}`}>
                        {msg.read ? <MailOpen className="h-4 w-4 text-muted-foreground"/> : <Mail className="h-4 w-4 text-primary"/>}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${!msg.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {msg.senderName}
                          {!msg.read && <span className="ml-2 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                          {msg.replies?.length > 0 && <span className="ml-2 text-[10px] bg-green-500/20 text-green-600 px-1.5 py-0.5 rounded-full">{msg.replies.length} repl{msg.replies.length === 1 ? 'y' : 'ies'}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Re: <span className="text-foreground">{msg.itemTitle}</span> · {msg.senderEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button onClick={e => { e.stopPropagation(); handleDelete(msg._id); }} className="text-muted-foreground hover:text-red-500 transition-colors p-2.5 -m-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                      {expanded === msg._id ? <ChevronUp className="h-4 w-4 text-muted-foreground"/> : <ChevronDown className="h-4 w-4 text-muted-foreground"/>}
                    </div>
                  </div>

                  {/* Expanded */}
                  {expanded === msg._id && (<div className="px-5 pb-5 border-t border-border space-y-4">
                      {/* Original message */}
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">Customer message:</p>
                        <div className="rounded-lg bg-secondary/50 p-4">
                          <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>

                      {/* Thread of replies */}
                      {msg.replies?.length > 0 && (<div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">Conversation:</p>
                          {msg.replies.map((r, i) => (<div key={i} className={`rounded-lg p-3 text-sm ${r.from === "merchant" ? "bg-primary/10 border border-primary/20 ml-6" : "bg-secondary/50 mr-6"}`}>
                              <p className={`text-xs font-semibold mb-1 ${r.from === "merchant" ? "text-primary" : "text-muted-foreground"}`}>
                                {r.from === "merchant" ? "You" : msg.senderName}
                              </p>
                              <p className="whitespace-pre-wrap text-foreground">{r.text}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                            </div>))}
                        </div>)}

                      {/* Reply box */}
                      <div className="border-t border-border pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs font-medium text-muted-foreground">Reply to {msg.senderName}:</p>
                          <span className={`text-[10px] ${((replyText[msg._id] || "").length >= 1000) ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                            {(replyText[msg._id] || "").length}/1000
                          </span>
                        </div>
                        <textarea value={replyText[msg._id] || ""} onChange={e => {
                        const val = e.target.value;
                        if (val.length <= 1000) {
                            setReplyText(prev => ({ ...prev, [msg._id]: val }));
                        }
                    }} placeholder="Type your reply..." maxLength={1000} rows={3} className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"/>
                        <div className="flex items-center justify-between mt-2">
                          <a href={`mailto:${msg.senderEmail}?subject=Re: ${encodeURIComponent(msg.itemTitle)}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                            Or reply via email →
                          </a>
                          <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2" onClick={() => handleReply(msg._id)} disabled={sending === msg._id}>
                            {sending === msg._id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Send className="h-3.5 w-3.5"/>}
                            Send Reply
                          </Button>
                        </div>
                      </div>
                    </div>)}
                </motion.div>))}
            </div>)}
        </motion.div>
      </section>
    </MerchantLayout>);
};
export default MerchantInbox;
