import { useState } from "react";
import { motion } from "framer-motion";
import { X, Mail, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  sanitizeEmailInput,
  sanitizeNameInput,
  sanitizeMessageInput,
  validateEmail,
  validateName,
  validateMessage,
  NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  NAME_HINT,
  EMAIL_HINT,
  MESSAGE_HINT,
} from "@/lib/validation";

interface Props {
  itemTitle: string;
  eventId?: string;
  serviceId?: string;
  merchantId?: string;
  onClose: () => void;
}

const ContactMerchantModal = ({ itemTitle, eventId, serviceId, merchantId, onClose }: Props) => {
  const { user } = useAuth() as any;
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    const nameErr = validateName(name);
    if (nameErr) {
      toast.error(nameErr);
      return;
    }
    const emailErr = validateEmail(email);
    if (emailErr) {
      toast.error(emailErr);
      return;
    }
    const messageErr = validateMessage(message);
    if (messageErr) {
      toast.error(messageErr);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/contact/merchant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderName: name, senderEmail: email, message, eventId, serviceId, merchantId, customerId: user?._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSent(true);
      toast.success("Message sent to the organiser!");
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold">Contact Organiser</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
              <Send className="h-7 w-7 text-green-500" />
            </div>
            <p className="font-semibold">Message Sent!</p>
            <p className="text-sm text-muted-foreground">The organiser will reply to your email directly.</p>
            <Button onClick={onClose} className="mt-2 bg-gradient-primary text-primary-foreground hover:opacity-90">Close</Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-5">
              Send a message about <span className="font-medium text-foreground">"{itemTitle}"</span>
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Your Name</Label>
                <Input
                  value={name}
                  maxLength={NAME_MAX_LENGTH}
                  onChange={e => setName(sanitizeNameInput(e.target.value))}
                  placeholder="Your name"
                  className="mt-1"
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">{NAME_HINT}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Your Email</Label>
                <Input type="text" inputMode="email" maxLength={EMAIL_MAX_LENGTH} value={email} onChange={e => setEmail(sanitizeEmailInput(e.target.value))} placeholder="user@gmail.com" className="mt-1" required />
                <p className="mt-1 text-xs text-muted-foreground">{EMAIL_HINT}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <textarea
                  value={message}
                  maxLength={MESSAGE_MAX_LENGTH}
                  onChange={e => setMessage(sanitizeMessageInput(e.target.value))}
                  placeholder="Ask anything about this event or service..."
                  rows={4}
                  required
                  className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">{MESSAGE_HINT}</p>
              </div>
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : <><Send className="h-4 w-4 mr-2" /> Send Message</>}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ContactMerchantModal;
