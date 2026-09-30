CREATE TABLE public.site_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  title text NOT NULL,
  href text,
  category text NOT NULL DEFAULT 'fashion' CHECK (category IN ('fashion','food','beauty','home')),
  format text NOT NULL DEFAULT '916' CHECK (format IN ('916','11','169')),
  seconds numeric NOT NULL DEFAULT 8,
  photos integer NOT NULL DEFAULT 3,
  video_url text NOT NULL,
  video_webm_url text,
  poster_url text,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_reels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_reels TO authenticated;
GRANT ALL ON public.site_reels TO service_role;
ALTER TABLE public.site_reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone sees published reels" ON public.site_reels FOR SELECT TO anon, authenticated USING (published OR public.is_platform_admin());
CREATE POLICY "Staff manage reels" ON public.site_reels FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER site_reels_updated_at BEFORE UPDATE ON public.site_reels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_reels (brand, title, href, category, format, seconds, photos, video_url, video_webm_url, poster_url, sort_order) VALUES
('Purl Soho','Japanese Denim Cotton','https://purlsoho.com','fashion','916',7.8,3,'/__l5e/assets-v1/88a2db3b-a404-4d78-80fb-e0e34c182785/example-of-the-week.mp4','/__l5e/assets-v1/efffafcf-e9c8-4b5d-9156-33e8551df87b/example-of-the-week.webm','/__l5e/assets-v1/71aefa9c-721c-435a-ae27-d3443de62a84/example-of-the-week-poster.webp',10),
('Aro','AW 26-27 Collection','https://aroshoes.com/','fashion','11',6,3,'/__l5e/assets-v1/32bd17af-179b-432b-9163-49f45aba29d0/product-spotlight.mp4','/__l5e/assets-v1/28d28e11-c233-4b8a-b3b9-daaaedd53e17/product-spotlight.webm','/__l5e/assets-v1/e4d29bdd-5553-4815-bc31-c304807bd9f5/product-spotlight-poster.webp',20),
('Sachajuan','Bioshield Collection','https://shop.sachajuan.com','beauty','916',9,3,'/__l5e/assets-v1/cabf4eb6-0a05-4076-89ad-2ce2b9a4817f/bioshield-collection.mp4','/__l5e/assets-v1/0b88f9f9-6fee-41af-bc1d-039737415f76/bioshield-collection.webm','/__l5e/assets-v1/47a7cd1d-1e6b-40f2-990c-b8456e230e96/bioshield-collection-poster.webp',30),
('Agnona','Fall–Winter Collection','https://agnona.com','fashion','916',8,3,'/__l5e/assets-v1/1188b4fa-3882-41c3-95c7-29aa46309c53/fall-winter-collection.mp4','/__l5e/assets-v1/bcec6b7b-351d-49eb-ac11-0952dc8f3432/fall-winter-collection.webm','/__l5e/assets-v1/62743854-6452-4b24-af5c-01fadea952e2/fall-winter-collection-poster.webp',40),
('Katherine Grover','Fine Jewelry Gifts','https://www.katherinegroverfinejewelry.com','fashion','169',8,3,'/__l5e/assets-v1/bfb124ec-7f18-46e9-a3d6-712223ee1ab5/fine-jewelry-gifts.mp4','/__l5e/assets-v1/78c23610-fee8-4843-ab1a-8eb40ebf37b7/fine-jewelry-gifts.webm','/__l5e/assets-v1/614c4129-19ff-4d1f-a7ee-2b8f7bc42cea/fine-jewelry-gifts-poster.webp',50);

CREATE TABLE public.brand_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 320),
  brand text NOT NULL CHECK (char_length(brand) BETWEEN 1 AND 200),
  website text CHECK (website IS NULL OR char_length(website) <= 500),
  message text CHECK (message IS NULL OR char_length(message) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.brand_requests TO anon, authenticated;
GRANT SELECT ON public.brand_requests TO authenticated;
GRANT ALL ON public.brand_requests TO service_role;
ALTER TABLE public.brand_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send a request" ON public.brand_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff read requests" ON public.brand_requests FOR SELECT TO authenticated USING (public.is_platform_admin());

CREATE POLICY "Anyone views site reels" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'site-reels');
CREATE POLICY "Staff upload site reels" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-reels' AND public.is_platform_admin());
CREATE POLICY "Staff update site reels" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'site-reels' AND public.is_platform_admin());
CREATE POLICY "Staff delete site reels" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site-reels' AND public.is_platform_admin());