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

}

export function homeForRoles(roles: string[]): "/app" | "/partner" | "/admin" {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("partner")) return "/partner";
  return "/app";
}
