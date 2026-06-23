-- 1. Create listen_logs table
create table if not exists public.listen_logs (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references public.profiles(id) on delete cascade not null,
  note_id          uuid references public.notes(id) on delete cascade not null,
  seconds_listened integer not null,
  created_at       timestamp with time zone default now()
);

alter table public.listen_logs enable row level security;

create policy "Anyone can read listen logs"
  on public.listen_logs for select using (true);

create policy "Users can log own listens"
  on public.listen_logs for insert with check (auth.uid() = user_id);


-- 2. Create reposts table
create table if not exists public.reposts (
  user_id    uuid references public.profiles(id) on delete cascade not null,
  note_id    uuid references public.notes(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  primary key (user_id, note_id)
);

alter table public.reposts enable row level security;

create policy "Reposts are publicly readable"
  on public.reposts for select using (true);

create policy "Users can repost"
  on public.reposts for insert with check (auth.uid() = user_id);

create policy "Users can remove repost"
  on public.reposts for delete using (auth.uid() = user_id);


-- 3. Add bio text column to profiles table
alter table public.profiles 
add column if not exists bio text;


-- 4. Create the view for Discovery scoring algorithm
create or replace view public.notes_with_score as
select 
  n.*,
  coalesce(
    (
      (n.likes_count * 5) + 
      ((select count(*)::integer from public.reposts r where r.note_id = n.id) * 10) +
      coalesce(
        (
          select 
            avg(least(1.0, l.seconds_listened::float / nullif(n.duration_seconds, 0))) * count(*)
          from public.listen_logs l 
          where l.note_id = n.id
        ),
        0.0
      )
    ),
    0.0
  )::float as note_score
from public.notes n;
