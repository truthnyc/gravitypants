ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS page_intro text NOT NULL DEFAULT '';
ALTER TABLE public.moods ADD COLUMN IF NOT EXISTS page_intro text NOT NULL DEFAULT '';

UPDATE public.categories SET page_intro = format(
  'Independent %s brands, shown through short reels rather than product grids. Each brand here shares how its pieces look and move, so you can find a maker whose style fits you. Open any brand to see its reels and visit its shop.',
  lower(name)) WHERE page_intro = '';

UPDATE public.moods SET page_intro = format(
  'Brands and gift ideas that feel %s, picked by the brands themselves. Watch a short reel from each one to find something that matches the mood, whether it is for you or for someone else. Open a brand to see more of its reels.',
  lower(name)) WHERE page_intro = '';