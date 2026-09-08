import { useRef, useState, useEffect } from "react";
import { UploadCloud, Image as ImageIcon, X, Loader2, Link2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiUploadImage } from "@/lib/api";

export function ImageUploadField({
  id,
  label = "Visual Asset",
  value = "",
  onChange,
  placeholder = "https://images.unsplash.com/photo-...",
  token,
  aspectRatioClass = "aspect-[16/9]",
  recommendedDimensions = "Recommended: 1600 × 900 px",
  className = ""
}) {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("upload"); // "upload" | "url"
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [urlInput, setUrlInput] = useState(value);

  // Sync internal urlInput state when value changes externally
  useEffect(() => {
    setUrlInput(value || "");
    setImgError(false);
  }, [value]);

  const hasImage = Boolean(value && value.trim() && !imgError);

  const handleUpload = async (file) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/jpg", "image/gif", "image/svg+xml"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isAllowedExt = ["jpg", "jpeg", "png", "webp", "avif", "gif", "svg"].includes(ext);

    if (!allowedTypes.includes(file.type) && !isAllowedExt) {
      toast.error("Invalid file format. Please upload JPG, PNG, WEBP, or AVIF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit. Please select a smaller image.");
      return;
    }

    setUploading(true);
    setImgError(false);

    try {
      const res = await apiUploadImage(file, token);
      if (res && res.url) {
        onChange(res.url);
        setUrlInput(res.url);
        setIsEditing(false);
        toast.success("Image uploaded successfully!");
      } else {
        throw new Error("No URL returned from server");
      }
    } catch (err) {
      console.warn("Server upload failed, reading locally as data URL fallback:", err.message);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        onChange(dataUrl);
        setUrlInput(dataUrl);
        setIsEditing(false);
        toast.success("Image loaded successfully!");
      };
      reader.onerror = () => {
        toast.error("Failed to read image file.");
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      onChange("");
      setIsEditing(false);
      return;
    }
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/uploads/") && !trimmed.startsWith("data:")) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }
    onChange(trimmed);
    setImgError(false);
    setIsEditing(false);
    toast.success("Image URL updated!");
  };

  const handleRemove = () => {
    onChange("");
    setUrlInput("");
    setImgError(false);
    setIsEditing(true);
  };

  return (
    <div className={`rounded-[14px] border border-border/80 bg-card p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          {label}
        </h3>
        {recommendedDimensions && (
          <span className="text-[11px] text-muted-foreground font-medium">
            {recommendedDimensions}
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.avif,.gif,.svg"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Large Image Preview Banner */}
      <div className={`relative w-full ${aspectRatioClass} max-h-[320px] rounded-xl overflow-hidden bg-muted/40 border border-border/70 flex items-center justify-center transition-all group`}>
        {value && !imgError ? (
          <img
            src={value}
            alt={label}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform group-hover:scale-[1.01]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-xs font-medium">No image assigned yet</p>
            <p className="text-[11px] text-muted-foreground/80 max-w-xs">
              Upload an image file or provide a valid external URL below.
            </p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs font-semibold text-foreground">Uploading image...</span>
          </div>
        )}
      </div>

      {/* Image Preview Action Bar */}
      {hasImage && !isEditing && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">
            Current visual preview
          </span>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 border-border/80"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Change Image
            </Button>

            <button
              type="button"
              onClick={handleRemove}
              className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Controls Area (Shown when editing or when no image exists) */}
      {(!hasImage || isEditing) && (
        <div className="space-y-3 pt-2">
          {/* Segmented Control Tabs */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex p-1 rounded-lg bg-muted/60 border border-border/60">
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "upload"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Upload Image
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("url")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "url"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Image URL
              </button>
            </div>

            {hasImage && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Tab 1: Upload Image */}
          {activeTab === "upload" && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border border-dashed transition-all p-6 text-center flex flex-col items-center justify-center space-y-2 ${
                isDragging
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border/80 bg-muted/20 hover:bg-primary/5 hover:border-primary/50"
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Drag & drop an image here or <span className="text-primary underline font-medium">Browse Files</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  JPG, PNG, WEBP, AVIF • Max 5 MB
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Image URL */}
          {activeTab === "url" && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id={id}
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={placeholder}
                    className="h-9 text-xs font-mono pr-8 bg-background"
                  />
                  {urlInput && (
                    <button
                      type="button"
                      onClick={() => setUrlInput("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleApplyUrl}
                  className="h-9 px-3 text-xs font-semibold shrink-0"
                >
                  Apply URL
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Enter an HTTP or HTTPS link from Unsplash, Cloudinary, or any web server.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
