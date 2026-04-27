
-- Step hierarchy fields
ALTER TABLE public.recipe_steps
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS emphasis jsonb;

-- Likes
CREATE TABLE IF NOT EXISTS public.recipe_likes (
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);
CREATE INDEX IF NOT EXISTS recipe_likes_recipe_idx ON public.recipe_likes(recipe_id);
ALTER TABLE public.recipe_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes viewable by everyone"
  ON public.recipe_likes FOR SELECT USING (true);
CREATE POLICY "Users insert own likes"
  ON public.recipe_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own likes"
  ON public.recipe_likes FOR DELETE USING (auth.uid() = user_id);

-- Follows
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows(following_id);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows viewable by everyone"
  ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users insert own follows"
  ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users delete own follows"
  ON public.follows FOR DELETE USING (auth.uid() = follower_id);
