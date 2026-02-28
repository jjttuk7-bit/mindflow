-- Create storage buckets for images and audio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('items-images', 'items-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('items-audio', 'items-audio', true, 52428800, ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for items-images
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'items-images');

CREATE POLICY "Anyone can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'items-images');

CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'items-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for items-audio
CREATE POLICY "Authenticated users can upload audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'items-audio');

CREATE POLICY "Anyone can view audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'items-audio');

CREATE POLICY "Users can delete own audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'items-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
