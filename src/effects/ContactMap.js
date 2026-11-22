// Motion component adapted from Ucas Studio’s published homepage. See README.md.
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { feature } from "topojson-client"; /**
 * Contact Map — the world drawn in halftone particles, with the studio's two cities (Ankara and
 * New York, as in the footer clocks) glowing and particles flowing between them along an arc.
 * Same particle language as the rest of the site: square dots on a fine grid, random brightness,
 * ragged soft edges, scanline dashes. The cursor blows the dots like wind; they drift back.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */ // 110m is plenty at one sample per 2.5px grid cell, and rasterises about ten times faster than 50m
import land from "../assets/land.json";
const CITIES = [
  [32.86, 39.93],
  [-74, 40.71],
];
const LAT_TOP = 78,
  LAT_BOT = -58;
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
let landCache = null;
const loadLand = () =>
  (landCache ||= Promise.resolve(land).then((t) => feature(t, t.objects.land))); // The real ratio of device pixels to layout pixels, including browser zoom and any CSS scale
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
export default function ContactMap(props) {
  const scheme = useColorScheme();
  const { color, opacity, size, grid: gridProp, density, flow, style } = props;
  const wrapRef = useRef(null); // a theme switch only recolours the dots: rebuilding the scene would stall the theme wipe
  const recolor = useRef(null);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
      position: "absolute",
      left: "0",
      top: "0",
      display: "block",
      pointerEvents: "none",
      imageRendering: "pixelated",
    });
    wrap.appendChild(canvas);
    const g = canvas.getContext("2d");
    let dpr = pixelRatio(wrap); // grid pitch and dot size are whole device pixels, so every gap between dots is the same width
    let grid = bpGrid(gridProp, dpr);
    let dotSize = Math.max(1, Math.round(bpDot(size) * dpr)) / dpr;
    const onCanvas = false;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const probe = document.createElement("canvas").getContext("2d");
    probe.fillStyle = resolveColor(color, wrap);
    probe.fillRect(0, 0, 1, 1);
    const [cr, cg, cb] = probe.getImageData(0, 0, 1, 1).data;
    let ink = `${cr},${cg},${cb}`;
    let W = 1,
      H = 1; // map dots: home position, brightness, kind (0 dot, 1 dash), reveal delay
    let hx = new Float32Array(0),
      hy = new Float32Array(0),
      hb = new Float32Array(0),
      hk = new Uint8Array(0),
      hd = new Float32Array(0);
    let ox = new Float32Array(0),
      oy = new Float32Array(0),
      vx = new Float32Array(0),
      vy = new Float32Array(0);
    let N = 0;
    let cities = [];
    let land = null;
    let reveal = onCanvas || reduce ? 1 : 0; // equirectangular, fitted to the frame
    let sc = 1,
      x0 = 0,
      y0 = 0;
    const proj = (lon, lat) => [
      x0 + (lon + 180) * sc,
      y0 + (LAT_TOP - lat) * sc,
    ];
    const build = () => {
      W = Math.max(1, wrap.clientWidth);
      H = Math.max(1, wrap.clientHeight);
      dpr = pixelRatio(wrap);
      grid = bpGrid(gridProp, dpr);
      dotSize = Math.max(1, Math.round(bpDot(size) * dpr)) / dpr; // the canvas is never stretched: one canvas pixel per device pixel, so every dot is exactly 2px
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = canvas.width / dpr + "px";
      canvas.style.height = canvas.height / dpr + "px";
      if (!land) return;
      sc = Math.min(W / 360, H / (LAT_TOP - LAT_BOT));
      x0 = (W - 360 * sc) / 2;
      y0 = (H - (LAT_TOP - LAT_BOT) * sc) / 2;
      cities = CITIES.map(([lo, la]) => proj(lo, la)); // rasterise the land at one sample per grid cell
      const cols = Math.ceil(W / grid),
        rows = Math.ceil(H / grid);
      const m = document.createElement("canvas");
      m.width = cols;
      m.height = rows;
      const mg = m.getContext("2d", { willReadFrequently: true });
      mg.scale(1 / grid, 1 / grid);
      mg.fillStyle = "#000";
      mg.beginPath(); // rings that cross the 180° meridian are unwrapped and drawn on both sides of the map
      const ring = (r) => {
        const pts = [];
        let prev = r[0][0],
          off = 0,
          lo0 = 1e9,
          lo1 = -1e9;
        for (const [lo, la] of r) {
          if (lo - prev > 180) off -= 360;
          else if (prev - lo > 180) off += 360;
          prev = lo;
          pts.push([lo + off, la]);
          lo0 = Math.min(lo0, lo + off);
          lo1 = Math.max(lo1, lo + off);
        } // only rings that run past ±180° need a shifted copy on the other side
        const shifts = [0];
        if (lo0 < -180) shifts.push(360);
        if (lo1 > 180) shifts.push(-360);
        for (const shift of shifts) {
          pts.forEach(([lo, la], i) => {
            const [px, py] = proj(lo + shift, la);
            i ? mg.lineTo(px, py) : mg.moveTo(px, py);
          });
          mg.closePath();
        }
      };
      for (const f of land.features) {
        const geom = f.geometry;
        const polys =
          geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
        for (const p of polys) for (const r of p) ring(r);
      }
      mg.fill("nonzero");
      const d = mg.getImageData(0, 0, cols, rows).data;
      const south = proj(0, -56)[1];
      const wob = [0, 0, 0, 0].map(() => Math.random() * 6.3);
      const X = [],
        Y = [],
        B = [],
        K = [],
        D = [];
      for (let j = 0; j < rows; j++) {
        const scan = Math.random() < 0.06;
        for (let i = 0; i < cols; i++) {
          const x = (i + 0.5) * grid,
            y = (j + 0.5) * grid; // Antarctica is left out, it would only show as a cut strip along the bottom
          const isLand = d[(j * cols + i) * 4 + 3] > 120 && y < south; // ragged, random fade towards the frame edges
          const ex = Math.abs(x / W - 0.5) * 2,
            ey = Math.abs(y / H - 0.5) * 2;
          const edge =
            0.72 +
            0.1 * Math.sin(y * 0.03 + wob[0]) +
            0.08 * Math.sin(x * 0.021 + wob[1]);
          const fade =
            1 - smooth(edge, 1.02, Math.pow(ex ** 4 + ey ** 4, 0.25)); // the cities glow: denser and brighter around them
          let glow = 0;
          for (const [cx, cy] of cities)
            glow = Math.max(
              glow,
              Math.exp(
                -((x - cx) ** 2 + (y - cy) ** 2) / (2 * (W * 0.035) ** 2),
              ),
            );
          const patch =
            0.6 +
            0.4 * Math.sin(x * 0.013 + wob[2]) * Math.sin(y * 0.019 + wob[3]);
          const p = isLand
            ? (density / 100) * (0.35 + 0.35 * patch + 0.3 * glow) * fade
            : 0.006 * fade + 0.05 * glow;
          if (Math.random() >= p) continue;
          X.push(x);
          Y.push(y);
          B.push(
            isLand
              ? Math.min(1, 0.5 + Math.random() * 0.3 + glow * 0.5)
              : 0.15 + Math.random() * 0.3,
          );
          K.push(Math.random() < (scan ? 0.03 : 0.002) ? 1 : 0); // reveal spreads out from the two cities
          let near = 1e9;
          for (const [cx, cy] of cities)
            near = Math.min(near, Math.hypot(x - cx, y - cy));
          D.push(Math.min(1, near / (W * 0.6)) * 0.75 + Math.random() * 0.25);
        }
      }
      N = X.length;
      hx = Float32Array.from(X);
      hy = Float32Array.from(Y);
      hb = Float32Array.from(B);
      hk = Uint8Array.from(K);
      hd = Float32Array.from(D);
      ox = new Float32Array(N);
      oy = new Float32Array(N);
      vx = new Float32Array(N);
      vy = new Float32Array(N); // a few dots keep twinkling live; the rest are baked into a still layer once revealed
      tw = new Uint8Array(N);
      for (let i = 0; i < N; i++)
        tw[i] = !hk[i] && Math.random() < 0.06 ? 1 : 0;
      act = new Uint8Array(N);
      actList = [];
      levelIdx = new Int32Array(N + 2e3);
      baked = false;
      draw();
    }; // the arc between the cities, bowed upwards
    const arcPoint = (t) => {
      const [ax, ay] = cities[0],
        [bx, by] = cities[1];
      const mx = (ax + bx) / 2,
        my = Math.min(ay, by) - Math.abs(ax - bx) * 0.22;
      const u = 1 - t;
      return [
        u * u * ax + 2 * u * t * mx + t * t * bx,
        u * u * ay + 2 * u * t * my + t * t * by,
      ];
    };
    const FLOW = 90;
    const fl = Array.from({ length: FLOW }, () => ({
      t: Math.random(),
      sp: 0.05 + Math.random() * 0.07,
      dir: Math.random() < 0.5 ? 1 : -1,
      j: (Math.random() - 0.5) * 6,
    }));
    const mouse = { x: -1e5, y: -1e5, px: -1e5, py: -1e5, speed: 0 };
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      if (
        visible &&
        mouse.x > -80 &&
        mouse.y > -80 &&
        mouse.x < W + 80 &&
        mouse.y < H + 80
      )
        wake();
    };
    window.addEventListener("pointermove", onMove, { passive: true }); // Performance: the map is still most of the time, so the dots are baked into one layer and each
    // frame only copies it, then draws the few dots that move (cursor wind, twinkle, the arc flow and
    // the cities). Dots are drawn in alpha buckets, so the fill colour changes ~40 times a frame
    // instead of once per dot.
    let tw = new Uint8Array(0); // live twinkling dots, never baked
    let act = new Uint8Array(0); // dots currently pushed by the cursor
    let actList = [];
    let levelIdx = new Int32Array(0);
    const LEVELS = 40;
    const levelCount = new Int32Array(LEVELS + 1);
    let styles = [];
    const makeStyles = () =>
      (styles = Array.from(
        { length: LEVELS + 1 },
        (_, l) => `rgba(${ink},${(l / LEVELS).toFixed(3)})`,
      ));
    makeStyles();
    const bake = document.createElement("canvas");
    const bg = bake.getContext("2d");
    let baked = false;
    let clock = 0,
      energy = 0;
    const R = 70,
      R2 = R * R;
    const step = (dt) => {
      clock += dt;
      if (reveal < 1) reveal = Math.min(1, reveal + dt / 2.4);
      const mvx = mouse.x - mouse.px,
        mvy = mouse.y - mouse.py;
      mouse.speed += (Math.min(60, Math.hypot(mvx, mvy)) - mouse.speed) * 0.3;
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      const ml = Math.hypot(mvx, mvy);
      const dirX = ml > 0.01 ? mvx / ml : 0,
        dirY = ml > 0.01 ? mvy / ml : 0;
      energy = mouse.speed > 0.3 ? Math.min(2.2, mouse.speed / 7) : 0; // only look for new dots to push while the cursor moves over the map
      const near =
        energy > 0 &&
        mouse.x > -R &&
        mouse.y > -R &&
        mouse.x < W + R &&
        mouse.y < H + R;
      if (near)
        for (let i = 0; i < N; i++) {
          if (hk[i]) continue; // the scanline dashes stay put
          const dx = hx[i] + ox[i] - mouse.x,
            dy = hy[i] + oy[i] - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= R2) continue;
          const f = (1 - d2 / R2) * energy * 2400 * dt;
          const side = ((i * 0.618) % 1) * 1.4 - 0.7;
          vx[i] += (dirX - dirY * side) * f;
          vy[i] += (dirY + dirX * side) * f;
          if (!act[i]) {
            act[i] = 1;
            actList.push(i);
          }
        } // spring the pushed dots home; drop them from the live list once they have settled
      let w = 0;
      for (let k = 0; k < actList.length; k++) {
        const i = actList[k];
        vx[i] += -ox[i] * 11 * dt;
        vy[i] += -oy[i] * 11 * dt;
        vx[i] *= 0.9;
        vy[i] *= 0.9;
        ox[i] += vx[i] * dt;
        oy[i] += vy[i] * dt;
        if (
          Math.abs(ox[i]) < 0.3 &&
          Math.abs(oy[i]) < 0.3 &&
          Math.abs(vx[i]) < 0.5 &&
          Math.abs(vy[i]) < 0.5
        ) {
          ox[i] = oy[i] = vx[i] = vy[i] = 0;
          act[i] = 0;
        } else actList[w++] = i;
      }
      actList.length = w;
      for (const p of fl) {
        p.t += p.sp * dt * flow * p.dir;
        if (p.t > 1) p.t -= 1;
        if (p.t < 0) p.t += 1;
      }
    };
    const px = (v) => Math.round(v * dpr) / dpr; // bucketed drawing: queue (x, y, kind) per alpha level, then fill each level in one go
    let qx = new Float32Array(4096),
      qy = new Float32Array(4096),
      qk = new Uint8Array(4096),
      ql = new Int32Array(4096),
      qn = 0;
    const queue = (x, y, a, kind) => {
      const l = Math.round(Math.min(1, a) * LEVELS);
      if (l <= 0) return;
      if (qn === qx.length) {
        const grow = (o, C) => {
          const n = new C(o.length * 2);
          n.set(o);
          return n;
        };
        qx = grow(qx, Float32Array);
        qy = grow(qy, Float32Array);
        qk = grow(qk, Uint8Array);
        ql = grow(ql, Int32Array);
      }
      qx[qn] = x;
      qy[qn] = y;
      qk[qn] = kind;
      ql[qn] = l;
      qn++;
    };
    const flush = (c) => {
      const s = dotSize;
      levelCount.fill(0);
      for (let q = 0; q < qn; q++) levelCount[ql[q]]++; // counting sort by level
      const startAt = new Int32Array(LEVELS + 2);
      for (let l = 1; l <= LEVELS + 1; l++)
        startAt[l] = startAt[l - 1] + levelCount[l - 1];
      if (levelIdx.length < qn) levelIdx = new Int32Array(qn * 2);
      const fillAt = startAt.slice();
      for (let q = 0; q < qn; q++) levelIdx[fillAt[ql[q]]++] = q;
      for (let l = 1; l <= LEVELS; l++) {
        if (!levelCount[l]) continue;
        c.fillStyle = styles[l];
        for (let k = startAt[l]; k < startAt[l + 1]; k++) {
          const q = levelIdx[k],
            x = qx[q],
            y = qy[q];
          if (qk[q])
            c.fillRect(px(x - s * 2), px(y - s / 2), px(s * 4), px(s * 0.5));
          else c.fillRect(px(x - s / 2), px(y - s / 2), px(s), px(s));
        }
      }
      qn = 0;
    };
    const snapX = (i) => Math.round((hx[i] + ox[i]) / grid) * grid;
    const snapY = (i) => Math.round((hy[i] + oy[i]) / grid) * grid;
    const twinkle = (i) =>
      0.85 + 0.15 * Math.sin(clock * (1.5 + (i % 7) * 0.4) + i); // the still layer: every revealed dot that is neither twinkling nor pushed, at its home
    const bakeLayer = () => {
      bake.width = canvas.width;
      bake.height = canvas.height;
      bg.setTransform(dpr, 0, 0, dpr, 0, 0);
      bg.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++)
        if (!tw[i])
          queue(
            Math.round(hx[i] / grid) * grid,
            Math.round(hy[i] / grid) * grid,
            opacity * hb[i] * 0.925,
            hk[i],
          );
      flush(bg);
      baked = true;
    };
    const draw = () => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const s = dotSize;
      if (reveal >= 1 && !baked) bakeLayer();
      if (reveal < 1) {
        // while the map reveals from the cities every dot changes, so all of them are drawn live
        for (let i = 0; i < N; i++) {
          const r = smooth(hd[i], hd[i] + 0.25, reveal * 1.25);
          if (r <= 0) continue;
          queue(
            snapX(i),
            snapY(i),
            opacity * hb[i] * r * (tw[i] ? twinkle(i) : 0.925),
            hk[i],
          );
        }
      } else {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(bake, 0, 0);
        g.setTransform(dpr, 0, 0, dpr, 0, 0); // pushed dots leave a gap at home and are drawn where the wind carried them
        for (const i of actList) {
          if (tw[i]) continue;
          const x = Math.round(hx[i] / grid) * grid,
            y = Math.round(hy[i] / grid) * grid;
          g.clearRect(px(x - s / 2), px(y - s / 2), px(s), px(s));
          queue(snapX(i), snapY(i), opacity * hb[i] * 0.925, 0);
        }
        for (let i = 0; i < N; i++)
          if (tw[i]) queue(snapX(i), snapY(i), opacity * hb[i] * twinkle(i), 0);
      }
      if (cities.length && reveal > 0.3) {
        const a = smooth(0.3, 0.9, reveal); // particles travelling along the arc, brightest mid-flight, with a short trail
        for (const p of fl) {
          for (let k = 0; k < 5; k++) {
            const t = p.t - p.dir * k * 0.006;
            if (t < 0 || t > 1) continue;
            const [x, y] = arcPoint(t);
            const o =
              opacity * a * (1 - k / 5) * (0.35 + 0.65 * Math.sin(t * Math.PI));
            queue(
              Math.round((x + p.j * Math.sin(t * Math.PI)) / grid) * grid,
              Math.round(y / grid) * grid,
              o,
              0,
            );
          }
        } // the cities: a small bright core that breathes
        for (const [cx, cy] of cities) {
          const pulse = 0.75 + 0.25 * Math.sin(clock * 2.2);
          for (let k = 0; k < 14; k++) {
            const an = k * 2.4 + clock * 0.3,
              rr = (k % 4) * grid * 0.9;
            queue(
              Math.round((cx + Math.cos(an) * rr) / grid) * grid,
              Math.round((cy + Math.sin(an) * rr) / grid) * grid,
              opacity * a * pulse * (1 - (k % 4) * 0.2),
              0,
            );
          }
        }
      }
      flush(g);
    }; // reveals each time it comes into view; the loop runs only while the map is on screen
    let visible = false;
    const io = new IntersectionObserver(
      (es) => {
        const v = es[0].isIntersecting;
        if (!v && visible && !onCanvas && !reduce) reveal = 0;
        visible = v;
        if (v) wake();
      },
      { threshold: 0.2 },
    );
    io.observe(wrap);
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
    ro.observe(wrap);
    let alive = true;
    const idle = (fn) =>
      window.requestIdleCallback
        ? window.requestIdleCallback(fn, { timeout: 600 })
        : setTimeout(fn, 1);
    const stopNear = whenNear(wrap, () =>
      loadLand()
        .then((l) => {
          if (!alive) return;
          land = l; // rasterising the land is the one heavy step; keep it off the scroll frames
          idle(() => alive && build());
        })
        .catch(() => {}),
    ); // 30 frames a second while it only twinkles and flows, 60 while the cursor pushes dots
    let raf = 0,
      last = 0,
      lastDraw = 0;
    const frame = (now) => {
      raf = 0;
      if (!visible || !alive) return;
      raf = requestAnimationFrame(frame);
      if (window.__ucasLoading || !N) {
        last = now;
        return;
      }
      const fps = actList.length || energy > 0 || reveal < 1 ? 60 : 30;
      if (now - lastDraw < 1e3 / fps - 2) return;
      lastDraw = now;
      const dt = Math.min(0.05, last ? (now - last) / 1e3 : 0);
      last = now;
      if (!reduce) step(dt);
      draw();
    };
    function wake() {
      if (!raf && visible) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    }
    recolor.current = () => {
      probe.fillStyle = resolveColor(color, wrap);
      probe.fillRect(0, 0, 1, 1);
      const [r, g2, b] = probe.getImageData(0, 0, 1, 1).data;
      ink = `${r},${g2},${b}`;
      makeStyles();
      baked = false;
      if (N) draw();
    };
    return () => {
      alive = false;
      stopNear();
      cancelAnimationFrame(raf);
      clearTimeout(rt);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      canvas.remove();
    };
  }, [color, opacity, size, gridProp, density, flow]);
  useEffect(() => recolor.current?.(), [scheme]);
  return /*#__PURE__*/ _jsx("div", {
    ref: wrapRef,
    "aria-hidden": true,
    style: {
      ...style,
      position: "relative",
      overflow: "hidden",
      pointerEvents: "none",
    },
  });
}
