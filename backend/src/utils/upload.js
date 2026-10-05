import multer from "multer";

// Use memory storage — files go directly to Cloudinary, never saved to disk
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif"
];

const fileFilter = (_req, file, cb) => {
  if (file && file.mimetype && ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error("Invalid image format. Only JPG, PNG, WEBP, GIF, and HEIC images are allowed."), false);
  }
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

