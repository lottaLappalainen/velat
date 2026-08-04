-- Fixes signup failing with "Database error saving new user" (500 from
-- POST /auth/v1/signup).
--
-- Root cause: handle_new_user() (20260804120000_initial_schema.sql) is
-- `security definer` but references `profiles` unqualified with no explicit
-- `search_path`. It then runs under the *caller's* search_path — Supabase's
-- internal supabase_auth_admin role, whose search_path doesn't include
-- `public` — so the insert fails with "relation \"profiles\" does not
-- exist" inside the trigger, and the whole signup transaction rolls back.
--
-- Fix (Supabase's own documented pattern for this trigger): pin
-- search_path to '' and fully qualify the table as public.profiles.
-- CREATE OR REPLACE keeps the function's OID, so the existing
-- on_auth_user_created trigger keeps working without being recreated.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;
