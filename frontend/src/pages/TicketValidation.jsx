import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { Search, CheckCircle2, XCircle, Loader2, QrCode, CameraOff, Clock, User, Calendar, History } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import PageHeader from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiMarkTicketAsUsed } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";
import { Html5Qrcode } from "html5-qrcode";

// Helper to extract clean Ticket ID from scanned QR text (URL, raw string, or JSON)
const parseTicketIdFromQr = (qrText) => {
  if (!qrText || typeof qrText !== "string") return null;
  const trimmed = qrText.trim();

  // 1. Direct match for TKT-XXXXXXXXXXXXX-YYYYYYYY
  const match = trimmed.match(/TKT-\d+-[A-Z0-9]+/i);
  if (match) return match[0].toUpperCase();

  // 2. Query param in URL
  try {
    const url = new URL(trimmed);
    const param = url.searchParams.get("ticketId") || url.searchParams.get("ticket");
    if (param) {
      const pMatch = param.match(/TKT-\d+-[A-Z0-9]+/i);
      if (pMatch) return pMatch[0].toUpperCase();
    }
  } catch {
    // not a URL
  }

  // 3. JSON payload
  try {
    const data = JSON.parse(trimmed);
    const id = data.ticketId || data.id || data.code;
    if (typeof id === "string") {
      const jMatch = id.match(/TKT-\d+-[A-Z0-9]+/i);
      if (jMatch) return jMatch[0].toUpperCase();
    }
  } catch {
    // not JSON
  }

  return null;
};

// Modal for Camera QR Scanning
const QRScannerModal = ({ open, onClose, onScanSuccess }) => {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [permissionError, setPermissionError] = useState(null);
  const [loading, setLoading] = useState(true);
  const html5QrCodeRef = useRef(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    let isSubscribed = true;
    setLoading(true);
    setPermissionError(null);
    isScanningRef.current = false;

    const initScanner = async () => {
      try {
        const availableCameras = await Html5Qrcode.getCameras();
        if (!isSubscribed) return;

        if (!availableCameras || availableCameras.length === 0) {
          setPermissionError("No camera detected on this device. Please use manual Ticket ID entry.");
          setLoading(false);
          return;
        }

        setCameras(availableCameras);
        const backCam = availableCameras.find((c) =>
          /back|rear|environment/i.test(c.label)
        );
        const targetCamId = backCam ? backCam.id : availableCameras[0].id;
        setSelectedCameraId(targetCamId);

        const scanner = new Html5Qrcode("qr-reader-container");
        html5QrCodeRef.current = scanner;

        await scanner.start(
          targetCamId,
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (isScanningRef.current) return;
            isScanningRef.current = true;
            onScanSuccess(decodedText);
          },
          () => {}
        );

        if (isSubscribed) {
          setLoading(false);
        }
      } catch (err) {
        if (!isSubscribed) return;
        setLoading(false);
        const errMsg = String(err?.message || err).toLowerCase();
        if (errMsg.includes("permission") || errMsg.includes("denied") || errMsg.includes("notallowed")) {
          setPermissionError("Camera permission denied. Please allow camera access in browser settings to scan QR codes.");
        } else {
          setPermissionError("Unable to access camera. Please enter the Ticket ID manually.");
        }
      }
    };

    const timer = setTimeout(() => {
      initScanner();
    }, 150);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current
              .stop()
              .then(() => {
                html5QrCodeRef.current?.clear();
                html5QrCodeRef.current = null;
              })
              .catch(() => {});
          } else {
            html5QrCodeRef.current.clear();
            html5QrCodeRef.current = null;
          }
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [open]);

  const handleSwitchCamera = async (newCameraId) => {
    setSelectedCameraId(newCameraId);
    if (html5QrCodeRef.current) {
      try {
        setLoading(true);
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.start(
          newCameraId,
          { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
          (decodedText) => {
            if (isScanningRef.current) return;
            isScanningRef.current = true;
            onScanSuccess(decodedText);
          },
          () => {}
        );
      } catch (e) {
        toast.error("Failed to switch camera");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="sm:max-w-md border-border bg-card p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <QrCode className="h-5 w-5 text-primary" />
            Scan Ticket QR Code
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Point your camera at the customer's ticket QR code to validate instantly.
          </DialogDescription>
        </DialogHeader>

        {cameras.length > 1 && !permissionError && (
          <div className="mb-3">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Camera</label>
            <select
              value={selectedCameraId}
              onChange={(e) => handleSwitchCamera(e.target.value)}
              className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${c.id.substring(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="relative min-h-[260px] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-border/50">
          {permissionError ? (
            <div className="p-6 text-center text-muted-foreground space-y-3">
              <CameraOff className="mx-auto h-10 w-10 text-destructive/80" />
              <p className="text-sm font-semibold text-foreground">{permissionError}</p>
              <p className="text-xs">You can still enter the Ticket ID manually in the search box.</p>
            </div>
          ) : (
            <>
              <div id="qr-reader-container" className="w-full h-full min-h-[260px]" />
              {loading && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white gap-2 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs font-medium">Starting camera stream…</span>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="pt-3">
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TicketValidation = () => {
  const { token } = useAuth();
  const [ticketId, setTicketId] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [markingAsUsed, setMarkingAsUsed] = useState(false);
  const [markUsedDialogOpen, setMarkUsedDialogOpen] = useState(false);
  const [showAllValidations, setShowAllValidations] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const historyRef = useGsapStagger([searchHistory, showAllValidations], { y: 10, stagger: 0.03 });

  const loadRecentValidations = async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/bookings/validate/recent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.recentValidations || []);
      }
    } catch (err) {
      console.error("Failed to load validation history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadRecentValidations();
  }, [token]);

  useRealtimeEvent("realtime:ticket-scanned", () => {
    loadRecentValidations();
  });

  const validateTicket = async (overrideTicketId) => {
    const targetId = typeof overrideTicketId === "string" ? overrideTicketId : ticketId;
    const cleanTicketId = targetId.trim();
    if (!cleanTicketId) {
      toast.error("Please enter a ticket ID");
      return;
    }
    if (!/^TKT-\d+-[A-Z0-9]+$/i.test(cleanTicketId)) {
      toast.error("Invalid Ticket ID format. Expected format: TKT-XXXXXXXXXXXXX-YYYYYYYY");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/bookings/validate/${cleanTicketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.alreadyValidated) {
          setValidationResult({
            valid: false,
            alreadyValidated: true,
            booking: data.booking,
            validatedAt: data.validatedAt,
            validatedBy: data.validatedBy,
            message: "This ticket has already been used"
          });
          toast.error("❌ Ticket already used! Cannot accept this ticket again.");
        } else if (response.status === 403) {
          setValidationResult({
            valid: false,
            alreadyValidated: false,
            notAuthorized: true,
            message: data.error || "Not authorized to validate this ticket"
          });
          toast.error("⛔ This ticket does not belong to your events.");
        } else {
          setValidationResult({
            valid: false,
            alreadyValidated: false,
            message: data.error || "Ticket not found"
          });
          toast.error(data.error || "Ticket not found");
        }
        return;
      }
      setValidationResult({
        valid: true,
        alreadyValidated: false,
        booking: data.booking
      });
      toast.success("✅ Ticket is valid! Ready to mark as used.");
    } catch (error) {
      setValidationResult({
        valid: false,
        alreadyValidated: false,
        message: error.message || "Error validating ticket"
      });
      toast.error(error.message || "Error validating ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      validateTicket();
    }
  };

  const handleQrScanned = (decodedText) => {
    const extractedId = parseTicketIdFromQr(decodedText);
    if (!extractedId) {
      toast.error("Invalid ticket QR code format");
      setScannerOpen(false);
      return;
    }

    setTicketId(extractedId);
    setScannerOpen(false);
    validateTicket(extractedId);
  };

  const handleMarkAsUsed = async () => {
    if (!validationResult?.booking?.ticketId) return;
    setMarkingAsUsed(true);
    try {
      await apiMarkTicketAsUsed(validationResult.booking.ticketId, token);
      toast.success("✅ Ticket marked as used successfully! Customer admitted.");
      setMarkUsedDialogOpen(false);
      setValidationResult(null);
      setTicketId("");
      loadRecentValidations();
    } catch (error) {
      toast.error(error.message || "Failed to mark ticket as used");
    } finally {
      setMarkingAsUsed(false);
    }
  };

  const visibleValidations = showAllValidations ? searchHistory : searchHistory.slice(0, 6);

  return (
    <MerchantLayout>
      <div className="w-full min-w-0 space-y-8 font-sans pb-10">
        <PageHeader
          title="Ticket Validation"
          subtitle="Scan or enter ticket ID codes to verify customer booking authenticity and grant venue admission."
          breadcrumbs={[
            { label: "Merchant Portal", to: "/merchant-dashboard" },
            { label: "Operations" },
            { label: "Ticket Validation" }
          ]}
        />

        {/* Top Area: Validation Card (65-70%) + How to Use (30-35%) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid gap-6 lg:grid-cols-3 items-start"
        >
          {/* Main Validation / Search Panel */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight">Search & Validate Ticket</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter ticket code or scan QR badge to check booking status
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-muted-foreground block">Ticket ID</label>
                  <span className="text-[10px] text-muted-foreground">{(ticketId || "").length}/30</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <Input
                    placeholder="Enter Ticket ID (e.g., TKT-1773396713958-FDDMIBBK)"
                    maxLength={30}
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                    onKeyPress={handleKeyPress}
                    className="flex-1 font-mono uppercase border-border bg-background rounded-xl min-h-[44px] text-sm"
                  />
                  <div className="flex gap-2 shrink-0">
                    <Button
                      onClick={() => validateTicket()}
                      disabled={loading}
                      className="bg-gradient-primary text-primary-foreground hover:opacity-90 min-h-[44px] px-5 rounded-xl font-semibold"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Validate
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setScannerOpen(true)}
                      variant="outline"
                      className="border-border hover:bg-secondary min-h-[44px] px-4 rounded-xl font-semibold flex items-center gap-1.5"
                    >
                      <QrCode className="h-4 w-4 text-primary" />
                      <span>Scan QR</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Validation Result */}
              {validationResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 rounded-xl border-2 ${
                    validationResult.valid
                      ? "border-green-500/30 bg-green-500/10"
                      : "border-red-500/30 bg-red-500/10"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5">
                      {validationResult.valid ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`font-bold text-base ${
                          validationResult.valid ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {validationResult.valid
                          ? "✓ Valid Ticket"
                          : validationResult.alreadyValidated
                          ? "✗ Ticket Already Used - REJECTED"
                          : validationResult.notAuthorized
                          ? "⛔ Not Your Event"
                          : "✗ Invalid Ticket"}
                      </h3>

                      {validationResult.notAuthorized ? (
                        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                          <p className="text-xs font-semibold text-orange-600">
                            This ticket belongs to a different merchant's event. You can only validate tickets for your own events.
                          </p>
                        </div>
                      ) : validationResult.booking ? (
                        <div className="mt-3 space-y-3">
                          {validationResult.alreadyValidated && (
                            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                              <p className="text-xs font-semibold text-red-700 mb-1">
                                🚫 This ticket has already been used and cannot be accepted again
                              </p>
                              <div className="text-[11px] text-red-600 space-y-0.5">
                                <p>
                                  <strong>Used At:</strong> {new Date(validationResult.validatedAt).toLocaleString()}
                                </p>
                                <p>
                                  <strong>Used By:</strong> {validationResult.validatedBy?.name || "Unknown"}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-[11px] text-muted-foreground">Customer Name</p>
                              <p className="font-semibold text-foreground">{validationResult.booking.customer?.name || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">Email</p>
                              <p className="font-semibold text-foreground truncate">{validationResult.booking.customer?.email || "N/A"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-[11px] text-muted-foreground">Event / Service</p>
                              <p className="font-semibold text-foreground">{validationResult.booking.eventName || validationResult.booking.serviceName}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">Booking Status</p>
                              <p
                                className={`font-semibold capitalize ${
                                  validationResult.booking.status === "confirmed"
                                    ? "text-green-600"
                                    : validationResult.booking.status === "completed"
                                    ? "text-blue-600"
                                    : "text-yellow-600"
                                }`}
                              >
                                {validationResult.booking.status}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-[11px] text-muted-foreground">Date & Time</p>
                              <p className="font-semibold text-foreground">
                                {new Date(validationResult.booking.datetime).toLocaleDateString()} {" "}
                                {new Date(validationResult.booking.datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">Price Paid</p>
                              <p className="font-semibold text-foreground">{formatCurrency(validationResult.booking.price)}</p>
                            </div>
                          </div>

                          {/* Ticket Breakdown */}
                          {(validationResult.booking.selectedTickets || validationResult.booking.ticketType) && (
                            <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20 text-xs">
                              <p className="font-semibold text-muted-foreground mb-1.5">🎫 Tickets:</p>
                              {validationResult.booking.selectedTickets && Object.keys(validationResult.booking.selectedTickets).length > 0 ? (
                                <div className="space-y-1">
                                  {Object.entries(validationResult.booking.selectedTickets).map(([type, qty]) => (
                                    <div key={type} className="flex justify-between">
                                      <span className="capitalize text-foreground">
                                        {type === "silver"
                                          ? "🥈 Silver"
                                          : type === "gold"
                                          ? "🥇 Gold"
                                          : type === "diamond"
                                          ? "💎 Diamond"
                                          : type}
                                      </span>
                                      <span className="font-semibold text-primary">
                                        {Number(qty)} Ticket{Number(qty) > 1 ? "s" : ""}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex justify-between">
                                  <span className="capitalize text-foreground">{validationResult.booking.ticketType}</span>
                                  <span className="font-semibold text-primary">
                                    {validationResult.booking.quantity || 1} Ticket{(validationResult.booking.quantity || 1) > 1 ? "s" : ""}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {validationResult.valid ? (
                            <div className="mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                              <p className="text-xs font-semibold text-green-600 mb-2">✓ Ticket is valid and can be admitted</p>
                              <Button
                                onClick={() => setMarkUsedDialogOpen(true)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg h-9 text-xs font-semibold"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                Mark as Used & Admit
                              </Button>
                            </div>
                          ) : validationResult.alreadyValidated ? (
                            <div className="mt-3 p-2.5 bg-red-500/10 rounded-lg border border-red-500/20">
                              <p className="text-xs font-semibold text-red-600">🚫 DO NOT ACCEPT - This ticket cannot be used again</p>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">{validationResult.message}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* How to Use Panel */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-base">How to Use</h3>
              <div className="space-y-3.5 text-xs text-muted-foreground">
                <div className="flex gap-3 items-start">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="leading-relaxed">Ask customer for ticket ID or scan their QR badge with camera</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="leading-relaxed">Enter the ticket ID in the box or click <strong className="text-foreground">Scan QR</strong></p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="leading-relaxed">Click <strong className="text-foreground">Validate</strong> to verify booking status</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-bold shrink-0 mt-0.5">
                    4
                  </div>
                  <p className="leading-relaxed">Confirm customer details and click <strong className="text-foreground">Mark as Used</strong> to admit</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Area: Full Width Recent Validations */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="space-y-4 pt-2"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Recent Validations ({searchHistory.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                History of customer tickets verified for your events & services
              </p>
            </div>
            {searchHistory.length > 6 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllValidations(!showAllValidations)}
                className="text-primary hover:text-primary/80 text-xs font-semibold h-8"
              >
                {showAllValidations ? "Show Less" : `View All (${searchHistory.length})`}
              </Button>
            )}
          </div>

          {/* Cards Grid */}
          {historyLoading ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2 bg-card border border-border rounded-2xl">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading validation history...
            </div>
          ) : searchHistory.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center text-xs text-muted-foreground space-y-2">
              <History className="mx-auto h-8 w-8 opacity-20" />
              <p>No ticket validations performed yet.</p>
            </div>
          ) : (
            <div ref={historyRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleValidations.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/80 bg-card p-4 space-y-2.5 transition-all hover:border-primary/40 shadow-sm flex flex-col justify-between"
                >
                  {/* Top: Ticket ID + Badge */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <span className="font-mono text-primary font-bold text-xs truncate" title={item.ticketId}>
                      {item.ticketId}
                    </span>
                    <span className="bg-green-500/15 text-green-600 text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0">
                      Validated
                    </span>
                  </div>

                  {/* Middle: Customer & Event info */}
                  <div className="space-y-1.5 text-xs">
                    {item.customerName && (
                      <div className="flex items-center gap-1.5 text-foreground/90 font-medium">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{item.customerName}</span>
                      </div>
                    )}
                    {item.eventTitle && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{item.eventTitle}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Timestamp */}
                  <div className="pt-2 border-t border-border/30 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0 opacity-70" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show More/Less Footer Button */}
          {searchHistory.length > 6 && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllValidations(!showAllValidations)}
                className="text-xs font-semibold rounded-xl px-5 h-9"
              >
                {showAllValidations ? "Show Less" : `View All Validations (${searchHistory.length})`}
              </Button>
            </div>
          )}
        </motion.div>

        {/* QR Camera Scanner Modal */}
        <QRScannerModal
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanSuccess={handleQrScanned}
        />

        {/* Mark as Used Dialog */}
        <Dialog open={markUsedDialogOpen} onOpenChange={setMarkUsedDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Ticket as Used</DialogTitle>
              <DialogDescription>
                Confirm that this ticket has been used and the customer has been admitted
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 space-y-1.5">
                <p>
                  <strong>Ticket ID:</strong> {validationResult?.booking?.ticketId}
                </p>
                <p>
                  <strong>Customer:</strong> {validationResult?.booking?.customer?.name}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMarkUsedDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleMarkAsUsed} disabled={markingAsUsed} className="bg-green-600 hover:bg-green-700 text-white font-semibold">
                {markingAsUsed ? "Marking..." : "Confirm & Mark as Used"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MerchantLayout>
  );
};

export default TicketValidation;
