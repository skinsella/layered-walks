-- 0009 — Row-Level Security. Default deny; explicit policies per table.
-- See docs/01-database-schema.md §9. Money/trust writes go through Edge Functions
-- (service role), which bypasses RLS — so several tables intentionally have read-only
-- (or no) client policies.

alter table profiles              enable row level security;
alter table user_preferred_themes enable row level security;
alter table creator_profiles      enable row level security;
alter table cities                enable row level security;
alter table themes                enable row level security;
alter table periods               enable row level security;
alter table tours                 enable row level security;
alter table tour_themes           enable row level security;
alter table stops                 enable row level security;
alter table stop_images           enable row level security;
alter table stop_themes           enable row level security;
alter table stop_periods          enable row level security;
alter table purchases             enable row level security;
alter table payouts               enable row level security;
alter table reviews               enable row level security;
alter table saved_tours           enable row level security;
alter table tour_progress         enable row level security;
alter table tour_downloads        enable row level security;
alter table generated_routes      enable row level security;
alter table generated_route_stops enable row level security;

-- ── Public reference data (read-only to clients) ──────────────────────
create policy "cities public read"  on cities  for select using (true);
create policy "themes public read"  on themes  for select using (true);
create policy "periods public read" on periods for select using (true);

-- ── Profiles ──────────────────────────────────────────────────────────
create policy "own profile rw" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "public reads creator profiles" on profiles
  for select using (is_creator = true);

create policy "own preferred themes" on user_preferred_themes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "creator profiles public read" on creator_profiles
  for select using (true);
create policy "own creator profile write" on creator_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- ── Tours: published public; creators manage their own ────────────────
create policy "published tours are public" on tours
  for select using (status = 'published');
create policy "creators manage own tours" on tours
  for all using (creator_id = auth.uid()) with check (creator_id = auth.uid());
-- NOTE: the publish transition (draft→in_review→published) is performed only by the
-- tours-publish Edge Function (service role). Add a column guard or BEFORE UPDATE
-- trigger to stop clients self-publishing via the policy above.

create policy "tour themes readable with tour" on tour_themes
  for select using (
    exists (select 1 from tours t where t.id = tour_id
            and (t.status = 'published' or t.creator_id = auth.uid()))
  );
create policy "creators write own tour themes" on tour_themes
  for all using (exists (select 1 from tours t where t.id = tour_id and t.creator_id = auth.uid()))
  with check (exists (select 1 from tours t where t.id = tour_id and t.creator_id = auth.uid()));

-- ── Stops: the content gate ──────────────────────────────────────────
create policy "stop read gate" on stops
  for select using (
    creator_id = auth.uid()        -- owner
    or is_preview = true           -- free taster
    or has_purchased(tour_id)      -- buyer
  );
create policy "creators write own stops" on stops
  for all using (creator_id = auth.uid()) with check (creator_id = auth.uid());

create policy "stop images follow stop" on stop_images
  for select using (
    exists (select 1 from stops s where s.id = stop_id
            and (s.creator_id = auth.uid() or s.is_preview or has_purchased(s.tour_id)))
  );
create policy "creators write own stop images" on stop_images
  for all using (exists (select 1 from stops s where s.id = stop_id and s.creator_id = auth.uid()))
  with check (exists (select 1 from stops s where s.id = stop_id and s.creator_id = auth.uid()));

create policy "stop themes follow stop" on stop_themes
  for select using (
    exists (select 1 from stops s where s.id = stop_id
            and (s.creator_id = auth.uid() or s.is_preview or has_purchased(s.tour_id)))
  );
create policy "stop periods follow stop" on stop_periods
  for select using (
    exists (select 1 from stops s where s.id = stop_id
            and (s.creator_id = auth.uid() or s.is_preview or has_purchased(s.tour_id)))
  );

-- ── Purchases: read own; writes are webhook-only (no write policy) ────
create policy "read own purchases" on purchases
  for select using (user_id = auth.uid());

-- payouts: creator reads own; writes are service-role only
create policy "creator reads own payouts" on payouts
  for select using (creator_id = auth.uid());

-- ── Reviews: public read; purchasers write ───────────────────────────
create policy "reviews are public" on reviews for select using (true);
create policy "purchasers write reviews" on reviews
  for insert with check (user_id = auth.uid() and has_purchased(tour_id));
create policy "edit own review" on reviews
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own review" on reviews
  for delete using (user_id = auth.uid());

-- ── Owner-only personal data ─────────────────────────────────────────
create policy "own saves" on saved_tours
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own progress" on tour_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own downloads" on tour_downloads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own generated routes" on generated_routes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own generated route stops" on generated_route_stops
  for select using (
    exists (select 1 from generated_routes r where r.id = route_id and r.user_id = auth.uid())
  );
