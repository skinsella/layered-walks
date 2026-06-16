import { useEffect, useRef, useState } from 'react';

import type { Coords } from './recording';

const g = globalThis as unknown as {
  navigator?: {
    geolocation?: {
      watchPosition: (ok: (p: any) => void, err: (e: any) => void, opts?: any) => number;
      clearWatch: (id: number) => void;
    };
  };
};

function metresBetween(a: Coords, b: Coords): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Continuously tracks the creator's position (web `watchPosition`) so the recording map can
 * show a live "you are here" dot. Throttled — only reports a move of >8 m or after >5 s — so
 * the map (a Mapbox static image) doesn't refetch on every tiny GPS jitter.
 */
export function useLiveLocation(): { position: Coords | null; error: string | null } {
  const [position, setPosition] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<{ p: Coords; t: number } | null>(null);

  useEffect(() => {
    const geo = g.navigator?.geolocation;
    if (!geo?.watchPosition) {
      setError('Live location is not available on this device.');
      return;
    }
    const id = geo.watchPosition(
      (p: any) => {
        const next: Coords = {
          lng: p.coords.longitude,
          lat: p.coords.latitude,
          accuracy: p.coords.accuracy ?? 0,
        };
        const now = Date.now();
        const prev = last.current;
        if (!prev || metresBetween(prev.p, next) > 8 || now - prev.t > 5000) {
          last.current = { p: next, t: now };
          setPosition(next);
          setError(null);
        }
      },
      (e: any) => setError(e?.message || 'Could not track your location.'),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
    return () => geo.clearWatch(id);
  }, []);

  return { position, error };
}
