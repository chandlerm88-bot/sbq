
-- Run AFTER schema.sql. Private parent + Noah only.
create table if not exists public.answer_events (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 question_id text,question_text text not null,correct boolean not null,
 category text not null,difficulty text,source text,mode text,
 answered_at timestamptz not null default now()
);
create index if not exists answer_events_user_time on public.answer_events(user_id,answered_at desc);
create table if not exists public.play_sessions (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 seconds int not null check(seconds between 1 and 60),
 recorded_at timestamptz not null default now()
);
create index if not exists play_sessions_user_time on public.play_sessions(user_id,recorded_at desc);
alter table public.answer_events enable row level security;
alter table public.play_sessions enable row level security;
drop policy if exists "student inserts own answers" on public.answer_events;
create policy "student inserts own answers" on public.answer_events for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "admin reads answers" on public.answer_events;
create policy "admin reads answers" on public.answer_events for select to authenticated using(public.is_quest_admin());
drop policy if exists "student inserts own playtime" on public.play_sessions;
create policy "student inserts own playtime" on public.play_sessions for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "admin reads playtime" on public.play_sessions;
create policy "admin reads playtime" on public.play_sessions for select to authenticated using(public.is_quest_admin());
-- Allow admin to see Noah's save for wallet / creature progress.
drop policy if exists "admin reads player saves" on public.player_saves;
create policy "admin reads player saves" on public.player_saves for select to authenticated using(public.is_quest_admin());
-- Keep question editing admin-only through the existing policies.
-- Only administrators can list player IDs and display names.
create or replace function public.quest_players()
returns table(user_id uuid, username text)
language sql stable security definer set search_path = '' as $$
 select u.id,coalesce(u.raw_user_meta_data->>'username','Player') as username
 from auth.users u
 where public.is_quest_admin() = true
 order by username;
$$;
revoke all on function public.quest_players() from public;
grant execute on function public.quest_players() to authenticated;
