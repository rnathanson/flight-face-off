-- Clean up orphaned function from deleted partnership tables
DROP FUNCTION IF EXISTS public.update_partnership_updated_at() CASCADE;