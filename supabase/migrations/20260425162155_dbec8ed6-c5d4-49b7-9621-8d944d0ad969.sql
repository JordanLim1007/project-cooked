-- Fix function search paths
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Restrict listing on storage buckets - replace broad SELECT with scoped one
DROP POLICY IF EXISTS "Recipe images public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;

-- Files are still publicly fetchable by URL (bucket is public). Listing requires owning the folder.
CREATE POLICY "Recipe images list own folder" ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images' AND (auth.uid()::text = (storage.foldername(name))[1]));
CREATE POLICY "Avatars list own folder" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1]));