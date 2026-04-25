create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  account_name text not null,
  username text,
  email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  platform text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  link_type text not null,
  link_label text,
  link_value text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists playgrounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  idea_id uuid references knowledge_items(id) on delete set null,
  title text not null,
  brief text,
  stage text not null default 'seed' check (stage in ('seed', 'research', 'prototype', 'build', 'paused', 'launched')),
  current_focus text,
  next_actions jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  label text not null,
  kind text not null default 'api_key',
  secret_ciphertext text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists knowledge_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  kind text not null check (kind in ('note', 'idea', 'goal', 'contact', 'business', 'life')),
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  content text not null,
  mood text,
  entry_date date not null default now()::date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  detail text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  storage_key text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists assistant_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  prompt text not null,
  response text not null,
  provider text not null,
  model text not null,
  policy text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_user_id on projects(user_id);
create index if not exists idx_project_links_user_id on project_links(user_id);
create index if not exists idx_project_links_project_id on project_links(project_id);
create index if not exists idx_playgrounds_user_id on playgrounds(user_id);
create index if not exists idx_playgrounds_project_id on playgrounds(project_id);
create index if not exists idx_credentials_user_id on credentials(user_id);
create index if not exists idx_knowledge_items_user_id on knowledge_items(user_id);
create index if not exists idx_knowledge_items_embedding on knowledge_items using ivfflat (embedding vector_cosine_ops);
create index if not exists idx_todos_user_id on todos(user_id);
create index if not exists idx_diary_entries_user_id on diary_entries(user_id);
create index if not exists idx_audit_events_user_id on audit_events(user_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_accounts_updated_at on accounts;
create trigger trg_accounts_updated_at before update on accounts for each row execute function set_updated_at();
drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at before update on users for each row execute function set_updated_at();
drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at before update on projects for each row execute function set_updated_at();
drop trigger if exists trg_playgrounds_updated_at on playgrounds;
create trigger trg_playgrounds_updated_at before update on playgrounds for each row execute function set_updated_at();
drop trigger if exists trg_credentials_updated_at on credentials;
create trigger trg_credentials_updated_at before update on credentials for each row execute function set_updated_at();
drop trigger if exists trg_knowledge_items_updated_at on knowledge_items;
create trigger trg_knowledge_items_updated_at before update on knowledge_items for each row execute function set_updated_at();
drop trigger if exists trg_diary_entries_updated_at on diary_entries;
create trigger trg_diary_entries_updated_at before update on diary_entries for each row execute function set_updated_at();
drop trigger if exists trg_todos_updated_at on todos;
create trigger trg_todos_updated_at before update on todos for each row execute function set_updated_at();
