export interface OrderSnapshot {
  code: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  items: {
    id: string;
    slug: string;
    name: string;
    brand: string;
    image_url: string | null;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
  shippingCost?: number;
  total: number;
}

export const orderSnapshotKey = (code: string) => `autentik-orders:${code}`;