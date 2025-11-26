/**
 * Social media sharing utilities with watermark support
 */

export interface ShareOptions {
  imageUrl: string;
  outfitId: string;
  username: string;
  rating?: number;
  platform: 'instagram' | 'tiktok' | 'facebook';
}

/**
 * Generates a watermarked image with "Rate me" text
 */
export async function generateWatermarkedImage(
  imageUrl: string,
  username: string,
  rating?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

              img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }
            canvas.width = 1080;
            canvas.height = 1350;

            // Always cover the canvas with the image: "cover" mode
            const imgRatio = img.width / img.height;
            const canvasRatio = canvas.width / canvas.height;
            let drawWidth, drawHeight, drawX, drawY;
            if (imgRatio > canvasRatio) {
              // Image is wider: fit height, crop sides
              drawHeight = canvas.height;
              drawWidth = imgRatio * canvas.height;
              drawX = (canvas.width - drawWidth) / 2;
              drawY = 0;
            } else {
              // Image is taller: fit width, crop top/bottom
              drawWidth = canvas.width;
              drawHeight = canvas.width / imgRatio;
              drawX = 0;
              drawY = (canvas.height - drawHeight) / 2;
            }

            // Draw photo to fill entire canvas, cropping as necessary
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

            // Overlay + watermark at bottom of image
            const overlayHeight = Math.round(canvas.height * 0.08);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);

            ctx.font = `bold ${canvas.width * 0.05}px Arial`;
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RATE ME', canvas.width / 2, canvas.height - overlayHeight * 0.5);

            ctx.font = `${canvas.width * 0.025}px Arial`;
            ctx.fillStyle = '#E5E7EB';
            ctx.fillText(
              'https://ratemyoutfitnow.netlify.app/',
              canvas.width / 2,
              canvas.height - overlayHeight * 0.15
            );

            canvas.toBlob((blob) => {
              if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          }, 'image/png', 0.95);
        };




    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Download watermarked image
 */
export async function downloadWatermarkedImage(
  imageUrl: string,
  username: string,
  outfitId: string
): Promise<void> {
  try {
    const blob = await generateWatermarkedImage(imageUrl, username);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rateme-${outfitId}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading watermarked image:', error);
    throw error;
  }
}

/**
 * Share to Instagram (opens with image ready to share)
 */
export async function shareToInstagram(options: ShareOptions): Promise<void> {
  try {
    const blob = await generateWatermarkedImage(options.imageUrl, options.username, options.rating);
    const url = URL.createObjectURL(blob);

    // Instagram share typically requires going to the Instagram app or website
    // On web, we'll provide the image for download so user can upload to Instagram
    const link = document.createElement('a');
    link.href = url;
    link.download = `rateme-${options.outfitId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Open Instagram in new tab as fallback
    setTimeout(() => {
      window.open('https://www.instagram.com/', '_blank');
    }, 500);
  } catch (error) {
    console.error('Error sharing to Instagram:', error);
    throw error;
  }
}

/**
 * Share to TikTok (opens with download prompt for image)
 */
export async function shareToTikTok(options: ShareOptions): Promise<void> {
  try {
    const blob = await generateWatermarkedImage(options.imageUrl, options.username, options.rating);
    const url = URL.createObjectURL(blob);

    // Download the image for TikTok
    const link = document.createElement('a');
    link.href = url;
    link.download = `rateme-${options.outfitId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Open TikTok in new tab
    setTimeout(() => {
      window.open('https://www.tiktok.com/upload', '_blank');
    }, 500);
  } catch (error) {
    console.error('Error sharing to TikTok:', error);
    throw error;
  }
}

/**
 * Share to Facebook via web intent
 */
export async function shareToFacebook(options: ShareOptions): Promise<void> {
  try {
    const url = window.location.origin;
    const text = `Check out my outfit on RateMe! ${options.username}'s fit rated ${options.rating || 'N/A'}/10`;

    const facebookShareUrl = new URL('https://www.facebook.com/sharer/sharer.php');
    facebookShareUrl.searchParams.set('u', url);
    facebookShareUrl.searchParams.set('quote', text);

    window.open(facebookShareUrl.toString(), 'facebook-share-dialog', 'width=800,height=600');
  } catch (error) {
    console.error('Error sharing to Facebook:', error);
    throw error;
  }
}
