-- EXTENSIONS
create extension if not exists "uuid-ossp";

-- ORGANIZATIONS (comptes clients Vocalab)
create table organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  plan text default 'starter' check (plan in ('starter', 'growth', 'scale')),
  stripe_customer_id text,
  stripe_subscription_id text,
  minutes_included integer default 300,
  minutes_used integer default 0,
  agents_limit integer default 1,
  leads_limit integer default 500,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- USERS (membres d'une organization)
create table users (
  id uuid references auth.users primary key,
  organization_id uuid references organizations(id) on delete cascade,
  email text not null,
  full_name text,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AGENTS (agents vocaux configurés)
create table agents (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  type text default 'outbound' check (type in ('inbound', 'outbound')),
  status text default 'inactive' check (status in ('active', 'inactive', 'paused')),
  vapi_agent_id text,
  voice_id text,
  language text default 'fr',
  system_prompt text,
  first_message text,
  industry text,
  objective text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LEADS (prospects scrapés)
create table leads (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  company_name text,
  contact_name text,
  phone text,
  email text,
  website text,
  industry text,
  city text,
  country text default 'FR',
  employees_count text,
  source text default 'apify',
  status text default 'pending' check (status in (
    'pending', 'calling', 'called', 'interested', 
    'not_interested', 'callback', 'converted'
  )),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CAMPAIGNS (campagnes d'appels)
create table campaigns (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  name text not null,
  status text default 'draft' check (status in (
    'draft', 'active', 'paused', 'completed'
  )),
  target_industry text,
  target_city text,
  target_country text default 'FR',
  leads_total integer default 0,
  leads_called integer default 0,
  leads_interested integer default 0,
  leads_converted integer default 0,
  price_per_rdv integer default 120,
  rdv_validated integer default 0,
  revenue_generated integer default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CALLS (historique des appels)
create table calls (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  agent_id uuid references agents(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  vapi_call_id text unique,
  status text check (status in (
    'queued', 'ringing', 'in_progress', 
    'completed', 'failed', 'no_answer'
  )),
  duration_seconds integer default 0,
  transcript text,
  summary text,
  qualification_score integer check (qualification_score between 0 and 10),
  outcome text check (outcome in (
    'interested', 'not_interested', 
    'callback', 'converted', 'no_answer'
  )),
  recording_url text,
  cost_cents integer default 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- WAITLIST (beta)
create table waitlist (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  first_name text,
  team_size text,
  created_at timestamptz default now()
);

-- ROW LEVEL SECURITY
alter table organizations enable row level security;
alter table users enable row level security;
alter table agents enable row level security;
alter table leads enable row level security;
alter table campaigns enable row level security;
alter table calls enable row level security;

-- POLICIES (chaque user voit uniquement ses données)
create policy "Users see own org" on organizations
  for all using (
    id in (
      select organization_id from users 
      where id = auth.uid()
    )
  );

create policy "Users see own data" on users
  for all using (organization_id in (
    select organization_id from users 
    where id = auth.uid()
  ));

create policy "Agents own org" on agents
  for all using (organization_id in (
    select organization_id from users 
    where id = auth.uid()
  ));

create policy "Leads own org" on leads
  for all using (organization_id in (
    select organization_id from users 
    where id = auth.uid()
  ));

create policy "Campaigns own org" on campaigns
  for all using (organization_id in (
    select organization_id from users 
    where id = auth.uid()
  ));

create policy "Calls own org" on calls
  for all using (organization_id in (
    select organization_id from users 
    where id = auth.uid()
  ));

-- UPDATED_AT automatique
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_organizations_updated_at
  before update on organizations
  for each row execute function update_updated_at();

create trigger update_users_updated_at
  before update on users
  for each row execute function update_updated_at();

create trigger update_agents_updated_at
  before update on agents
  for each row execute function update_updated_at();

create trigger update_leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

create trigger update_campaigns_updated_at
  before update on campaigns
  for each row execute function update_updated_at();

-- EMAIL_LOGS (historique des emails envoyés)
create table email_logs (
  id              uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  lead_id         uuid references leads(id) on delete set null,
  subject         text,
  body            text,
  status          text default 'sent' check (status in ('sent', 'replied', 'bounced')),
  sent_at         timestamptz default now()
);

alter table email_logs enable row level security;

create policy "Email logs own org" on email_logs
  for all using (organization_id in (
    select organization_id from users
    where id = auth.uid()
  ));
