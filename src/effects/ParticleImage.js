// Motion component adapted from Ucas Studio’s published homepage. See README.md.
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
/**
 * Particle Image — the whole card is drawn with image-coloured particles (like the motion.dev
 * TSL particle morph). The particles first form the client's logo as a sparse halftone; when the
 * card scrolls into view they flow into the picture. Hover turns the picture back into the logo.
 * There is no separate photo layer, so the transition is continuous.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */ const VERT = `
uniform float uMix, uTime, uSize, uDpr, uSpread, uLogoSize;
uniform vec2 uRes;
uniform vec3 uInk;
attribute vec3 aLogo;
attribute vec3 aColor;
attribute float aDelay;
attribute float aLogoAlpha;
attribute vec2 aOff; // cursor wind offset, updated on the CPU
varying vec3 vColor;
varying float vAlpha;
void main(){
  // each particle starts a little later than the one before it, so the change sweeps across the card
  float m = clamp((uMix - aDelay * 0.35) / 0.65, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  vec3 p = mix(position, aLogo, m);
  // a soft arc while travelling
  float travel = sin(m * 3.14159);
  p.xy += vec2(sin(aDelay * 91.7 + uTime * 0.8), cos(aDelay * 53.3 + uTime * 0.6)) * travel * uSpread;
  p.xy += aOff;
  // every dot that stays visible in the logo state (logo and specks) takes the ink colour
  float isLogo = step(0.01, aLogoAlpha);
  vColor = mix(aColor, uInk, m * isLogo);
  vAlpha = mix(1.0, aLogoAlpha, m);
  // same whole number of device pixels for every dot, centred on a pixel (site-wide rule)
  float ps = max(1.0, floor(uDpr * uLogoSize + 0.5));
  gl_PointSize = ps;
  vec4 q = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vec2 sp = (q.xy / q.w * 0.5 + 0.5) * uRes;
  sp = (mod(ps, 2.0) > 0.5 ? floor(sp) + 0.5 : floor(sp + 0.5));
  q.xy = (sp / uRes * 2.0 - 1.0) * q.w;
  gl_Position = q;
}`;
const FRAG = `
varying vec3 vColor;
varying float vAlpha;
void main(){
  if (vAlpha < 0.01) discard;
  gl_FragColor = vec4(vColor, vAlpha);
}`; // starts moving right away and settles softly
const ease = (x) => 1 - Math.pow(1 - x, 3); // Logo (or fallback text) as halftone cells: crisp edges plus a sparse fill, snapped to a grid.
// Every logo is scaled to the same optical weight: the geometric mean of its ink bounds is matched
// to a target, nudged by ink density so thin wordmarks grow and heavy marks shrink.
function logoCells(img, text, W, H, grid) {
  const cw = Math.round(W),
    ch = Math.round(H);
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const g = c.getContext("2d", { willReadFrequently: true });
  const font = (px) =>
    `500 ${px}px 'Aeonik Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
  const hasImg = !!(img && (img.naturalWidth || img.width));
  const iw = hasImg ? img.naturalWidth || 300 : 0,
    ih = hasImg ? img.naturalHeight || 100 : 0; // draw the mark at scale s, centred on (cx, cy)
  const paint = (s, cx, cy) => {
    g.clearRect(0, 0, cw, ch);
    if (hasImg)
      g.drawImage(img, cx - (iw * s) / 2, cy - (ih * s) / 2, iw * s, ih * s);
    else {
      g.fillStyle = "#000";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = font(100 * s);
      g.fillText(text, cx, cy);
    }
  };
  const read = () => {
    try {
      return g.getImageData(0, 0, cw, ch).data;
    } catch {
      return null;
    }
  }; // pass 1: draw at a provisional size and measure the ink
  const s0 = hasImg ? Math.min((W * 0.5) / iw, (H * 0.3) / ih) : H * 0.0016;
  paint(s0, cw / 2, ch / 2);
  let d = read();
  if (!d) return [];
  let x0 = cw,
    y0 = ch,
    x1 = 0,
    y1 = 0,
    ink = 0;
  for (let y = 0; y < ch; y += 2)
    for (let x = 0; x < cw; x += 2)
      if (d[(y * cw + x) * 4 + 3] > 110) {
        ink++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (!ink) return [];
  const bw = Math.max(2, x1 - x0),
    bh = Math.max(2, y1 - y0);
  const density = Math.min(1, (ink * 4) / (bw * bh));
  const target = Math.min(W, H) * 0.3;
  let k =
    (target / Math.sqrt(bw * bh)) *
    Math.pow(0.45 / Math.max(0.08, density), 0.3);
  k = Math.min(k, (W * 0.8) / bw, (H * 0.46) / bh); // pass 2: redraw at the balanced size, centred on the ink itself
  const midX = (x0 + x1) / 2 - cw / 2,
    midY = (y0 + y1) / 2 - ch / 2;
  paint(s0 * k, cw / 2 - midX * k, ch / 2 - midY * k);
  d = read();
  if (!d) return [];
  const A = (x, y) => {
    const xi = Math.round(x),
      yi = Math.round(y);
    return xi < 0 || yi < 0 || xi >= cw || yi >= ch
      ? 0
      : d[(yi * cw + xi) * 4 + 3];
  };
  const out = [];
  for (let y = grid / 2; y < ch; y += grid)
    for (let x = grid / 2; x < cw; x += grid) {
      if (A(x, y) < 110) continue;
      const edge =
        A(x - grid, y) < 110 ||
        A(x + grid, y) < 110 ||
        A(x, y - grid) < 110 ||
        A(x, y + grid) < 110;
      if (edge || Math.random() < 0.85) out.push(x - cw / 2, ch / 2 - y);
    }
  return out;
} // The real ratio of device pixels to layout pixels, including browser zoom and any CSS scale
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
}; // run after the page loader has finished (right away when there is none)
const afterLoader = (fn) => {
  if (window.__ucasLoading)
    window.addEventListener("ucas-loaded", fn, { once: true });
  else fn();
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
}; // The cards are built one at a time, each in its own idle moment, so four cards entering together
// never stack their work into one long frame.
const buildQueue = [];
let queueBusy = false;
const runQueue = () => {
  const job = buildQueue.shift();
  if (!job) return (queueBusy = false);
  queueBusy = true;
  const ric = window.requestIdleCallback;
  const next = () => {
    job();
    setTimeout(runQueue, 32);
  };
  ric ? ric(next, { timeout: 400 }) : setTimeout(next, 16);
};
const enqueueBuild = (job) => {
  buildQueue.push(job);
  if (!queueBusy) runQueue();
};
export default function ParticleImage(props) {
  const scheme = useColorScheme();
  const { image, logo, title, ink, radius, density, style } = props;
  const wrapRef = useRef(null); // a theme switch only recolours the logo dots: rebuilding the scene would stall the theme wipe
  const recolor = useRef(null);
  const src = image?.src;
  const srcSet = image?.srcSet;
  const alt = image?.alt || (title ? `${title} project` : "");
  const logoSrc = logo?.src;
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !src) return; // the WebGL context is only created when the card is about to be built (a screen away), so the
    // first page load does not set up four GPU contexts at once
    let renderer = null;
    let canvas = null;
    let dpr = pixelRatio(wrap);
    const ensureRenderer = () => {
      if (renderer) return true;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: false,
          alpha: true,
          premultipliedAlpha: false,
        });
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
        pointerEvents: "none",
      });
      wrap.insertBefore(c, img);
      return true;
    };
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    let points = null;
    let mat = null;
    let geo = null;
    const inkCol = new THREE.Color(resolveColor(ink || "#111110", wrap));
    const uniforms = {
      uMix: { value: 1 },
      uTime: { value: 0 },
      uSize: { value: density },
      uDpr: { value: dpr },
      uRes: { value: new THREE.Vector2(1, 1) },
      uSpread: { value: 30 },
      uLogoSize: { value: bpDot(2) },
      uInk: { value: new THREE.Vector3(inkCol.r, inkCol.g, inkCol.b) },
    };
    let W = 1,
      H = 1;
    let disposed = false,
      ready = false;
    let inView = false,
      assembled = false; // The real photo, at full resolution, sits over the particles while the card is at rest, so the
    // picture is sharp; the moment anything moves (the logo morph or the cursor wind) it steps aside
    // and the particles carry the motion. The same file is sampled for the particles (one download).
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.alt = alt;
    img.decoding = "async";
    Object.assign(img.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
      pointerEvents: "none",
      opacity: "0",
    });
    wrap.appendChild(img);
    let photoOn = false;
    const syncPhoto = () => {
      const on =
        ready && uniforms.uMix.value <= 1e-4 && !tweening && !windActive;
      if (on === photoOn) return;
      photoOn = on; // fades in softly once everything has settled, and leaves at once when motion starts
      img.style.transition = on ? "opacity 0.35s ease" : "none";
      img.style.opacity = on ? "1" : "0";
    };
    let logoImg = null; // eased tween of uMix between logo (1) and picture (0)
    let from = 1,
      to = 1,
      t0 = 0,
      dur = 1.6,
      raf = 0,
      tweening = false; // cursor wind (as in the hero): dots near the pointer are blown the way it moves, then glide back
    let n = 0;
    let homeP = new Float32Array(0),
      homeL = new Float32Array(0),
      dly = new Float32Array(0),
      ang = new Float32Array(0);
    let off = new Float32Array(0),
      vel = new Float32Array(0);
    let offAttr = null;
    let act = new Uint8Array(0),
      actList = [];
    const mouse = {
      x: -1e5,
      y: -1e5,
      px: -1e5,
      py: -1e5,
      speed: 0,
      inside: false,
    };
    let windActive = false;
    const wind = (dt) => {
      const mvx = mouse.x - mouse.px,
        mvy = mouse.y - mouse.py;
      mouse.speed += (Math.min(60, Math.hypot(mvx, mvy)) - mouse.speed) * 0.3;
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      const ml = Math.hypot(mvx, mvy);
      const dirX = ml > 0.01 ? mvx / ml : 0,
        dirY = ml > 0.01 ? mvy / ml : 0;
      const energy = Math.min(2.2, mouse.speed / 7);
      const R = 70,
        R2 = R * R,
        MAXD = 90;
      const mix = uniforms.uMix.value; // look for newly pushed dots only while the cursor moves over the card; after that only the
      // pushed ones are integrated, and only their slice of the buffer goes to the GPU
      if (energy > 0.05 && mouse.inside) {
        for (let i = 0; i < n; i++) {
          let m = Math.min(1, Math.max(0, (mix - dly[i] * 0.35) / 0.65));
          m = m * m * (3 - 2 * m);
          const hx =
            homeP[i * 3] + (homeL[i * 3] - homeP[i * 3]) * m + off[i * 2];
          const hy =
            homeP[i * 3 + 1] +
            (homeL[i * 3 + 1] - homeP[i * 3 + 1]) * m +
            off[i * 2 + 1];
          const dx = hx - mouse.x,
            dy = hy - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= R2) continue;
          const f = (1 - d2 / R2) * energy * 2600 * dt;
          const side = (ang[i] / Math.PI - 1) * 0.7,
            k = 0.5 + dly[i];
          vel[i * 2] += (dirX - dirY * side) * f * k;
          vel[i * 2 + 1] += (dirY + dirX * side) * f * k;
          if (!act[i]) {
            act[i] = 1;
            actList.push(i);
          }
        }
      }
      let w = 0,
        lo = n,
        hi = -1;
      for (let a = 0; a < actList.length; a++) {
        const i = actList[a];
        let ox = off[i * 2],
          oy = off[i * 2 + 1],
          vx = vel[i * 2],
          vy = vel[i * 2 + 1];
        const o2 = ox * ox + oy * oy;
        if (o2 > 1) {
          const fl = Math.sqrt(o2) * 5.4 * dt;
          vx += Math.sin(t * 9 + i) * fl;
          vy += Math.cos(t * 7 + i * 1.3) * fl;
        }
        vx = (vx - ox * 11 * dt) * 0.9;
        vy = (vy - oy * 11 * dt) * 0.9;
        ox += vx * dt;
        oy += vy * dt;
        const ol = Math.hypot(ox, oy);
        if (ol > MAXD) {
          ox *= MAXD / ol;
          oy *= MAXD / ol;
        }
        if (
          Math.abs(ox) < 0.05 &&
          Math.abs(oy) < 0.05 &&
          Math.abs(vx) < 0.05 &&
          Math.abs(vy) < 0.05
        ) {
          ox = oy = vx = vy = 0;
          act[i] = 0;
        } else actList[w++] = i;
        off[i * 2] = ox;
        off[i * 2 + 1] = oy;
        vel[i * 2] = vx;
        vel[i * 2 + 1] = vy;
        if (i < lo) lo = i;
        if (i > hi) hi = i;
      }
      actList.length = w;
      if (offAttr && hi >= lo) {
        offAttr.clearUpdateRanges();
        offAttr.addUpdateRange(lo * 2, (hi - lo + 1) * 2);
        offAttr.needsUpdate = true;
      }
      windActive = w > 0;
    }; // capped at 60 frames a second (120 Hz screens would otherwise double the work)
    let t = 0,
      last = 0,
      lastDraw = 0;
    const loop = (now) => {
      if (now - lastDraw < 1e3 / 60 - 2) {
        raf = requestAnimationFrame(loop);
        return;
      }
      lastDraw = now;
      const dt = Math.min(0.05, last ? (now - last) / 1e3 : 0);
      last = now;
      t += dt;
      if (tweening) {
        const p = Math.min(1, (now - t0) / 1e3 / dur);
        uniforms.uMix.value = from + (to - from) * ease(p);
        if (p >= 1) tweening = false;
      }
      uniforms.uTime.value = now / 1e3;
      if (ready && (mouse.inside || windActive)) wind(dt);
      renderer.render(scene, camera);
      syncPhoto();
      raf =
        tweening || windActive || (mouse.inside && inView)
          ? requestAnimationFrame(loop)
          : 0;
      if (!raf) last = 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const go = (target) => {
      to = target;
      if (!ready) return;
      from = uniforms.uMix.value;
      t0 = performance.now();
      dur = 0.9 + Math.abs(to - from) * 0.6;
      tweening = true;
      kick();
    };
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect();
      mouse.x = e.clientX - r.left - r.width / 2;
      mouse.y = -(e.clientY - r.top - r.height / 2);
      const inside =
        Math.abs(mouse.x) < r.width / 2 + 40 &&
        Math.abs(mouse.y) < r.height / 2 + 40;
      if (inside && !mouse.inside) {
        mouse.px = mouse.x;
        mouse.py = mouse.y;
      }
      mouse.inside = inside;
      if (inside) kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const build = () => {
      if (disposed || !img.naturalWidth || !ensureRenderer()) return;
      W = Math.max(1, wrap.clientWidth);
      H = Math.max(1, wrap.clientHeight);
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
      uniforms.uSpread.value = Math.min(W, H) * 0.06; // picture: a dense grid of particles that reads as the photo itself
      // the photo is built from 2px dots placed edge to edge (a 2px grid), so it reads as a clean
      // image with no screen-door lines; the dots still break apart when they move
      // on phones and tablets the dots are smaller, so the grid follows their size in whole device pixels
      const dev = Math.max(1, Math.floor(dpr * bpDot(2) + 0.5));
      const step = window.innerWidth < 1200 ? dev / dpr : Math.max(2, density);
      const cols = Math.max(2, Math.floor(W / step)),
        rows = Math.max(2, Math.floor(H / step));
      const ox0 = -((cols - 1) * step) / 2,
        oy0 = ((rows - 1) * step) / 2;
      const c = document.createElement("canvas");
      c.width = cols;
      c.height = rows;
      const g = c.getContext("2d");
      const s = Math.max(cols / img.naturalWidth, rows / img.naturalHeight);
      const dw = img.naturalWidth * s,
        dh = img.naturalHeight * s;
      g.drawImage(img, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
      const data = g.getImageData(0, 0, cols, rows).data;
      n = cols * rows; // logo: halftone cells; every remaining particle becomes faint grain or hides
      const LG = bpGrid(2.5, dpr);
      const cells = logoCells(
        logoImg && logoImg.complete ? logoImg : null,
        title || "",
        W,
        H,
        LG,
      );
      const order = new Uint32Array(n);
      for (let i = 0; i < n; i++) order[i] = i;
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = order[i];
        order[i] = order[j];
        order[j] = t;
      }
      const pos = new Float32Array(n * 3),
        lg = new Float32Array(n * 3),
        col = new Float32Array(n * 3);
      const delay = new Float32Array(n),
        la = new Float32Array(n);
      const nCells = cells.length / 2;
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          pos[k * 3] = ox0 + i * step;
          pos[k * 3 + 1] = oy0 - j * step;
          col[k * 3] = data[k * 4] / 255;
          col[k * 3 + 1] = data[k * 4 + 1] / 255;
          col[k * 3 + 2] = data[k * 4 + 2] / 255; // the change sweeps diagonally with a little noise
          delay[k] = Math.min(
            1,
            Math.max(
              0,
              0.6 * ((i / cols) * 0.7 + (j / rows) * 0.3) + 0.4 * Math.random(),
            ),
          );
        }
      for (let r = 0; r < n; r++) {
        const k = order[r];
        if (r < nCells) {
          lg[k * 3] = cells[r * 2];
          lg[k * 3 + 1] = cells[r * 2 + 1];
          la[k] = 0.95; // bright and dense, like the hero scenes
        } else {
          // loose, random specks around the logo: denser near it, thinning out towards
          // the card edges, each with its own brightness; the rest stay hidden
          const gx = (Math.random() - 0.5) * (W - 16),
            gy = (Math.random() - 0.5) * (H - 16);
          lg[k * 3] = Math.round(gx / LG) * LG;
          lg[k * 3 + 1] = Math.round(gy / LG) * LG;
          const r = Math.hypot(gx / (W * 0.5), gy / (H * 0.5)); // same tone as the logo; the background reads quieter only because it is sparse
          const p = (0.0015 + 0.0075 * Math.max(0, 1 - r) ** 1.5) * (9e4 / n);
          la[k] = Math.random() < p ? 0.95 : 0;
        }
      }
      if (points) {
        scene.remove(points);
        geo?.dispose();
      }
      geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("aLogo", new THREE.BufferAttribute(lg, 3));
      geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
      geo.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
      geo.setAttribute("aLogoAlpha", new THREE.BufferAttribute(la, 1));
      homeP = pos;
      homeL = lg;
      dly = delay;
      ang = new Float32Array(n);
      for (let i = 0; i < n; i++) ang[i] = Math.random() * Math.PI * 2;
      off = new Float32Array(n * 2);
      vel = new Float32Array(n * 2);
      act = new Uint8Array(n);
      actList = [];
      offAttr = new THREE.BufferAttribute(off, 2);
      offAttr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("aOff", offAttr);
      mat =
        mat ||
        new THREE.ShaderMaterial({
          uniforms,
          vertexShader: VERT,
          fragmentShader: FRAG,
          transparent: true,
          depthWrite: false,
          depthTest: false,
        });
      points = new THREE.Points(geo, mat);
      scene.add(points);
      const show = () => {
        if (disposed) return;
        ready = true;
        renderer.render(scene, camera);
        if (inView && !assembled) {
          assembled = true;
          afterLoader(() => setTimeout(() => go(0), 350));
        }
      }; // the shader compiles in the background (KHR_parallel_shader_compile), so it never stalls a frame
      if (!compiled) {
        compiled = true;
        renderer.compileAsync(scene, camera).then(show, show);
      } else show();
    };
    let compiled = false;
    let pending = logoSrc ? 2 : 1;
    const done = () => {
      if (--pending === 0) enqueueBuild(build);
    };
    const startLoad = () => {
      if (logoSrc) {
        logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.onload = done;
        logoImg.onerror = () => {
          logoImg = null;
          done();
        };
        logoImg.src = logoSrc;
      }
      img.onload = done;
      img.sizes = `${Math.max(1, Math.round(wrap.clientWidth))}px`;
      if (srcSet) img.srcset = srcSet;
      img.src = src;
    };
    const stopNear = whenNear(wrap, startLoad); // the first time the card is seen, the logo flows into the picture
    const io = new IntersectionObserver(
      (es) => {
        inView = es[0].isIntersecting;
        if (inView && !assembled && ready) {
          assembled = true;
          afterLoader(() => setTimeout(() => go(0), 350));
        }
      },
      { threshold: 0.25 },
    );
    io.observe(wrap);
    const host = wrap.closest("a") || wrap;
    let hoverTimer = 0;
    const onEnter = () => {
      clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => go(1), 100);
    };
    const onLeave = () => {
      clearTimeout(hoverTimer);
      go(0);
    };
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    const ro = new ResizeObserver(() => {
      if (
        ready &&
        (Math.abs(wrap.clientWidth - W) > 2 ||
          Math.abs(wrap.clientHeight - H) > 2)
      )
        enqueueBuild(build);
    });
    ro.observe(wrap);
    recolor.current = () => {
      const c = new THREE.Color(resolveColor(ink || "#111110", wrap));
      uniforms.uInk.value.set(c.r, c.g, c.b);
      if (ready) renderer.render(scene, camera);
    };
    return () => {
      disposed = true;
      stopNear();
      clearTimeout(hoverTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      geo?.dispose();
      mat?.dispose();
      renderer?.dispose();
      img.remove();
      canvas?.remove();
    };
  }, [src, srcSet, alt, logoSrc, title, ink, density]);
  useEffect(() => recolor.current?.(), [scheme]);
  return /*#__PURE__*/ _jsx("div", {
    ref: wrapRef,
    style: {
      ...style,
      position: "relative",
      overflow: "hidden",
      borderRadius: radius,
    },
  });
}
