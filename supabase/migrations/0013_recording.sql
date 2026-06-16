-- 0013 — backend for in-app recording: a media storage bucket + a stop-creation RPC.

-- ── Storage bucket for recorded audio + stop photos ──────────────────────────
insert into storage.buckets (id, name, public)
values ('tour-media', 'tour-media', true)
on conflict (id) do nothing;

-- Creators upload into their own folder (path = {uid}/{tourId}/{file}); anyone can read.
create policy "creators upload own media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'tour-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "public read tour media"
  on storage.objects for select to public
  using (bucket_id = 'tour-media');
create policy "creators update own media"
  on storage.objects for update to authenticated
  using (bucket_id = 'tour-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "creators delete own media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'tour-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── create_stop(): insert a recorded stop with a real PostGIS point ──────────
-- Avoids client-side geography casting. Verifies the caller owns the tour.
create or replace function create_stop(
  p_tour_id    uuid,
  p_sequence   integer,
  p_title      text,
  p_lng        double precision,
  p_lat        double precision,
  p_accuracy   double precision,
  p_audio_path text,
  p_dwell      integer default 120
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not exists (select 1 from tours where id = p_tour_id and creator_id = auth.uid()) then
    raise exception 'not your tour';
  end if;
  insert into stops (tour_id, creator_id, sequence, title, location,
                     gps_accuracy_m, audio_path, dwell_time_sec, recorded_at, audio_source)
  values (p_tour_id, auth.uid(), p_sequence, coalesce(nullif(p_title, ''), 'Untitled stop'),
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_accuracy, p_audio_path, p_dwell, now(), 'recorded')
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function create_stop(uuid, integer, text, double precision, double precision, double precision, text, integer)
  to authenticated;
