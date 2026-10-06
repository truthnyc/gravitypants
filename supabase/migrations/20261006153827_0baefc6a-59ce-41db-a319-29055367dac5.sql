CREATE OR REPLACE FUNCTION public.sync_master_mood_references()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.directory_brands SET moods = array_remove(moods, OLD.name) WHERE OLD.name = ANY(moods);
    UPDATE public.directory_reels SET moods = array_remove(moods, OLD.name) WHERE OLD.name = ANY(moods);
    RETURN OLD;
  ELSIF OLD.name IS DISTINCT FROM NEW.name THEN
    UPDATE public.directory_brands SET moods = array_replace(moods, OLD.name, NEW.name) WHERE OLD.name = ANY(moods);
    UPDATE public.directory_reels SET moods = array_replace(moods, OLD.name, NEW.name) WHERE OLD.name = ANY(moods);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_master_mood_references() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_master_mood_references AFTER UPDATE OF name OR DELETE ON public.moods FOR EACH ROW EXECUTE FUNCTION public.sync_master_mood_references();