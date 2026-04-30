-- Clean up orphans before adding FKs
DELETE FROM public.cooking_progress WHERE recipe_id NOT IN (SELECT id FROM public.recipes);
DELETE FROM public.recipe_schedule WHERE recipe_id NOT IN (SELECT id FROM public.recipes);

ALTER TABLE public.cooking_progress
  ADD CONSTRAINT cooking_progress_recipe_fkey
  FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

ALTER TABLE public.recipe_schedule
  ADD CONSTRAINT recipe_schedule_recipe_fkey
  FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

-- Profile lookup for follows list
ALTER TABLE public.follows
  ADD CONSTRAINT follows_follower_profile_fkey
  FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.follows
  ADD CONSTRAINT follows_following_profile_fkey
  FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;