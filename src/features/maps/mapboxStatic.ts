import { env } from '@/lib/env';

export type LngLat = { lng: number; lat: number };

/** True when a usable Mapbox public token is configured (not the preview placeholder). */
export function hasMapboxToken(): boolean {
  const t = env.mapboxToken;
  return !!t && t.startsWith('pk.') && t !== 'pk.preview' && t.length > 20;
}

export type MapMarker = LngLat & { label?: string; color: string };

/**
 * Builds a Mapbox Static Images API URL with the route path + numbered pins baked in.
 * Usable as an <Image> source on web + native, and cacheable for offline. Needs a pk.* token;
 * returns null otherwise so callers fall back to the SVG schematic (WalkMap).
 */
export function mapboxStaticUrl(opts: {
  path?: LngLat[];
  markers: MapMarker[];
  current?: LngLat | null;
  width: number;
  height: number;
  dark?: boolean;
}): string | null {
  if (!hasMapboxToken() || !opts.width || !opts.height) return null;

  const style = opts.dark ? 'dark-v11' : 'light-v11';
  const overlays: string[] = [];

  if (opts.path && opts.path.length > 1) {
    const feature = {
      type: 'Feature',
      properties: {
        stroke: opts.dark ? '#E0A458' : '#B0742A',
        'stroke-width': 4,
        'stroke-opacity': 0.85,
      },
      geometry: { type: 'LineString', coordinates: opts.path.map((p) => [p.lng, p.lat]) },
    };
    overlays.push(`geojson(${encodeURIComponent(JSON.stringify(feature))})`);
  }
  for (const m of opts.markers) {
    const label = m.label ? `-${m.label}` : '';
    overlays.push(`pin-s${label}+${m.color.replace('#', '')}(${m.lng},${m.lat})`);
  }
  if (opts.current) {
    overlays.push(`pin-s+ffffff(${opts.current.lng},${opts.current.lat})`);
  }

  const w = Math.round(opts.width);
  const h = Math.round(opts.height);
  return (
    `https://api.mapbox.com/styles/v1/mapbox/${style}/static/` +
    `${overlays.join(',')}/auto/${w}x${h}@2x?padding=36&access_token=${env.mapboxToken}`
  );
}
