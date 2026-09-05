/**
 * Payment service abstraction.
 *
 * Rules baked in here on purpose:
 *  - Payment orders are only ever created on the server.
 *  - No secret key ever reaches the client; the client receives an order id and
 *    the amount only.
 *  - A booking is never marked paid from a client claim. `confirmPayment` only
 *    trusts a server-side verification result from the gateway.
 *  - Callbacks are idempotent: a repeat callback for the same provider payment
 *    id is a no-op, guarded by a unique index.
 *
 * No online gateway credentials are configured yet, so the online provider
 * refuses to create an order instead of pretending a payment succeeded.
 * Wire a real gateway by implementing `OnlineGateway` and setting its secrets.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PaymentMethod = "online" | "cash_on_completion";

export type InitiatedPayment = {
  paymentId: string;
  method: PaymentMethod;
  status: "pending" | "requires_gateway";
  amountPaise: number;
  provider: string;
  /** Safe, non-secret data for the client to hand to a gateway SDK. */
  clientPayload: { orderId: string | null; publicKey: string | null } | null;
  gatewayConfigured: boolean;
  message: string;
};

export interface OnlineGateway {
  name: string;
  createOrder(args: {
    amountPaise: number;
    receipt: string;
  }): Promise<{ orderId: string; publicKey: string }>;
  verifySignature(payload: Record<string, string>): Promise<boolean>;
}

/** Returns the configured gateway, or null while credentials are absent. */
export function getOnlineGateway(): OnlineGateway | null {
  const keyId = process.env["PAYMENT_GATEWAY_KEY_ID"];
  const keySecret = process.env["PAYMENT_GATEWAY_KEY_SECRET"];
  if (!keyId || !keySecret) return null;
  // TODO(production): return a concrete gateway implementation here.
  return null;
}

export async function initiatePayment(args: {
  bookingId: string;
  customerId: string;
  amountPaise: number;
  method: PaymentMethod;
}): Promise<InitiatedPayment> {
  const gateway = args.method === "online" ? getOnlineGateway() : null;
  const idempotencyKey = `booking:${args.bookingId}:${args.method}`;

  if (args.method === "online" && !gateway) {
    const { data } = await supabaseAdmin
      .from("payments")
      .upsert(
        {
          booking_id: args.bookingId,
          customer_id: args.customerId,
          provider: "unconfigured",
          amount_paise: args.amountPaise,
          status: "created",
          idempotency_key: idempotencyKey,
        },
        { onConflict: "idempotency_key" },
      )
      .select("id")
      .single();

    return {
      paymentId: data?.id ?? "",
      method: args.method,
      status: "requires_gateway",
      amountPaise: args.amountPaise,
      provider: "unconfigured",
      clientPayload: null,
      gatewayConfigured: false,
      message:
        "Online payment needs a payment gateway to be connected. Your booking is saved as awaiting payment.",
    };
  }

  if (gateway) {
    const order = await gateway.createOrder({
      amountPaise: args.amountPaise,
      receipt: args.bookingId,
    });
    const { data } = await supabaseAdmin
      .from("payments")
      .upsert(
        {
          booking_id: args.bookingId,
          customer_id: args.customerId,
          provider: gateway.name,
          provider_order_id: order.orderId,
          amount_paise: args.amountPaise,
          status: "pending",
          idempotency_key: idempotencyKey,
        },
        { onConflict: "idempotency_key" },
      )
      .select("id")
      .single();
    return {
      paymentId: data?.id ?? "",
      method: "online",
      status: "pending",
      amountPaise: args.amountPaise,
      provider: gateway.name,
      clientPayload: { orderId: order.orderId, publicKey: order.publicKey },
      gatewayConfigured: true,
      message: "Complete the payment to confirm your booking.",
    };
  }

  // Pay-after-service: a real, verifiable flow. The partner marks collection at
  // completion; nothing claims money has moved before that.
  const { data } = await supabaseAdmin
    .from("payments")
    .upsert(
      {
        booking_id: args.bookingId,
        customer_id: args.customerId,
        provider: "cash",
        amount_paise: args.amountPaise,
        status: "pending",
        idempotency_key: idempotencyKey,
      },
      { onConflict: "idempotency_key" },
    )
    .select("id")
    .single();

  await supabaseAdmin.from("bookings").update({ status: "confirmed" }).eq("id", args.bookingId);
  await supabaseAdmin.from("booking_status_history").insert({
    booking_id: args.bookingId,
    status: "confirmed",
    changed_by: args.customerId,
    actor_role: "customer",
    note: "Confirmed — payment due after service",
  });
  await supabaseAdmin.from("notifications").insert({
    user_id: args.customerId,
    audience: "customer",
    title: "Booking confirmed",
    body: "We'll assign a cleaning professional shortly.",
    kind: "booking",
    booking_id: args.bookingId,
  });

  return {
    paymentId: data?.id ?? "",
    method: "cash_on_completion",
    status: "pending",
    amountPaise: args.amountPaise,
    provider: "cash",
    clientPayload: null,
    gatewayConfigured: false,
    message: "Booking confirmed. Payment is collected after the job is completed.",
  };
}

/**
 * Server-side verification entry point for gateway callbacks/webhooks.
 * Idempotent: a duplicate provider payment id never double-credits a booking.
 */
export async function confirmPaymentFromGateway(payload: Record<string, string>) {
  const gateway = getOnlineGateway();
  if (!gateway) return { ok: false as const, reason: "gateway_not_configured" };

  const valid = await gateway.verifySignature(payload);
  if (!valid) return { ok: false as const, reason: "invalid_signature" };

  const orderId = payload["order_id"];
  const paymentId = payload["payment_id"];
  if (!orderId || !paymentId) return { ok: false as const, reason: "missing_ids" };

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, booking_id, status, customer_id")
    .eq("provider", gateway.name)
    .eq("provider_order_id", orderId)
    .maybeSingle();
  if (!payment) return { ok: false as const, reason: "unknown_order" };
  if (payment.status === "paid") return { ok: true as const, duplicate: true };

  await supabaseAdmin
    .from("payments")
    .update({
      status: "paid",
      provider_payment_id: paymentId,
      verified_at: new Date().toISOString(),
      raw_event: payload as never,
    })
    .eq("id", payment.id);

  await supabaseAdmin
    .from("bookings")
    .update({ status: "payment_verified" })
    .eq("id", payment.booking_id);
  await supabaseAdmin.from("booking_status_history").insert({
    booking_id: payment.booking_id,
    status: "payment_verified",
    note: "Payment verified server-side",
  });
  await supabaseAdmin.from("bookings").update({ status: "confirmed" }).eq("id", payment.booking_id);

  return { ok: true as const, duplicate: false };
}
