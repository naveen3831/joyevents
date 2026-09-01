import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Tag, Copy, Check } from "lucide-react";
import { apiGetAllPromoCodes } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
const AvailablePromoCodes = ({ onApply, appliedCode, eventId, serviceId, merchantId, context, itemCategory }) => {
    const { token } = useAuth();
    const [promos, setPromos] = useState([]);
    const [expanded, setExpanded] = useState(true); // Default to true to show codes immediately
    const [copied, setCopied] = useState(null);
    useEffect(() => {
        apiGetAllPromoCodes()
            .then((res) => {
            const all = (res.promoCodes || []).filter((p) => p.isActive !== false);
            // Show active codes that match the context, category, AND merchant
            let relevant = all;
            // Merchant-specific filter (CRITICAL)
            if (merchantId) {
                relevant = relevant.filter((p) => {
                    const pMerchantId = (p.merchant?._id || p.merchant || "").toString();
                    const targetMerchantId = (typeof merchantId === "object" ? (merchantId?._id || "") : (merchantId || "")).toString();
                    return targetMerchantId && pMerchantId === targetMerchantId;
                });
            }
            if (context === "service") {
                relevant = relevant.filter((p) => (p.appliesTo || "all") === "all" || p.appliesTo === "services");
            }
            else if (context === "ticketedEvent") {
                relevant = relevant.filter((p) => (p.appliesTo || "all") === "all" || p.appliesTo === "ticketedEvents");
            }
            else if (context === "fullServiceEvent") {
                relevant = relevant.filter((p) => (p.appliesTo || "all") === "all" || p.appliesTo === "fullServiceEvents");
            }
            // Filter by category if itemCategory is provided
            if (itemCategory) {
                relevant = relevant.filter((p) => {
                    if (!p.applicableCategories || p.applicableCategories.length === 0)
                        return true;
                    if (p.applicableCategories.includes("all"))
                        return true;
                    // Case-insensitive comparison
                    return p.applicableCategories.some((cat) => cat.toLowerCase() === itemCategory.toLowerCase() || cat === "all");
                });
            }
            // If specific eventId or serviceId is provided, and the promo has restricted items, check them
            relevant = relevant.filter((p) => {
                if (eventId && p.applicableEvents && p.applicableEvents.length > 0) {
                    return p.applicableEvents.some((e) => (e._id || e) === eventId);
                }
                if (serviceId && p.applicableServices && p.applicableServices.length > 0) {
                    return p.applicableServices.some((s) => (s._id || s) === serviceId);
                }
                return true;
            });
            setPromos(relevant);
        })
            .catch(() => { });
    }, [eventId, serviceId, merchantId, context, itemCategory]);
    if (promos.length === 0)
        return null;
    const handleCopy = (code) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(code);
            setTimeout(() => setCopied(null), 2000);
            toast.success("Code copied!");
        });
    };
    const visible = expanded ? promos : promos.slice(0, 2);
    return (<div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary"/>
          Available Promo Codes
        </h4>
        {promos.length > 2 && (<button onClick={() => setExpanded(v => !v)} className="text-xs text-primary font-medium hover:underline">
            {expanded ? "Show less" : `+${promos.length - 2} more`}
          </button>)}
      </div>

      <div className="space-y-3">
        {visible.map((promo) => {
            const isApplied = appliedCode === promo.code;
            const discountLabel = promo.discountType === "percentage"
                ? `${promo.discountValue}% off`
                : `${formatCurrency(promo.discountValue)} off`;
            const usageLeft = promo.usageLimit > 0
                ? `${promo.usageLimit - (promo.usedCount || 0)} uses left`
                : null;
            const minText = promo.minBookingAmount && Number(promo.minBookingAmount) > 0
                ? `Spend ${formatCurrency(Number(promo.minBookingAmount))}+ to get ${discountLabel}`
                : null;
            return (<div key={promo._id} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors ${isApplied
                    ? "border-green-500/40 bg-green-500/10"
                    : "border-border bg-secondary/40"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-primary">{promo.code}</span>
                  <span className="text-xs rounded-full bg-primary/15 text-primary px-2 py-0.5 font-medium">
                    {discountLabel}
                  </span>
                  {minText && (<span className="text-xs rounded-full bg-amber-500/15 text-amber-600 px-2 py-0.5 font-medium">
                      Min {formatCurrency(Number(promo.minBookingAmount))}
                    </span>)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                  {promo.description && (<p className="truncate">{promo.description}</p>)}
                  {minText && (<p className="truncate">{minText}</p>)}
                  {!promo.description && !minText && usageLeft && (<p className="truncate">{usageLeft}</p>)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => handleCopy(promo.code)} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Copy code">
                  {copied === promo.code
                    ? <Check className="h-3.5 w-3.5 text-green-500"/>
                    : <Copy className="h-3.5 w-3.5"/>}
                </button>
                <button onClick={() => onApply(promo.code)} disabled={isApplied} className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${isApplied
                    ? "bg-green-500/20 text-green-600 cursor-default"
                    : "bg-primary text-primary-foreground hover:opacity-90"}`}>
                  {isApplied ? "Applied" : "Apply"}
                </button>
              </div>
            </div>);
        })}
      </div>
    </div>);
};
export default AvailablePromoCodes;
