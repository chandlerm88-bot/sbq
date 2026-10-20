-- Run once in Supabase SQL Editor.
create table if not exists public.admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.player_saves (
 user_id uuid primary key references auth.users(id) on delete cascade,
 save_data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists public.question_packs (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 questions jsonb not null default '[]'::jsonb,
 published boolean not null default false,
 updated_at timestamptz not null default now()
);
create index if not exists question_packs_published_idx on public.question_packs(published);
create or replace function public.is_quest_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admins where user_id=auth.uid());
$$;
revoke all on function public.is_quest_admin() from public;
grant execute on function public.is_quest_admin() to authenticated;
alter table public.admins enable row level security;
alter table public.player_saves enable row level security;
alter table public.question_packs enable row level security;
create policy "admins read own role" on public.admins for select to authenticated using (user_id=auth.uid());
create policy "players read own save" on public.player_saves for select to authenticated using (user_id=auth.uid());
create policy "players create own save" on public.player_saves for insert to authenticated with check (user_id=auth.uid());
create policy "players update own save" on public.player_saves for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "players read published packs" on public.question_packs for select to authenticated using (published=true or public.is_quest_admin());
create policy "admins insert packs" on public.question_packs for insert to authenticated with check (public.is_quest_admin());
create policy "admins update packs" on public.question_packs for update to authenticated using (public.is_quest_admin()) with check (public.is_quest_admin());
create policy "admins delete packs" on public.question_packs for delete to authenticated using (public.is_quest_admin());
-- After signing up your admin account, manually promote it in SQL Editor:
-- insert into public.admins(user_id) select id from auth.users where email='YOUR_ADMIN_USERNAME@players.scholarsbowl.invalid';
