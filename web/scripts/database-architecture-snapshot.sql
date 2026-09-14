-- WKE-004 metadata-only inventory. This query reads PostgreSQL catalogs and
-- information_schema only; it never reads application rows.
with db_tables as (
  select
    n.nspname as schema,
    c.relname as name,
    case c.relkind
      when 'r' then 'table'
      when 'p' then 'table'
      when 'v' then 'view'
      when 'm' then 'materialized-view'
      when 'f' then 'foreign-table'
      else c.relkind::text
    end as kind,
    c.relrowsecurity as "rlsEnabled",
    c.relforcerowsecurity as "rlsForced"
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
),
db_functions as (
  select
    n.nspname as schema,
    p.proname as name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
    pg_catalog.pg_get_function_result(p.oid) as result,
    p.prosecdef as "securityDefiner",
    coalesce(to_jsonb(p.proconfig), '[]'::jsonb) as config
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind in ('f', 'p')
),
db_triggers as (
  select
    n.nspname as schema,
    c.relname as "table",
    t.tgname as name,
    p.proname as function,
    t.tgenabled::text as enabled
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  join pg_catalog.pg_proc p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and not t.tgisinternal
),
db_foreign_keys as (
  select
    source_ns.nspname as schema,
    source.relname as "table",
    constraint_row.conname as name,
    target_ns.nspname || '.' || target.relname as references,
    constraint_row.convalidated as validated,
    constraint_row.confdeltype::text as "deleteAction",
    constraint_row.confupdtype::text as "updateAction",
    coalesce((
      select jsonb_agg(source_attribute.attname order by key_position.ordinality)
      from unnest(constraint_row.conkey) with ordinality as key_position(attnum, ordinality)
      join pg_catalog.pg_attribute source_attribute
        on source_attribute.attrelid = constraint_row.conrelid
       and source_attribute.attnum = key_position.attnum
    ), '[]'::jsonb) as columns
  from pg_catalog.pg_constraint constraint_row
  join pg_catalog.pg_class source on source.oid = constraint_row.conrelid
  join pg_catalog.pg_namespace source_ns on source_ns.oid = source.relnamespace
  join pg_catalog.pg_class target on target.oid = constraint_row.confrelid
  join pg_catalog.pg_namespace target_ns on target_ns.oid = target.relnamespace
  where constraint_row.contype = 'f'
    and source_ns.nspname = 'public'
),
db_indexes as (
  select
    n.nspname as schema,
    c.relname as "table",
    index_class.relname as name,
    index_row.indisunique as unique,
    index_row.indisvalid as valid,
    coalesce((
      select jsonb_agg(attribute_row.attname order by key_position.ordinality)
      from unnest(index_row.indkey::smallint[]) with ordinality as key_position(attnum, ordinality)
      left join pg_catalog.pg_attribute attribute_row
        on attribute_row.attrelid = index_row.indrelid
       and attribute_row.attnum = key_position.attnum
      where key_position.ordinality <= index_row.indnkeyatts
    ), '[]'::jsonb) as columns
  from pg_catalog.pg_index index_row
  join pg_catalog.pg_class c on c.oid = index_row.indrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  join pg_catalog.pg_class index_class on index_class.oid = index_row.indexrelid
  where n.nspname = 'public'
),
db_policies as (
  select
    schemaname as schema,
    tablename as "table",
    policyname as name,
    cmd as command,
    permissive,
    to_jsonb(roles) as roles
  from pg_catalog.pg_policies
  where schemaname in ('public', 'storage', 'realtime')
),
db_table_grants as (
  select
    table_schema as schema,
    table_name as "table",
    lower(grantee) as role,
    lower(privilege_type) as privilege
  from information_schema.role_table_grants
  where table_schema = 'public'
    and lower(grantee) in ('public', 'anon', 'authenticated')
),
db_function_grants as (
  select distinct
    routine_schema as schema,
    routine_name as name,
    lower(grantee) as role,
    lower(privilege_type) as privilege
  from information_schema.role_routine_grants
  where routine_schema = 'public'
    and lower(grantee) in ('public', 'anon', 'authenticated')
)
select jsonb_build_object(
  'tables', coalesce((select jsonb_agg(to_jsonb(row_value) order by schema, name) from db_tables row_value), '[]'::jsonb),
  'functions', coalesce((select jsonb_agg(to_jsonb(row_value) order by schema, name, arguments) from db_functions row_value), '[]'::jsonb),
  'triggers', coalesce((select jsonb_agg(to_jsonb(row_value) order by schema, "table", name) from db_triggers row_value), '[]'::jsonb),
  'foreignKeys', coalesce((select jsonb_agg(to_jsonb(row_value) order by schema, "table", name) from db_foreign_keys row_value), '[]'::jsonb),
  'indexes', coalesce((select jsonb_agg(to_jsonb(row_value) order by schema, "table", name) from db_indexes row_value), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(to_jsonb(row_value) order by schema, "table", name) from db_policies row_value), '[]'::jsonb),
  'tableGrants', coalesce((select jsonb_agg(to_jsonb(row_value) order by schema, "table", role, privilege) from db_table_grants row_value), '[]'::jsonb),
  'functionGrants', coalesce((select jsonb_agg(to_jsonb(row_value) order by schema, name, role) from db_function_grants row_value), '[]'::jsonb)
) as snapshot;
