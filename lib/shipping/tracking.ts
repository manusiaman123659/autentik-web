export function isSafeCourier(value: string): boolean {
  return value.length <= 80 && !/[\u0000-\u001f\u007f-\u009f<>]/.test(value)
    && !/(?:[a-z][a-z0-9+.-]*:|www\.|\/\/|&(?:lt|gt);)/i.test(value);
}

export function isSafeTrackingNumber(value: string): boolean {
  return value.length <= 100 && /^[A-Za-z0-9 ._/-]*$/.test(value)
    && !/(?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|id|co|io)(?:[./]|$))/i.test(value);
}

export function getTrackingDestination(courier: string | null): string | null {
  if (courier?.trim().toUpperCase() !== "JNE") return null;
  return "https://jne.co.id/tracking-package";
}
