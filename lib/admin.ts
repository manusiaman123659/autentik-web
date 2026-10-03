import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { AdminUser } from "@/lib/admin-sections";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";
import { hasCapability, isCmsRole, canAccessSection, type CmsCapability } from "@/lib/admin-permissions";
import { notFound } from "next/navigation";

export type { AdminUser };
export { ADMIN_SECTIONS };

const getCurrentCmsUser = cache(
  async (): Promise<AdminUser | null> => {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let authData;
    try {
      const result = await supabase.auth.getUser();
      authData = result.data;
    } catch (err) {
      // Refresh token expired/invalid → return null
      // Caller (layout.tsx) akan redirect ke /admin/login
      if (err && typeof err === "object" && "code" in err && err.code !== "refresh_token_not_found") {
        console.error("[getAdminUser] unexpected auth error:", err);
      }
      return null;
    }
    const user = authData?.user;
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !profile ||
      profile.is_active !== true ||
      !isCmsRole(profile.role)
    ) {
      return null;
    }

    return {
      id: user.id,
      email: profile.email ?? user.email ?? "",
      fullName: profile.full_name,
      role: profile.role,
    };
  }
);

export async function getAdminUser(capability: CmsCapability = "cms"): Promise<AdminUser | null> {
  const user = await getCurrentCmsUser();
  return user && hasCapability(user.role, capability) ? user : null;
}

export const requireSuperAdmin = () => getAdminUser("sensitive");
export const requireAdmin = () => getAdminUser("shipping");
export const requireOperationalStaff = () => getAdminUser("operations");
export const requireContentManager = () => getAdminUser("content");

export async function requireCapability(capability: CmsCapability): Promise<AdminUser> {
  const user = await getAdminUser(capability);
  if (!user) notFound();
  return user;
}

export async function requireSectionAccess(section: string): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user || !canAccessSection(user.role, section)) notFound();
  return user;
}
