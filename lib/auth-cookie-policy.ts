import type { CookieOptions } from "@supabase/ssr";

export const REMEMBER_COOKIE = "aka-auth-remember";
export const REMEMBER_SECONDS = 30 * 24 * 60 * 60;
export type AuthCookie = { name: string; value: string; options: CookieOptions };
type CookieValue = { name: string; value: string };

export function authCookieName(supabaseUrl: string) {
  return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
}

export function isSessionCookie(name: string, supabaseUrl: string) {
  const base = authCookieName(supabaseUrl);
  return name === base || (name.startsWith(`${base}.`) && /^\d+$/.test(name.slice(base.length + 1)));
}

export function rememberCookie(value: "30d" | "session" | ""): AuthCookie {
  return {
    name: REMEMBER_COOKIE, value,
    options: {
      path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production",
      ...(value === "30d" ? { maxAge: REMEMBER_SECONDS } : value === "" ? { maxAge: 0 } : {}),
    },
  };
}

export function applyAuthCookiePolicy(changes: AuthCookie[], current: CookieValue[], supabaseUrl: string): AuthCookie[] {
  const mode = current.find(cookie => cookie.name === REMEMBER_COOKIE)?.value === "30d" ? "30d" : "session";
  let setsSession = false;
  let deletesSession = false;
  let liveOptions: CookieOptions | undefined;
  const output = changes.map(cookie => {
    if (!isSessionCookie(cookie.name, supabaseUrl)) return cookie;
    const deletion = (typeof cookie.options.maxAge === "number" && cookie.options.maxAge <= 0)
      || (cookie.options.maxAge === undefined && cookie.options.expires !== undefined && cookie.options.expires.getTime() <= Date.now());
    if (deletion) { deletesSession = true; return cookie; }
    setsSession = true;
    const options = { ...cookie.options };
    delete options.maxAge;
    delete options.expires;
    if (mode === "30d") options.maxAge = REMEMBER_SECONDS;
    liveOptions = options;
    return { ...cookie, options };
  });
  if (setsSession) {
    // The SDK omits unchanged chunks; renew every surviving chunk together.
    for (const cookie of current) {
      if (cookie.value !== "" && isSessionCookie(cookie.name, supabaseUrl) && !changes.some(change => change.name === cookie.name)) {
        output.push({ ...cookie, options: { ...liveOptions } });
      }
    }
    output.push(rememberCookie(mode));
  }
  else if (deletesSession) output.push(rememberCookie(""));
  return output;
}
