-- Admin-only writes, public read.
--
-- Everyone (signed in or not) can read protocols, categories and inventory.
-- Only users listed in public.admin_users can insert, update or delete.
--
-- After running this, add yourself as admin (replace the email):
--   insert into public.admin_users (user_id)
--   select id from auth.users where email = 'you@example.com';

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Each signed-in user may see only their own admin row (used by is_admin()).
drop policy if exists "admin_users self read" on public.admin_users;
create policy "admin_users self read" on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Replace every existing policy on the app tables with: public read, admin write.
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'categories',
    'syntheses',
    'synthesis_reactions',
    'synthesis_starting_materials',
    'synthesis_steps',
    'chemicals',
    'inventory_log'
  ] loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    for p in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;

    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format(
      'create policy "admin insert" on public.%I for insert to authenticated with check ((select public.is_admin()))', t);
    execute format(
      'create policy "admin update" on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format(
      'create policy "admin delete" on public.%I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end $$;

-- Create or update a protocol and its reactions, materials and steps in one
-- transaction, so a failed edit never leaves a protocol half-saved.
-- Runs as the caller, so the admin-only RLS policies above still apply.
create or replace function public.save_synthesis(
  p_id uuid,
  p_synthesis jsonb,
  p_reactions jsonb,
  p_materials jsonb,
  p_steps jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  s public.syntheses;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  s := jsonb_populate_record(null::public.syntheses, p_synthesis);

  if p_id is null then
    insert into public.syntheses (
      name, formula, molecular_weight, cas_number, structure_smiles, category_id,
      difficulty, yield_percentage, total_time, safety_notes, notes, is_default
    ) values (
      s.name, s.formula, s.molecular_weight, s.cas_number, s.structure_smiles, s.category_id,
      s.difficulty, s.yield_percentage, s.total_time, s.safety_notes, s.notes, false
    )
    returning id into v_id;
  else
    update public.syntheses set
      name = s.name,
      formula = s.formula,
      molecular_weight = s.molecular_weight,
      cas_number = s.cas_number,
      structure_smiles = s.structure_smiles,
      category_id = s.category_id,
      difficulty = s.difficulty,
      yield_percentage = s.yield_percentage,
      total_time = s.total_time,
      safety_notes = s.safety_notes,
      notes = s.notes,
      updated_at = now()
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Synthesis not found';
    end if;

    delete from public.synthesis_reactions where synthesis_id = v_id;
    delete from public.synthesis_starting_materials where synthesis_id = v_id;
    delete from public.synthesis_steps where synthesis_id = v_id;
  end if;

  insert into public.synthesis_reactions (
    synthesis_id, reaction_equation, reaction_type, conditions, temperature,
    pressure, duration, catalyst, solvent, order_index
  )
  select v_id, r.reaction_equation, r.reaction_type, r.conditions, r.temperature,
    r.pressure, r.duration, r.catalyst, r.solvent, r.order_index
  from jsonb_populate_recordset(null::public.synthesis_reactions, coalesce(p_reactions, '[]'::jsonb)) r;

  insert into public.synthesis_starting_materials (
    synthesis_id, chemical_name, formula, cas_number, amount, purity, state, notes
  )
  select v_id, m.chemical_name, m.formula, m.cas_number, m.amount, m.purity, m.state, m.notes
  from jsonb_populate_recordset(null::public.synthesis_starting_materials, coalesce(p_materials, '[]'::jsonb)) m;

  insert into public.synthesis_steps (
    synthesis_id, step_number, title, description, duration, temperature,
    equipment, safety_warnings, tips
  )
  select v_id, st.step_number, st.title, st.description, st.duration, st.temperature,
    st.equipment, st.safety_warnings, st.tips
  from jsonb_populate_recordset(null::public.synthesis_steps, coalesce(p_steps, '[]'::jsonb)) st;

  return v_id;
end;
$$;

revoke all on function public.save_synthesis(uuid, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_synthesis(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- Delete a protocol and everything attached to it in one transaction.
create or replace function public.delete_synthesis(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  delete from public.synthesis_reactions where synthesis_id = p_id;
  delete from public.synthesis_starting_materials where synthesis_id = p_id;
  delete from public.synthesis_steps where synthesis_id = p_id;
  delete from public.syntheses where id = p_id;
end;
$$;

revoke all on function public.delete_synthesis(uuid) from public, anon;
grant execute on function public.delete_synthesis(uuid) to authenticated;
