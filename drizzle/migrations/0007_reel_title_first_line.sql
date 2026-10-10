CREATE OR REPLACE FUNCTION public.directory_faceted_search(q text DEFAULT ''::text, f_moods text[] DEFAULT '{}'::text[], f_categories text[] DEFAULT '{}'::text[], f_brands text[] DEFAULT '{}'::text[], page integer DEFAULT 1, page_size integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  words text[] := array(select w from unnest(string_to_array(lower(btrim(regexp_replace(coalesce(q,''), '\s+', ' ', 'g'))), ' ')) w where w <> '');
  ps int := least(greatest(coalesce(page_size, 12), 1), 240);
  pg int := greatest(coalesce(page, 1), 1);
  fm text[] := coalesce(f_moods, '{}'); fc text[] := coalesce(f_categories, '{}'); fb text[] := coalesce(f_brands, '{}');
  result jsonb;
begin
  with pool as (
    select 'directory'::text as kind, r.id, coalesce(nullif(btrim(r.display_title), ''), b.name) as title, b.id as brand_id, b.name as brand_name, b.slug as brand_slug,
      b.category, public.category_slug(b.category) as cat_slug, r.formats,
      case when coalesce(array_length(r.moods,1),0) > 0 then r.moods else b.moods end as moods,
      r.poster_url, r.preview_url, r.video_url, public.is_featured_brand(b.id) as featured, null::int as sort_order,
      coalesce(r.published_at, r.created_at) as ts
    from directory_reels r join directory_brands b on b.id = r.brand_id
    where r.status = 'live' and public.brand_visible(b.id)
    union all
    select 'site', s.id, coalesce(nullif(btrim(s.display_title), ''), s.title, b.name), b.id, b.name, b.slug, b.category, public.category_slug(b.category),
      array[case s.format when '916' then '9x16' when '11' then '1x1' else '16x9' end],
      case when coalesce(array_length(s.moods,1),0) > 0 then s.moods else b.moods end,
      s.poster_url, null, s.video_url, true, s.sort_order, s.created_at
    from site_reels s join directory_brands b on b.id = s.brand_id
    where s.published and public.brand_visible(b.id)
  ), matched as (
    select p.*,
      (fm = '{}' or p.moods && fm) as ok_m,
      (fc = '{}' or p.cat_slug = any(fc)) as ok_c,
      (fb = '{}' or p.brand_slug = any(fb)) as ok_b
    from pool p
    where coalesce(array_length(words,1),0) = 0 or not exists (
      select 1 from unnest(words) w where position(w in lower(concat_ws(' ', p.title, p.brand_name, p.category, array_to_string(p.moods,' '),
        case when '9x16' = any(p.formats) then '9:16 9x16 vertical portrait story' end,
        case when '1x1' = any(p.formats) then '1:1 1x1 square' end,
        case when '16x9' = any(p.formats) then '16:9 16x9 wide landscape' end))) = 0)
  ), hits as (select * from matched where ok_m and ok_c and ok_b)
  select jsonb_build_object(
    'total', (select count(*) from hits),
    'reels', coalesce((select jsonb_agg(to_jsonb(x) - 'ok_m' - 'ok_c' - 'ok_b' - 'ts' - 'sort_order' order by x.rn) from (
       select h.*, row_number() over (order by h.featured desc, h.sort_order nulls last, h.ts desc, h.id) as rn
       from hits h order by rn offset (pg-1)*ps limit ps) x), '[]'::jsonb),
    'moods', coalesce((select jsonb_object_agg(m, n) from (select m, count(*) n from matched, unnest(moods) m where ok_c and ok_b group by m) t), '{}'::jsonb),
    'categories', coalesce((select jsonb_object_agg(cat_slug, n) from (select cat_slug, count(*) n from matched where ok_m and ok_b group by cat_slug) t), '{}'::jsonb),
    'brands', coalesce((select jsonb_object_agg(brand_slug, n) from (select brand_slug, count(*) n from matched where ok_m and ok_c group by brand_slug) t), '{}'::jsonb)
  ) into result;
  return result || jsonb_build_object('page', pg, 'pageSize', ps);
end $function$