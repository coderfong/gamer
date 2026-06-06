-- gamer / 0007_storage_brand_assets.sql
-- Phase 3 step 3.3: storage bucket for brand-uploaded assets.
--   Folders (by convention): {brand_id}/logos/, {brand_id}/prize-images/,
--                            {brand_id}/campaign-backgrounds/
--   Public read so player game pages can show images without auth.
--   Write restricted to the brand that owns the top-level {brand_id} folder.

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do update set public = true;

-- Helper: the first path segment must be a brand id owned by the caller.
-- storage.foldername(name) returns the path segments as a text[].

drop policy if exists "brand-assets public read" on storage.objects;
create policy "brand-assets public read" on storage.objects for select
  using (bucket_id = 'brand-assets');

drop policy if exists "brand-assets owner insert" on storage.objects;
create policy "brand-assets owner insert" on storage.objects for insert
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in (
      select id::text from brands where owner_id = auth.uid()
    )
  );

drop policy if exists "brand-assets owner update" on storage.objects;
create policy "brand-assets owner update" on storage.objects for update
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in (
      select id::text from brands where owner_id = auth.uid()
    )
  );

drop policy if exists "brand-assets owner delete" on storage.objects;
create policy "brand-assets owner delete" on storage.objects for delete
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in (
      select id::text from brands where owner_id = auth.uid()
    )
  );
