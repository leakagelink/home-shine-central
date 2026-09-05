import { supabase } from "@/integrations/supabase/client";

/**
 * Exchanges the single-use token hash minted by the server for a real Supabase
 * session. The client never sees a PIN, an OTP, or a service key.
 */
export async function exchangeSessionTicket(tokenHash: string) {
  const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (error) throw new Error("Could not start your session. Please try again.");
}

export function homeForRoles(roles: string[]): "/app" | "/partner" | "/admin" {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("partner")) return "/partner";
  return "/app";
}
