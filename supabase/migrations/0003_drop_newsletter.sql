-- Newsletter feature was removed (orphan API route + dead client code).
-- Dropping the table also drops its RLS policies.
drop table if exists public.newsletter_subscribers;
