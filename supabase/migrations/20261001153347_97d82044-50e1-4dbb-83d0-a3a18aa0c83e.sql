WITH source_project AS (
  SELECT id, logo
  FROM public.projects
  WHERE id = '76a945c1-98dd-4d2d-b6db-9ea61ed6fc6b'
), source_frames AS (
  SELECT f.*, row_number() OVER (ORDER BY f.sort_order) AS n
  FROM public.frames f
  JOIN source_project p ON p.id = f.project_id
), target AS (
  SELECT id, style, settings, slides
  FROM public.templates
  WHERE id = 'ab62a3ad-fdda-41ec-92cf-a384194b8dd4'
), rebuilt AS (
  SELECT
    t.id,
    t.style || jsonb_build_object(
      'logo_show_on', COALESCE(p.logo->>'show_on', 'all'),
      'logo_version', COALESCE(p.logo->>'version', 'auto')
    ) AS new_style,
    (
      SELECT jsonb_agg(
        COALESCE(t.slides->((sf.n - 1)::integer), '{}'::jsonb) || jsonb_build_object(
          'photo_background_color', sf.photo->'background_color',
          'transition_speed', COALESCE(sf.transition_in->>'speed', 'smooth'),
          'headline_style', CASE WHEN sf.headline IS NULL THEN NULL ELSE sf.headline - 'text' - 'same_on_all' END,
          'subline_style', CASE WHEN sf.subline IS NULL THEN NULL ELSE sf.subline - 'text' - 'same_on_all' END,
          'logo_visible', sf.logo_visible,
          'logo_variant', sf.logo_variant
        )
        ORDER BY sf.n
      )
      FROM source_frames sf
    ) AS new_slides,
    t.settings || jsonb_build_object(
      'logo', COALESCE(t.settings->'logo', '{}'::jsonb) || jsonb_build_object(
        'show_on', COALESCE(p.logo->>'show_on', 'all'),
        'version', COALESCE(p.logo->>'version', 'auto')
      ),
      'frames', (
        SELECT jsonb_agg(jsonb_build_object(
          'duration_sec', sf.duration_sec,
          'photo', sf.photo - 'path' - 'url' - 'asset_id',
          'transition_in', CASE WHEN sf.sort_order = 0 THEN jsonb_build_object('type', 'cut', 'speed', COALESCE(sf.transition_in->>'speed', 'smooth')) ELSE sf.transition_in END,
          'headline', sf.headline,
          'subline', sf.subline,
          'logo_visible', sf.logo_visible,
          'logo_variant', sf.logo_variant
        ) ORDER BY sf.n)
        FROM source_frames sf
      )
    ) AS new_settings
  FROM target t
  CROSS JOIN source_project p
)
UPDATE public.templates t
SET style = r.new_style,
    slides = r.new_slides,
    settings = r.new_settings,
    updated_at = now()
FROM rebuilt r
WHERE t.id = r.id;