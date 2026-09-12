import { ResultAttachment } from '../types';

/**
 * Compress and process a file for attachment.
 * If image: downscale to max 1200px and compress to high-quality JPEG (reducing 5MB photos to ~70-150KB).
 * If PDF/EML/other: convert to Base64 data URL with a safe 800KB limit for Firestore document limits.
 */
export async function processFileForAttachment(file: File): Promise<ResultAttachment> {
  const isImage = file.type.startsWith('image/');

  if (isImage) {
    try {
      const compressedDataUrl = await compressImage(file);
      // Calculate approximate size in bytes from base64
      const head = 'data:image/jpeg;base64,';
      const base64Length = compressedDataUrl.length - (compressedDataUrl.indexOf(',') + 1);
      const approximateSize = Math.round((base64Length * 3) / 4);

      return {
        name: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
        type: 'image/jpeg',
        size: approximateSize,
        dataUrl: compressedDataUrl,
        uploadedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.warn('Image compression failed, falling back to direct data URL', e);
    }
  }

  // Non-image or fallback: check size (max 800KB)
  const MAX_RAW_SIZE = 850 * 1024; // 850 KB
  if (file.size > MAX_RAW_SIZE) {
    throw new Error(
      `حجم الملف (${formatFileSize(file.size)}) يتجاوز الحد المسموح به (850 كيلوبايت). يُرجى تقليل حجم الملف أو ضغطه قبل الرفع.`
    );
  }

  const dataUrl = await fileToDataUrl(file);

  return {
    name: file.name,
    type: file.type || getFallbackMimeType(file.name),
    size: file.size,
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Converts File to Base64 Data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Image compressor using HTML5 Canvas
 */
function compressImage(file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Draw white background for transparent images
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes to readable size
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const formatted = (bytes / Math.pow(1024, i)).toFixed(1);
  return `${formatted} ${units[i]}`;
}

/**
 * Detect general attachment category
 */
export function getAttachmentCategory(attachment: ResultAttachment): 'image' | 'pdf' | 'email' | 'text' | 'document' | 'other' {
  const type = (attachment.type || '').toLowerCase();
  const name = (attachment.name || '').toLowerCase();

  if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)) {
    return 'image';
  }
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) {
    return 'pdf';
  }
  if (type.includes('rfc822') || type.includes('eml') || type.includes('message') || /\.(eml|msg)$/i.test(name)) {
    return 'email';
  }
  if (type.startsWith('text/') || /\.(txt|csv|log)$/i.test(name)) {
    return 'text';
  }
  if (type.includes('word') || type.includes('officedocument') || /\.(doc|docx)$/i.test(name)) {
    return 'document';
  }
  return 'other';
}

/**
 * Download an attachment to the user's computer or device
 */
export function downloadAttachment(attachment: ResultAttachment): void {
  try {
    const link = document.createElement('a');
    link.href = attachment.dataUrl;
    link.download = attachment.name || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Download failed:', err);
    // Fallback: open in new tab
    window.open(attachment.dataUrl, '_blank');
  }
}

/**
 * Fallback MIME type inference based on file extension
 */
function getFallbackMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'eml':
      return 'message/rfc822';
    case 'msg':
      return 'application/vnd.ms-outlook';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'txt':
      return 'text/plain';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}
