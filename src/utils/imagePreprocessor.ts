/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Preprocesses a receipt image on the client side using a computer vision-like pipeline
 * (Resizing, grayscale conversion, and contrast/brightness enhancement)
 * to optimize it for fast uploading and superior OCR accuracy.
 *
 * @param file The uploaded file
 * @param maxWidth Max width for resizing
 * @param maxHeight Max height for resizing
 */
export const preprocessReceiptImage = (
  file: File,
  maxWidth = 1000,
  maxHeight = 1000
): Promise<{ base64: string; width: number; height: number; originalSize: number; compressedSize: number }> => {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions preserving aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          // Apply computer vision-like preprocessing filters
          // 1. Convert to grayscale to remove color noise/chromatic aberration
          // 2. Boost contrast to make the text darker and background whiter
          // 3. Slightly increase brightness to wash out shadow gradients
          try {
            ctx.filter = "grayscale(100%) contrast(140%) brightness(105%)";
          } catch (e) {
            console.warn("Canvas filter not supported on this browser, drawing normally");
          }
          
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Compress as JPEG at 0.65 quality (optimal balance of file size & legible text for OCR)
        const base64 = canvas.toDataURL("image/jpeg", 0.65);
        
        // Calculate compressed size in bytes (approximate from base64 length)
        const compressedSize = Math.round((base64.length * 3) / 4);

        resolve({
          base64,
          width,
          height,
          originalSize,
          compressedSize
        });
      };
      img.onerror = () => reject(new Error("Failed to load image into memory"));
    };
    reader.onerror = () => reject(new Error("Failed to read raw image file"));
  });
};
