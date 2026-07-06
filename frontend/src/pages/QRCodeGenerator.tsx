import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import MerchantLayout from "@/components/MerchantLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { QRCodeSVG } from "qrcode.react";
import { Download, Copy, CheckCircle2, Plus, Edit2, Loader2, Trash2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/config";

interface Event {
  _id: string;
  title: string;
  description?: string;
  qrCodeCustomUrl?: string;
  qrCodeActive?: boolean;
}

interface Service {
  _id: string;
  name: string;
  description?: string;
  qrCodeCustomUrl?: string;
  qrCodeActive?: boolean;
}

export default function QRCodeGenerator() {
  const { user, token } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const qrRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<{ id: string, type: 'event' | 'service', url: string } | null>(null);
  const [customUrl, setCustomUrl] = useState("");

  useEffect(() => {
    if (user?._id && token) {
      fetchMerchantData();
    } else {
      setLoading(false);
      if (!user?._id) setError("User not authenticated");
    }
  }, [user?._id, token]);

  const fetchMerchantData = async () => {
    try {
      setError(null);
      
      if (!user?._id || !token) {
        setError("User ID or token not available");
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const apiUrl = API_URL;

      // Fetch events
      try {
        const eventsUrl = `${apiUrl}/api/events/merchant/${user._id}`;
        const eventsRes = await fetch(eventsUrl, { headers });
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          setEvents(Array.isArray(data) ? data : data.events || []);
        } else {
          setEvents([]);
        }
      } catch (error) {
        setEvents([]);
      }

      // Fetch services
      try {
        const servicesUrl = `${apiUrl}/api/services/merchant/${user._id}`;
        const servicesRes = await fetch(servicesUrl, { headers });
        if (servicesRes.ok) {
          const data = await servicesRes.json();
          setServices(Array.isArray(data) ? data : data.services || []);
        } else {
          setServices([]);
        }
      } catch (error) {
        setServices([]);
      }
    } catch (error) {
      setError("Failed to load events and services");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQR = async () => {
    if (!currentItem || !user || !token) return;

    const trimmedUrl = customUrl.trim();
    if (!trimmedUrl) {
      toast.error("Destination URL is required");
      return;
    }

    if (trimmedUrl.length > 2048) {
      toast.error("Destination URL cannot exceed 2048 characters");
      return;
    }

    // Check if it's a relative path starting with '/' or a valid absolute URL (allowing spaces)
    const isRelativePath = trimmedUrl.startsWith("/");
    const isValidUrl = isRelativePath || /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .%-]*)*\/?$/i.test(trimmedUrl);

    if (!isValidUrl) {
      toast.error("Please enter a valid URL (starting with http:// or https://) or a relative path (starting with /)");
      return;
    }
    
    setUpdating(true);
    try {
      const apiUrl = API_URL;
      const endpoint = currentItem.type === 'event' 
        ? `${apiUrl}/api/events/${currentItem.id}`
        : `${apiUrl}/api/services/${currentItem.id}`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          qrCodeCustomUrl: trimmedUrl,
          qrCodeActive: true // Always set to active when created/updated
        })
      });

      if (res.ok) {
        toast.success(`QR Code ${currentItem.url ? 'updated' : 'created'} successfully!`);
        setDialogOpen(false);
        fetchMerchantData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update QR code");
      }
    } catch (err) {
      toast.error("An error occurred while updating the QR code");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async (id: string, type: 'event' | 'service', currentActive: boolean) => {
    if (!token) return;
    try {
      const apiUrl = API_URL;
      const endpoint = type === 'event' 
        ? `${apiUrl}/api/events/${id}`
        : `${apiUrl}/api/services/${id}`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ qrCodeActive: !currentActive })
      });

      if (res.ok) {
        toast.success(`QR Code ${!currentActive ? 'activated' : 'deactivated'} successfully!`);
        fetchMerchantData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to toggle status");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleDeleteQR = async (id: string, type: 'event' | 'service') => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this QR code?")) return;

    try {
      const apiUrl = API_URL;
      const endpoint = type === 'event' 
        ? `${apiUrl}/api/events/${id}`
        : `${apiUrl}/api/services/${id}`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          qrCodeCustomUrl: "",
          qrCodeActive: false 
        })
      });

      if (res.ok) {
        toast.success("QR Code deleted successfully!");
        fetchMerchantData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete QR code");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const openUpdateDialog = (id: string, type: 'event' | 'service', currentUrl?: string) => {
    setCurrentItem({ id, type, url: currentUrl || "" });
    setCustomUrl(currentUrl || `${window.location.origin}/${type}s/${id}`);
    setDialogOpen(true);
  };

  const downloadQRCode = (refKey: string, filename: string) => {
    const element = qrRefs.current[refKey];
    if (!element) return;

    const svg = element.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${filename}.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("QR Code downloaded!");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Failed to download QR code");
    };

    img.src = url;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground">Loading your events and services...</p>
          </div>
        </div>
      </MerchantLayout>
    );
  }

  if (error) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QR Code Generator</h1>
          <p className="text-muted-foreground mt-2">
            Create QR codes for your events and services. Anyone can scan to view details.
          </p>
        </div>

        <Tabs defaultValue="events" className="w-full">
          <TabsList>
            <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
            <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4">
            {events.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No events found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <Card key={event._id} className="flex flex-col">
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-xs sm:text-lg line-clamp-1">{event.title}</CardTitle>
                      <CardDescription className="line-clamp-1 text-xs">{event.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-2 sm:space-y-4 p-3 sm:p-6">
                      {event.qrCodeCustomUrl ? (
                        <>
                          <div className={`flex flex-col items-center justify-center p-4 bg-secondary rounded-lg relative transition-opacity ${!event.qrCodeActive ? 'opacity-40 grayscale' : ''}`}>
                            <div 
                              ref={(el) => { if (el) qrRefs.current[`event-${event._id}`] = el; }}
                              className="bg-white p-3 rounded-md shadow-sm flex items-center justify-center"
                            >
                              <QRCodeSVG
                                value={event.qrCodeCustomUrl}
                                size={120}
                                level="H"
                                includeMargin={true}
                                fgColor="#000000"
                                bgColor="#ffffff"
                              />
                            </div>
                            {!event.qrCodeActive && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/20 rounded-lg">
                                <span className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-bold border border-destructive/20 backdrop-blur-sm">
                                  INACTIVE
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              {event.qrCodeActive ? (
                                <Power className="h-4 w-4 text-green-500" />
                              ) : (
                                <PowerOff className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-xs font-medium">
                                {event.qrCodeActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <Switch 
                              checked={event.qrCodeActive} 
                              onCheckedChange={() => handleToggleActive(event._id, 'event', !!event.qrCodeActive)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              disabled={!event.qrCodeActive}
                              onClick={() =>
                                downloadQRCode(`event-${event._id}`, `event-${event.title}`)
                              }
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => openUpdateDialog(event._id, 'event', event.qrCodeCustomUrl)}
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteQR(event._id, 'event')}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                copyToClipboard(
                                  event.qrCodeCustomUrl || "",
                                  `event-${event._id}`
                                )
                              }
                            >
                              {copied === `event-${event._id}` ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Link
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 bg-secondary/30 rounded-lg border-2 border-dashed border-secondary">
                          <div className="p-3 bg-secondary rounded-full">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="text-center px-4">
                            <p className="text-sm font-medium">No QR Code generated</p>
                            <p className="text-xs text-muted-foreground mt-1">Create a custom QR code for this event</p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => openUpdateDialog(event._id, 'event')}
                          >
                            Create QR Code
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            {services.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No services found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <Card key={service._id} className="flex flex-col">
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-xs sm:text-lg line-clamp-1">{service.name}</CardTitle>
                      <CardDescription className="line-clamp-1 text-xs">{service.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-2 sm:space-y-4 p-3 sm:p-6">
                      {service.qrCodeCustomUrl ? (
                        <>
                          <div className={`flex flex-col items-center justify-center p-4 bg-secondary rounded-lg relative transition-opacity ${!service.qrCodeActive ? 'opacity-40 grayscale' : ''}`}>
                            <div 
                              ref={(el) => { if (el) qrRefs.current[`service-${service._id}`] = el; }}
                              className="bg-white p-3 rounded-md shadow-sm flex items-center justify-center"
                            >
                              <QRCodeSVG
                                value={service.qrCodeCustomUrl}
                                size={120}
                                level="H"
                                includeMargin={true}
                                fgColor="#000000"
                                bgColor="#ffffff"
                              />
                            </div>
                            {!service.qrCodeActive && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/20 rounded-lg">
                                <span className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-bold border border-destructive/20 backdrop-blur-sm">
                                  INACTIVE
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              {service.qrCodeActive ? (
                                <Power className="h-4 w-4 text-green-500" />
                              ) : (
                                <PowerOff className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-xs font-medium">
                                {service.qrCodeActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <Switch 
                              checked={service.qrCodeActive} 
                              onCheckedChange={() => handleToggleActive(service._id, 'service', !!service.qrCodeActive)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              disabled={!service.qrCodeActive}
                              onClick={() =>
                                downloadQRCode(
                                  `service-${service._id}`,
                                  `service-${service.name}`
                                )
                              }
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => openUpdateDialog(service._id, 'service', service.qrCodeCustomUrl)}
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteQR(service._id, 'service')}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                copyToClipboard(
                                  service.qrCodeCustomUrl || "",
                                  `service-${service._id}`
                                )
                              }
                            >
                              {copied === `service-${service._id}` ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Link
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 bg-secondary/30 rounded-lg border-2 border-dashed border-secondary">
                          <div className="p-3 bg-secondary rounded-full">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="text-center px-4">
                            <p className="text-sm font-medium">No QR Code generated</p>
                            <p className="text-xs text-muted-foreground mt-1">Create a custom QR code for this service</p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => openUpdateDialog(service._id, 'service')}
                          >
                            Create QR Code
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentItem?.url ? 'Update' : 'Create'} QR Code</DialogTitle>
            <DialogDescription>
              Enter the URL you want this QR code to point to.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="url">Destination URL</Label>
              <Input
                id="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com"
              />
              <p className="text-[10px] text-muted-foreground mt-1 bg-secondary/50 p-2 rounded">
                💡 <strong>Tip for local testing:</strong> Scanning "localhost" on a phone won't open. Replace "localhost" with your computer's local IP (e.g. <code>192.168.x.x</code>) or use a live URL so your phone can reach it.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateQR} disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentItem?.url ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MerchantLayout>
  );
}

