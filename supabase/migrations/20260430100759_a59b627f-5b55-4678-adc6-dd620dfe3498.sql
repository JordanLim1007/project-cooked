CREATE TABLE public.review_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_images_review ON public.review_images(review_id);

ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review images viewable by everyone"
ON public.review_images FOR SELECT USING (true);

CREATE POLICY "Review owner manages images"
ON public.review_images FOR ALL
USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_images.review_id AND r.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_images.review_id AND r.user_id = auth.uid()));