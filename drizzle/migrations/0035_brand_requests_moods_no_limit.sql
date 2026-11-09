-- Brand moods are no longer capped at three: applications may carry any number of moods.
ALTER TABLE public.brand_requests DROP CONSTRAINT brand_requests_moods_limit;
ALTER TABLE public.brand_requests ADD CONSTRAINT brand_requests_moods_limit CHECK (cardinality(moods) >= 0 AND cardinality(moods) <= 60);