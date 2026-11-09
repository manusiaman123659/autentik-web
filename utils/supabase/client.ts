import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { applyAuthCookiePolicy, isSessionCookie, rememberCookie, REMEMBER_COOKIE, type AuthCookie } from "@/lib/auth-cookie-policy";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function readCookies() {
  return parseCookieHeader(document.cookie).map(({ name, value }) => ({ name, value: value ?? "" }));
}

function writeCookies(cookies: AuthCookie[]) {
  for (const { name, value, options } of cookies) document.cookie = serializeCookieHeader(name, value, options);
}

export function setRememberMode(remember: boolean) {
  const preference = rememberCookie(remember ? "30d" : "session");
  const current = readCookies().filter(cookie => cookie.name !== REMEMBER_COOKIE);
  const session = current.filter(cookie => isSessionCookie(cookie.name, supabaseUrl!))
    .map(cookie => ({ ...cookie, options: { path: "/", sameSite: "lax" as const } }));
  // Only called after successful login; reissue even when the token bytes did not change.
  writeCookies(applyAuthCookiePolicy(session, [...current, preference], supabaseUrl!));
}

const subscribed = new WeakSet<object>();
export const createClient = () => {
  const client = createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
    { cookies: {
      getAll: readCookies,
      setAll(changes) { writeCookies(applyAuthCookiePolicy(changes, readCookies(), supabaseUrl!)); },
    } },
  );
  if (!subscribed.has(client)) {
    subscribed.add(client);
    client.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") writeCookies([rememberCookie("")]);
    });
  }
  return client;
};

export async function signInAdmin(email: string, password: string, remember: boolean) {
  const result = await createClient().auth.signInWithPassword({ email, password });
  if (!result.error && result.data.session) setRememberMode(remember);
  return result;
}
