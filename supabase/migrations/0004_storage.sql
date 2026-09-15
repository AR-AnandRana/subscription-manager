-- ============================================================================
-- Storage buckets
--
-- Upstream writes uploads to images/uploads/logos and images/uploads/avatars on
-- the web server's disk. Here they are objects in Supabase Storage.
--
-- Both buckets are public to read: a logo is shown on every card and an avatar
-- in the header, and serving them through signed URLs would mean re-signing on
-- every render for no privacy gain. Writes stay restricted to the owner, whose
-- id is the first path segment.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- storage.objects outlives the public tables, so these policies survive a
-- teardown of this schema. Dropping them first keeps the script re-runnable.
drop policy if exists "logos: public read" on storage.objects;
drop policy if exists "logos: owner writes" on storage.objects;
drop policy if exists "logos: owner updates" on storage.objects;
drop policy if exists "logos: owner deletes" on storage.objects;
drop policy if exists "avatars: public read" on storage.objects;
drop policy if exists "avatars: owner writes" on storage.objects;
drop policy if exists "avatars: owner updates" on storage.objects;
drop policy if exists "avatars: owner deletes" on storage.objects;

-- Anyone may read; only the owner may write into their own folder.
create policy "logos: public read"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos: owner writes"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos: owner updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos: owner deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: owner writes"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
