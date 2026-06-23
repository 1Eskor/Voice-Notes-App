-- Add premium flag to profiles table
alter table public.profiles 
add column if not exists is_premium boolean default false;

-- Add plays_count column to notes table
alter table public.notes 
add column if not exists plays_count integer default 0;

-- Create an RPC to safely increment play counts for notes
create or replace function public.increment_plays_count(p_note_id uuid)
returns void as $$
begin
  update public.notes 
  set plays_count = coalesce(plays_count, 0) + 1 
  where id = p_note_id;
end;
$$ language plpgsql security definer;
