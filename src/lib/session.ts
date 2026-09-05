import { supabase } from "@/integrations/supabase/client";

/**
 * Exchanges the single-use token hash minted by the server for a real Supabase
 * session. The client never sees a PIN, an OTP, or a service key.
 */
export async function exchangeSessionTicket(tokenHash: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (error || !data.session) {
    throw new Error("Could not start your session. Please try again.");
  }
  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  // Wait until the session is readable before the caller navigates into a
  // protected route, otherwise the route guard sees a signed-out client.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Could not start your session. Please try again.");
}


export function homeForRoles(roles: string[]): "/app" | "/partner" | "/admin" {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("partner")) return "/partner";
  return "/app";
}
