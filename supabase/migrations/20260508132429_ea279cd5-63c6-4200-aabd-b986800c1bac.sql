-- Vegan label for recipes
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS is_vegan boolean NOT NULL DEFAULT false;

-- Allow users to create their own timer_done notifications (so background timer watchers can post them)
CREATE POLICY "Users insert own timer notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND type = 'timer_done');