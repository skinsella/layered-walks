import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Polyline, Text as SvgText } from 'react-native-svg';

import { colors, field as fieldColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

export type GeoPoint = { lng: number; lat: number };
export type MapStop = GeoPoint & { locked?: boolean };

/**
 * A simple, dependency-light schematic map (SVG — works on web + native, offline, no token).
 * Draws the walked `path` (breadcrumb), numbered stop pins, and a live `current` position.
 * It shows the *shape and coverage* of a walk so a creator can confirm the geography while
 * recording. The Mapbox street-tile layer (native, `@rnmapbox/maps`) is a later upgrade that
 * renders beneath these same overlays.
 */
export function WalkMap({
  stops = [],
  path,
  current,
  height = 160,
  field = false,
}: {
  stops?: MapStop[];
  path?: GeoPoint[];
  current?: GeoPoint | null;
  height?: number;
  field?: boolean;
}) {
  const [w, setW] = useState(0);
  const pad = 24;

  const surface = field ? fieldColors.surface : colors.surfaceAlt;
  const border = field ? fieldColors.border : colors.border;
  const accent = field ? fieldColors.accent : colors.primary;
  const onAccent = field ? fieldColors.accentText : colors.primaryText;
  const lockFill = field ? fieldColors.bg : colors.surface;
  const lockStroke = field ? fieldColors.border : colors.border;
  const lockText = field ? fieldColors.textMuted : colors.textMuted;
  const dot = field ? '#FFFFFF' : colors.text;
  const dotRing = field ? fieldColors.bg : colors.bg;

  const all: GeoPoint[] = [...stops, ...(path ?? []), ...(current ? [current] : [])];

  // Equirectangular projection scaled by cos(lat), fit-to-box preserving aspect ratio.
  function makeProjector(): ((p: GeoPoint) => { x: number; y: number }) | null {
    if (!w || all.length === 0) return null;
    const lats = all.map((p) => p.lat);
    const meanLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const k = Math.cos((meanLat * Math.PI) / 180) || 1;
    const xs = all.map((p) => p.lng * k);
    const ys = all.map((p) => p.lat);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1e-4;
    const spanY = maxY - minY || 1e-4;
    const availW = w - 2 * pad;
    const availH = height - 2 * pad;
    const scale = Math.min(availW / spanX, availH / spanY);
    const offX = (availW - spanX * scale) / 2;
    const offY = (availH - spanY * scale) / 2;
    return (p: GeoPoint) => ({
      x: pad + offX + (p.lng * k - minX) * scale,
      y: pad + offY + (maxY - p.lat) * scale, // invert y (north up)
    });
  }
  const proj = makeProjector();
  const line = (pts: GeoPoint[]) =>
    pts
      .map((p) => {
        const q = proj!(p);
        return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={[styles.wrap, { height, backgroundColor: surface, borderColor: border }]}
    >
      {proj && w > 0 && (
        <Svg width={w} height={height}>
          {/* the walked track (breadcrumb) */}
          {path && path.length > 1 && (
            <Polyline
              points={line(path)}
              fill="none"
              stroke={accent}
              strokeWidth={3}
              strokeOpacity={0.6}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {/* fallback: connect stops if no explicit track */}
          {!path && stops.length > 1 && (
            <Polyline
              points={line(stops)}
              fill="none"
              stroke={accent}
              strokeWidth={2}
              strokeOpacity={0.4}
              strokeDasharray="2 6"
            />
          )}
          {/* stop pins, numbered in sequence */}
          {stops.map((s, i) => {
            const q = proj(s);
            const locked = s.locked;
            return (
              <G key={i}>
                <Circle
                  cx={q.x}
                  cy={q.y}
                  r={12}
                  fill={locked ? lockFill : accent}
                  stroke={locked ? lockStroke : accent}
                  strokeWidth={2}
                />
                <SvgText
                  x={q.x}
                  y={q.y + 4}
                  fontSize={11}
                  fontFamily={fonts.textSemibold}
                  fill={locked ? lockText : onAccent}
                  textAnchor="middle"
                >
                  {i + 1}
                </SvgText>
              </G>
            );
          })}
          {/* live position */}
          {current &&
            (() => {
              const q = proj(current);
              return (
                <G>
                  <Circle cx={q.x} cy={q.y} r={10} fill={dot} fillOpacity={0.25} />
                  <Circle cx={q.x} cy={q.y} r={5} fill={dot} stroke={dotRing} strokeWidth={2} />
                </G>
              );
            })()}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
});
