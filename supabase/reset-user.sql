-- Reset all users: delete all session data. Run in Supabase SQL Editor.

delete from public.session_log;
delete from public.match_history;
delete from public.user_killers;
delete from public.user_settings;
delete from public.user_state;
