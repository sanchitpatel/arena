import { supabase } from '../utils/supabase';

/**
 * Storage Service — Manages mobile player photo uploads to Supabase Cloud Storage
 * Targets the 'avatars' public bucket with automatic cache busting.
 */

const AVATARS_BUCKET = 'avatars';

/**
 * Uploads a compressed player avatar blob to Supabase Storage.
 *
 * @param {Blob} blob - The compressed image Blob (typically ~35-50 KB WebP or JPEG)
 * @param {Object} metadata
 * @param {string} [metadata.guestId] - e.g. "Guest042"
 * @param {string} [metadata.playerId] - Player UUID
 * @returns {Promise<{ success: boolean, publicUrl?: string, fileName?: string, error?: string }>}
 */
export async function uploadPlayerAvatar(blob, { guestId = 'guest', playerId = '' } = {}) {
  try {
    if (!blob) {
      throw new Error('No image blob provided for upload.');
    }

    // Determine extension based on blob MIME type
    const isJpeg = blob.type === 'image/jpeg';
    const ext = isJpeg ? 'jpg' : 'webp';

    // Clean guest identifier to ensure valid safe storage path
    const safeTag = String(guestId || playerId || 'guest').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `guest_${safeTag}_${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(fileName, blob, {
        contentType: blob.type || 'image/webp',
        cacheControl: '31536000', // 1 year immutable client caching
        upsert: true,
      });

    if (error) {
      console.error('[Storage Service] Upload failed:', error);
      // Give actionable error message if bucket hasn't been created yet
      if (error.message?.includes('Bucket not found') || error.statusCode === 404) {
        throw new Error("Bucket 'avatars' not found. Please create the public bucket 'avatars' in Supabase Dashboard.");
      }
      throw error;
    }

    // Retrieve the permanent public CDN URL
    const { data: urlData } = supabase.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded photo.');
    }

    return {
      success: true,
      publicUrl: urlData.publicUrl,
      fileName,
      path: data?.path || fileName,
    };
  } catch (err) {
    console.error('[Storage Service] Avatar upload error:', err);
    return {
      success: false,
      publicUrl: null,
      error: err.message || 'Failed to upload photo to server.',
    };
  }
}
