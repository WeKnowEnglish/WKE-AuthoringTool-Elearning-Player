-- Server-side media library search + pagination (matches prior JS filter semantics).

create or replace function public.media_asset_list_covers_needles(
  p_haystack text[],
  p_needles text[]
)
returns boolean
language sql
immutable
parallel safe
as $$
  select case
    when p_needles is null or cardinality(p_needles) = 0 then true
    else not exists (
      select 1
      from unnest(p_needles) as nd(needle)
      where length(trim(nd.needle)) > 0
        and not exists (
          select 1
          from unnest(coalesce(p_haystack, '{}'::text[])) as h(val)
          where lower(regexp_replace(trim(h.val), '\s+', ' ', 'g'))
            = lower(regexp_replace(trim(nd.needle), '\s+', ' ', 'g'))
        )
    )
  end;
$$;

create or replace function public.teacher_search_media_assets(
  p_kind text,
  p_q text,
  p_level text,
  p_word_type text,
  p_countability text,
  p_tags text[],
  p_categories text[],
  p_skills text[],
  p_limit int,
  p_offset int
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with lim as (
    select
      greatest(0, least(coalesce(nullif(p_limit, 0), 200), 1000))::int as lim_v,
      greatest(0, coalesce(p_offset, 0))::int as off_v
  ),
  base as (
    select m.*
    from public.media_assets m
    where
      case coalesce(nullif(trim(p_kind), ''), 'all')
        when 'image' then m.content_type like 'image/%'
        when 'audio' then m.content_type like 'audio/%'
        when 'video' then m.content_type like 'video/%'
        else true
      end
      and (
        p_countability is null
        or trim(p_countability) = ''
        or lower(trim(p_countability)) = 'all'
        or m.meta_countability = lower(trim(p_countability))
      )
      and (
        p_level is null
        or trim(p_level) = ''
        or lower(regexp_replace(trim(coalesce(m.meta_level, '')), '\s+', ' ', 'g'))
          = lower(regexp_replace(trim(p_level), '\s+', ' ', 'g'))
      )
      and (
        p_word_type is null
        or trim(p_word_type) = ''
        or lower(regexp_replace(trim(coalesce(m.meta_word_type, '')), '\s+', ' ', 'g'))
          = lower(regexp_replace(trim(p_word_type), '\s+', ' ', 'g'))
      )
      and public.media_asset_list_covers_needles(m.meta_tags, p_tags)
      and public.media_asset_list_covers_needles(m.meta_categories, p_categories)
      and public.media_asset_list_covers_needles(m.meta_skills, p_skills)
      and (
        p_q is null
        or trim(p_q) = ''
        or position(
          lower(regexp_replace(trim(p_q), '\s+', ' ', 'g')) in lower(
            regexp_replace(
              trim(
                coalesce(m.meta_item_name, '') || ' ' ||
                coalesce(m.original_filename, '') || ' ' ||
                coalesce(m.public_url, '') || ' ' ||
                coalesce(m.meta_plural, '') || ' ' ||
                coalesce(m.meta_level, '') || ' ' ||
                coalesce(m.meta_word_type, '') || ' ' ||
                coalesce(m.meta_past_tense, '') || ' ' ||
                coalesce(m.meta_notes, '') || ' ' ||
                coalesce(array_to_string(coalesce(m.meta_tags, '{}'::text[]), ' '), '') || ' ' ||
                coalesce(array_to_string(coalesce(m.meta_categories, '{}'::text[]), ' '), '') || ' ' ||
                coalesce(array_to_string(coalesce(m.meta_alternative_names, '{}'::text[]), ' '), '') || ' ' ||
                coalesce(array_to_string(coalesce(m.meta_skills, '{}'::text[]), ' '), '')
              ),
              '\s+',
              ' ',
              'g'
            )
          )
        ) > 0
      )
  ),
  tally as (
    select count(*)::bigint as c from base
  ),
  page as (
    select b.*
    from base b
    order by b.created_at desc
    limit (select lim_v from lim)
    offset (select off_v from lim)
  )
  select jsonb_build_object(
    'total', (select c from tally),
    'items', coalesce(
      (
        select jsonb_agg(to_jsonb(p) order by p.created_at desc nulls last)
        from page p
      ),
      '[]'::jsonb
    )
  );
$$;

grant execute on function public.media_asset_list_covers_needles(text[], text[]) to authenticated;
grant execute on function public.teacher_search_media_assets(
  text, text, text, text, text, text[], text[], text[], int, int
) to authenticated;
