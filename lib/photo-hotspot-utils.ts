/**
 * computeContainedImageRect
 *
 * When an <img> with `object-fit: contain` is rendered inside a container,
 * the actual visible image may be smaller than the container (letterboxed).
 * This function computes the exact pixel rect of the visible image area
 * within the container, accounting for any padding/insets on the image element.
 *
 * Usage:
 *   const rect = computeContainedImageRect(imgElement);
 *   // rect.left, rect.top  = offset from container's left/top edge
 *   // rect.width, rect.height = rendered image dimensions
 *
 * The function uses the img element's `naturalWidth`, `naturalHeight`, and
 * its actual rendered client dimensions (minus padding) to calculate the
 * letterbox offsets.
 */

export interface ImageRect {
  /** X offset from the container's left edge (px) */
  left: number;
  /** Y offset from the container's top edge (px) */
  top: number;
  /** Rendered width of the actual image content (px) */
  width: number;
  /** Rendered height of the actual image content (px) */
  height: number;
}

/**
 * Compute the pixel rect of the visible image inside a `object-fit: contain`
 * image element. Works for portrait, landscape, and square images inside
 * any shaped container.
 *
 * @param img - The <img> HTMLElement. Must have `naturalWidth` & `naturalHeight` loaded.
 * @returns The pixel rect of the visible image relative to the *container*.
 *          Returns null if the image has no natural dimensions (not loaded yet).
 */
export function computeContainedImageRect(
  img: HTMLImageElement
): ImageRect | null {
  const { naturalWidth, naturalHeight } = img;
  if (!naturalWidth || !naturalHeight) return null;

  // Get the computed style to read padding on the img element itself
  // (Next.js Image uses `padding: 32px` via className like `p-8`)
  const style = window.getComputedStyle(img);
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  const paddingBottom = parseFloat(style.paddingBottom) || 0;
  const paddingLeft = parseFloat(style.paddingLeft) || 0;

  // The available space for object-fit: contain (after padding)
  const availW = img.clientWidth - paddingLeft - paddingRight;
  const availH = img.clientHeight - paddingTop - paddingBottom;

  if (availW <= 0 || availH <= 0) return null;

  const imgAspect = naturalWidth / naturalHeight;
  const containerAspect = availW / availH;

  let renderW: number;
  let renderH: number;

  if (imgAspect > containerAspect) {
    // Image is wider — fits width, letterboxed vertically
    renderW = availW;
    renderH = availW / imgAspect;
  } else {
    // Image is taller (or equal) — fits height, letterboxed horizontally
    renderH = availH;
    renderW = availH * imgAspect;
  }

  // Offset within the available padding-box (centered by object-fit: contain)
  const offsetX = paddingLeft + (availW - renderW) / 2;
  const offsetY = paddingTop + (availH - renderH) / 2;

  return {
    left: offsetX,
    top: offsetY,
    width: renderW,
    height: renderH,
  };
}

/**
 * Convert a click event on an image container into percentage coordinates
 * (0-100) relative to the actual visible image content.
 *
 * @returns `{ x, y }` clamped to [0, 100], or `null` if the click landed
 *          outside the actual image (in the letterbox / padding area).
 */
export function clickToImagePercent(
  clientX: number,
  clientY: number,
  img: HTMLImageElement,
  containerRect: DOMRect
): { x: number; y: number } | null {
  const imgRect = computeContainedImageRect(img);
  if (!imgRect) return null;

  // Pointer position relative to the container element
  const pointerX = clientX - containerRect.left;
  const pointerY = clientY - containerRect.top;

  // Check if inside the actual image rect
  if (
    pointerX < imgRect.left ||
    pointerX > imgRect.left + imgRect.width ||
    pointerY < imgRect.top ||
    pointerY > imgRect.top + imgRect.height
  ) {
    return null; // Click on letterbox/padding — ignore
  }

  const rawX = ((pointerX - imgRect.left) / imgRect.width) * 100;
  const rawY = ((pointerY - imgRect.top) / imgRect.height) * 100;

  return {
    x: Math.round(Math.min(100, Math.max(0, rawX)) * 100) / 100,
    y: Math.round(Math.min(100, Math.max(0, rawY)) * 100) / 100,
  };
}

/**
 * Convert percentage coordinates (0-100) back to pixel position relative
 * to the container element.
 *
 * Used by the public-facing renderer to position marker buttons over
 * the actual image content (not the wrapper/padding).
 */
export function percentToContainerPixel(
  posX: number,
  posY: number,
  img: HTMLImageElement
): { left: number; top: number } | null {
  const imgRect = computeContainedImageRect(img);
  if (!imgRect) return null;

  return {
    left: imgRect.left + (posX / 100) * imgRect.width,
    top: imgRect.top + (posY / 100) * imgRect.height,
  };
}
