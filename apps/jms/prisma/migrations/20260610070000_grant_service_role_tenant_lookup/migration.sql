-- Allow Supabase PostgREST (service_role) to resolve tenant in Edge middleware.
-- Prisma admin uses DATABASE_URL; middleware uses Supabase REST + service_role key.

GRANT SELECT ON "Journal" TO service_role;
GRANT SELECT ON "JournalDomain" TO service_role;
