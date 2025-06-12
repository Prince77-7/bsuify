export interface FileValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  preserveOriginalSize?: boolean;
}

// Supported file formats for real estate photos
const SUPPORTED_FORMATS = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/tif'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const RECOMMENDED_MAX_WIDTH = 1920;
const RECOMMENDED_MAX_HEIGHT = 1080;

// Maximum image dimensions to prevent memory issues (supports up to 16K resolution)
const ABSOLUTE_MAX_WIDTH = 15360; // 16K width
const ABSOLUTE_MAX_HEIGHT = 8640; // 16K height

export function validateImageFile(file: File): FileValidationResult {
  // Check file type
  if (!SUPPORTED_FORMATS.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file format. Please use: JPG, PNG, WebP, HEIC, or TIFF`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  // Additional validation for specific formats
  if (file.type.includes('heic') || file.type.includes('heif')) {
    // Note: HEIC support may require additional polyfills
    console.warn('HEIC format detected - may require additional processing');
  }

  return { valid: true, file };
}

export function processImageFile(
  file: File, 
  options: ImageProcessingOptions = {}
): Promise<{ 
  processedFile: File; 
  originalDimensions: { width: number; height: number };
  processedDimensions: { width: number; height: number };
  compressionRatio: number;
}> {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = RECOMMENDED_MAX_WIDTH,
      maxHeight = RECOMMENDED_MAX_HEIGHT,
      quality = 0.9,
      format = 'jpeg',
      preserveOriginalSize = false
    } = options;

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to create canvas context'));
      return;
    }

    img.onload = () => {
      const originalWidth = img.width;
      const originalHeight = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = preserveOriginalSize 
        ? { width: originalWidth, height: originalHeight }
        : calculateOptimalDimensions(
            originalWidth, 
            originalHeight, 
            maxWidth, 
            maxHeight
          );

      // Safety check: prevent extremely large images that could cause memory issues
      if (preserveOriginalSize && (width > ABSOLUTE_MAX_WIDTH || height > ABSOLUTE_MAX_HEIGHT)) {
        const scale = Math.min(ABSOLUTE_MAX_WIDTH / width, ABSOLUTE_MAX_HEIGHT / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        console.warn(`Image too large (${originalWidth}x${originalHeight}), scaled down to ${width}x${height} for memory safety`);
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw image with high quality settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to process image'));
            return;
          }

          const processedFile = new File([blob], file.name, {
            type: `image/${format}`,
            lastModified: Date.now()
          });

          resolve({
            processedFile,
            originalDimensions: { width: originalWidth, height: originalHeight },
            processedDimensions: { width, height },
            compressionRatio: Math.round((1 - blob.size / file.size) * 100)
          });
        },
        `image/${format}`,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Create object URL for the image
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
}

export function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // If image is larger than max dimensions, scale it down
  if (width > maxWidth || height > maxHeight) {
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const scale = Math.min(widthRatio, heightRatio);

    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  return { width, height };
}

export function getImageMetadata(file: File): Promise<{
  dimensions: { width: number; height: number };
  fileSize: number;
  format: string;
  hasEXIF: boolean;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        dimensions: { width: img.width, height: img.height },
        fileSize: file.size,
        format: file.type,
        hasEXIF: file.type.includes('jpeg') || file.type.includes('jpg') || file.type.includes('tiff')
      });
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for metadata extraction'));
    };

    img.src = URL.createObjectURL(file);
  });
}

export function createThumbnail(
  file: File, 
  size: number = 150
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to create canvas context'));
      return;
    }

    img.onload = () => {
      // Create square thumbnail
      canvas.width = size;
      canvas.height = size;

      const { width, height } = img;
      const minDimension = Math.min(width, height);
      const scale = size / minDimension;

      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      
      const offsetX = (size - scaledWidth) / 2;
      const offsetY = (size - scaledHeight) / 2;

      // Fill background
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, size, size);

      // Draw image centered
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

      resolve(canvas.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error('Failed to create thumbnail'));
    };

    img.src = URL.createObjectURL(file);
  });
}

export function downloadImage(dataUrl: string, filename: string = 'realty-canvas-export') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function copyToClipboard(dataUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Convert data URL to blob
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const item = new ClipboardItem({ [blob.type]: blob });
        return navigator.clipboard.write([item]);
      })
      .then(() => resolve())
      .catch(() => reject(new Error('Failed to copy to clipboard')));
  });
}

// Drag and drop helper
export function setupDragAndDrop(
  element: HTMLElement,
  onFilesDrop: (files: FileList) => void,
  onDragStateChange?: (isDragging: boolean) => void
) {
  let dragCounter = 0;

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      onDragStateChange?.(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      onDragStateChange?.(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    dragCounter = 0;
    onDragStateChange?.(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      onFilesDrop(files);
    }
  };

  element.addEventListener('dragenter', handleDragEnter);
  element.addEventListener('dragleave', handleDragLeave);
  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('drop', handleDrop);

  // Return cleanup function
  return () => {
    element.removeEventListener('dragenter', handleDragEnter);
    element.removeEventListener('dragleave', handleDragLeave);
    element.removeEventListener('dragover', handleDragOver);
    element.removeEventListener('drop', handleDrop);
  };
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get file extension
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

// Generate unique filename
export function generateFilename(prefix: string = 'realty-canvas', extension: string = 'png'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}.${extension}`;
} 