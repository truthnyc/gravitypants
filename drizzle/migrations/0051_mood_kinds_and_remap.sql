ALTER TABLE public.moods ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'mood';
ALTER TABLE public.moods ADD CONSTRAINT moods_kind_check CHECK (kind IN ('mood','occasion','season','setting'));

CREATE TABLE public.mood_aliases (alias text PRIMARY KEY, target text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.mood_aliases TO anon, authenticated;
GRANT ALL ON public.mood_aliases TO service_role;
ALTER TABLE public.mood_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read mood aliases" ON public.mood_aliases FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.mood_remap_backup (id bigserial PRIMARY KEY, table_name text NOT NULL, row_id uuid NOT NULL, moods text[] NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.mood_remap_backup TO service_role;
ALTER TABLE public.mood_remap_backup ENABLE ROW LEVEL SECURITY;

CREATE TEMP TABLE mood_map (old text PRIMARY KEY, new text NOT NULL) ON COMMIT DROP;
INSERT INTO mood_map VALUES
 ('serene','calm'),('soothing','calm'),('relaxed','calm'),('dark','moody'),('fun','playful'),('cheerful','playful'),
 ('lively','energetic'),('dynamic','energetic'),('punchy','energetic'),('refined','elegant'),('sophisticated','elegant'),
 ('warm','cozy'),('organic','natural'),('heritage','timeless'),('indulgent','luxurious'),('cold','winter'),('sunny','summer'),
 ('celebratory','celebration'),('festive','holiday');

-- Target values that must exist.
INSERT INTO public.moods (name, family, kind, sort_order, family_id)
SELECT v.n, v.f, v.k, v.o, (SELECT id FROM public.mood_families WHERE name = v.f)
FROM (VALUES
 ('calm','Calm','mood',3),('moody','Dramatic','mood',70),('playful','Playful','mood',40),('energetic','Energetic','mood',31),
 ('elegant','Luxe','mood',11),('cozy','Warm','mood',20),('natural','Natural','mood',50),('timeless','Luxe','mood',13),('luxurious','Luxe',
 'mood',10),
 ('gift','Occasion','occasion',1),('holiday','Occasion','occasion',2),('black friday','Occasion','occasion',3),('valentine''s','Occasion','occasion',4),('wedding','Occasion','occasion',5),('celebration','Occasion','occasion',6),
 ('winter','Season','season',1),('spring','Season','season',2),('summer','Season','season',3),('autumn','Season','season',4),
 ('urban','Setting','setting',1),('coastal','Setting','setting',2),('mountain','Setting','setting',3),('studio','Setting','setting',4),('home','Setting','setting',5),('nature','Setting','setting',6)
) v(n,f,k,o)
ON CONFLICT (name) DO NOTHING;
UPDATE public.moods m SET kind = v.k, family = v.f, family_id = NULL, sort_order = v.o
FROM (VALUES ('gift','occasion','Occasion',1),('black friday','occasion','Occasion',3),('urban','setting','Setting',1),('coastal','setting','Setting',2)) v(n,k,f,o)
WHERE m.name = v.n;

-- Back up original tags.
INSERT INTO public.mood_remap_backup (table_name, row_id, moods) SELECT 'directory_reels', id, moods FROM public.directory_reels WHERE coalesce(array_length(moods,1),0) > 0;
INSERT INTO public.mood_remap_backup (table_name, row_id, moods) SELECT 'site_reels', id, moods FROM public.site_reels WHERE coalesce(array_length(moods,1),0) > 0;
INSERT INTO public.mood_remap_backup (table_name, row_id, moods) SELECT 'directory_brands', id, moods FROM public.directory_brands WHERE coalesce(array_length(moods,1),0) > 0;

CREATE FUNCTION pg_temp.remap(a text[]) RETURNS text[] LANGUAGE sql AS $$
  SELECT coalesce(array_agg(m ORDER BY o), '{}') FROM (
    SELECT coalesce(mm.new, lower(x)) m, min(ord) o FROM unnest(a) WITH ORDINALITY u(x, ord) LEFT JOIN mood_map mm ON mm.old = lower(x) GROUP BY 1) t
$$;

ALTER TABLE public.directory_reels DISABLE TRIGGER USER;
UPDATE public.directory_reels SET moods = pg_temp.remap(moods) WHERE moods && (SELECT array_agg(old) FROM mood_map);
ALTER TABLE public.directory_reels ENABLE TRIGGER USER;
UPDATE public.site_reels SET moods = pg_temp.remap(moods) WHERE moods && (SELECT array_agg(old) FROM mood_map);
ALTER TABLE public.directory_brands DISABLE TRIGGER USER;
UPDATE public.directory_brands SET moods = pg_temp.remap(moods) WHERE moods && (SELECT array_agg(old) FROM mood_map);
ALTER TABLE public.directory_brands ENABLE TRIGGER USER;

-- Repoint link tables, then retire merged names (kept as aliases).
INSERT INTO public.brand_moods (brand_id, mood_id)
SELECT DISTINCT bm.brand_id, t.id FROM public.brand_moods bm JOIN public.moods o ON o.id = bm.mood_id JOIN mood_map mm ON mm.old = o.name JOIN public.moods t ON t.name = mm.new
WHERE NOT EXISTS (SELECT 1 FROM public.brand_moods x WHERE x.brand_id = bm.brand_id AND x.mood_id = t.id);
INSERT INTO public.category_moods (category, category_id, mood_id, sort_order)
SELECT DISTINCT ON (cm.category, t.id) cm.category, cm.category_id, t.id, cm.sort_order FROM public.category_moods cm JOIN public.moods o ON o.id = cm.mood_id JOIN mood_map mm ON mm.old = o.name JOIN public.moods t ON t.name = mm.new
WHERE NOT EXISTS (SELECT 1 FROM public.category_moods x WHERE x.category = cm.category AND x.mood_id = t.id);
INSERT INTO public.mood_aliases (alias, target) SELECT old, new FROM mood_map ON CONFLICT (alias) DO UPDATE SET target = excluded.target;
DELETE FROM public.brand_moods WHERE mood_id IN (SELECT m.id FROM public.moods m JOIN mood_map mm ON mm.old = m.name);
DELETE FROM public.category_moods WHERE mood_id IN (SELECT m.id FROM public.moods m JOIN mood_map mm ON mm.old = m.name);
ALTER TABLE public.moods DISABLE TRIGGER sync_master_mood_references;
DELETE FROM public.moods WHERE name IN (SELECT old FROM mood_map);
ALTER TABLE public.moods ENABLE TRIGGER sync_master_mood_references;
DELETE FROM public.mood_families f WHERE NOT EXISTS (SELECT 1 FROM public.moods m WHERE m.family_id = f.id) AND f.name = 'Festive';

-- Headline moods / settings referencing old names.
UPDATE public.site_settings s SET value = replace(s.value::text, '"' || mm.old || '"', '"' || mm.new || '"')::jsonb
FROM mood_map mm WHERE s.key IN ('directory','directory_greeting') AND s.value::text LIKE '%"' || mm.old || '"%';

-- Mood cap: at most 3 kind='mood' tags when a reel's tags change.
CREATE OR REPLACE FUNCTION public.reel_mood_cap() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.moods IS NOT DISTINCT FROM OLD.moods THEN RETURN NEW; END IF;
  SELECT count(*) INTO n FROM unnest(coalesce(NEW.moods,'{}')) x WHERE NOT EXISTS (SELECT 1 FROM public.moods m WHERE m.name = lower(x) AND m.kind <> 'mood');
  IF n > 3 THEN RAISE EXCEPTION 'A reel can have at most 3 moods' USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reel_mood_cap BEFORE INSERT OR UPDATE OF moods ON public.directory_reels FOR EACH ROW EXECUTE FUNCTION public.reel_mood_cap();
CREATE TRIGGER reel_mood_cap BEFORE INSERT OR UPDATE OF moods ON public.site_reels FOR EACH ROW EXECUTE FUNCTION public.reel_mood_cap();

CREATE OR REPLACE FUNCTION public.directory_faceted_search(q text DEFAULT ''::text, f_moods text[] DEFAULT '{}'::text[], f_categories text[] DEFAULT '{}'::text[], f_brands text[] DEFAULT '{}'::text[], page integer DEFAULT 1, page_size integer DEFAULT 12, seed text DEFAULT ''::text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
declare
  words text[] := array(select w from unnest(string_to_array(lower(btrim(regexp_replace(coalesce(q,''), '\s+', ' ', 'g'))), ' ')) w where w <> '');
  ps int := least(greatest(coalesce(page_size, 12), 1), 240);
  pg int := greatest(coalesce(page, 1), 1);
  sd text := left(coalesce(seed, ''), 64);
  sel text[] := array(select distinct coalesce(a.target, lower(x)) from unnest(coalesce(f_moods, '{}')) x left join public.mood_aliases a on a.alias = lower(x));
  fm text[] := array(select s from unnest(sel) s where coalesce((select kind from public.moods where name = s), 'mood') = 'mood');
  fo text[] := array(select s from unnest(sel) s where (select kind from public.moods where name = s) = 'occasion');
  fs text[] := array(select s from unnest(sel) s where (select kind from public.moods where name = s) = 'season');
  fe text[] := array(select s from unnest(sel) s where (select kind from public.moods where name = s) = 'setting');
  fc text[] := coalesce(f_categories, '{}'); fb text[] := coalesce(f_brands, '{}');
  result jsonb;
begin
  with pool as (
    select 'directory'::text as kind, r.id, coalesce(nullif(btrim(r.display_title), ''), b.name) as title, b.id as brand_id, b.name as brand_name, b.slug as brand_slug,
      b.category, public.category_slug(b.category) as cat_slug, r.formats,
      case when coalesce(array_length(r.moods,1),0) > 0 then r.moods else b.moods end as moods,
      array(select distinct lower(x) from unnest(coalesce(r.moods,'{}') || coalesce(b.moods,'{}')) x) as bmoods,
      r.poster_url, r.preview_url, r.video_url, (r.in_showcase or public.is_featured_brand(b.id)) as featured, case when r.in_showcase then r.showcase_order end as sort_order,
      coalesce(r.published_at, r.created_at) as ts,
      concat_ws(' ', r.description, b.description, array_to_string(coalesce(r.tags,'{}'), ' ')) as extra_text
    from directory_reels r join directory_brands b on b.id = r.brand_id
    where r.status = 'live' and public.brand_visible(b.id)
    union all
    select 'site', s.id, coalesce(nullif(btrim(s.display_title), ''), s.title, b.name), b.id, b.name, b.slug, b.category, public.category_slug(b.category),
      array[case s.format when '916' then '9x16' when '45' then '4x5' when '11' then '1x1' when '54' then '5x4' else '16x9' end],
      case when coalesce(array_length(s.moods,1),0) > 0 then s.moods else b.moods end,
      array(select distinct lower(x) from unnest(coalesce(s.moods,'{}') || coalesce(b.moods,'{}')) x),
      s.poster_url, null, s.video_url, true, s.sort_order, s.created_at,
      concat_ws(' ', s.description, b.description)
    from site_reels s join directory_brands b on b.id = s.brand_id
    where s.published and public.brand_visible(b.id)
  ), matched as (
    select p.*,
      (fm = '{}' or p.bmoods && fm) as ok_m, (fo = '{}' or p.bmoods && fo) as ok_o,
      (fs = '{}' or p.bmoods && fs) as ok_s, (fe = '{}' or p.bmoods && fe) as ok_e,
      (fc = '{}' or p.cat_slug = any(fc)) as ok_c,
      (fb = '{}' or p.brand_slug = any(fb)) as ok_b
    from pool p
    where coalesce(array_length(words,1),0) = 0 or not exists (
      select 1 from unnest(words) w where position(w in lower(concat_ws(' ', p.title, p.brand_name, p.category, array_to_string(p.moods,' '), array_to_string(p.bmoods,' '), p.extra_text,
        case when '9x16' = any(p.formats) then '9:16 9x16 vertical portrait story' end,
        case when '4x5' = any(p.formats) then '4:5 4x5 portrait' end, case when '5x4' = any(p.formats) then '5:4 5x4 landscape' end, case when '1x1' = any(p.formats) then '1:1 1x1 square' end,
        case when '16x9' = any(p.formats) then '16:9 16x9 wide landscape' end))) = 0)
  ), hits as (select * from matched where ok_m and ok_o and ok_s and ok_e and ok_c and ok_b)
  select jsonb_build_object(
    'total', (select count(*) from hits),
    'reels', coalesce((select jsonb_agg(to_jsonb(x) - 'ok_m' - 'ok_o' - 'ok_s' - 'ok_e' - 'ok_c' - 'ok_b' - 'ts' - 'sort_order' - 'bmoods' - 'extra_text' order by x.rn) from (
       select h.*, row_number() over (order by case when sd = '' then null else md5(h.id::text || sd) end, h.featured desc, h.sort_order nulls last, h.ts desc, h.id) as rn
       from hits h order by rn offset (pg-1)*ps limit ps) x), '[]'::jsonb),
    'moods', coalesce((select jsonb_object_agg(m, n) from (
       select t.m, count(*) n from matched x, lateral (select u m, coalesce((select kind from public.moods where name = u), 'mood') k from unnest(x.bmoods) u) t
       where x.ok_c and x.ok_b and (t.k = 'mood' or x.ok_m) and (t.k = 'occasion' or x.ok_o) and (t.k = 'season' or x.ok_s) and (t.k = 'setting' or x.ok_e)
       group by t.m) t), '{}'::jsonb),
    'categories', coalesce((select jsonb_object_agg(cat_slug, n) from (select cat_slug, count(*) n from matched where ok_m and ok_o and ok_s and ok_e and ok_b group by cat_slug) t), '{}'::jsonb),
    'brands', coalesce((select jsonb_object_agg(brand_slug, n) from (select brand_slug, count(*) n from matched where ok_m and ok_o and ok_s and ok_e and ok_c group by brand_slug) t), '{}'::jsonb)
  ) into result;
  return result || jsonb_build_object('page', pg, 'pageSize', ps);
end $function$;