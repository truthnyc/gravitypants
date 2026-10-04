ALTER TABLE public.directory_reels ADD COLUMN IF NOT EXISTS title text;
UPDATE public.directory_reels r SET title = p.name FROM public.projects p WHERE p.id = r.ad_id AND r.title IS NULL;
CREATE POLICY "Members can update own reel title" ON public.directory_reels FOR UPDATE TO authenticated USING (is_brand_member(brand_id)) WITH CHECK (is_brand_member(brand_id));