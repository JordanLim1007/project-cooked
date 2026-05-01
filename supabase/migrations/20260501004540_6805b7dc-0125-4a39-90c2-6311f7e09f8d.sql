-- 1) Multi-meal tagging
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS meal_types text[] NOT NULL DEFAULT '{}';

-- Backfill from existing single meal_type
UPDATE public.recipes
SET meal_types = ARRAY[meal_type]
WHERE meal_type IS NOT NULL AND (meal_types IS NULL OR cardinality(meal_types) = 0);

-- 2) Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                -- recipient
  actor_id uuid,                        -- who triggered it
  recipe_id uuid,                       -- optional related recipe
  type text NOT NULL,                   -- 'like' | 'follow' | 'new_recipe' | 'timer_done'
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT policy: only triggers (SECURITY DEFINER) create rows.

CREATE INDEX IF NOT EXISTS idx_notifications_user_recent
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id) WHERE is_read = false;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 3) Push subscriptions (browser web push)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subs"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subs"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own subs"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4) Triggers
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  recipe_owner uuid;
BEGIN
  SELECT user_id INTO recipe_owner FROM public.recipes WHERE id = NEW.recipe_id;
  IF recipe_owner IS NULL OR recipe_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, actor_id, recipe_id, type)
  VALUES (recipe_owner, NEW.user_id, NEW.recipe_id, 'like');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.recipe_likes;
CREATE TRIGGER trg_notify_on_like
AFTER INSERT ON public.recipe_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;
CREATE TRIGGER trg_notify_on_follow
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

CREATE OR REPLACE FUNCTION public.notify_followers_new_recipe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only when transitioning to published
  IF NEW.is_published = true AND (OLD.is_published IS DISTINCT FROM true) THEN
    INSERT INTO public.notifications (user_id, actor_id, recipe_id, type)
    SELECT f.follower_id, NEW.user_id, NEW.id, 'new_recipe'
    FROM public.follows f
    WHERE f.following_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_new_recipe ON public.recipes;
CREATE TRIGGER trg_notify_followers_new_recipe
AFTER UPDATE OF is_published ON public.recipes
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_new_recipe();

-- Also fire when a recipe is inserted already published (rare path)
CREATE OR REPLACE FUNCTION public.notify_followers_new_recipe_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_published = true THEN
    INSERT INTO public.notifications (user_id, actor_id, recipe_id, type)
    SELECT f.follower_id, NEW.user_id, NEW.id, 'new_recipe'
    FROM public.follows f
    WHERE f.following_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_new_recipe_insert ON public.recipes;
CREATE TRIGGER trg_notify_followers_new_recipe_insert
AFTER INSERT ON public.recipes
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_new_recipe_insert();