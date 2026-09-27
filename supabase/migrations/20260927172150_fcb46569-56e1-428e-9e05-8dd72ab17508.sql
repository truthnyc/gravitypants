CREATE POLICY "media read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'media');
CREATE POLICY "media insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'media');
CREATE POLICY "media update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');
CREATE POLICY "media delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'media');