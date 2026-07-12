/**
 * Image optimization utilities
 * Provides reusable functions for optimized image loading with blur placeholders
 */

/**
 * Generate SVG shimmer placeholder for better loading UX
 * @param w - Width of the placeholder
 * @param h - Height of the placeholder
 * @returns SVG string for shimmer effect
 */
export const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f0f0f0" offset="20%" />
      <stop stop-color="#e0e0e0" offset="50%" />
      <stop stop-color="#f0f0f0" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f0f0f0" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

/**
 * Convert string to base64
 * Works in both browser and server environments
 * @param str - String to convert
 * @returns Base64 encoded string
 */
export const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

/**
 * Generate blur data URL for Next.js Image placeholder
 * @param width - Image width
 * @param height - Image height
 * @returns Data URL for blur placeholder
 */
export const getBlurDataURL = (width: number = 400, height: number = 400) =>
  `data:image/svg+xml;base64,${toBase64(shimmer(width, height))}`;
