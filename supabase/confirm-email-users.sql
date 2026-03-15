-- Fix "Email not confirmed": mark all users as confirmed so they can sign in.
-- Run this in Supabase Dashboard → SQL Editor → New query → paste below → Run.
-- Then try signing in again.

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;
