import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your-api-key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your-api-secret'
});

// Check if configuration is valid
const isConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                     process.env.CLOUDINARY_API_KEY && 
                     process.env.CLOUDINARY_API_SECRET;

if (!isConfigured) {
  console.warn('⚠️  CLOUDINARY NOT CONFIGURED!');
  console.warn('Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file');
  console.warn('See CLOUDINARY_SETUP.md for instructions');
}

// Upload image to Cloudinary — accepts file path OR buffer
export const uploadToCloudinary = async (filePathOrBuffer, folder = 'joyevents') => {
  try {
    if (!isConfigured) {
      throw new Error('Cloudinary not configured. Please check .env file and add CLOUDINARY credentials.');
    }

    // If it's a Buffer (from memoryStorage), upload via stream
    if (Buffer.isBuffer(filePathOrBuffer)) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }]
          },
          (error, result) => {
            if (error) return reject(new Error(`Image upload failed: ${error.message}`));
            resolve({ url: result.secure_url, public_id: result.public_id, width: result.width, height: result.height });
          }
        );
        stream.end(filePathOrBuffer);
      });
    }

    // Otherwise treat as file path (legacy fallback)
    const result = await cloudinary.uploader.upload(filePathOrBuffer, {
      folder,
      resource_type: 'auto',
      transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }]
    });
    return { url: result.secure_url, public_id: result.public_id, width: result.width, height: result.height };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error.message);
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

// Delete image from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

export default cloudinary;
