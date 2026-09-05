import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Loader2, MapPin, Plus, Tag } from "lucide-react";
import { toast } from "sonner";

import { addressesQuery } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { createBooking, quoteBooking } from "@/lib/booking.functions";
import { rupees, TIME_SLOTS, dayLabel, nextDates, timeLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/checkout")({
  head: () => ({
    meta: [
      { title: "Confirm your cleaning — SqueakClean" },
      {
        name: "description",
        content: "Choose your address, date and slot, apply a coupon and confirm your booking.",
      },
      { property: "og:title", content: "Confirm your cleaning — SqueakClean" },
      { property: "og:description", content: "Choose an address, a slot, and confirm." },
    ],
  }),
  component: Checkout;
});

function Checkout() {
  return null;
}
