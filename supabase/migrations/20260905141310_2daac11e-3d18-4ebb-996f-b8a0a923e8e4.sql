DROP POLICY "public read categories" ON public.service_categories;
DROP POLICY "public read services" ON public.services;
DROP POLICY "public read addons" ON public.addons;
DROP POLICY "public read active coupons" ON public.coupons;

CREATE POLICY "anon read categories" ON public.service_categories FOR SELECT TO anon USING (is_active);
CREATE POLICY "auth read categories" ON public.service_categories FOR SELECT TO authenticated USING (is_active OR public.is_admin());
CREATE POLICY "anon read services" ON public.services FOR SELECT TO anon USING (is_active);
CREATE POLICY "auth read services" ON public.services FOR SELECT TO authenticated USING (is_active OR public.is_admin());
CREATE POLICY "anon read addons" ON public.addons FOR SELECT TO anon USING (is_active);
CREATE POLICY "auth read addons" ON public.addons FOR SELECT TO authenticated USING (is_active OR public.is_admin());
CREATE POLICY "anon read coupons" ON public.coupons FOR SELECT TO anon
  USING (is_active AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "auth read coupons" ON public.coupons FOR SELECT TO authenticated
  USING ((is_active AND (expires_at IS NULL OR expires_at > now())) OR public.is_admin());

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;