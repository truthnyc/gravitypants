ALTER TABLE public.directory_brands
  DROP CONSTRAINT IF EXISTS directory_brands_description_check;

ALTER TABLE public.directory_brands
  ADD CONSTRAINT directory_brands_description_check
  CHECK (description IS NULL OR char_length(description) <= 160);