-- 0058_restrict_whatsapp_leads_public_insert.sql
-- WhatsApp click tracking has no application writer. Keep historical rows and staff reads.

BEGIN;

REVOKE INSERT ON TABLE public.whatsapp_leads
  FROM PUBLIC, anon, authenticated;

GRANT INSERT ON TABLE public.whatsapp_leads TO service_role;

DROP POLICY IF EXISTS leads_public_insert ON public.whatsapp_leads;

COMMIT;

NOTIFY pgrst, 'reload schema';
