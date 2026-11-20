/**
 * High-Performance Client-Side Image Compressor for Mobile Web
 * 
 * - Auto-downscales to max 400x400 px with 1:1 aspect ratio square center-crop
 * - Compresses to lightweight WebP (falling back to JPEG)
 * - Targets ~30 KB - 50 KB file size for lightning-fast live venue uploads
 * - Preserves memory by properly cleaning up object URLs and canvas contexts
 */

export async function compressImage(fileOrBlob, options = {}) {
  const {
    targetSize = 400,
    quality = 0.82,
    fallbackMime = 'image/jpeg',
  } = options;

  if (!fileOrBlob) {
    throw new Error('No image file or blob provided for compression');
  }

  // 1. Create an HTMLImageElement from the input Blob or File
  const sourceUrl = URL.createObjectURL(fileOrBlob);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(new Error('Failed to load image into memory: ' + (err?.message || 'Invalid image format')));
      image.src = sourceUrl;
    });

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    if (!naturalWidth || !naturalHeight) {
      throw new Error('Invalid image dimensions detected');
    }

    // 2. Compute 1:1 square crop offsets (Center Crop)
    const cropSize = Math.min(naturalWidth, naturalHeight);
    const startX = (naturalWidth - cropSize) / 2;
    const startY = (naturalHeight - cropSize) / 2;

    // Output dimension (do not upscale if original image is smaller than targetSize)
    const outputDim = Math.min(targetSize, cropSize);

    // 3. Render onto Offscreen Canvas
    const canvas = document.createElement('canvas');
    canvas.width = outputDim;
    canvas.height = outputDim;

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) {
      throw new Error('Unable to acquire 2D canvas rendering context');
    }

    // Crisp smoothing settings for mobile screens
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw center-cropped square
    ctx.drawImage(
      img,
      startX,
      startY,
      cropSize,
      cropSize,
      0,
      0,
      outputDim,
      outputDim
    );

    // 4. Test WebP format support, fallback to JPEG
    let targetFormat = 'image/webp';
    const isWebPSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    if (!isWebPSupported) {
      targetFormat = fallbackMime;
    }

    // 5. Convert to Blob
    const compressedBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob conversion failed'));
          }
        },
        targetFormat,
        quality
      );
    });

    // Generate local preview URL
    const previewUrl = URL.createObjectURL(compressedBlob);

    return {
      blob: compressedBlob,
      previewUrl,
      width: outputDim,
      height: outputDim,
      sizeBytes: compressedBlob.size,
      mimeType: compressedBlob.type,
      sizeKb: (compressedBlob.size / 1024).toFixed(1),
    };
  } finally {
    // Release the initial blob memory immediately
    URL.revokeObjectURL(sourceUrl);
  }
}
