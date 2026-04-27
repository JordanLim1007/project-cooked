ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS tips TEXT[];
ALTER TABLE public.recipe_steps ADD COLUMN IF NOT EXISTS keywords TEXT[];

CREATE INDEX IF NOT EXISTS idx_recipes_published_created ON public.recipes(is_published, created_at DESC);