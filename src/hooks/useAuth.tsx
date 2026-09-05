import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type SessionUser = {
  id: string;
  mobile: string;
  fullName: string | null;
  roles: AppRole[];
};

async function loadSessionUser(): Promise<SessionUser | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("mobile, full_name").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    id: user.id,
    mobile: profile?.mobile ?? "",
    fullName: profile?.full_name ?? null,
    roles: (roles ?? []).map((r) => r.role),
  };
}

export function useAuth() {
  const query = useQuery({
    queryKey: ["session-user"],
    queryFn: loadSessionUser,
    staleTime: 60_000,
  });

  const user = query.data ?? null;
  return {
    user,
    isLoading: query.isLoading,
    roles: user?.roles ?? [],
    isCustomer: user?.roles.includes("customer") ?? false,
    isPartner: user?.roles.includes("partner") ?? false,
    isAdmin: user?.roles.includes("admin") ?? false,
  };
}

export async function signOutEverywhere() {
  await supabase.auth.signOut();
}
