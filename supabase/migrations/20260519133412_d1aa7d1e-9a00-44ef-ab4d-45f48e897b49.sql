
CREATE POLICY "Deny client access to whm_quota_checks"
ON public.whm_quota_checks
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny client access to zoho_customers"
ON public.zoho_customers
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny client access to zoho_invoices"
ON public.zoho_invoices
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
