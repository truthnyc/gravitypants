ALTER TABLE public.projects ADD COLUMN template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL;
CREATE INDEX projects_template_id_idx ON public.projects(template_id);