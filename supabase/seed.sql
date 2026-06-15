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

-- NOTE: flagship tours + stops are authored through the creator tooling in Sprint 6
-- (docs/03-build-plan.md §4), not seeded here.
