-- Recurring cleaning plans -------------------------------------------------
CREATE TYPE public.subscription_frequency AS ENUM ('weekly', 'biweekly', 'monthly');
CREATE TYPE public.subscription_state AS ENUM ('active', 'paused', 'cancelled');

CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  category_slug TEXT,
  title TEXT NOT NULL,
  frequency public.subscription_frequency NOT NULL,
  slot_start TIME NOT NULL,
  slot_end TIME NOT NULL,
  next_run_date DATE NOT NULL,
  lines JSONB NOT NULL,
  estimated_total_paise INTEGER NOT NULL DEFAULT 0,
  state public.subscription_state NOT NULL DEFAULT 'active',
  last_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers manage their own plans" ON public.subscriptions
  FOR ALL TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins view all plans" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX subscriptions_due_idx ON public.subscriptions (state, next_run_date);

-- Customer <-> partner chat -----------------------------------------------
CREATE TABLE public.booking_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role public.app_role NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.booking_messages TO authenticated;
GRANT ALL ON public.booking_messages TO service_role;
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Booking participants read messages" ON public.booking_messages
  FOR SELECT TO authenticated USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid())
    )
  );
CREATE POLICY "Booking participants send messages" ON public.booking_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid())
    )
  );
CREATE INDEX booking_messages_booking_idx ON public.booking_messages (booking_id, created_at);

-- Live tracking fields on bookings ----------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN partner_eta_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN partner_note TEXT,
  ADD COLUMN subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL;

-- Push notification device tokens -----------------------------------------
CREATE TABLE public.push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own devices" ON public.push_tokens
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Live updates -------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.booking_messages REPLICA IDENTITY FULL;