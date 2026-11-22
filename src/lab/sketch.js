// All coordinates use half the canvas height as one unit.
export const TAU = Math.PI * 2;
export const series = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
export const fract = (x) => x - Math.floor(x);
export const mix = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function arc(
  dot,
  cx,
  cy,
  rx,
  ry,
  start,
  sweep,
  count,
  radius = 0.005,
  alpha = 0.65,
) {
  for (let i = 0; i < count; i++) {
    const a = start + (sweep * i) / (count - 1);
    dot(cx + rx * Math.cos(a), cy + ry * Math.sin(a), radius, alpha);
  }
}

export function view3D(yaw, pitch, scale = 1) {
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  return (x, y, z) => {
    const side = x * cy + z * sy,
      depth = z * cy - x * sy;
    return [scale * side, scale * (y * cp - depth * sp), depth * cp + y * sp];
  };
}

export function surfacePoint(dot, project, x, y, z, r = 0.006) {
  const [px, py, depth] = project(x, y, z);
  dot(px, py, r, clamp(0.57 + 0.37 * depth, 0.19, 1));
}
