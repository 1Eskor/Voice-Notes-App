-- 1. Create listen_logs table
create table if not exists public.listen_logs (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references public.profiles(id) on delete cascade not null,
  note_id          uuid references public.notes(id) on delete cascade not null,
  seconds_listened integer not null,
  created_at       timestamp with time zone default now()
);

alter table public.listen_logs enable row level security;

drop policy if exists "Anyone can read listen logs" on public.listen_logs;
create policy "Anyone can read listen logs"
  on public.listen_logs for select using (true);

drop policy if exists "Users can log own listens" on public.listen_logs;
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

drop policy if exists "Reposts are publicly readable" on public.reposts;
create policy "Reposts are publicly readable"
  on public.reposts for select using (true);

drop policy if exists "Users can repost" on public.reposts;
create policy "Users can repost"
  on public.reposts for insert with check (auth.uid() = user_id);

drop policy if exists "Users can remove repost" on public.reposts;
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


-- 5. Create notifications table
create table if not exists public.notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  actor_id   uuid references public.profiles(id) on delete cascade not null,
  type       text not null check (type in ('like', 'comment', 'follow')),
  note_id    uuid references public.notes(id) on delete cascade,
  is_read    boolean default false not null,
  created_at timestamp with time zone default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update using (auth.uid() = user_id);


-- 6. Trigger functions for notifications
create or replace function public.handle_like_notification()
returns trigger as $$
declare
  v_note_author uuid;
begin
  select user_id into v_note_author from public.notes where id = new.note_id;
  
  if v_note_author is not null and v_note_author != new.user_id then
    insert into public.notifications (user_id, actor_id, type, note_id)
    values (v_note_author, new.user_id, 'like', new.note_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_like_created on public.likes;
create trigger on_like_created
  after insert on public.likes
  for each row execute procedure public.handle_like_notification();


create or replace function public.handle_unlike_notification_cleanup()
returns trigger as $$
declare
  v_note_author uuid;
begin
  select user_id into v_note_author from public.notes where id = old.note_id;
  
  if v_note_author is not null then
    delete from public.notifications 
    where user_id = v_note_author
      and actor_id = old.user_id
      and type = 'like'
      and note_id = old.note_id;
  end if;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_like_deleted on public.likes;
create trigger on_like_deleted
  after delete on public.likes
  for each row execute procedure public.handle_unlike_notification_cleanup();


create or replace function public.handle_comment_notification()
returns trigger as $$
declare
  v_note_author uuid;
begin
  select user_id into v_note_author from public.notes where id = new.note_id;
  
  if v_note_author is not null and v_note_author != new.user_id then
    insert into public.notifications (user_id, actor_id, type, note_id)
    values (v_note_author, new.user_id, 'comment', new.note_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created
  after insert on public.comments
  for each row execute procedure public.handle_comment_notification();


create or replace function public.handle_follow_notification()
returns trigger as $$
begin
  if new.follower_id != new.following_id then
    insert into public.notifications (user_id, actor_id, type)
    values (new.following_id, new.follower_id, 'follow');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_follow_created on public.follows;
create trigger on_follow_created
  after insert on public.follows
  for each row execute procedure public.handle_follow_notification();


create or replace function public.handle_unfollow_notification_cleanup()
returns trigger as $$
begin
  delete from public.notifications 
  where user_id = old.following_id
    and actor_id = old.follower_id
    and type = 'follow';
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_follow_deleted on public.follows;
create trigger on_follow_deleted
  after delete on public.follows
  for each row execute procedure public.handle_unfollow_notification_cleanup();


-- 7. Add tables to Supabase Realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;

    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'likes'
    ) then
      alter publication supabase_realtime add table public.likes;
    end if;

    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
    ) then
      alter publication supabase_realtime add table public.comments;
    end if;

    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notes'
    ) then
      alter publication supabase_realtime add table public.notes;
    end if;
  end if;
end;
$$;


-- 8. Add parent_id column to comments table
alter table public.comments 
add column if not exists parent_id uuid references public.comments(id) on delete cascade;

-- 9. Add tagging_preference column to profiles table
alter table public.profiles 
add column if not exists tagging_preference text default 'everyone' 
check (tagging_preference in ('everyone', 'following', 'following_me', 'none'));

-- 10. Create comment_likes table
create table if not exists public.comment_likes (
  user_id    uuid references public.profiles(id) on delete cascade not null,
  comment_id uuid references public.comments(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  primary key (user_id, comment_id)
);

alter table public.comment_likes enable row level security;

drop policy if exists "Comment likes are publicly readable" on public.comment_likes;
create policy "Comment likes are publicly readable"
  on public.comment_likes for select using (true);

drop policy if exists "Users can like comments" on public.comment_likes;
create policy "Users can like comments"
  on public.comment_likes for insert with check (auth.uid() = user_id);

drop policy if exists "Users can remove comment likes" on public.comment_likes;
create policy "Users can remove comment likes"
  on public.comment_likes for delete using (auth.uid() = user_id);

-- 11. Recreate notifications type constraint to support 'tag'
alter table public.notifications 
drop constraint if exists notifications_type_check;

alter table public.notifications 
add constraint notifications_type_check 
check (type in ('like', 'comment', 'follow', 'tag'));

-- 12. Create trigger function to process comment @tags
create or replace function public.process_comment_tags()
returns trigger as $$
declare
  r_match record;
  v_tagged_user_id uuid;
  v_pref text;
  v_allowed boolean;
begin
  for r_match in 
    select distinct (regexp_matches(new.content, '@([a-zA-Z0-9_]+)', 'g'))[1] as username
  loop
    select id, coalesce(tagging_preference, 'everyone') into v_tagged_user_id, v_pref 
    from public.profiles 
    where username = r_match.username;

    if v_tagged_user_id is not null and v_tagged_user_id != new.user_id then
      v_allowed := false;

      if v_pref = 'everyone' then
        v_allowed := true;
      elsif v_pref = 'none' then
        v_allowed := false;
      elsif v_pref = 'following' then
        select exists(
          select 1 from public.follows 
          where follower_id = v_tagged_user_id and following_id = new.user_id
        ) into v_allowed;
      elsif v_pref = 'following_me' then
        select exists(
          select 1 from public.follows 
          where (follower_id = v_tagged_user_id and following_id = new.user_id)
             or (follower_id = new.user_id and following_id = v_tagged_user_id)
        ) into v_allowed;
      end if;

      if v_allowed then
        insert into public.notifications (user_id, actor_id, type, note_id)
        values (v_tagged_user_id, new.user_id, 'tag', new.note_id);
      end if;
    end if;
  end loop;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_tagged on public.comments;
create trigger on_comment_tagged
  after insert on public.comments
  for each row execute procedure public.process_comment_tags();

-- 13. Add comment_likes to Supabase Realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comment_likes'
    ) then
      alter publication supabase_realtime add table public.comment_likes;
    end if;
  end if;
end;
$$;
