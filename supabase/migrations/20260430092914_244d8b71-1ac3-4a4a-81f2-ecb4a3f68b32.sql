-- 1. Optional flag on ingredients
ALTER TABLE public.recipe_ingredients
  ADD COLUMN IF NOT EXISTS is_optional BOOLEAN NOT NULL DEFAULT false;

-- 2. Timer duration on steps (seconds)
ALTER TABLE public.recipe_steps
  ADD COLUMN IF NOT EXISTS timer_seconds INTEGER;

-- 3. Cooking progress (per user, per recipe)
CREATE TABLE IF NOT EXISTS public.cooking_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL,
  checked_ingredient_ids UUID[] NOT NULL DEFAULT '{}',
  current_step INTEGER NOT NULL DEFAULT 0,
  timer_state JSONB,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);
ALTER TABLE public.cooking_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own progress" ON public.cooking_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.cooking_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.cooking_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own progress" ON public.cooking_progress FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER cooking_progress_updated_at BEFORE UPDATE ON public.cooking_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_cooking_progress_user ON public.cooking_progress(user_id, updated_at DESC);

-- 4. Recipe schedule (specific dates)
CREATE TABLE IF NOT EXISTS public.recipe_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL,
  scheduled_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own schedule" ON public.recipe_schedule FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own schedule" ON public.recipe_schedule FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own schedule" ON public.recipe_schedule FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own schedule" ON public.recipe_schedule FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recipe_schedule_user_date ON public.recipe_schedule(user_id, scheduled_date);