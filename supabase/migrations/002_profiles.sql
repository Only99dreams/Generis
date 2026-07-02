create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    email text,
    phone text,
    avatar_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
