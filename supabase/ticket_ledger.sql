-- Run AFTER schema.sql and private_dashboard.sql.
-- Server-authoritative Play Ticket ledger: the browser can no longer mint or spend
-- tickets on its own. Tickets are EARNED from answer_events (1 per 10 correct answers,
-- with an anti-spam spacing filter) and SPENT only through quest_spend_ticket().

create table if not exists public.ticket_spends (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game text,
  spent_at timestamptz not null default now()
);
create index if not exists ticket_spends_user_time on public.ticket_spends(user_id, spent_at desc);

-- Parent escape hatch: grant (positive) or remove (negative) tickets manually,
-- e.g. to honor tickets earned before this ledger went live:
--   insert into public.ticket_adjustments(user_id, amount, note)
--   select id, 5, 'carryover from pre-ledger progress' from auth.users
--   where email = 'NOAH_USERNAME@players.scholarsbowl.invalid';
create table if not exists public.ticket_adjustments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.ticket_spends enable row level security;
alter table public.ticket_adjustments enable row level security;

-- Students may READ their own ledger rows; nobody may INSERT/UPDATE/DELETE spends
-- directly (no policy = denied) — spends happen only via the definer function below.
create policy "own spends read" on public.ticket_spends
  for select to authenticated using (user_id = auth.uid() or public.is_quest_admin());
create policy "own adjustments read" on public.ticket_adjustments
  for select to authenticated using (user_id = auth.uid() or public.is_quest_admin());
create policy "admin writes adjustments" on public.ticket_adjustments
  for insert to authenticated with check (public.is_quest_admin());

-- Earned tickets = floor(valid correct answers / 10).
-- "Valid" = correct answers at least 4 seconds apart, so a console script spamming
-- fake answer_events earns nothing quickly, and any attempt is visible on the
-- parent dashboard as a wall of suspicious entries.
create or replace function public.quest_ticket_balance()
returns table(earned int, spent int, adjusted int, balance int)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select answered_at, correct,
           lag(answered_at) over (order by answered_at) as prev
    from public.answer_events
    where user_id = auth.uid()
  ),
  valid as (
    select count(*)::int as c from mine
    where correct and (prev is null or answered_at - prev >= interval '4 seconds')
  ),
  sp  as (select count(*)::int as c from public.ticket_spends where user_id = auth.uid()),
  adj as (select coalesce(sum(amount),0)::int as c from public.ticket_adjustments where user_id = auth.uid())
  select (valid.c / 10), sp.c, adj.c,
         greatest(0, (valid.c / 10) - sp.c + adj.c)
  from valid, sp, adj;
$$;
revoke all on function public.quest_ticket_balance() from public;
grant execute on function public.quest_ticket_balance() to authenticated;

-- Atomically spend one ticket. Returns {"ok": bool, "balance": int}.
create or replace function public.quest_spend_ticket(game text)
returns json
language plpgsql security definer set search_path = '' as $$
declare bal int;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'balance', 0, 'error', 'not signed in');
  end if;
  select b.balance into bal from public.quest_ticket_balance() b;
  if coalesce(bal,0) < 1 then
    return json_build_object('ok', false, 'balance', coalesce(bal,0));
  end if;
  insert into public.ticket_spends(user_id, game)
  values (auth.uid(), left(coalesce(game,'arcade'), 40));
  return json_build_object('ok', true, 'balance', bal - 1);
end;
$$;
revoke all on function public.quest_spend_ticket(text) from public;
grant execute on function public.quest_spend_ticket(text) to authenticated;
