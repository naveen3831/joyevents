import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Smartphone, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiCreateBooking, apiPayForBooking, apiVerifyToken } from "@/lib/api";

interface SimplePaymentProps {
  amount: number;
  bookingId?: string; // Optional booking ID for existing bookings
  bookingData: {
    serviceName?: string;
    eventName?: string;
    eventId?: string;
    serviceId?: string;
    date: string;
    time: string;
    selectedTickets?: { [key: string]: number };
    selectedSession?: string;
    ticketType?: string;
    quantity?: number;
    customerLocation?: {
      address: string;
      latitude: number;
      longitude: number;
    };
    promoCode?: any;
    originalAmount?: number;
    discount?: number;
    addOns?: { name: string; price: number }[];
    paymentType?: "full" | "advance" | "remaining";
    seatNumbers?: string[];
  };
  onSuccess: (booking: any) => void;
  onError: (error: string) => void;
  onClose: () => void;
  initUseWallet?: boolean;
}

const SimplePayment = ({ amount, bookingId, bookingData, onSuccess, onError, onClose, initUseWallet }: SimplePaymentProps) => {
  const { token, user, updateUser } = useAuth() as any;
  const [selectedMethod, setSelectedMethod] = useState<"card" | "upi">("card");
  const [loading, setLoading] = useState(false);
  const [useWallet, setUseWallet] = useState(initUseWallet || false);

  const walletBalance = user?.walletBalance || 0;
  const walletApplied = useWallet ? Math.min(walletBalance, amount) : 0;
  const remainingAmount = amount - walletApplied;
  
  // Card details
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  
  // UPI details
  const [upiId, setUpiId] = useState("");

  const handlePayment = async () => {
    if (!token || !user) {
      toast.error("Please login to continue");
      return;
    }

    // Validate payment details only if there is a remaining amount to pay
    if (remainingAmount > 0) {
      if (selectedMethod === "card") {
        if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
          toast.error("Please fill all card details");
          return;
        }
        if (cardNumber.replace(/\s/g, "").length !== 16) {
          toast.error("Please enter a valid 16-digit card number");
          return;
        }
        if (cvv.length !== 3) {
          toast.error("Please enter a valid 3-digit CVV");
          return;
        }
      } else if (selectedMethod === "upi") {
        if (!upiId) {
          toast.error("Please enter UPI ID");
          return;
        }
        if (!upiId.includes("@")) {
          toast.error("Please enter a valid UPI ID");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const paymentDetails = remainingAmount === 0 ? {} : (selectedMethod === "card" ? {
        cardLast4: cardNumber.slice(-4),
        cardholderName: cardholderName
      } : {
        upiId: upiId
      });

      const finalPaymentMethod = remainingAmount === 0 ? "wallet" : selectedMethod;

      let result;
      if (bookingId) {
        // Payment for an existing booking
        result = await apiPayForBooking(bookingId, {
          paymentMethod: finalPaymentMethod,
          paymentDetails,
          paymentType: bookingData.paymentType || "full",
          useWallet: useWallet && walletApplied > 0,
          walletAmountPaid: walletApplied
        }, token);
      } else {
        // Create new booking with payment details
        const bookingPayload: any = {
          serviceName: bookingData.serviceName,
          eventName: bookingData.eventName,
          eventId: bookingData.eventId,
          serviceId: bookingData.serviceId,
          price: amount,
          date: bookingData.date,
          time: bookingData.time,
          isEvent: !!bookingData.eventName,
          customerLocation: bookingData.customerLocation,
          paymentMethod: finalPaymentMethod,
          selectedSession: bookingData.selectedSession,
          paymentDetails,
          useWallet: useWallet && walletApplied > 0,
          walletAmountPaid: walletApplied,
          // Promo code data
          promoCode: bookingData.promoCode,
          originalPrice: bookingData.originalAmount,
          discount: bookingData.discount,
          // Add-ons
          addOns: bookingData.addOns || [],
          // Seat numbers
          seatNumbers: bookingData.seatNumbers || []
        };
        
        // Handle multiple tickets or single ticket
        if (bookingData.selectedTickets && Object.keys(bookingData.selectedTickets).length > 0) {
          // Convert to plain object to ensure proper serialization
          const ticketsObj: any = {};
          for (const [key, value] of Object.entries(bookingData.selectedTickets)) {
            ticketsObj[key] = Number(value);
          }
          bookingPayload.selectedTickets = ticketsObj;
        } else if (bookingData.ticketType) {
          bookingPayload.ticketType = bookingData.ticketType;
          if (bookingData.quantity) {
            bookingPayload.quantity = bookingData.quantity;
          }
        }
        
        result = await apiCreateBooking(bookingPayload, token);
      }

      // Sync wallet balance locally
      try {
        const verifyRes = await apiVerifyToken(token);
        if (verifyRes.user) {
          updateUser(verifyRes.user);
        }
      } catch (e) {}

      toast.success("Payment successful! Booking confirmed.");
      onSuccess(result.booking);
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
      onError(error.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="space-y-3">
      {/* Event/Service Details */}
      <div className="bg-secondary/20 rounded-lg p-3">
        <h3 className="font-semibold text-base mb-1">
          {bookingData.eventName || bookingData.serviceName}
        </h3>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>📅 {new Date(`${bookingData.date}T${bookingData.time}`).toLocaleString()}</p>
          {bookingData.selectedTickets && Object.keys(bookingData.selectedTickets).length > 0 && (
            <div className="space-y-0.5">
              {Object.entries(bookingData.selectedTickets).map(([type, qty]: any) => {
                if (qty > 0) {
                  return (
                    <p key={type} className="capitalize">
                      🎫 <span className="font-medium text-primary">{type}</span> × {qty}
                    </p>
                  );
                }
              })}
            </div>
          )}
          {bookingData.ticketType && (
            <p className="capitalize">🎫 <span className="font-medium text-primary">{bookingData.ticketType}</span> Ticket {bookingData.quantity && `× ${bookingData.quantity}`}</p>
          )}
          {bookingData.customerLocation && (
            <p>📍 {bookingData.customerLocation.address}</p>
          )}
          <div className="space-y-0.5 pt-1 border-t border-muted-foreground/20">
            {bookingData.originalAmount && bookingData.discount && (
              <>
                <p className="line-through text-muted-foreground">Original: {formatCurrency(bookingData.originalAmount)}</p>
                <p className="text-green-500 font-semibold">Discount: -{formatCurrency(bookingData.discount)}</p>
              </>
            )}
            <p className="font-semibold">Subtotal: {formatCurrency(amount)}</p>
            {walletApplied > 0 && (
              <p className="text-green-500 font-semibold animate-pulse">Wallet Applied: -{formatCurrency(walletApplied)}</p>
            )}
            <p className="text-base font-bold text-primary">Total Due: {formatCurrency(remainingAmount)}</p>
          </div>
        </div>
      </div>

      {/* Wallet Balance Toggle */}
      {walletBalance > 0 && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/5 hover:border-primary/40 transition-colors">
          <input
            id="useWalletCheck"
            type="checkbox"
            checked={useWallet}
            onChange={(e) => setUseWallet(e.target.checked)}
            className="h-4.5 w-4.5 rounded accent-primary cursor-pointer shrink-0"
          />
          <label htmlFor="useWalletCheck" className="text-xs font-bold cursor-pointer select-none flex-1">
            Apply Wallet Balance (Available: <span className="text-primary font-black">{formatCurrency(walletBalance)}</span>)
          </label>
        </div>
      )}

      {/* Payment Method Selection */}
      {remainingAmount > 0 ? (
        <>
          <div>
            <h4 className="font-medium text-sm mb-2">Select Payment Method for Remaining Due</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod("card")}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border-2 transition-all ${
                  selectedMethod === "card"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span className="font-medium text-xs">Card</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod("upi")}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border-2 transition-all ${
                  selectedMethod === "upi"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                <span className="font-medium text-xs">UPI</span>
              </button>
            </div>
          </div>

          {/* Payment Details Form */}
          <div className="space-y-2">
            {selectedMethod === "card" ? (
              <>
                <div>
                  <Label htmlFor="cardNumber" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    className="h-9 text-sm mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="expiryDate" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                      maxLength={5}
                      className="h-9 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={cvv}
                      type="password"
                      onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ""))}
                      maxLength={3}
                      className="h-9 text-sm mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cardholderName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    placeholder="John Doe"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className="h-9 text-sm mt-1"
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="upiId" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">UPI ID</Label>
                <Input
                  id="upiId"
                  placeholder="yourname@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="h-9 text-sm mt-1"
                />
              </div>
            )}
          </div>
        </>
      ) : (
        useWallet && walletApplied > 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-xs text-green-400 font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Your wallet balance covers the total amount. No card details required.</span>
          </div>
        )
      )}

      {/* Payment Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
        <div className="flex items-start gap-2">
          <div className="text-blue-500 text-xs mt-0.5">ℹ️</div>
          <div className="text-xs">
            <p className="font-semibold text-blue-600 dark:text-blue-400">Secure Transaction</p>
            <p className="text-muted-foreground">All payments are mock-authorized instantly for demonstration.</p>
          </div>
        </div>
      </div>

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-gradient-primary hover:opacity-90 text-white font-bold"
        size="sm"
      >
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
        ) : remainingAmount === 0 ? (
          <>Pay {formatCurrency(walletApplied)} with Wallet</>
        ) : (
          <>Pay Remaining {formatCurrency(remainingAmount)} {bookingData.paymentType === "remaining" ? "& Complete" : "& Confirm"}</>
        )}
      </Button>

      <Button variant="outline" onClick={onClose} disabled={loading} className="w-full" size="sm">
        Cancel
      </Button>
    </div>
  );
};

export default SimplePayment;
