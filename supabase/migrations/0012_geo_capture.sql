-- 0012 — geographic capture for live recording (docs/04 §2b ripples).
-- Makes a recording's geography first-class: the walked TRACK (not just stop points), and
-- per-stop GPS accuracy + provenance. On device, Record mode (expo-location) accumulates a
-- breadcrumb into tours.path and stamps each stop's coordinate + accuracy as it's captured.

-- The recorded walking line — the route a follower should trace between stops.
alter table tours add column if not exists path geography(LineString, 4326);

-- Per-stop capture metadata.
alter table stops add column if not exists gps_accuracy_m real;       -- accuracy at capture (m)
alter table stops add column if not exists recorded_at    timestamptz; -- when captured in the field
alter table stops add column if not exists audio_source   text
  check (audio_source in ('recorded', 'uploaded'));                    -- in-app vs desk upload

-- Spatial index for the track (e.g. "tours whose path passes near here").
create index if not exists tours_path_gix on tours using gist (path);
