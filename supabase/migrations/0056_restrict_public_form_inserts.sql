-- 0056_restrict_public_form_inserts.sql
-- Form submissions now insert through the server-only service-role client.
-- Keep staff policies and all read permissions unchanged.

BEGIN;

REVOKE INSERT ON TABLE public.contact_messages
  FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON TABLE public.quotation_requests
  FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON TABLE public.document_download_leads
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS messages_public_insert ON public.contact_messages;
DROP POLICY IF EXISTS rfq_public_insert ON public.quotation_requests;
DROP POLICY IF EXISTS docleads_public_insert ON public.document_download_leads;

COMMIT;

NOTIFY pgrst, 'reload schema';
