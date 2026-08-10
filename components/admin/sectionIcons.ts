import type { LucideIcon } from "lucide-react";
import {
  ShoppingBag,
  Package,
  Boxes,
  Tags,
  Briefcase,
  Users,
  Inbox,
  MessageCircle,
  UserCog,
  CreditCard,
  History,
} from "lucide-react";

export const SECTION_ICONS: Record<string, LucideIcon> = {
  orders: ShoppingBag,
  sparepart: Package,
  stok: Boxes,
  produk: Package,
  merek: Tags,
  karir: Briefcase,
  relasi: Users,
  inquiry: Inbox,
  lead: MessageCircle,
  "akses-staff": UserCog,
  integrasi: CreditCard,
  riwayat: History,
};