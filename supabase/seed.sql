-- Seed data for local dev / first launch city. Applied by `supabase db reset`.

-- Launch city: Limerick (centroid near King John's Castle / city centre).
insert into cities (name, country_code, slug, centroid, timezone, is_active)
values (
  'Limerick', 'IE', 'limerick',
  ST_SetSRID(ST_MakePoint(-8.6267, 52.6638), 4326)::geography,
  'Europe/Dublin', true
)
on conflict (slug) do nothing;

-- The seven lenses (themes).
insert into themes (slug, name, icon, sort_order) values
  ('history',      'History',       '🏛️', 1),
  ('economics',    'Economics',     '📈', 2),
  ('architecture', 'Architecture',  '🏗️', 3),
  ('politics',     'Politics',      '⚖️', 4),
  ('food',         'Food',          '🍽️', 5),
  ('literature',   'Literature',    '📖', 6),
  ('hidden-gems',  'Hidden Gems',   '🔍', 7)
on conflict (slug) do nothing;

-- Historical periods relevant to the Limerick flagship tours (docs/03 §4).
insert into periods (slug, name, year_start, year_end) values
  ('medieval',      'Medieval',          1100, 1500),
  ('georgian',      'Georgian',          1714, 1830),
  ('victorian',     'Victorian',         1837, 1901),
  ('revolutionary', 'Revolutionary Ireland', 1912, 1923),
  ('celtic-tiger',  'Celtic Tiger',      1995, 2008)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- LOCAL DEV DEMO DATA — a demo creator + the three flagship tours + stops.
-- In production these are authored through the creator tooling (docs/03 §4); here
-- they're seeded so the app renders real data end-to-end against the schema + RLS.
-- Safe to re-run: every insert is ON CONFLICT DO NOTHING.
-- ─────────────────────────────────────────────────────────────────────────────

-- Demo creator's auth user. The handle_new_user trigger creates the matching profile.
-- (Local dev only — encrypted_password via pgcrypto; never seed real users this way.)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'creator@demo.layeredwalks.test',
  crypt('walkme123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Dr. M. Ó Riain"}',
  false, '', '', '', ''
) on conflict (id) do nothing;

update profiles set is_creator = true where id = '11111111-1111-1111-1111-111111111111';

insert into creator_profiles (id, display_name, bio, status, payout_enabled, revenue_share)
values (
  '11111111-1111-1111-1111-111111111111',
  'Dr. M. Ó Riain',
  'Economic historian. Twenty years researching Limerick''s industrial and urban past.',
  'approved', true, 0.700
) on conflict (id) do nothing;

-- Three published flagship tours (docs/03 §4 / docs/17).
insert into tours (id, creator_id, city_id, title, slug, summary, description,
                   status, difficulty, est_duration_min, distance_meters,
                   price_cents, currency, is_featured, published_at)
values
(
  'a1111111-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  (select id from cities where slug = 'limerick'),
  'Economic Transformation', 'economic-transformation',
  'Shannon-era ambition, FDI, decline and the long recovery.',
  'A walk through the economic forces that built and rebuilt Limerick: the Shannon Scheme, foreign direct investment, deindustrialisation, and the slow, contested recovery of the city centre.',
  'published', 'moderate', 75, 2400, 900, 'EUR', true, now()
),
(
  'a1111111-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  (select id from cities where slug = 'limerick'),
  'The Georgian City', 'the-georgian-city',
  'Merchant wealth, terraces and the grid that made modern Limerick.',
  'Newtown Pery and the Georgian plan: how merchant capital laid out a rational grid of brick terraces, and what the facades still tell us about status, trade and decline.',
  'published', 'easy', 60, 1800, 700, 'EUR', true, now()
),
(
  'a1111111-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  (select id from cities where slug = 'limerick'),
  'Hidden Limerick', 'hidden-limerick',
  'Forgotten lanes, local stories and curiosities off the trail.',
  'The city the tour buses miss: back lanes, vanished industries, and the small monuments that locals walk past every day without a second glance.',
  'published', 'easy', 45, 1500, 500, 'EUR', false, now()
)
on conflict (id) do nothing;

-- Tour-level lens tags (drives the Discover lens filter).
insert into tour_themes (tour_id, theme_id) values
('a1111111-0000-0000-0000-000000000001', (select id from themes where slug = 'economics')),
('a1111111-0000-0000-0000-000000000001', (select id from themes where slug = 'history')),
('a1111111-0000-0000-0000-000000000002', (select id from themes where slug = 'architecture')),
('a1111111-0000-0000-0000-000000000002', (select id from themes where slug = 'history')),
('a1111111-0000-0000-0000-000000000003', (select id from themes where slug = 'hidden-gems'))
on conflict do nothing;

-- Stops for the Economic Transformation tour (stop 1 is a free preview).
insert into stops (id, tour_id, creator_id, sequence, title, description, narration_text,
                   location, address, dwell_time_sec, is_preview)
values
('b1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111', 1, 'Bank Place',
 'Where Limerick''s commercial money concentrated.',
 'Stand at Bank Place and look at the doorways. These were built to signal creditworthiness...',
 ST_SetSRID(ST_MakePoint(-8.6267, 52.6638), 4326)::geography, 'Bank Place, Limerick', 180, true),
('b1111111-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111', 2, 'The Custom House',
 'Trade, tariffs and the river economy.',
 'The river made Limerick, and the Custom House taxed what the river carried...',
 ST_SetSRID(ST_MakePoint(-8.6285, 52.6655), 4326)::geography, 'Bishop''s Quay, Limerick', 150, false),
('b1111111-0000-0000-0000-000000000003', 'a1111111-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111', 3, 'Cruise''s Street',
 'Retail, clearance and the reinvented high street.',
 'What stood here before this was cleared tells the story of post-industrial reinvention...',
 ST_SetSRID(ST_MakePoint(-8.6255, 52.6620), 4326)::geography, 'Cruise''s Street, Limerick', 150, false),
('b1111111-0000-0000-0000-000000000004', 'a1111111-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111', 4, 'People''s Park',
 'Civic ambition and Victorian philanthropy.',
 'A park given to the people says something about who held power and how they wished to be seen...',
 ST_SetSRID(ST_MakePoint(-8.6230, 52.6585), 4326)::geography, 'People''s Park, Limerick', 120, false)
on conflict (id) do nothing;

-- Stop-level lens tags (feeds the route engine's theme scoring).
insert into stop_themes (stop_id, theme_id) values
('b1111111-0000-0000-0000-000000000001', (select id from themes where slug = 'economics')),
('b1111111-0000-0000-0000-000000000002', (select id from themes where slug = 'economics')),
('b1111111-0000-0000-0000-000000000002', (select id from themes where slug = 'history')),
('b1111111-0000-0000-0000-000000000003', (select id from themes where slug = 'economics')),
('b1111111-0000-0000-0000-000000000004', (select id from themes where slug = 'history'))
on conflict do nothing;
