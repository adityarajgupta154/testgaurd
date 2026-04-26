/**
 * Cloudinary unsigned upload utility for ExamGuard.
 * 
 * Uses UNSIGNED upload preset — safe for frontend use.
 * No API secret is exposed.
 */

const CLOUD_NAME = 'daopxrrp0';
const UPLOAD_PRESET = 'examguard_faces';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Upload a base64 data URL image to Cloudinary.
 * 
 * @param {string} base64DataUrl - The image as a data URL (e.g., "data:image/jpeg;base64,...")
 * @param {string} publicId - Optional public ID / filename for the upload
 * @returns {Promise<{ secure_url: string, public_id: string }>} - Cloudinary response
 * @throws {Error} if upload fails
 */
export const uploadToCloudinary = async (base64DataUrl, publicId = '') => {
  console.log('[Cloudinary] Starting upload...');

  const formData = new FormData();
  formData.append('file', base64DataUrl);
  formData.append('upload_preset', UPLOAD_PRESET);
  if (publicId) {
    formData.append('public_id', publicId);
  }

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Cloudinary] Upload failed:', response.status, errorText);
    throw new Error(`Cloudinary upload failed (HTTP ${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.secure_url) {
    console.error('[Cloudinary] No secure_url in response:', data);
    throw new Error('Cloudinary response missing secure_url');
  }

  console.log('[Cloudinary] ✅ Upload successful:', data.secure_url);
  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
  };
};
