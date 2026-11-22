// Motion component adapted from Ucas Studio’s published homepage. See README.md.
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three"; /**
 * Team Portrait — a photo redrawn as a living halftone, after the dotted portrait reference.
 * Only the head is kept: the photo is straightened, framed on the face and faded out in an oval.
 * Tone is carried by particle density alone (every dot has the site-wide size and colour).
 * Density follows the reference, inverted for a light page: shadows are dense, light falls away.
 * The dots gather when the portrait scrolls into view, shimmer softly with scanline slips,
 * and blow away from the cursor like the hero.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */ // The gather, the shimmer, the scanline slip and the edge fade all run here on the GPU, so an idle
// portrait costs one draw call a frame. Only the cursor wind (a few hundred dots at most) is done on the
// CPU and passed in as aOff.
const VERT = `
uniform float uSize, uDpr, uGather, uClock, uSlipY0, uSlipY1, uSlipDx, uTilt, uTiltAmp;
uniform vec2 uRes, uHalf;
attribute vec2 aStart;
attribute vec2 aOff;
attribute float aBase, aDelay, aAng, aIdx;
attribute float aKind; // 0 dot, 1 horizontal streak
attribute float aDepth; // head depth, 0 rim/halo … 1 centre of the face (smooth)
varying float vAlpha;
varying float vKind;
void main(){
  float e = clamp((uGather - aDelay * 0.5) / 0.5, 0.0, 1.0);
  e = 1.0 - pow(1.0 - e, 3.0);
  vec2 p = mix(aStart, position.xy, e);
  if (position.y > uSlipY0 && position.y < uSlipY1) p.x += uSlipDx;
  p += aOff;
  // the head turns a little towards the cursor (ucas-tilt): a rotation about the vertical axis,
  // x' = x\xb7cos + z\xb7sin. The depth map is smooth, so neighbouring dots move almost alike and keep
  // their spacing; the halo (depth 0) drifts the other way, which gives the sense of depth.
  float dz = (aDepth - 0.4) * uHalf.x;
  float ang = uTilt * uTiltAmp * 0.012 * e;
  p.x = p.x * cos(ang) + dz * sin(ang);
  // living grain: each dot breathes a little, fading in as it lands
  float flick = 0.82 + 0.18 * sin(uClock * (2.0 + aAng) + aIdx);
  // dots fade out before the card edge, so nothing is ever cut off
  float fe = clamp((uHalf.x - abs(p.x)) / 50.0, 0.0, 1.0) * clamp((uHalf.y - abs(p.y)) / 50.0, 0.0, 1.0);
  float ap = clamp(e / 0.35, 0.0, 1.0);
  vAlpha = aBase * flick * ap * ap * (3.0 - 2.0 * ap) * fe;
  vKind = aKind;
  // same whole number of device pixels for every dot, centred on a pixel (site-wide rule)
  float ps = max(1.0, floor(uSize * uDpr + 0.5));
  gl_PointSize = ps * (aKind > 0.5 ? 4.0 : 1.0);
  vec4 q = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
  vec2 sp = (q.xy / q.w * 0.5 + 0.5) * uRes;
  sp = (mod(ps, 2.0) > 0.5 ? floor(sp) + 0.5 : floor(sp + 0.5));
  q.xy = (sp / uRes * 2.0 - 1.0) * q.w;
  gl_Position = q;
}`; // Square dots (halftone) and thin horizontal streaks like scanlines.
const FRAG = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
varying float vKind;
void main(){
  if (vAlpha < 0.01) discard;
  vec2 c = gl_PointCoord - 0.5;
  if (vKind > 0.5 && abs(c.y) > 0.09) discard;
  gl_FragColor = vec4(uColor, uOpacity * vAlpha);
}`;
const ease = (x) => 1 - Math.pow(1 - x, 3);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function halftone(data, cols, rows, G, o) {
  const { cutout, maskW, maskH, detail, contrast, invert, fill } = o;
  const n = cols * rows; // mean over a (2·rad+1)² window clipped to the image, with running sums: the cost no longer grows
  // with the radius (the head mask uses a radius of ~40 cells, which made this the slowest step)
  const boxBlur = (src, rad) => {
    const tmp = new Float32Array(n),
      out = new Float32Array(n);
    for (let j = 0; j < rows; j++) {
      const row = j * cols;
      let s = 0;
      for (let d = 0; d <= Math.min(rad, cols - 1); d++) s += src[row + d];
      for (let i = 0; i < cols; i++) {
        tmp[row + i] =
          s / (Math.min(cols - 1, i + rad) - Math.max(0, i - rad) + 1);
        if (i + rad + 1 < cols) s += src[row + i + rad + 1];
        if (i - rad >= 0) s -= src[row + i - rad];
      }
    }
    for (let i = 0; i < cols; i++) {
      let s = 0;
      for (let d = 0; d <= Math.min(rad, rows - 1); d++) s += tmp[d * cols + i];
      for (let j = 0; j < rows; j++) {
        out[j * cols + i] =
          s / (Math.min(rows - 1, j + rad) - Math.max(0, j - rad) + 1);
        if (j + rad + 1 < rows) s += tmp[(j + rad + 1) * cols + i];
        if (j - rad >= 0) s -= tmp[(j - rad) * cols + i];
      }
    }
    return out;
  }; // the head: a transparent cut-out (or an oval) that dissolves outward, like the reference
  const lum = new Float32Array(n),
    al = new Float32Array(n);
  let sa = 0,
    scx = 0,
    scy = 0;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      let a = data[k * 4 + 3] / 255;
      if (!cutout) {
        const ex = (i / cols - 0.5) / (maskW / 200),
          ey = (j / rows - 0.5) / (maskH / 200);
        a *= smooth(1, 0.7, Math.sqrt(ex * ex + ey * ey));
      }
      al[k] = a;
      lum[k] =
        (data[k * 4] * 0.299 +
          data[k * 4 + 1] * 0.587 +
          data[k * 4 + 2] * 0.114) /
        255;
      sa += a;
      scx += a * i;
      scy += a * j;
    }
  if (sa < 1) return null;
  const hcx = scx / sa,
    hcy = scy / sa;
  let vx = 0,
    vy = 0;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = al[j * cols + i];
      vx += a * (i - hcx) * (i - hcx);
      vy += a * (j - hcy) * (j - hcy);
    } // ellipse that matches the head (2σ ≈ its half extent)
  const rx = Math.sqrt(vx / sa) * 2,
    ry = Math.sqrt(vy / sa) * 2; // the face dissolves into the dark like the reference: a very soft head mask, so the
  // silhouette never shows
  const soft = boxBlur(al, Math.max(2, Math.round(rx * 0.42))); // the reference has no pores or stubble, only light and shadow: smooth the photo slightly
  const sm = Math.max(1, Math.round(rx * 0.025));
  const wl0 = new Float32Array(n);
  for (let k = 0; k < n; k++) wl0[k] = lum[k] * al[k];
  const sA = boxBlur(al, sm),
    sL = boxBlur(wl0, sm);
  if (sm) {
    for (let k = 0; k < n; k++) if (sA[k] > 0.001) lum[k] = sL[k] / sA[k];
  }
  const rad = new Float32Array(n),
    fade = new Float32Array(n),
    frame = new Float32Array(n);
  const inside = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i; // the glow around the head is a tall ellipse, like the reference
      const r = Math.hypot((i - hcx) / (rx * 1.05), (j - hcy) / (ry * 1.4));
      rad[k] = r; // nothing reaches the frame's edges, so no dot is ever cut off
      const fx = ((i + 0.5) / cols) * 2 - 1,
        fy = ((j + 0.5) / rows) * 2 - 1;
      frame[k] = smooth(1, 0.72, Math.pow(fx ** 4 + fy ** 4, 0.25)); // density fades from the middle of the face outwards, and down towards the chin
      const chin = 1 - smooth(0.1, 1.1, (j - hcy) / ry) * 0.6; // the crown of the head fades out gradually too, so the top never ends on a line
      const crown = smooth(-1.05, -0.15, (j - hcy) / ry);
      fade[k] =
        Math.pow(smooth(0, 1, soft[k]), 1.6) *
        smooth(1.25, 0.2, r) *
        chin *
        crown *
        frame[k];
      if (al[k] > 0.5) inside.push(lum[k]);
    } // stretch the tones inside the head so each portrait uses the full range
  inside.sort((a, b) => a - b);
  const lo = inside.length ? inside[Math.floor(inside.length * 0.03)] : 0;
  const hi = inside.length ? inside[Math.floor(inside.length * 0.985)] : 1; // local contrast at the scale of the eye sockets and cheekbones, as in the reference
  const R = Math.max(3, Math.round(rx * 0.3));
  const wl = new Float32Array(n),
    wl2 = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    wl[k] = lum[k] * al[k];
    wl2[k] = lum[k] * lum[k] * al[k];
  }
  const bA = boxBlur(al, R),
    bL = boxBlur(wl, R),
    bL2 = boxBlur(wl2, R);
  const local = Math.min(1, Math.max(0, detail / 3));
  const tone = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const w = Math.max(0.001, bA[k]);
    const mean = bL[k] / w,
      sd = Math.sqrt(Math.max(0, bL2[k] / w - mean * mean));
    const loc = 0.5 + (lum[k] - mean) / (2.4 * sd + 0.03);
    const glob = (lum[k] - lo) / Math.max(0.05, hi - lo);
    tone[k] = Math.min(1, Math.max(0, glob * (1 - local) + loc * local));
  } // tone → dot density and dot brightness. Like the reference, a dot is not just on or off:
  // bright areas are dense and bright, mid-tones sparser and dimmer, so it reads as soft light.
  const scanRow = new Float32Array(rows);
  for (let j = 0; j < rows; j++)
    scanRow[j] = Math.random() < 0.13 ? 0.3 + Math.random() * 0.7 : 0;
  const cov = new Float32Array(n),
    lev = new Float32Array(n),
    c0 = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let t = tone[k];
    if (!invert) t = 1 - t;
    t = Math.pow(smooth(0.08, 0.97, t), contrast);
    cov[k] =
      fade[k] * t * (fill / 100) * (1 + scanRow[Math.floor(k / cols)] * 0.3);
    c0[k] = cov[k];
    lev[k] = 0.3 + 0.7 * Math.sqrt(t * fade[k]);
  }
  const hx = [],
    hy = [],
    hb = [],
    hk = [],
    hz = []; // depth per cell: a smooth dome over the head ellipse, no texture from the photo, so adjacent
  // dots never shift by different amounts and never touch
  const depthAt = (i, j) => {
    const ex = (i - hcx) / (rx * 1.15),
      ey = (j - hcy) / (ry * 1.2);
    return Math.max(0, 1 - (ex * ex + ey * ey));
  };
  for (let j = 0; j < rows; j++) {
    const scan = scanRow[j];
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const v = cov[k]; // towards the edge the dither turns into loose random grain
      // the dither gradually gives way to random grain as the face fades out, so the edge
      // dissolves instead of ending in a line
      const loose = 1 - smooth(0.08, 0.75, fade[k]);
      const on =
        Math.random() < loose
          ? Math.random() < c0[k] * 0.55 * (1 - loose * 0.5)
          : v > 0.5 + (Math.random() - 0.5) * 0.3;
      const err = v - (on ? 1 : 0);
      if (i + 1 < cols) cov[k + 1] += (err * 7) / 16;
      if (j + 1 < rows) {
        if (i > 0) cov[k + cols - 1] += (err * 3) / 16;
        cov[k + cols] += (err * 5) / 16;
        if (i + 1 < cols) cov[k + cols + 1] += err / 16;
      }
      const jit = loose * G * 3.2;
      const x = (i + 0.5) * G - (cols * G) / 2 + (Math.random() - 0.5) * jit,
        y = (rows * G) / 2 - (j + 0.5) * G + (Math.random() - 0.5) * jit; // scanline streaks gather at the sides of the face, as in the reference
      const side = smooth(0.35, 1.1, Math.abs(i - hcx) / rx);
      if (on) {
        hx.push(x);
        hy.push(y);
        hb.push(
          Math.min(1, Math.max(0.15, lev[k] * (0.8 + Math.random() * 0.4))),
        );
        hk.push(Math.random() < 0.002 + scan * 0.03 + side * 0.01 ? 1 : 0);
        hz.push(depthAt(i, j));
      } else if (
        Math.random() <
        0.016 * smooth(1.35, 0.5, rad[k]) * frame[k] * (1 + scan)
      ) {
        // a loose, irregular halo of faint dots and dashes
        hx.push(x);
        hy.push(y);
        const dash = Math.random() < 0.012 + scan * 0.04 + side * 0.01;
        hb.push(0.12 + Math.random() * (dash ? 0.6 : 0.45));
        hk.push(dash ? 1 : 0);
        hz.push(0);
      }
    }
  }
  return { hx, hy, hb, hk, hz };
} // ---- end halftone
// The real ratio of device pixels to layout pixels, including browser zoom and any CSS scale
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
}; // Heavy work (images, particle layouts) starts only when the element is about a screen away, so the
// page loads light and the main thread stays free for the first view.
const whenNear = (el, fn) => {
  const io = new IntersectionObserver(
    (es) => {
      if (es.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    },
    { rootMargin: "100% 0px" },
  );
  io.observe(el);
  return () => io.disconnect();
};
export default function TeamPortrait(props) {
  const scheme = useColorScheme();
  const {
    image,
    color,
    opacity,
    size,
    grid,
    rotate,
    zoom,
    focusX,
    focusY,
    maskW,
    maskH,
    contrast,
    detail = 0.7,
    fill,
    invert,
    cutout = true,
    tilt = 18,
    background,
    radius,
    style,
  } = props;
  const wrapRef = useRef(null); // A theme switch recolours the dots and rebuilds the halftone (which shows the light on a dark page
  // and the shadows on a light one) in place, so the portrait never scatters and gathers again
  const recolor = useRef(null);
  const retone = useRef(null);
  const setTiltAmp = useRef(null);
  const src = image?.src;
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !src) return;
    const onCanvas = false;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches; // the WebGL context is created only when the portrait is about to be built (a screen away)
    let renderer = null;
    let canvas = null;
    let dpr = pixelRatio(wrap);
    const ensureRenderer = () => {
      if (renderer) return true;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
      } catch {
        return false;
      }
      renderer.setPixelRatio(dpr);
      renderer.setClearColor(0, 0);
      const c = renderer.domElement;
      canvas = c;
      Object.assign(c.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        display: "block",
        imageRendering: "pixelated",
      });
      wrap.appendChild(c);
      return true;
    };
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    const ink = resolveColor(color, wrap);
    const col = new THREE.Color(ink); // light dots on a dark page show the light (as in the reference); dark dots on a light page show
    // the shadows, with a gentler tone curve so the face does not turn harsh
    const isLight = (c) => c.r * 0.299 + c.g * 0.587 + c.b * 0.114 > 0.5;
    const toneFor = (light) =>
      light
        ? { invert: true, detail, contrast }
        : { invert: false, detail: detail * 1.2, contrast: contrast * 0.4 };
    let lightInk = isLight(col);
    let tone = toneFor(lightInk);
    const uniforms = {
      uSize: { value: bpDot(size) },
      uDpr: { value: dpr },
      uRes: { value: new THREE.Vector2(1, 1) },
      uColor: { value: new THREE.Vector3(col.r, col.g, col.b) },
      uOpacity: { value: opacity },
      uGather: { value: 0 },
      uClock: { value: 0 },
      uSlipY0: { value: 0 },
      uSlipY1: { value: 0 },
      uSlipDx: { value: 0 },
      uTilt: { value: 0 },
      uTiltAmp: { value: tilt },
      uHalf: { value: new THREE.Vector2(1, 1) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    let geo = null;
    let points = null; // the previous theme's halftone while it fades out (xf 0 → 1)
    let fading = null;
    let xf = 1;
    const XFADE = 0.3;
    const dropFading = () => {
      if (!fading) return;
      scene.remove(fading.points);
      fading.geo.dispose();
      fading.mat.dispose();
      fading = null;
    }; // particle state (pixel units, origin = centre)
    let N = 0;
    let tx = new Float32Array(0),
      ty = new Float32Array(0); // home on the halftone grid
    let sx = new Float32Array(0),
      sy = new Float32Array(0); // scattered start
    let ox = new Float32Array(0),
      oy = new Float32Array(0),
      ovx = new Float32Array(0),
      ovy = new Float32Array(0);
    let base = new Float32Array(0),
      delay = new Float32Array(0),
      ang = new Float32Array(0);
    let offAttr = null,
      offArr = new Float32Array(0);
    let act = new Uint8Array(0),
      actList = [];
    let W = 1,
      H = 1;
    const img = new Image();
    img.crossOrigin = "anonymous"; // Framer resizes the card a few times while the page loads. Each rebuild uses the same seeded
    // random numbers and keeps the gather progress, so the portrait never jumps or restarts.
    let seed0 = 7;
    for (let k = 0; k < String(src).length; k++)
      seed0 = (seed0 * 31 + String(src).charCodeAt(k)) | 0;
    let built = false,
      compiled = false;
    const build = () => {
      if (!img.naturalWidth || !ensureRenderer()) return;
      let sd = seed0 >>> 0;
      const nativeRandom = Math.random;
      Math.random = () => {
        sd = (sd + 1831565813) | 0;
        let t = Math.imul(sd ^ (sd >>> 15), 1 | sd);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      try {
        buildInner();
      } finally {
        Math.random = nativeRandom;
      }
    };
    const buildInner = () => {
      W = Math.max(1, wrap.clientWidth);
      H = Math.max(1, wrap.clientHeight);
      dpr = pixelRatio(wrap);
      renderer.setPixelRatio(dpr);
      uniforms.uDpr.value = dpr;
      renderer.setSize(W, H, false);
      uniforms.uRes.value.set(W * dpr, H * dpr);
      uniforms.uHalf.value.set(W / 2, H / 2);
      camera.left = -W / 2;
      camera.right = W / 2;
      camera.top = H / 2;
      camera.bottom = -H / 2;
      camera.updateProjectionMatrix(); // straighten and frame the head at one sample per grid cell
      const G = bpGrid(grid, dpr);
      const cols = Math.max(2, Math.floor(W / G)),
        rows = Math.max(2, Math.floor(H / G));
      const c = document.createElement("canvas");
      c.width = cols;
      c.height = rows;
      const g = c.getContext("2d", { willReadFrequently: true });
      const iw = img.naturalWidth,
        ih = img.naturalHeight;
      const s = zoom * Math.min(cols / iw, rows / ih);
      g.translate(cols / 2, rows / 2);
      g.rotate((rotate * Math.PI) / 180);
      g.scale(s, s);
      g.drawImage(img, -iw * (focusX / 100), -ih * (focusY / 100));
      let data;
      try {
        data = g.getImageData(0, 0, cols, rows).data;
      } catch {
        return;
      }
      const ht = halftone(data, cols, rows, G, {
        cutout,
        maskW,
        maskH,
        fill,
        ...tone,
      });
      if (!ht) return;
      const { hx, hy, hb, hk, hz } = ht;
      N = hx.length;
      tx = Float32Array.from(hx);
      ty = Float32Array.from(hy);
      base = Float32Array.from(hb);
      sx = new Float32Array(N);
      sy = new Float32Array(N);
      ox = new Float32Array(N);
      oy = new Float32Array(N);
      ovx = new Float32Array(N);
      ovy = new Float32Array(N);
      delay = new Float32Array(N);
      ang = new Float32Array(N);
      offArr = new Float32Array(N * 2);
      act = new Uint8Array(N);
      actList = [];
      const gs = () =>
        Math.sqrt(-2 * Math.log(1 - Math.random())) *
        Math.cos(Math.random() * Math.PI * 2);
      const wob = [0, 0, 0, 0].map(() => Math.random() * 6.3);
      const clumps = [];
      for (let c = 0, nc = 3 + Math.floor(Math.random() * 3); c < nc; c++)
        clumps.push([
          (Math.random() * 2 - 1) * W * 0.3,
          (Math.random() * 2 - 1) * H * 0.3,
          Math.min(W, H) * (0.05 + Math.random() * 0.12),
        ]);
      for (let i = 0; i < N; i++) {
        ang[i] = Math.random() * Math.PI * 2; // gather from a loose cloud; the head fills in from the top down
        // start as random scattered debris like the hero background: a few clumps of random size,
        // patchy haze and a ragged edge; resampled, never clipped
        for (let t = 0; t < 40; t++) {
          let px, py;
          if (Math.random() < 0.45) {
            const c = clumps[Math.floor(Math.random() * clumps.length)];
            px = c[0] + gs() * c[2];
            py = c[1] + gs() * c[2] * 1.2;
          } else {
            px = (Math.random() * 2 - 1) * W * 0.5;
            py = (Math.random() * 2 - 1) * H * 0.5;
          }
          const r = Math.pow(
            Math.pow(Math.abs(px) / (W * 0.5), 3) +
              Math.pow(Math.abs(py) / (H * 0.5), 3),
            1 / 3,
          );
          const edge =
            0.5 +
            0.12 * Math.sin(py * 0.03 + wob[0]) +
            0.1 * Math.sin(px * 0.027 + wob[1]);
          const patch =
            0.5 +
            0.5 * Math.sin(px * 0.021 + wob[2]) * Math.sin(py * 0.017 + wob[3]);
          const keep = (1 - smooth(edge, 0.98, r)) * (0.25 + 0.75 * patch);
          sx[i] = px;
          sy[i] = py;
          if (Math.random() < keep) break;
        }
        delay[i] = Math.min(
          1,
          Math.max(0, 0.55 * (0.5 - ty[i] / H) + 0.45 * Math.random()),
        );
      }
      if (points) scene.remove(points);
      geo?.dispose();
      geo = new THREE.BufferGeometry();
      const home = new Float32Array(N * 3),
        start = new Float32Array(N * 2),
        idx = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        home[i * 3] = tx[i];
        home[i * 3 + 1] = ty[i];
        start[i * 2] = sx[i];
        start[i * 2 + 1] = sy[i];
        idx[i] = i;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(home, 3));
      geo.setAttribute("aStart", new THREE.BufferAttribute(start, 2));
      geo.setAttribute("aBase", new THREE.BufferAttribute(base, 1));
      geo.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
      geo.setAttribute("aAng", new THREE.BufferAttribute(ang, 1));
      geo.setAttribute("aIdx", new THREE.BufferAttribute(idx, 1));
      offAttr = new THREE.BufferAttribute(offArr, 2);
      offAttr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("aOff", offAttr);
      geo.setAttribute(
        "aKind",
        new THREE.BufferAttribute(Float32Array.from(hk), 1),
      );
      geo.setAttribute(
        "aDepth",
        new THREE.BufferAttribute(Float32Array.from(hz), 1),
      );
      points = new THREE.Points(geo, mat);
      scene.add(points); // the editor canvas and reduced motion show the finished portrait
      if (onCanvas || reduce) gather = 1;
      else if (!built) gather = 0;
      built = true;
      step(0); // the shader compiles in the background (KHR_parallel_shader_compile), so the first frame
      // never stalls the scroll
      if (!compiled) {
        compiled = true;
        renderer.compileAsync(scene, camera).then(render, render);
      } else render();
    }; // cursor wind, as in the hero
    const mouse = { x: -1e5, y: -1e5, px: -1e5, py: -1e5, speed: 0 }; // the head follows the cursor's x while it is over the card (−1 left … 1 right) and eases
    // back to centre when it leaves
    let hover = false,
      tiltNow = 0,
      tiltTarget = 0;
    const onLeave = (e) => {
      if (e && e.relatedTarget) return;
      hover = false;
      wake();
    };
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect();
      mouse.x = e.clientX - r.left - W / 2;
      mouse.y = -(e.clientY - r.top - H / 2);
      hover = Math.abs(mouse.x) < W / 2 && Math.abs(mouse.y) < H / 2;
      if (
        visible &&
        Math.abs(mouse.x) < W / 2 + 80 &&
        Math.abs(mouse.y) < H / 2 + 80
      )
        wake();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    window.addEventListener("blur", onLeave); // a band of rows occasionally slips sideways, like a scanline glitch
    const slip = { y0: 0, y1: 0, dx: 0, start: -10, next: 2.5 };
    let clock = 0,
      energy = 0;
    let gather = 0; // 0 scattered → 1 assembled
    const GATHER = 2.2;
    const step = (dt) => {
      clock += dt;
      if (gather < 1) gather = Math.min(1, gather + dt / GATHER);
      if (xf < 1) {
        xf = Math.min(1, xf + dt / XFADE);
        const k = xf * xf * (3 - 2 * xf);
        uniforms.uOpacity.value = opacity * k;
        if (fading) fading.mat.uniforms.uOpacity.value = opacity * (1 - k);
        if (xf >= 1) dropFading();
      }
      if (clock > slip.next) {
        const h = 4 + Math.random() * 18;
        slip.y0 = (Math.random() - 0.5) * H * 0.7;
        slip.y1 = slip.y0 + h;
        slip.dx = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 10);
        slip.start = clock;
        slip.next = clock + 2.5 + Math.random() * 3.5;
      }
      const sa = (clock - slip.start) / 0.7;
      const slipAmt = sa >= 0 && sa <= 1 ? Math.sin(sa * Math.PI) : 0;
      uniforms.uGather.value = gather;
      uniforms.uClock.value = clock;
      uniforms.uSlipY0.value = slip.y0;
      uniforms.uSlipY1.value = slip.y1;
      uniforms.uSlipDx.value = slip.dx * slipAmt;
      tiltTarget = hover ? Math.max(-1, Math.min(1, mouse.x / (W / 2))) : 0;
      tiltNow += (tiltTarget - tiltNow) * (1 - Math.pow(1 - 0.09, dt * 60));
      if (Math.abs(tiltNow - tiltTarget) < 0.0015) tiltNow = tiltTarget;
      uniforms.uTilt.value = tiltNow;
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
      energy = mouse.speed > 0.3 ? Math.min(2.2, mouse.speed / 7) : 0;
      if (dt <= 0) return; // new dots are only searched while the cursor moves over the card
      if (
        energy > 0 &&
        Math.abs(mouse.x) < W / 2 + R &&
        Math.abs(mouse.y) < H / 2 + R
      ) {
        for (let i = 0; i < N; i++) {
          let e = Math.min(1, Math.max(0, (gather - delay[i] * 0.5) / 0.5));
          e = ease(e);
          const dx = sx[i] + (tx[i] - sx[i]) * e + ox[i] - mouse.x,
            dy = sy[i] + (ty[i] - sy[i]) * e + oy[i] - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= R2) continue;
          const f = (1 - d2 / R2) * energy * 2600 * dt;
          const side = (ang[i] / Math.PI - 1) * 0.7;
          const k = 0.5 + delay[i];
          ovx[i] += (dirX - dirY * side) * f * k;
          ovy[i] += (dirY + dirX * side) * f * k;
          if (!act[i]) {
            act[i] = 1;
            actList.push(i);
          }
        }
      }
      if (!actList.length) return;
      let w = 0;
      for (let k = 0; k < actList.length; k++) {
        const i = actList[k];
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
        ) {
          ox[i] = oy[i] = ovx[i] = ovy[i] = 0;
          act[i] = 0;
        } else actList[w++] = i;
        offArr[i * 2] = ox[i];
        offArr[i * 2 + 1] = oy[i];
      }
      actList.length = w;
      if (offAttr) offAttr.needsUpdate = true;
    };
    const render = () => renderer && renderer.render(scene, camera); // gathers each time it comes into view, scatters again once it has left
    let visible = false;
    const io = new IntersectionObserver(
      (es) => {
        const v = es[0].isIntersecting;
        if (!v && visible && !onCanvas) gather = 0;
        visible = v;
        if (v) wake();
      },
      { threshold: 0.05 },
    );
    io.observe(wrap); // the halftone is built when the browser has a spare moment, not in the middle of a scroll frame
    img.onload = () =>
      window.requestIdleCallback
        ? window.requestIdleCallback(build, { timeout: 500 })
        : setTimeout(build, 1);
    const stopNear = whenNear(wrap, () => (img.src = src));
    let rt = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(rt);
      rt = window.setTimeout(() => {
        if (
          Math.abs(wrap.clientWidth - W) > 2 ||
          Math.abs(wrap.clientHeight - H) > 2
        )
          build();
      }, 120);
    });
    ro.observe(wrap); // 60 frames a second while the dots gather or the cursor pushes them, 30 for the idle shimmer;
    // the loop stops while the portrait is off screen
    let raf = 0,
      last = 0,
      lastDraw = 0;
    const frame = (now) => {
      raf = 0;
      if (!visible || reduce) return;
      raf = requestAnimationFrame(frame);
      if (!N || window.__ucasLoading) {
        last = now;
        return; // waits for the page loader
      }
      const fps =
        gather < 1 ||
        xf < 1 ||
        actList.length ||
        energy > 0 ||
        tiltNow !== tiltTarget
          ? 60
          : 30;
      if (now - lastDraw < 1e3 / fps - 2) return;
      lastDraw = now;
      const dt = Math.min(0.05, last ? (now - last) / 1e3 : 0);
      last = now;
      step(dt);
      render();
    };
    const wake = () => {
      if (!raf && visible && !reduce) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    if (reduce) gather = 1;
    setTiltAmp.current = (v) => {
      uniforms.uTiltAmp.value = v;
      wake();
    };
    recolor.current = () => {
      const c = new THREE.Color(resolveColor(color, wrap));
      uniforms.uColor.value.set(c.r, c.g, c.b);
      if (N) render();
    };
    retone.current = (instant = false) => {
      const c = new THREE.Color(resolveColor(color, wrap));
      uniforms.uColor.value.set(c.r, c.g, c.b);
      const light = isLight(c);
      if (light === lightInk) return;
      lightInk = light;
      tone = toneFor(light);
      if (!built || !points || !geo) return; // the first build picks up the new tone
      // keep the current halftone on screen with its own opacity and fade it out under the new one
      dropFading();
      const old = new THREE.ShaderMaterial({
        uniforms: { ...uniforms, uOpacity: { value: uniforms.uOpacity.value } },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      points.material = old;
      fading = { points, geo, mat: old };
      points = null;
      geo = null;
      build();
      if (!instant && visible && !reduce && !onCanvas) {
        xf = 0;
        uniforms.uOpacity.value = 0;
        wake();
      } else {
        xf = 1;
        uniforms.uOpacity.value = opacity;
        dropFading();
        render();
      }
    }; // The site toggle fires "ucas-theme" inside the view-transition update, before the browser takes
    // the new snapshot: rebuilding right there means the wipe already reveals the final portrait,
    // with no recolour-then-rebuild step afterwards
    const onTheme = () => retone.current?.(true);
    window.addEventListener("ucas-theme", onTheme);
    return () => {
      window.removeEventListener("ucas-theme", onTheme);
      stopNear();
      cancelAnimationFrame(raf);
      clearTimeout(rt);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      window.removeEventListener("blur", onLeave);
      geo?.dispose();
      dropFading();
      mat.dispose();
      renderer?.dispose();
      canvas?.remove();
    };
  }, [
    src,
    color,
    opacity,
    size,
    grid,
    rotate,
    zoom,
    focusX,
    focusY,
    maskW,
    maskH,
    contrast,
    detail,
    fill,
    invert,
    cutout,
  ]);
  useEffect(() => {
    setTiltAmp.current?.(tilt);
  }, [tilt]); // a system light/dark change (no wipe) cross-fades; after a toggle this finds the work already done
  useEffect(() => {
    retone.current?.();
  }, [scheme]);
  return /*#__PURE__*/ _jsx("div", {
    ref: wrapRef,
    "aria-hidden": true,
    style: {
      ...style,
      position: "relative",
      overflow: "hidden",
      background,
      borderRadius: radius,
    },
  });
}
