import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getTrackingDestination } from "./tracking";

export async function getOwnedOrderTrackingUrl(orderCode: string): Promise<string | null> {
  const supabase = createClient(await cookies());
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;
  const { data: order, error: orderError } = await supabase.from("orders")
    .select("tracking_courier").eq("order_code", orderCode)
    .eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  if (orderError || !order?.tracking_courier) return null;
  try {
    const { data, error } = await createAdminClient().from("site_settings")
      .select("tracking_urls:value->courierTrackingUrls").eq("key", "store").maybeSingle();
    if (error) return null;
    return getTrackingDestination(order.tracking_courier, data?.tracking_urls);
  } catch {
    return null;
  }
}
