-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('customer','partner','admin');
CREATE TYPE public.account_status AS ENUM ('active','suspended','deleted');
CREATE TYPE public.booking_status AS ENUM (
  'pending_payment','payment_verified','confirmed','partner_assigned','partner_accepted',
  'on_the_way','arrived','work_started','work_completed','review_pending','completed',
  'cancelled','refund_initiated','refund_completed'
);
CREATE TYPE public.payment_status AS ENUM ('created','pending','paid','failed','refunded','partially_refunded');
CREATE TYPE public.kyc_status AS ENUM ('not_submitted','pending','approved','rejected');
CREATE TYPE public.withdrawal_status AS ENUM ('requested','approved','rejected','paid');
CREATE TYPE public.refund_status AS ENUM ('requested','approved','rejected','processing','completed');
CREATE TYPE public.job_photo_kind AS ENUM ('before','after');

-- ============ SHARED HELPERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES / ROLES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mobile text UNIQUE NOT NULL,
  full_name text,
  email text,
  avatar_url text,
  status public.account_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE POLICY "own or admin profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ============ AUTH CREDENTIALS / OTP / RATE LIMITS (server-only) ============
CREATE TABLE public.auth_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  pin_salt text NOT NULL,
  pin_algo text NOT NULL DEFAULT 'pbkdf2-sha256-210000',
  pin_set_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.auth_credentials TO service_role;
ALTER TABLE public.auth_credentials ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.otp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile text NOT NULL,
  purpose text NOT NULL DEFAULT 'login',
  code_hash text NOT NULL,
  code_salt text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otp_requests_mobile_idx ON public.otp_requests (mobile, created_at DESC);
GRANT ALL ON public.otp_requests TO service_role;
ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  kind text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_attempts_idx ON public.auth_attempts (identifier, kind, created_at DESC);
GRANT ALL ON public.auth_attempts TO service_role;
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- ============ CATALOG ============
CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  tagline text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_categories TO anon, authenticated;
GRANT ALL ON public.service_categories TO service_role;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.service_categories FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin());
CREATE POLICY "admin write categories" ON public.service_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  includes text[] NOT NULL DEFAULT '{}',
  price_paise int NOT NULL,
  duration_minutes int,
  max_quantity int NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "public read services" ON public.services FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin());
CREATE POLICY "admin write services" ON public.services FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.service_categories(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_paise int NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.addons TO anon, authenticated;
GRANT ALL ON public.addons TO service_role;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read addons" ON public.addons FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin());
CREATE POLICY "admin write addons" ON public.addons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ ADDRESSES ============
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  house_no text NOT NULL,
  building text,
  street text,
  landmark text,
  area text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX addresses_user_idx ON public.addresses (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER addresses_updated BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid());

-- ============ PARTNER ============
CREATE TABLE public.partner_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  city text,
  skills text[] NOT NULL DEFAULT '{}',
  is_available boolean NOT NULL DEFAULT true,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  jobs_completed int NOT NULL DEFAULT 0,
  commission_percent numeric(5,2) NOT NULL DEFAULT 10,
  kyc_state public.kyc_status NOT NULL DEFAULT 'not_submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.partner_profiles TO authenticated;
GRANT ALL ON public.partner_profiles TO service_role;
ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER partner_profiles_updated BEFORE UPDATE ON public.partner_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "partner own profile read" ON public.partner_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "partner own profile update" ON public.partner_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.partner_kyc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  doc_number_masked text,
  file_path text,
  state public.kyc_status NOT NULL DEFAULT 'pending',
  reviewer_id uuid,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX partner_kyc_partner_idx ON public.partner_kyc (partner_id);
GRANT SELECT, INSERT ON public.partner_kyc TO authenticated;
GRANT ALL ON public.partner_kyc TO service_role;
ALTER TABLE public.partner_kyc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner own kyc read" ON public.partner_kyc FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR public.is_admin());
CREATE POLICY "partner own kyc insert" ON public.partner_kyc FOR INSERT TO authenticated
  WITH CHECK (partner_id = auth.uid());

-- ============ COUPONS ============
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric(10,2) NOT NULL,
  max_discount_paise int,
  min_order_paise int NOT NULL DEFAULT 0,
  usage_limit int,
  per_user_limit int NOT NULL DEFAULT 1,
  used_count int NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active coupons" ON public.coupons FOR SELECT TO anon, authenticated
  USING ((is_active AND (expires_at IS NULL OR expires_at > now())) OR public.is_admin());
CREATE POLICY "admin write coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ BOOKINGS ============
CREATE SEQUENCE public.booking_number_seq START 1001;
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text NOT NULL UNIQUE DEFAULT ('SQK-' || nextval('public.booking_number_seq')::text),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  address_id uuid REFERENCES public.addresses(id) ON DELETE SET NULL,
  address_snapshot jsonb,
  category_slug text,
  status public.booking_status NOT NULL DEFAULT 'pending_payment',
  scheduled_date date NOT NULL,
  slot_start time NOT NULL,
  slot_end time NOT NULL,
  special_instructions text,
  subtotal_paise int NOT NULL DEFAULT 0,
  addons_paise int NOT NULL DEFAULT 0,
  discount_paise int NOT NULL DEFAULT 0,
  total_paise int NOT NULL DEFAULT 0,
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  cancel_reason text,
  cancelled_at timestamptz,
  rescheduled_from jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bookings_customer_idx ON public.bookings (customer_id, created_at DESC);
CREATE INDEX bookings_partner_idx ON public.bookings (partner_id, scheduled_date);
CREATE INDEX bookings_status_idx ON public.bookings (status);
GRANT SELECT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "booking read own" ON public.bookings FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR partner_id = auth.uid() OR public.is_admin());

CREATE TABLE public.booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  addon_id uuid REFERENCES public.addons(id) ON DELETE SET NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'service',
  unit_price_paise int NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  line_total_paise int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX booking_items_booking_idx ON public.booking_items (booking_id);
GRANT SELECT ON public.booking_items TO authenticated;
GRANT ALL ON public.booking_items TO service_role;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking items read own" ON public.booking_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
    AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid() OR public.is_admin())));

CREATE TABLE public.booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status public.booking_status NOT NULL,
  changed_by uuid,
  actor_role public.app_role,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bsh_booking_idx ON public.booking_status_history (booking_id, created_at);
GRANT SELECT ON public.booking_status_history TO authenticated;
GRANT ALL ON public.booking_status_history TO service_role;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status history read own" ON public.booking_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
    AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid() OR public.is_admin())));

CREATE TABLE public.job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.job_photo_kind NOT NULL,
  file_path text NOT NULL,
  width int, height int, bytes int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_photos_booking_idx ON public.job_photos (booking_id);
GRANT SELECT, INSERT ON public.job_photos TO authenticated;
GRANT ALL ON public.job_photos TO service_role;
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job photos read own" ON public.job_photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
    AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid() OR public.is_admin())));
CREATE POLICY "partner insert job photos" ON public.job_photos FOR INSERT TO authenticated
  WITH CHECK (partner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.partner_id = auth.uid()));

-- ============ PAYMENTS / REFUNDS ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'unconfigured',
  provider_order_id text,
  provider_payment_id text,
  idempotency_key text UNIQUE,
  amount_paise int NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status public.payment_status NOT NULL DEFAULT 'created',
  verified_at timestamptz,
  failure_reason text,
  raw_event jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_provider_payment_uniq ON public.payments (provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX payments_customer_idx ON public.payments (customer_id, created_at DESC);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "payments read own" ON public.payments FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin());

CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_paise int NOT NULL,
  reason text,
  state public.refund_status NOT NULL DEFAULT 'requested',
  provider_refund_id text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER refunds_updated BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "refunds read own" ON public.refunds FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin());

CREATE TABLE public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  discount_paise int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupon_usage TO authenticated;
GRANT ALL ON public.coupon_usage TO service_role;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupon usage read own" ON public.coupon_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ============ EARNINGS / WITHDRAWALS ============
CREATE TABLE public.partner_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_slug text,
  percent numeric(5,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_commissions TO authenticated;
GRANT ALL ON public.partner_commissions TO service_role;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commissions read" ON public.partner_commissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "commissions admin write" ON public.partner_commissions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.partner_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  gross_paise int NOT NULL,
  commission_paise int NOT NULL,
  net_paise int NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  available_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX partner_earnings_idx ON public.partner_earnings (partner_id, created_at DESC);
GRANT SELECT ON public.partner_earnings TO authenticated;
GRANT ALL ON public.partner_earnings TO service_role;
ALTER TABLE public.partner_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "earnings read own" ON public.partner_earnings FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR public.is_admin());

CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_paise int NOT NULL,
  state public.withdrawal_status NOT NULL DEFAULT 'requested',
  note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER withdrawals_updated BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "withdrawals read own" ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR public.is_admin());

CREATE TABLE public.payout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  withdrawal_id uuid REFERENCES public.withdrawal_requests(id) ON DELETE SET NULL,
  amount_paise int NOT NULL,
  provider text NOT NULL DEFAULT 'unconfigured',
  provider_payout_id text,
  state text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payout_history TO authenticated;
GRANT ALL ON public.payout_history TO service_role;
ALTER TABLE public.payout_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts read own" ON public.payout_history FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR public.is_admin());

-- ============ ENGAGEMENT ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience public.app_role,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'general',
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "notifications mark read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating int NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews read" ON public.reviews FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR partner_id = auth.uid() OR public.is_admin());

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  subject text NOT NULL,
  message text NOT NULL,
  state text NOT NULL DEFAULT 'open',
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tickets_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "tickets read own" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_role public.app_role,
  action text NOT NULL,
  entity text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============ SEED CATALOG (exact prices) ============
INSERT INTO public.service_categories (slug, name, tagline, icon, sort_order) VALUES
 ('bathroom','Bathroom','Deep scrub, descale, shine','sparkle',1),
 ('kitchen','Kitchen','Degrease cabinets and trolleys','diamond',2),
 ('flat','Flat','Full-home deep cleaning','home',3),
 ('other','Other','Balconies, fans, glass and more','plus',4);

INSERT INTO public.services (category_id, slug, name, description, includes, price_paise, duration_minutes, sort_order)
SELECT c.id, v.slug, v.name, v.description, v.includes, v.price_paise, v.mins, v.sort_order
FROM (VALUES
 ('bathroom','bathroom-intense-1','Bathroom Intense (1)','1 bathroom · 1 cleaner · 45 min', ARRAY['Floor and wall scrub','Toilet deep clean','Fittings polish','Mirror wipe'], 45000, 45, 1),
 ('bathroom','bathroom-intense-2','Bathroom Intense (2)','Up to 2 bathrooms · 60 min', ARRAY['Everything in Intense (1)','Covers 2 bathrooms'], 85000, 60, 2),
 ('bathroom','bathroom-intense-3','Bathroom Intense (3)','3 bathrooms · deep descale · 90 min', ARRAY['Everything in Intense (1)','Covers 3 bathrooms','Extra descaling pass'], 125000, 90, 3),
 ('bathroom','move-in-cleaning-1','Move In Cleaning (1)','1 bathroom · move-in grade', ARRAY['Sanitised top to bottom','Drain clean-out','Grout brushing'], 55000, 60, 4),
 ('bathroom','move-in-cleaning-2','Move In Cleaning (2)','2 bathrooms · move-in grade', ARRAY['Everything in Move In (1)','Covers 2 bathrooms'], 95000, 90, 5),
 ('bathroom','move-in-cleaning-3','Move In Cleaning (3)','3 bathrooms · move-in grade', ARRAY['Everything in Move In (1)','Covers 3 bathrooms'], 135000, 120, 6),
 ('bathroom','hard-water-cleaning-1','Hard Water Cleaning (1)','1 bathroom · heavy scaling', ARRAY['Chemical descaling','Tap and shower de-scale','Tile stain treatment'], 70000, 75, 7),
 ('bathroom','hard-water-cleaning-2','Hard Water Cleaning (2)','2 bathrooms · heavy scaling', ARRAY['Everything in Hard Water (1)','Covers 2 bathrooms'], 125000, 120, 8),
 ('bathroom','hard-water-cleaning-3','Hard Water Cleaning (3)','3 bathrooms · heavy scaling', ARRAY['Everything in Hard Water (1)','Covers 3 bathrooms'], 150000, 150, 9),
 ('bathroom','glass-cleaning','Glass Cleaning','Spots gone · streak-free · 20 min', ARRAY['Shower glass','Mirrors','Frames wipe'], 20000, 20, 10),
 ('kitchen','kitchen-base','Kitchen Base','Full kitchen degrease', ARRAY['Countertops and sink','Stove and backsplash','Floor scrub','Outer cabinet wipe'], 130000, 150, 1),
 ('kitchen','upper-cabinet','Upper Cabinet','Inside upper cabinets', ARRAY['Empty, wipe, reline','Grease removal'], 20000, 30, 2),
 ('kitchen','trolley','Trolley','Inside trolleys and drawers', ARRAY['Pull-out cleaning','Rail degrease'], 30000, 40, 3),
 ('flat','1bhk-flat-cleaning','1BHK Flat Cleaning','Whole 1BHK deep clean', ARRAY['1 bedroom, hall, kitchen','1 bathroom','Floors, fans, switches','Balcony sweep'], 350000, 300, 1),
 ('flat','2bhk-flat-cleaning','2BHK Flat Cleaning','Whole 2BHK deep clean', ARRAY['2 bedrooms, hall, kitchen','Up to 2 bathrooms','Floors, fans, switches','Balcony sweep'], 500000, 420, 2),
 ('flat','3bhk-flat-cleaning','3BHK Flat Cleaning','Whole 3BHK deep clean', ARRAY['3 bedrooms, hall, kitchen','Up to 3 bathrooms','Floors, fans, switches','Balcony sweep'], 700000, 540, 3),
 ('flat','4bhk-flat-cleaning','4BHK Flat Cleaning','Whole 4BHK deep clean', ARRAY['4 bedrooms, hall, kitchen','Up to 4 bathrooms','Floors, fans, switches','Balcony sweep'], 920000, 660, 4),
 ('other','balcony-small','Balcony Small','Up to 40 sq ft', ARRAY['Floor scrub','Railing wipe'], 50000, 40, 1),
 ('other','balcony-big','Balcony Big','Above 40 sq ft', ARRAY['Floor scrub','Railing and grill wipe'], 70000, 60, 2),
 ('other','fan-cleaning','Fan Cleaning','Per ceiling fan', ARRAY['Blade degrease','Motor housing wipe'], 6500, 10, 3),
 ('other','bathroom-exhaust','Bathroom Exhaust','Per exhaust fan', ARRAY['Dust and grease removal'], 7000, 15, 4),
 ('other','kitchen-exhaust','Kitchen Exhaust','Per exhaust fan', ARRAY['Heavy grease removal','Mesh clean'], 9000, 20, 5),
 ('other','windows','Windows','Per window set', ARRAY['Glass both sides','Frame and track'], 30000, 30, 6),
 ('other','glass-doors','Glass Doors','Per glass door', ARRAY['Both sides','Handles and track'], 45000, 35, 7)
) AS v(cat, slug, name, description, includes, price_paise, mins, sort_order)
JOIN public.service_categories c ON c.slug = v.cat;

INSERT INTO public.addons (category_id, slug, name, description, price_paise, sort_order)
SELECT c.id, v.slug, v.name, v.description, v.price_paise, v.sort_order
FROM (VALUES
 ('bathroom','sanitising-spray','Sanitising spray','Hospital-grade final spray',15000,1),
 ('bathroom','towel-set-wash','Towel set wash','Wash and dry your towel set',25000,2),
 ('kitchen','fridge-inside','Fridge inside','Shelves out, wipe, deodorise',35000,1),
 ('kitchen','chimney-filter','Chimney filter','Filter degrease and rinse',30000,2),
 ('flat','sofa-shampoo','Sofa shampoo','Per 3-seater wet shampoo',90000,1),
 ('flat','mattress-vacuum','Mattress vacuum','Per mattress deep vacuum',60000,2),
 ('other','pet-safe-products','Pet-safe products','Non-toxic product swap',10000,1)
) AS v(cat, slug, name, description, price_paise, sort_order)
JOIN public.service_categories c ON c.slug = v.cat;

INSERT INTO public.partner_commissions (name, category_slug, percent) VALUES
 ('Standard platform commission', NULL, 10),
 ('Flat deep-clean commission', 'flat', 12);

INSERT INTO public.coupons (code, title, description, discount_type, discount_value, max_discount_paise, min_order_paise, per_user_limit, expires_at) VALUES
 ('SQUEAK20','20% off your first clean','Applies to any category, capped at ₹300.','percent',20,30000,50000,1, now() + interval '90 days'),
 ('FLAT100','₹100 off','Flat ₹100 off orders above ₹700.','fixed',100,10000,70000,3, now() + interval '60 days');
