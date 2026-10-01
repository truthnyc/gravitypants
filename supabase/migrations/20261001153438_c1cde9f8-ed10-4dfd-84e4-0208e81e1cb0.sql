UPDATE public.templates
SET slides = jsonb_set(
  jsonb_set(slides, '{3,transition_in}', '"dip-black"'::jsonb, true),
  '{5,headline_placeholder}', '""'::jsonb, true
),
settings = jsonb_set(
  jsonb_set(settings, '{frames,3,transition_in,type}', '"dip_black"'::jsonb, true),
  '{frames,5,headline,text}', '""'::jsonb, true
),
updated_at = now()
WHERE id = 'ab62a3ad-fdda-41ec-92cf-a384194b8dd4';