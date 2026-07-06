import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiCreateBooking, apiPayForBooking } from "@/lib/api";

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
}

const SimplePayment = ({ amount, bookingId, bookingData, onSuccess, onError, onClose }: SimplePaymentProps) => {
  const { token, user } = useAuth() as any;
  const [selectedMethod, setSelectedMethod] = useState<"card" | "upi">("card");
  const [loading, setLoading] = useState(false);
  
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

    // Validate payment details
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

    setLoading(true);
    try {
      const paymentDetails = selectedMethod === "card" ? {
        cardLast4: cardNumber.slice(-4),
        cardholderName: cardholderName
      } : {
        upiId: upiId
      };

      let result;
      if (bookingId) {
        // Payment for an existing booking
        result = await apiPayForBooking(bookingId, {
          paymentMethod: selectedMethod,
          paymentDetails,
          paymentType: bookingData.paymentType || "full"
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
          paymentMethod: selectedMethod,
          selectedSession: bookingData.selectedSession,
          paymentDetails,
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
          {bookingData.originalAmount && bookingData.discount ? (
            <div className="space-y-0.5 pt-1 border-t border-muted-foreground/20">
              <p className="line-through text-muted-foreground">💰 {formatCurrency(bookingData.originalAmount)}</p>
              <p className="text-green-600 font-semibold">🎟️ Discount: -{formatCurrency(bookingData.discount)}</p>
              <p className="text-base font-semibold text-primary">💰 {formatCurrency(amount)}</p>
            </div>
          ) : (
            <p className="text-base font-semibold text-primary">💰 {formatCurrency(amount)}</p>
          )}
        </div>
      </div>

      {/* Payment Method Selection */}
      <div>
        <h4 className="font-medium text-sm mb-2">Select Payment Method</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSelectedMethod("card")}
            className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all ${
              selectedMethod === "card"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span className="font-medium text-sm">Card</span>
          </button>
          <button
            onClick={() => setSelectedMethod("upi")}
            className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all ${
              selectedMethod === "upi"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span className="font-medium text-sm">UPI</span>
          </button>
        </div>
      </div>

      {/* Payment Details Form */}
      <div className="space-y-2">
        {selectedMethod === "card" ? (
          <>
            <div>
              <Label htmlFor="cardNumber" className="text-xs">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="expiryDate" className="text-xs">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  maxLength={5}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="cvv" className="text-xs">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ""))}
                  maxLength={3}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cardholderName" className="text-xs">Cardholder Name</Label>
              <Input
                id="cardholderName"
                placeholder="John Doe"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </>
        ) : (
          <div>
            <Label htmlFor="upiId" className="text-xs">UPI ID</Label>
            <Input
              id="upiId"
              placeholder="yourname@paytm"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        )}
      </div>

      {/* Payment Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
        <div className="flex items-start gap-2">
          <div className="text-blue-500 text-xs mt-0.5">ℹ️</div>
          <div className="text-xs">
            <p className="font-medium text-blue-600 dark:text-blue-400">Secure Payment</p>
            <p className="text-muted-foreground">Your booking will be reviewed by admin/merchant.</p>
          </div>
        </div>
      </div>

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold"
        size="sm"
      >
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
        ) : (
          <>Pay {bookingData.paymentType === "advance" ? "Advance" : (bookingData.paymentType === "remaining" ? "Remaining" : "")} {formatCurrency(amount)} {bookingData.paymentType === "remaining" ? "& Complete" : "& Confirm"}</>
        )}
      </Button>

      <Button variant="outline" onClick={onClose} disabled={loading} className="w-full" size="sm">
        Cancel
      </Button>
    </div>
  );
};

export default SimplePayment;