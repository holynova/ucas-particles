// Motion component adapted from Ucas Studio’s published homepage. See README.md.
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three"; // ---------- shape helpers (unit space, y up, roughly 1 unit tall) ----------
const line = (x1, y1, x2, y2) => [[x1, y1, x2, y2]];
const arc = (cx, cy, r, a0, a1, n = 10) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n,
      t1 = a0 + ((a1 - a0) * (i + 1)) / n;
    out.push([
      cx + Math.cos(t0) * r,
      cy + Math.sin(t0) * r,
      cx + Math.cos(t1) * r,
      cy + Math.sin(t1) * r,
    ]);
  }
  return out;
};
const circle = (cx, cy, r) => arc(cx, cy, r, 0, Math.PI * 2, 20);
const rrect = (x0, y0, x1, y1, r) => {
  const P = Math.PI;
  return [
    ...line(x0 + r, y0, x1 - r, y0),
    ...arc(x1 - r, y0 + r, r, -P / 2, 0, 6),
    ...line(x1, y0 + r, x1, y1 - r),
    ...arc(x1 - r, y1 - r, r, 0, P / 2, 6),
    ...line(x1 - r, y1, x0 + r, y1),
    ...arc(x0 + r, y1 - r, r, P / 2, P, 6),
    ...line(x0, y1 - r, x0, y0 + r),
    ...arc(x0 + r, y0 + r, r, P, (3 * P) / 2, 6),
  ];
};
const pill = (x0, y0, x1, y1) => rrect(x0, y0, x1, y1, (y1 - y0) / 2);
const poly = (pts) => {
  const out = [];
  for (let i = 0; i < pts.length - 2; i += 2)
    out.push([pts[i], pts[i + 1], pts[i + 2], pts[i + 3]]);
  return out;
};
const WEB = {
  segs: [
    ...rrect(-0.82, -0.5, 0.82, 0.5, 0.04),
    ...line(-0.82, 0.41, 0.82, 0.41),
    ...circle(-0.76, 0.455, 0.013),
    ...circle(-0.72, 0.455, 0.013),
    ...circle(-0.68, 0.455, 0.013),
    ...pill(-0.3, 0.44, 0.3, 0.47),
    ...line(-0.72, 0.32, -0.42, 0.32),
    ...line(0.3, 0.32, 0.42, 0.32),
    ...line(0.48, 0.32, 0.6, 0.32),
    ...pill(0.64, 0.3, 0.74, 0.34),
    ...line(-0.72, 0.18, -0.1, 0.18),
    ...line(-0.72, 0.1, -0.2, 0.1),
    ...line(-0.72, 0, -0.3, 0),
    ...pill(-0.72, -0.12, -0.5, -0.07),
    ...rrect(0.02, -0.12, 0.72, 0.24, 0.02),
    ...rrect(-0.72, -0.44, -0.27, -0.2, 0.02),
    ...rrect(-0.22, -0.44, 0.23, -0.2, 0.02),
    ...rrect(0.28, -0.44, 0.72, -0.2, 0.02),
  ],
  fills: [[0.02, -0.12, 0.72, 0.24]],
};
const MOBILE = {
  segs: [
    ...rrect(-0.29, -0.56, 0.29, 0.56, 0.08),
    ...pill(-0.07, 0.49, 0.07, 0.52),
    ...circle(-0.19, 0.38, 0.045),
    ...line(-0.12, 0.4, 0.06, 0.4),
    ...line(-0.12, 0.36, 0, 0.36),
    ...rrect(-0.23, 0.02, 0.23, 0.29, 0.03),
    ...line(-0.23, -0.06, 0.2, -0.06),
    ...line(-0.23, -0.11, 0.12, -0.11),
    ...line(-0.23, -0.16, 0.16, -0.16),
    ...pill(-0.23, -0.38, 0.23, -0.29),
    ...line(-0.08, -0.5, 0.08, -0.5),
  ],
  fills: [[-0.23, 0.02, 0.23, 0.29]],
};
const DASHBOARD = {
  segs: [
    ...rrect(-0.85, -0.5, 0.85, 0.5, 0.04),
    ...line(-0.55, -0.5, -0.55, 0.5),
    ...circle(-0.74, 0.39, 0.04),
    ...line(-0.76, 0.24, -0.62, 0.24),
    ...line(-0.76, 0.16, -0.65, 0.16),
    ...line(-0.76, 0.08, -0.62, 0.08),
    ...line(-0.76, 0, -0.67, 0), // KPI tiles
    ...rrect(-0.48, 0.24, -0.18, 0.42, 0.02),
    ...rrect(-0.13, 0.24, 0.17, 0.42, 0.02),
    ...rrect(0.22, 0.24, 0.52, 0.42, 0.02),
    ...rrect(0.57, 0.24, 0.78, 0.42, 0.02), // line chart
    ...rrect(-0.48, -0.42, 0.3, 0.17, 0.02),
    ...poly([
      -0.44, -0.3, -0.34, -0.18, -0.24, -0.24, -0.12, -0.02, 0, -0.1, 0.1, 0.06,
      0.2, 0, 0.26, 0.1,
    ]),
    ...line(-0.44, -0.36, 0.26, -0.36), // bar chart
    ...rrect(0.35, -0.42, 0.78, 0.17, 0.02),
    ...line(0.41, -0.36, 0.41, -0.12),
    ...line(0.48, -0.36, 0.48, -0.02),
    ...line(0.55, -0.36, 0.55, -0.2),
    ...line(0.62, -0.36, 0.62, 0.06),
    ...line(0.69, -0.36, 0.69, -0.08),
    ...line(0.74, -0.36, 0.74, 0.1),
  ],
  fills: [],
}; // dashed construction guide
const dashed = (x1, y1, x2, y2, n = 14) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n,
      t1 = (i + 0.55) / n;
    out.push([
      x1 + (x2 - x1) * t0,
      y1 + (y2 - y1) * t0,
      x1 + (x2 - x1) * t1,
      y1 + (y2 - y1) * t1,
    ]);
  }
  return out;
}; // Brand identity: a logo mark being constructed on its geometry (circles, guides, clear-space
// corners), next to a type specimen ("Aa") and a colour palette.
const BRAND = {
  segs: [
    // construction geometry
    ...circle(-0.36, 0, 0.34),
    ...arc(-0.36, 0, 0.21, 0, Math.PI * 2, 18),
    ...dashed(-0.8, 0, 0.08, 0, 18),
    ...dashed(-0.36, -0.46, -0.36, 0.46, 12),
    ...dashed(-0.6, -0.24, -0.12, 0.24, 10),
    ...dashed(-0.6, 0.24, -0.12, -0.24, 10), // the mark: a bold geometric U
    ...line(-0.5, 0.2, -0.5, -0.02),
    ...line(-0.42, 0.2, -0.42, -0.02),
    ...line(-0.3, 0.2, -0.3, -0.02),
    ...line(-0.22, 0.2, -0.22, -0.02),
    ...line(-0.5, 0.2, -0.42, 0.2),
    ...line(-0.3, 0.2, -0.22, 0.2),
    ...arc(-0.36, -0.02, 0.14, Math.PI, Math.PI * 2, 16),
    ...arc(-0.36, -0.02, 0.06, Math.PI, Math.PI * 2, 10), // clear-space corners
    ...line(-0.78, 0.44, -0.7, 0.44),
    ...line(-0.78, 0.44, -0.78, 0.36),
    ...line(0.06, 0.44, -0.02, 0.44),
    ...line(0.06, 0.44, 0.06, 0.36),
    ...line(-0.78, -0.44, -0.7, -0.44),
    ...line(-0.78, -0.44, -0.78, -0.36),
    ...line(0.06, -0.44, -0.02, -0.44),
    ...line(0.06, -0.44, 0.06, -0.36), // palette
    ...rrect(0.22, -0.42, 0.34, -0.3, 0.015),
    ...rrect(0.38, -0.42, 0.5, -0.3, 0.015),
    ...rrect(0.54, -0.42, 0.66, -0.3, 0.015),
    ...rrect(0.7, -0.42, 0.82, -0.3, 0.015), // type specimen rules
    ...line(0.22, -0.2, 0.82, -0.2),
    ...line(0.22, -0.13, 0.62, -0.13),
  ],
  fills: [
    [-0.5, -0.02, -0.42, 0.2],
    [-0.3, -0.02, -0.22, 0.2],
    [0.22, -0.42, 0.34, -0.3],
  ],
}; // Points sampled from text drawn on a 2D canvas (unit space: 1 = 300px).
function textPoints(text, cx, cy, px, fill) {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 300;
  const g = c.getContext("2d");
  g.fillStyle = "#000";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `500 ${px}px 'Aeonik Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
  g.fillText(text, 450, 160);
  const d = g.getImageData(0, 0, 900, 300).data;
  const A = (x, y) =>
    x < 0 || y < 0 || x >= 900 || y >= 300 ? 0 : d[(y * 900 + x) * 4 + 3];
  const pts = [];
  for (let y = 0; y < 300; y += 2)
    for (let x = 0; x < 900; x += 2) {
      if (A(x, y) < 128) continue;
      const edge =
        A(x - 4, y) < 128 ||
        A(x + 4, y) < 128 ||
        A(x, y - 4) < 128 ||
        A(x, y + 4) < 128;
      if (edge || Math.random() < fill)
        pts.push(cx + (x - 450) / 300, cy - (y - 160) / 300);
    }
  return pts;
} // the brand scene: construction drawing plus an "Aa" specimen
function brandScene(n) {
  const nText = Math.round(n * 0.22);
  const base = sampleShape(BRAND, n - nText);
  const pts = textPoints("Aa", 0.52, 0.16, 150, 0.3);
  const out = new Float32Array(n * 2);
  out.set(base);
  const m = pts.length / 2;
  for (let i = n - nText; i < n; i++) {
    const k = Math.floor(Math.random() * m) * 2;
    out[i * 2] = m ? pts[k] : 0.52;
    out[i * 2 + 1] = m ? pts[k + 1] : 0.16;
  }
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const x = out[i * 2],
      y = out[i * 2 + 1];
    out[i * 2] = out[j * 2];
    out[i * 2 + 1] = out[j * 2 + 1];
    out[j * 2] = x;
    out[j * 2 + 1] = y;
  }
  return out;
} // Wordmark points sampled from text drawn on a 2D canvas.
function wordmark(text, n) {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 300;
  const g = c.getContext("2d");
  g.fillStyle = "#000";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font =
    "500 220px 'Aeonik Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  g.fillText(text, 450, 160);
  const d = g.getImageData(0, 0, 900, 300).data;
  const A = (x, y) =>
    x < 0 || y < 0 || x >= 900 || y >= 300 ? 0 : d[(y * 900 + x) * 4 + 3];
  const pts = [];
  for (let y = 0; y < 300; y += 2)
    for (let x = 0; x < 900; x += 2) {
      if (A(x, y) < 128) continue;
      const edge =
        A(x - 4, y) < 128 ||
        A(x + 4, y) < 128 ||
        A(x, y - 4) < 128 ||
        A(x, y + 4) < 128;
      if (edge || Math.random() < 0.35)
        pts.push((x - 450) / 300, -(y - 160) / 300);
    }
  const out = new Float32Array(n * 2);
  const m = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(Math.random() * m) * 2;
    out[i * 2] = pts[k] ?? 0;
    out[i * 2 + 1] = pts[k + 1] ?? 0;
  }
  return out;
}
function sampleShape(shape, n) {
  const { segs, fills } = shape;
  const lens = segs.map(([a, b, c, d]) => Math.hypot(c - a, d - b));
  const total = lens.reduce((s, l) => s + l, 0);
  const nFill = fills.length ? Math.round(n * 0.18) : 0;
  const nLine = n - nFill;
  const out = new Float32Array(n * 2);
  let si = 0,
    acc = 0;
  for (let i = 0; i < nLine; i++) {
    const target = ((i + Math.random()) / nLine) * total;
    while (si < segs.length - 1 && acc + lens[si] < target) acc += lens[si++];
    const t = lens[si] ? (target - acc) / lens[si] : 0;
    const [a, b, c, d] = segs[si];
    out[i * 2] = a + (c - a) * t;
    out[i * 2 + 1] = b + (d - b) * t;
  } // a halftone fill inside image areas, denser toward the bottom
  for (let i = nLine; i < n; i++) {
    const [x0, y0, x1, y1] = fills[i % fills.length];
    const v = Math.pow(Math.random(), 1.8);
    out[i * 2] = x0 + Math.random() * (x1 - x0);
    out[i * 2 + 1] = y0 + v * (y1 - y0);
  } // shuffle so every shape's points are spread across all particles
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const x = out[i * 2],
      y = out[i * 2 + 1];
    out[i * 2] = out[j * 2];
    out[i * 2 + 1] = out[j * 2 + 1];
    out[j * 2] = x;
    out[j * 2 + 1] = y;
  }
  return out;
}
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const VERT = `
uniform float uSize, uDpr;
uniform vec2 uRes;
attribute float aAlpha;
attribute float aKind; // 0 dot, 1 horizontal streak
attribute float aScale;
varying float vAlpha;
varying float vKind;
void main(){
  vAlpha = aAlpha;
  vKind = aKind;
  // every dot is the same whole number of device pixels, centred on a pixel, so moving dots
  // never render one pixel larger or smaller than the rest
  float ps = max(1.0, floor(uSize * uDpr * aScale + 0.5)) * (aKind > 0.5 ? 4.0 : 1.0);
  gl_PointSize = ps;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec2 px = (p.xy / p.w * 0.5 + 0.5) * uRes;
  px = (mod(ps, 2.0) > 0.5 ? floor(px) + 0.5 : floor(px + 0.5));
  p.xy = (px / uRes * 2.0 - 1.0) * p.w;
  gl_Position = p;
}`; // Square dots (halftone) and thin horizontal streaks like scanlines.
const FRAG = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
varying float vKind;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  if (vKind > 0.5 && abs(c.y) > 0.09) discard;
  gl_FragColor = vec4(uColor, uOpacity * vAlpha);
}`; // The real ratio of device pixels to layout pixels, including browser zoom and any CSS scale
// (e.g. a scaled preview), so the canvas is never drawn small and blown up.
// Site-wide particle size per breakpoint (Framer: phone < 810px, tablet < 1200px). The grid between
// dots is a whole number of device pixels, so every gap is the same width.
const bpDot = (desktop) =>
  window.innerWidth < 810 ? 1.2 : window.innerWidth < 1200 ? 1.6 : desktop;
const bpGrid = (desktop, dpr) => {
  const g =
    window.innerWidth < 810 ? 1.5 : window.innerWidth < 1200 ? 2 : desktop;
  return Math.max(1, Math.round(g * dpr)) / dpr;
};
const pixelRatio = (el) => {
  const r = el.getBoundingClientRect();
  const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
  return Math.min(3, Math.max(1, (window.devicePixelRatio || 1) * k));
}; // Colours may be Framer colour styles (CSS variables with light and dark values). Read the value
// that applies right now, and redraw when the visitor's system switches between light and dark.
const resolveColor = (c, el) => {
  const m = /var\((--[^,)]+)(?:,\s*([^)]+))?\)/.exec(c || "");
  if (!m) return c;
  const v =
    getComputedStyle(el).getPropertyValue(m[1]).trim() ||
    m[2] ||
    "rgb(17, 17, 16)"; // some browsers report the style as light-dark(light, dark): pick the side in use
  const ld = /^light-dark\((.*)\)$/.exec(v);
  if (!ld) return v;
  let depth = 0,
    cut = -1;
  for (let i = 0; i < ld[1].length; i++) {
    const ch = ld[1][i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && !depth) {
      cut = i;
      break;
    }
  }
  if (cut < 0) return v;
  return (siteIsDark() ? ld[1].slice(cut + 1) : ld[1].slice(0, cut)).trim();
}; // dark when the site toggle says so (<html data-theme>), otherwise follow the system setting
const siteIsDark = () => {
  const t = document.documentElement.dataset.theme;
  if (t === "dark" || t === "light") return t === "dark";
  return !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
};
const useColorScheme = () => {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" ? siteIsDark() : false,
  );
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    const on = () => setDark(siteIsDark());
    query?.addEventListener?.("change", on);
    window.addEventListener("ucas-theme", on);
    return () => {
      query?.removeEventListener?.("change", on);
      window.removeEventListener("ucas-theme", on);
    };
  }, []);
  return dark;
};
export default function IdeaToProduct(props) {
  const scheme = useColorScheme();
  const {
    color,
    particles,
    opacity,
    size,
    grid,
    centerX,
    centerY,
    scale,
    speed,
    wordmarkText,
    bleed = 480,
    bangDown = 130,
    tilt = 18,
    style,
  } = props;
  const wrapRef = useRef(null); // a theme switch only recolours the dots: rebuilding the scene would stall the theme wipe
  const recolor = useRef(null);
  const setTiltAmp = useRef(null);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    } catch {
      return;
    }
    let dpr = pixelRatio(wrap);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0, 0);
    const canvas = renderer.domElement; // the canvas reaches past the stage above and below, so the big bang can spread over the
    // neighbouring sections; it never takes clicks
    Object.assign(canvas.style, {
      position: "absolute",
      left: "0",
      right: "0",
      width: "100%",
      display: "block",
      pointerEvents: "none",
      imageRendering: "pixelated",
    }); // the canvas only reaches as far past the stage as the big bang can actually throw particles, so the
    // GPU clears and composites no more pixels than needed every frame
    let reach = bleed;
    const placeCanvas = () => {
      canvas.style.top = `${-reach}px`;
      canvas.style.bottom = `${-reach}px`;
      canvas.style.height = `calc(100% + ${reach * 2}px)`;
    };
    placeCanvas();
    wrap.appendChild(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1e3, 1e3); // phones: smaller dots on a tighter grid and bigger scenes, so the shapes read as fine drawings;
    // the particle count still stays well below desktop to keep every frame short
    const phone = window.innerWidth < 810;
    const N = Math.round(
      particles * (phone ? 0.9 : window.innerWidth < 1200 ? 0.85 : 1),
    );
    const DUST = Math.round(N * (phone ? 0.12 : 0.09)); // particles that stay as grain around the product
    const pos = new Float32Array(N * 3);
    const alpha = new Float32Array(N);
    const kind = new Float32Array(N);
    const pscale = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      kind[i] = Math.random() < 0.006 ? 1 : 0; // a rare scanline streak
      pscale[i] = 1; // every particle on the site has the same size
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
    geo.setAttribute("aScale", new THREE.BufferAttribute(pscale, 1));
    const col = new THREE.Color(resolveColor(color, wrap));
    const uniforms = {
      uSize: { value: bpDot(size) },
      uDpr: { value: dpr },
      uRes: { value: new THREE.Vector2(1, 1) },
      uColor: { value: new THREE.Vector3(col.r, col.g, col.b) },
      uOpacity: { value: opacity },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    const word = () => wordmark(wordmarkText || "Ucas", N);
    const SHAPES = [
      sampleShape(WEB, N),
      sampleShape(MOBILE, N),
      sampleShape(DASHBOARD, N),
      brandScene(N),
      word(),
    ];
    document.fonts?.ready.then(() => {
      SHAPES[3] = brandScene(N);
      SHAPES[4] = word();
    }); // per-particle state: world position (pixels, origin = shape centre, z towards the viewer)
    const x = new Float32Array(N),
      y = new Float32Array(N),
      z = new Float32Array(N);
    const vx = new Float32Array(N),
      vy = new Float32Array(N),
      vz = new Float32Array(N);
    const sx = new Float32Array(N),
      sy = new Float32Array(N),
      sz = new Float32Array(N);
    const ox = new Float32Array(N),
      oy = new Float32Array(N); // scatter offset from the cursor
    const ovx = new Float32Array(N),
      ovy = new Float32Array(N);
    const delay = new Float32Array(N),
      ang = new Float32Array(N); // a random direction and depth inside the seed sphere, reused for the big bang
    const bx = new Float32Array(N),
      by = new Float32Array(N),
      bz = new Float32Array(N),
      br = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      delay[i] = Math.random();
      ang[i] = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1,
        t = Math.random() * Math.PI * 2,
        q = Math.sqrt(1 - u * u);
      bx[i] = q * Math.cos(t);
      by[i] = q * Math.sin(t);
      bz[i] = u;
      br[i] = Math.cbrt(Math.random());
    }
    let W = 1,
      H = 1,
      IH = 1,
      S = 300,
      CX = 0,
      CY = 0;
    const smooth = (a, b, v) => {
      const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }; // The dust is a soft, even cloud: random homes with a gaussian falloff and random brightness.
    // Every home sits inside the frame and fades near its edges, so nothing is cut off.
    const dhx = new Float32Array(DUST),
      dhy = new Float32Array(DUST),
      dal = new Float32Array(DUST);
    const gauss = () =>
      Math.sqrt(-2 * Math.log(1 - Math.random())) *
      Math.cos(Math.random() * Math.PI * 2); // scenes stay inside the content column; only the big bang may use the whole stage
    const colHalf = () => Math.min(W / 2 - 12, 380); // The background sits within the content column (it may spill ~20px past each side). Density
    // is fairly even, with a few soft clumps, and thins out towards the edges with a ragged,
    // random falloff (like the portrait edges), so it never reads as a box.
    const placeDust = () => {
      const hx = colHalf(),
        hy = IH / 2;
      const nc = 2 + Math.floor(Math.random() * 3);
      const cl = [];
      for (let c = 0; c < nc; c++)
        cl.push([
          (Math.random() * 2 - 1) * hx * 0.7,
          (Math.random() * 2 - 1) * hy * 0.5,
          hx * (0.15 + Math.random() * 0.15),
        ]);
      const wob = [
        Math.random() * 6.3,
        Math.random() * 6.3,
        Math.random() * 6.3,
      ];
      for (let i = 0; i < DUST; i++) {
        let px = 0,
          py = 0;
        for (let tries = 0; tries < 40; tries++) {
          if (Math.random() < 0.3) {
            const c = cl[Math.floor(Math.random() * nc)];
            px = c[0] + gauss() * c[2];
            py = c[1] + gauss() * c[2] * 0.7;
          } else {
            px = (Math.random() * 2 - 1) * (hx + 24);
            py = (Math.random() * 2 - 1) * (hy + 30);
          } // ragged edge: the fade starts at a wobbly, random distance from the border
          const ex = Math.abs(px) / hx,
            ey = Math.abs(py) / hy;
          const edge =
            0.62 +
            0.1 * Math.sin(py * 0.02 + wob[0]) +
            0.08 * Math.sin(px * 0.017 + wob[1]) +
            0.06 * Math.sin((px + py) * 0.031 + wob[2]);
          const r = Math.pow(Math.pow(ex, 3) + Math.pow(ey, 3), 1 / 3);
          const keep = 1 - smooth(edge, 1.05 + Math.random() * 0.06, r);
          if (Math.random() < keep * keep) break;
        }
        dhx[i] = px;
        dhy[i] = py;
        dal[i] = 0.97; // same tone as the scene; the background reads lighter only through its sparser density
      }
    };
    const resize = () => {
      W = Math.max(1, wrap.clientWidth);
      IH = Math.max(1, wrap.clientHeight);
      {
        const CYp = Math.abs((centerY / 100 - 0.5) * IH);
        const Rb = Math.min(W * 0.45, IH / 2 + bangDown + 60) * 1.17; // lumpy edge reaches 1.16 R
        reach = Math.min(
          bleed,
          Math.max(40, Math.ceil(Rb + CYp - IH / 2 + 16)),
        );
        placeCanvas();
      }
      H = IH + reach * 2;
      dpr = pixelRatio(wrap);
      renderer.setPixelRatio(dpr);
      uniforms.uDpr.value = dpr;
      renderer.setSize(W, H, false);
      uniforms.uRes.value.set(W * dpr, H * dpr);
      camera.left = -W / 2;
      camera.right = W / 2;
      camera.top = H / 2;
      camera.bottom = -H / 2;
      camera.updateProjectionMatrix();
      S = Math.min(IH * 0.62, W * (phone ? 0.52 : 0.3)) * scale;
      CX = (centerX / 100 - 0.5) * W;
      CY = -(centerY / 100 - 0.5) * IH;
      placeDust();
    };
    resize();
    const TL = [
      { kind: "seed", dur: 2.2 },
      { kind: "bang", dur: 2.6 },
    ];
    SHAPES.forEach((_, k) => {
      if (k) TL.push({ kind: "scatter", dur: 0.9 });
      TL.push(
        { kind: "form", dur: 1.7, shape: k },
        { kind: "hold", dur: 3.4, shape: k },
      );
    });
    TL.push({ kind: "collapse", dur: 2.2 }, { kind: "void", dur: 0.9 });
    const proj = (zz) => {
      const F = S * 3.2;
      return F / Math.max(F * 0.25, F - zz);
    };
    let si = 0,
      st = 0;
    const enter = (k) => {
      si = k;
      st = 0;
      for (let i = 0; i < N; i++) {
        sx[i] = x[i];
        sy[i] = y[i];
        sz[i] = z[i];
      }
      if (TL[si].kind === "seed") {
        x.fill(0);
        y.fill(0);
        z.fill(0);
        alpha.fill(0);
      }
      if (TL[si].kind === "bang" || TL[si].kind === "scatter") {
        // Big bang: particles are thrown to random spots all around. Between scenes they
        // only scatter a short way. Every target is kept inside the frame.
        const bang = TL[si].kind === "bang";
        if (!bang)
          placeDust(); // the next scene spreads its spare particles somewhere new // Big bang: debris flies out in every direction and settles in a roughly round cloud that
        // spills over the text above and the cards below. Density is patchy and random, the
        // centre is hollow and the edge thins out softly instead of ending in an outline.
        // scene changes reuse the same burst, a little smaller, so every change feels like the first
        // sized by the width (about three quarters of it), so it spreads wide over the page
        // a round cloud: its dense body stays above the Selected Work title and only a few
        // stray specks (the gaussian tail) reach that line, so it never runs into the cards
        const R =
          Math.min(W * 0.45, IH / 2 + bangDown + 60) * (bang ? 1 : 0.62);
        const RY = R;
        const pf = [
          0.004 + Math.random() * 0.008,
          Math.random() * 6.3,
          0.004 + Math.random() * 0.008,
          Math.random() * 6.3,
          0.003 + Math.random() * 0.006,
          Math.random() * 6.3,
        ];
        const lobes = [
          Math.random() * 6.3,
          Math.random() * 6.3,
          Math.random() * 6.3,
        ];
        for (let i = 0; i < N; i++) {
          let X = 0,
            Y = 0,
            Z = 0;
          if (!bang) {
            // scene change: each particle loosens a short way from where it is, hangs there
            // for a moment, then flows into the next shape (same easing as after the bang)
            const t = Math.random() * Math.PI * 2;
            const r =
              S *
              (i < DUST
                ? 0.03 + 0.06 * Math.random()
                : 0.03 + 0.15 * Math.pow(Math.random(), 1.4));
            X = x[i] + Math.cos(t) * r;
            Y = y[i] + Math.sin(t) * r;
            Z = (Math.random() - 0.5) * S * 0.25;
          } else {
            for (let tries = 0; tries < 40; tries++) {
              const a = Math.random() * Math.PI * 2; // a slightly lumpy circle, never a perfect ring
              const edge =
                R *
                (1 +
                  0.07 * Math.sin(3 * a + lobes[0]) +
                  0.05 * Math.sin(5 * a + lobes[1]) +
                  0.04 * Math.sin(9 * a + lobes[2])); // gaussian falloff: dense in the middle, fewer and fewer specks further out
              let rr = 2;
              while (rr > 1) rr = Math.abs(gauss()) * 0.45;
              X = Math.cos(a) * rr * edge;
              Y = Math.sin(a) * rr * edge * (RY / R);
              const patch =
                0.5 +
                0.5 *
                  Math.sin(X * pf[0] + pf[1]) *
                  Math.sin(Y * pf[2] + pf[3]) *
                  Math.sin((X - Y) * pf[4] + pf[5]); // never reach the canvas edge above/below: fade out well before it
              const vy = 1;
              const keep =
                (0.25 + 0.75 * patch * patch) * (rr < 0.06 ? 0.4 : 1) * vy;
              if (Math.random() < keep) break;
            }
            Z = (Math.random() - 0.5) * S * 0.4;
          } // keep the on-screen spot where it was meant to be, whatever its depth
          const p = proj(Z);
          vx[i] = X / p;
          vy[i] = Y / p;
          vz[i] = Z;
        }
      }
    };
    enter(0); // cursor: track velocity so a quick sweep scatters more
    const mouse = { x: -1e5, y: -1e5, px: -1e5, py: -1e5, speed: 0 }; // ucas-tilt: while the cursor is over the stage the product turns a little towards it, a real
    // rotation about the vertical axis through the existing perspective; the dust sits behind the
    // product and so drifts the other way, which is what gives the sense of depth
    let hover = false,
      tiltNow = 0,
      tiltTarget = 0,
      tiltAmp = tilt;
    const onLeave = (e) => {
      if (e && e.relatedTarget) return;
      hover = false;
      wake();
    };
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect();
      mouse.x = e.clientX - r.left - r.width / 2 - CX;
      mouse.y = -(e.clientY - r.top - r.height / 2) - CY;
      hover = Math.abs(mouse.x + CX) < W / 2 && Math.abs(mouse.y + CY) < IH / 2;
      if (visible) wake();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    window.addEventListener("blur", onLeave);
    let visible = true;
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible) wake();
    });
    io.observe(wrap);
    let clock = 0,
      energy = 0,
      offActive = false;
    const G = bpGrid(grid, dpr);
    const snap = (v) => Math.round(v / G) * G;
    const step = (dt) => {
      clock += dt;
      st += dt;
      const s = TL[si];
      const u = Math.min(1, st / s.dur);
      const K = S / 300;
      const shape = s.shape !== undefined ? SHAPES[s.shape] : null;
      const k = Math.min(1, dt * 5); // per-frame easing factors, tuned at 60 fps and scaled to the real frame time, so the motion
      // looks the same at the 30 fps idle rate
      const fr = (f) => 1 - Math.pow(1 - f, dt * 60);
      const hold = fr(0.2);
      for (let i = 0; i < N; i++) {
        const dust = i < DUST;
        let a = 0.97; // target brightness
        if (s.kind === "seed") {
          // a point of light swells into a small, shimmering sphere, then trembles
          // only a growing handful of particles light up, so it starts from nothing and stays a
          // sparkle rather than a solid disc
          const g = ease(Math.min(1, u / 0.9));
          const r = S * 0.05 * g * br[i] * (1 + Math.sin(clock * 3 + i) * 0.06);
          const th = clock * 0.8;
          const X = bx[i] * r,
            Z = bz[i] * r;
          const shake =
            1 + Math.max(0, u - 0.85) * Math.sin(clock * 45 + i) * 0.5;
          x[i] = (X * Math.cos(th) - Z * Math.sin(th)) * shake;
          y[i] = by[i] * r * shake;
          z[i] = (X * Math.sin(th) + Z * Math.cos(th)) * shake;
          a =
            delay[i] < 0.06 * g * g
              ? 0.97 * (0.5 + 0.5 * Math.sin(clock * 7 + i))
              : 0;
        } else if (s.kind === "scatter") {
          // the scene breaks into loose particles, then the next scene forms straight from there
          const e1 = 1 - Math.pow(1 - Math.min(1, st / 0.5), 3);
          const k2 = 1;
          x[i] =
            (sx[i] + (vx[i] - sx[i]) * e1) * k2 + Math.sin(clock * 2 + i) * 2;
          y[i] =
            (sy[i] + (vy[i] - sy[i]) * e1) * k2 +
            Math.cos(clock * 1.7 + i * 1.3) * 2;
          z[i] = (sz[i] + (vz[i] - sz[i]) * e1) * k2;
          if (dust) a = dal[i];
        } else if (s.kind === "bang") {
          // fly out fast to the random spot (vx/vy/vz hold it), then hover there a while
          const e = 1 - Math.pow(1 - Math.min(1, st / 0.7), 3);
          x[i] = sx[i] + (vx[i] - sx[i]) * e + Math.sin(clock * 2 + i) * 3 * e;
          y[i] =
            sy[i] +
            (vy[i] - sy[i]) * e +
            Math.cos(clock * 1.7 + i * 1.3) * 3 * e;
          z[i] = sz[i] + (vz[i] - sz[i]) * e; // only about a third of the particles show in the burst; the rest fade in as the scene forms
          if (ang[i] > Math.PI * 0.65) a = 0;
        } else if (s.kind === "collapse") {
          // everything falls back into a single point and goes out
          const e = Math.pow(
            Math.min(1, Math.max(0, (u - delay[i] * 0.25) / 0.75)),
            2.4,
          );
          x[i] = sx[i] * (1 - e);
          y[i] = sy[i] * (1 - e);
          z[i] = sz[i] * (1 - e);
          a = (dust ? dal[i] : 0.97) * (1 - smooth(0.75, 1, u));
        } else if (s.kind === "void") {
          a = 0;
        } else if (dust) {
          // the dust drifts gently around its home
          const tx =
            dhx[i] + Math.sin(clock * (0.3 + delay[i] * 0.4) + ang[i]) * 6;
          const ty =
            dhy[i] +
            Math.cos(clock * (0.25 + delay[i] * 0.35) + ang[i] * 1.7) * 4;
          const prev = TL[si - 1]?.kind;
          const f = fr(
            s.kind === "form" && (prev === "bang" || prev === "scatter")
              ? ease(u) * 0.25
              : 0.06,
          );
          x[i] += (tx - x[i]) * f;
          y[i] += (ty - y[i]) * f;
          z[i] += (0 - z[i]) * f;
          a = dal[i];
        } else if (shape) {
          const tx = snap(shape[i * 2] * S),
            ty = snap(shape[i * 2 + 1] * S);
          if (s.kind === "hold") {
            x[i] += (tx - x[i]) * hold;
            y[i] += (ty - y[i]) * hold;
            z[i] += (0 - z[i]) * hold;
          } else {
            const d = delay[i] * 0.3;
            const e = ease(Math.min(1, Math.max(0, (u - d) / (1 - 0.3))));
            const wob = (1 - e) * e * 18 * K;
            x[i] = sx[i] + (tx - sx[i]) * e + Math.sin(i * 1.7) * wob;
            y[i] = sy[i] + (ty - sy[i]) * e + Math.cos(i * 2.3) * wob;
            z[i] = sz[i] * (1 - e);
          }
        } // flicker gives the halftone a living grain; depth dims what is far away
        const flick = 0.85 + 0.15 * Math.sin(clock * (3 + delay[i] * 5) + i);
        const depth = Math.min(1, Math.max(0.3, 1 + z[i] / (S * 1.6)));
        alpha[i] +=
          (a * flick * depth - alpha[i]) *
          (s.kind === "seed" || s.kind === "void" ? 1 : k);
      } // cursor scatter: particles near the pointer are flung the way it moves, then glide home
      const mvx = mouse.x - mouse.px,
        mvy = mouse.y - mouse.py;
      mouse.speed += (Math.min(60, Math.hypot(mvx, mvy)) - mouse.speed) * 0.3;
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      const R = 80,
        R2 = R * R,
        MAXD = 110;
      const ml = Math.hypot(mvx, mvy);
      const dirX = ml > 0.01 ? mvx / ml : 0,
        dirY = ml > 0.01 ? mvy / ml : 0;
      energy = mouse.speed > 0.3 ? Math.min(2.2, mouse.speed / 7) : 0; // the wind is only worked out while the cursor moves or some dots are still drifting back
      const windOn = energy > 0 || offActive; // head-on → turned towards the cursor, frame-rate independent, settles exactly
      tiltTarget = hover
        ? Math.max(-1, Math.min(1, (mouse.x + CX) / (W / 2)))
        : 0;
      tiltNow += (tiltTarget - tiltNow) * fr(0.09);
      if (Math.abs(tiltNow - tiltTarget) < 0.0015) tiltNow = tiltTarget;
      const ta = tiltNow * tiltAmp * 0.012,
        tca = Math.cos(ta),
        tsa = Math.sin(ta);
      const dustBack = S * 0.35;
      let anyOff = false;
      for (let i = 0; i < N; i++) {
        // turn about the vertical axis (dust a little behind the product), then perspective
        const zt = i < DUST ? z[i] - dustBack : z[i];
        const xr = x[i] * tca + zt * tsa;
        const zr = zt * tca - x[i] * tsa; // perspective: things nearer the viewer spread out
        const p = proj(z[i] + (zr - zt));
        if (!windOn) {
          pos[i * 3] = xr * p + CX;
          pos[i * 3 + 1] = y[i] * p + CY;
          continue;
        }
        const px = xr * p + ox[i],
          py = y[i] * p + oy[i];
        const dx = px - mouse.x,
          dy = py - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2 && energy > 0) {
          const f = (1 - d2 / R2) * energy * 2600 * dt;
          const side = (ang[i] / Math.PI - 1) * 0.7;
          const kk = 0.5 + delay[i];
          ovx[i] += (dirX - dirY * side) * f * kk;
          ovy[i] += (dirY + dirX * side) * f * kk;
        }
        const o2 = ox[i] * ox[i] + oy[i] * oy[i];
        if (o2 > 1) {
          const fl = Math.sqrt(o2) * 5.4 * dt;
          ovx[i] += Math.sin(clock * 9 + i) * fl;
          ovy[i] += Math.cos(clock * 7 + i * 1.3) * fl;
        }
        ovx[i] += -ox[i] * 11 * dt;
        ovy[i] += -oy[i] * 11 * dt;
        ovx[i] *= 0.9;
        ovy[i] *= 0.9;
        ox[i] += ovx[i] * dt;
        oy[i] += ovy[i] * dt;
        const ol = Math.hypot(ox[i], oy[i]);
        if (ol > MAXD) {
          ox[i] *= MAXD / ol;
          oy[i] *= MAXD / ol;
        }
        if (
          Math.abs(ox[i]) < 0.05 &&
          Math.abs(oy[i]) < 0.05 &&
          Math.abs(ovx[i]) < 0.05 &&
          Math.abs(ovy[i]) < 0.05
        )
          ox[i] = oy[i] = ovx[i] = ovy[i] = 0;
        else anyOff = true;
        pos[i * 3] = xr * p + ox[i] + CX;
        pos[i * 3 + 1] = y[i] * p + oy[i] + CY;
      }
      offActive = anyOff || tiltNow !== tiltTarget;
      if (u >= 1) enter((si + 1) % TL.length);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aAlpha.needsUpdate = true;
    };
    const render = () => renderer.render(scene, camera); // reduced motion: one finished scene, settled again whenever the size changes. 3s of settling
    // stays inside the hold stage (3.4s), so it never runs on into the next scatter
    const still = () => {
      enter(TL.findIndex((t) => t.kind === "hold" && t.shape === 1));
      for (let k = 0; k < 90; k++) step(1 / 30);
      render();
    };
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) still();
      else render();
    });
    ro.observe(wrap); // 60 frames a second while particles travel or the cursor pushes them, 30 while a scene holds
    // (only the grain shimmers then); nothing runs while the stage is off screen
    let raf = 0,
      last = 0,
      lastDraw = 0;
    const frame = (now) => {
      raf = 0;
      if (!visible) return;
      raf = requestAnimationFrame(frame);
      if (window.__ucasLoading) {
        last = now;
        return; // waits for the page loader
      }
      const kind = TL[si].kind;
      const fps =
        (kind === "hold" || kind === "void") && !offActive && energy === 0
          ? 30
          : 60;
      if (now - lastDraw < 1e3 / fps - 2) return;
      lastDraw = now;
      const dt = Math.min(0.05, last ? (now - last) / 1e3 : 0);
      last = now;
      if (dt <= 0) return;
      step(dt * speed);
      render();
    };
    const wake = () => {
      if (!raf && visible && !reduce) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    if (reduce) {
      still();
    } else {
      step(0.001);
      render();
      raf = requestAnimationFrame(frame);
    }
    setTiltAmp.current = (v) => {
      tiltAmp = v;
      wake();
    };
    recolor.current = () => {
      const c = new THREE.Color(resolveColor(color, wrap));
      uniforms.uColor.value.set(c.r, c.g, c.b);
      render();
    };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      window.removeEventListener("blur", onLeave);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [
    color,
    particles,
    opacity,
    size,
    grid,
    centerX,
    centerY,
    scale,
    speed,
    wordmarkText,
    bleed,
    bangDown,
  ]);
  useEffect(() => recolor.current?.(), [scheme]);
  useEffect(() => setTiltAmp.current?.(tilt), [tilt]);
  return /*#__PURE__*/ _jsx("div", {
    ref: wrapRef,
    "aria-hidden": true,
    style: {
      ...style,
      position: "relative",
      overflow: "visible",
      pointerEvents: "none",
    },
  });
}
