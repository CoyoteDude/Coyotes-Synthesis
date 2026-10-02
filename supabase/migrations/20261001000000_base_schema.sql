-- Base schema for the synthesis database (mirrors lib/types.ts).

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.syntheses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  formula text,
  molecular_weight numeric,
  cas_number text,
  structure_image_url text,
  structure_smiles text,
  category_id uuid references public.categories (id) on delete set null,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced', 'expert')),
  yield_percentage numeric,
  total_time text,
  safety_notes text,
  notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.synthesis_reactions (
  id uuid primary key default gen_random_uuid(),
  synthesis_id uuid not null references public.syntheses (id) on delete cascade,
  reaction_equation text not null,
  reaction_type text,
  conditions text,
  temperature text,
  pressure text,
  duration text,
  catalyst text,
  solvent text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.synthesis_starting_materials (
  id uuid primary key default gen_random_uuid(),
  synthesis_id uuid not null references public.syntheses (id) on delete cascade,
  chemical_name text not null,
  formula text,
  cas_number text,
  amount text,
  purity text,
  state text check (state in ('solid', 'liquid', 'gas', 'solution')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.synthesis_steps (
  id uuid primary key default gen_random_uuid(),
  synthesis_id uuid not null references public.syntheses (id) on delete cascade,
  step_number integer not null,
  title text,
  description text not null,
  duration text,
  temperature text,
  equipment text[],
  safety_warnings text[],
  tips text,
  created_at timestamptz not null default now()
);

create table if not exists public.chemicals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  formula text,
  cas_number text,
  molecular_weight numeric,
  state text check (state in ('solid', 'liquid', 'gas', 'solution')),
  purity text,
  current_quantity numeric not null default 0,
  unit text not null default 'g',
  minimum_quantity numeric not null default 0,
  location text,
  supplier text,
  lot_number text,
  expiration_date date,
  safety_data_sheet_url text,
  hazard_symbols text[],
  storage_conditions text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_log (
  id uuid primary key default gen_random_uuid(),
  chemical_id uuid not null references public.chemicals (id) on delete cascade,
  transaction_type text not null check (transaction_type in ('add', 'remove', 'adjust', 'expire')),
  quantity numeric not null,
  previous_quantity numeric,
  new_quantity numeric,
  reason text,
  performed_by text,
  created_at timestamptz not null default now()
);

create index if not exists syntheses_category_id_idx on public.syntheses (category_id);
create index if not exists synthesis_reactions_synthesis_id_idx on public.synthesis_reactions (synthesis_id);
create index if not exists synthesis_starting_materials_synthesis_id_idx on public.synthesis_starting_materials (synthesis_id);
create index if not exists synthesis_steps_synthesis_id_idx on public.synthesis_steps (synthesis_id);
create index if not exists inventory_log_chemical_id_idx on public.inventory_log (chemical_id);
