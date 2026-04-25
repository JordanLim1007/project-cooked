-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Preferences
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cuisines TEXT[] NOT NULL DEFAULT '{}',
  cooking_styles TEXT[] NOT NULL DEFAULT '{}',
  spice_level TEXT,
  time_preference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own prefs" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own prefs" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own prefs" ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);

-- Recipes
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  calories INT,
  spice_level TEXT,
  cuisine TEXT,
  cooking_style TEXT,
  time_minutes INT,
  food_type TEXT,
  meal_type TEXT,
  difficulty TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipes viewable by everyone" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Users insert own recipes" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own recipes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX recipes_user_idx ON public.recipes(user_id);
CREATE INDEX recipes_cuisine_idx ON public.recipes(cuisine);

-- Ingredients
CREATE TABLE public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  image_url TEXT,
  position INT NOT NULL DEFAULT 0
);
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ingredients viewable by everyone" ON public.recipe_ingredients FOR SELECT USING (true);
CREATE POLICY "Recipe owner manages ingredients" ON public.recipe_ingredients FOR ALL
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

-- Steps
CREATE TABLE public.recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  animation_key TEXT
);
ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Steps viewable by everyone" ON public.recipe_steps FOR SELECT USING (true);
CREATE POLICY "Recipe owner manages steps" ON public.recipe_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

-- Images
CREATE TABLE public.recipe_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0
);
ALTER TABLE public.recipe_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Images viewable by everyone" ON public.recipe_images FOR SELECT USING (true);
CREATE POLICY "Recipe owner manages images" ON public.recipe_images FOR ALL
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

-- Saved
CREATE TABLE public.saved_recipes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own saves" ON public.saved_recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own saves" ON public.saved_recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own saves" ON public.saved_recipes FOR DELETE USING (auth.uid() = user_id);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users insert own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_recipes_updated BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('recipe-images', 'recipe-images', true), ('avatars', 'avatars', true);

CREATE POLICY "Recipe images public read" ON storage.objects FOR SELECT USING (bucket_id = 'recipe-images');
CREATE POLICY "Recipe images auth upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recipe-images' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Recipe images own update" ON storage.objects FOR UPDATE USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Recipe images own delete" ON storage.objects FOR DELETE USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatars auth upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatars own update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatars own delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);