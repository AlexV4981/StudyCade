-- Apply as the Supabase project administrator (postgres), never from the app.
-- No email values or deployment secrets belong in migrations.
begin;

create schema if not exists studycade_private;
revoke all on schema studycade_private from public, anon, authenticated, service_role;

create table studycade_private.cloud_allowlist (
    email_hash text primary key,
    constraint cloud_allowlist_sha256 check (email_hash ~ '^[0-9a-f]{64}$')
);
alter table studycade_private.cloud_allowlist enable row level security;
alter table studycade_private.cloud_allowlist force row level security;
revoke all on table studycade_private.cloud_allowlist from public, anon, authenticated, service_role;
comment on table studycade_private.cloud_allowlist is
    'Administrator-managed SHA-256 hashes of lower(trim(verified auth.users.email)); never exposed through the Data API. Hashes are identifiers, not encryption.';

create table public.studycade_workspaces (
    owner_id uuid primary key references auth.users(id) on delete cascade,
    state jsonb not null,
    version bigint not null check (version > 0),
    updated_at timestamptz not null default pg_catalog.now(),
    state_bytes bigint generated always as (pg_catalog.octet_length(state::text)::bigint) stored,
    constraint studycade_workspace_size check (pg_catalog.octet_length(state::text) <= 20000000),
    constraint studycade_workspace_shape check (
        pg_catalog.jsonb_typeof(state) = 'object'
        and state ? 'version' and state->'version' = '1'::jsonb
        and state ? 'nextCard'
        and pg_catalog.jsonb_typeof(state->'nextCard') = 'number'
        and state->>'nextCard' ~ '^[1-9][0-9]{0,15}$'
        and state ?& array['sets','documents','files','progress','attempts','schedules']
        and pg_catalog.jsonb_typeof(state->'sets') = 'array'
        and pg_catalog.jsonb_array_length(state->'sets') <= 1000
        and pg_catalog.jsonb_typeof(state->'documents') = 'array'
        and pg_catalog.jsonb_array_length(state->'documents') <= 250
        and pg_catalog.jsonb_typeof(state->'files') = 'array'
        and pg_catalog.jsonb_array_length(state->'files') <= 250
        and pg_catalog.jsonb_typeof(state->'progress') = 'array'
        and pg_catalog.jsonb_array_length(state->'progress') <= 1000
        and pg_catalog.jsonb_typeof(state->'attempts') = 'array'
        and pg_catalog.jsonb_array_length(state->'attempts') <= 100000
        and pg_catalog.jsonb_typeof(state->'schedules') = 'array'
        and pg_catalog.jsonb_array_length(state->'schedules') <= 100000
    )
);
alter table public.studycade_workspaces enable row level security;
alter table public.studycade_workspaces force row level security;
revoke all on table public.studycade_workspaces from public, anon, authenticated, service_role;
grant select on table public.studycade_workspaces to authenticated;

-- SECURITY DEFINER is necessary to inspect protected Auth/allowlist tables. It
-- exposes only a boolean for the JWT subject, never user-controlled identifiers.
create function studycade_private.is_cloud_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
    select exists (
        select 1
        from auth.users as u
        join studycade_private.cloud_allowlist as a
          on a.email_hash = pg_catalog.encode(
              pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.lower(pg_catalog.btrim(u.email)), 'UTF8')),
              'hex'
          )
        where u.id = auth.uid()
          and u.email is not null
          and u.email_confirmed_at is not null
          and u.is_anonymous is false
          and (u.banned_until is null or u.banned_until <= pg_catalog.now())
          and exists (
              select 1 from auth.sessions as s
              where s.user_id = u.id
                and s.id::text = (auth.jwt()->>'session_id')
          )
    );
$function$;
alter function studycade_private.is_cloud_member() owner to postgres;
revoke all on function studycade_private.is_cloud_member() from public, anon, authenticated, service_role;
-- Policies reference this function by OID. No private-schema USAGE is granted:
-- authenticated callers cannot browse or directly address the private schema.
grant execute on function studycade_private.is_cloud_member() to authenticated;

create policy studycade_owner_read
on public.studycade_workspaces
for select to authenticated
using (owner_id = (select auth.uid()) and (select studycade_private.is_cloud_member()));

-- SECURITY DEFINER is required because clients have no table DML privileges.
-- This is the only write capability; owner_id is always derived from auth.uid().
-- The fixed advisory lock serializes quota accounting and CAS changes together.
create function public.studycade_save_workspace(expected_version bigint, workspace jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
    caller uuid;
    old_version bigint;
    old_bytes bigint := 0;
    incoming_bytes bigint;
    total_bytes bigint;
    new_version bigint;
    name text;
    max_items integer;
begin
    caller := auth.uid();
    if caller is null or not studycade_private.is_cloud_member() then
        raise exception using errcode = '42501', message = 'Cloud access is not allowed.';
    end if;
    if expected_version is null or expected_version < 0 or expected_version = 9223372036854775807 then
        raise exception using errcode = '22023', message = 'Invalid expected workspace version.';
    end if;
    if workspace is null or pg_catalog.jsonb_typeof(workspace) <> 'object' then
        raise exception using errcode = '22023', message = 'Workspace must be an object.';
    end if;
    incoming_bytes := pg_catalog.octet_length(workspace::text);
    if incoming_bytes > 20000000 then
        raise exception using errcode = '22023', message = 'Workspace exceeds the 20 MB limit.';
    end if;
    if not (workspace ? 'version') or workspace->'version' <> '1'::jsonb
       or not (workspace ? 'nextCard')
       or pg_catalog.jsonb_typeof(workspace->'nextCard') <> 'number'
       or (workspace->>'nextCard') !~ '^[1-9][0-9]{0,15}$' then
        raise exception using errcode = '22023', message = 'Invalid workspace version or card identifier.';
    end if;
    foreach name in array array['sets','documents','files','progress','attempts','schedules'] loop
        if not (workspace ? name) or pg_catalog.jsonb_typeof(workspace->name) <> 'array' then
            raise exception using errcode = '22023', message = 'Workspace collections must be arrays.';
        end if;
        max_items := case name when 'sets' then 1000 when 'documents' then 250
            when 'files' then 250 when 'progress' then 1000 else 100000 end;
        if pg_catalog.jsonb_array_length(workspace->name) > max_items then
            raise exception using errcode = '22023', message = 'Workspace collection limit exceeded.';
        end if;
    end loop;

    perform pg_catalog.pg_advisory_xact_lock(1937008996, 1667327061);
    select w.version, w.state_bytes into old_version, old_bytes
      from public.studycade_workspaces as w where w.owner_id = caller for update;
    if not found then
        old_bytes := 0;
        if expected_version <> 0 then
            raise exception using errcode = 'PT409', message = 'Workspace version conflict.';
        end if;
    elsif old_version <> expected_version then
        raise exception using errcode = 'PT409', message = 'Workspace version conflict.';
    end if;
    select coalesce(pg_catalog.sum(w.state_bytes), 0) into total_bytes
      from public.studycade_workspaces as w;
    if total_bytes - old_bytes + incoming_bytes > 100000000 then
        raise exception using errcode = 'PT507', message = 'Cloud storage quota reached.';
    end if;
    new_version := expected_version + 1;
    insert into public.studycade_workspaces(owner_id, state, version, updated_at)
      values(caller, workspace, new_version, pg_catalog.now())
      on conflict(owner_id) do update
        set state = excluded.state, version = excluded.version, updated_at = excluded.updated_at;
    return new_version;
end;
$function$;
alter function public.studycade_save_workspace(bigint, jsonb) owner to postgres;
revoke all on function public.studycade_save_workspace(bigint, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.studycade_save_workspace(bigint, jsonb) to authenticated;

comment on function public.studycade_save_workspace(bigint, jsonb) is
    'Owner-only compare-and-swap. Expected 0 creates version 1; subsequent writes require the current version. PT409 conflict; PT507 quota. No caller-supplied owner field is authoritative.';

commit;
