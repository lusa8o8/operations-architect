-- Profiles table to store user metadata
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamp with time zone default now()
);

-- Projects table
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  industry text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table projects enable row level security;

-- Profiles Policies
create policy "Users can view their own profile"
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Projects Policies
create policy "Users can access their own projects"
  on projects for all
  using ( auth.uid() = user_id );

-- Handle new user profile creation
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
