/** Money is stored in paise (integer) everywhere. Format only at the edges. */
export function rupees(paise: number): string {
  const value = paise / 100;
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: value % 1 === 0 ? 0 : 2 })}`;
}

export function shortDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function dayLabel(iso: string): { dow: string; day: string } {
  const d = new Date(`${iso}T00:00:00`);
  return {
    dow: d.toLocaleDateString("en-IN", { weekday: "short" }),
    day: d.toLocaleDateString("en-IN", { day: "numeric" }),
  };
}

export function timeLabel(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 ? "am" : "pm";
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

export const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending payment",
  payment_verified: "Payment verified",
  confirmed: "Confirmed",
  partner_assigned: "Partner assigned",
  partner_accepted: "Partner accepted",
  on_the_way: "On the way",
  arrived: "Arrived",
  work_started: "Work started",
  work_completed: "Work completed",
  review_pending: "Review pending",
  completed: "Completed",
  cancelled: "Cancelled",
  refund_initiated: "Refund initiated",
  refund_completed: "Refund completed",
};

export const ACTIVE_STATUSES = [
  "pending_payment",
  "payment_verified",
  "confirmed",
  "partner_assigned",
  "partner_accepted",
  "on_the_way",
  "arrived",
  "work_started",
  "work_completed",
  "review_pending",
] as const;

export const TIME_SLOTS = [
  { start: "09:00", end: "11:00" },
  { start: "11:00", end: "13:00" },
  { start: "13:00", end: "15:00" },
  { start: "15:00", end: "17:00" },
  { start: "17:00", end: "19:00" },
] as const;

export function nextDates(count = 10): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return out;
}
