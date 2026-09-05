import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  sort_order: number;
};

export type Service = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_paise: number;
  duration_minutes: number | null;
  max_quantity: number | null;
  is_active: boolean;
  sort_order: number;
};

export type Addon = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_paise: number;
  is_active: boolean;
  sort_order: number;
};

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("service_categories")
      .select("id, slug, name, tagline, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
});

export function categoryDetailQuery(slug: string) {
  return queryOptions({
    queryKey: ["category", slug],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: category, error } = await supabase
        .from("service_categories")
        .select("id, slug, name, tagline, sort_order")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!category) return null;

      const [services, addons] = await Promise.all([
        supabase
          .from("services")
          .select(
            "id, category_id, name, description, price_paise, duration_minutes, max_quantity, is_active, sort_order",
          )
          .eq("category_id", category.id)
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("addons")
          .select("id, category_id, name, description, price_paise, is_active, sort_order")
          .eq("is_active", true)
          .or(`category_id.eq.${category.id},category_id.is.null`)
          .order("sort_order"),
      ]);

      return {
        category: category as Category,
        services: (services.data ?? []) as Service[],
        addons: (addons.data ?? []) as Addon[],
      };
    },
  });
}

export const addressesQuery = queryOptions({
  queryKey: ["addresses"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const myBookingsQuery = queryOptions({
  queryKey: ["my-bookings"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_number, status, scheduled_date, slot_start, slot_end, total_paise, category_slug, created_at, booking_items(name, quantity, kind)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export function bookingDetailQuery(id: string) {
  return queryOptions({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "*, booking_items(*), booking_status_history(status, note, created_at), payments(status, provider, amount_paise), reviews(rating, comment), job_photos(kind, storage_path)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, kind, read_at, created_at, booking_id")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data ?? [];
  },
});
