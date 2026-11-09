ALTER TABLE public.site_reels DROP CONSTRAINT IF EXISTS site_reels_format_check;
ALTER TABLE public.site_reels ADD CONSTRAINT site_reels_format_check CHECK (format = ANY (ARRAY['916','45','11','54','169']));
UPDATE public.site_reels SET format='45' WHERE id='4d8b55d1-bb4c-4b70-a267-8a8f17a26551';
UPDATE public.directory_reels d SET formats = array_prepend(v.f, array_remove(d.formats, v.f))
FROM (VALUES ('ff1391cb-03d7-4a77-ab21-03322efb06c4'::uuid,'4x5'),('378edf8f-2513-4542-bd25-8867ceb00a3c'::uuid,'5x4'),('6390136e-ba26-4880-ae0e-69007a756528'::uuid,'5x4'),('a6b18286-17eb-4150-8237-14f162010cc9'::uuid,'4x5')) v(id,f)
WHERE d.id=v.id;