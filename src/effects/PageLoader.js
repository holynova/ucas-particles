// Motion component adapted from Ucas Studio’s published homepage. See README.md.
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
/**
 * Page Loader — the whole screen is particles. A loose field of dots covers it, and in the middle
 * the page's real loading percentage is drawn in dense particles. Each time the number changes, the
 * dots loosen and sweep into the new digits, like the hero's scene changes. At 100% every particle
 * flies once into the shapes of the page that is on screen, and the real page fades in under it.
 * The site's other animations wait (window.__ucasLoading) until then.
 * Plays on a full page load only (not on in-site navigation). A CSS fallback removes the layer even
 * if scripts never run.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */ let played = false;
const resolveColor = (c) => {
  const m = /var\((--[^,)]+)(?:,\s*([^)]+))?\)/.exec(c || "");
  if (!m) return c;
  return (
    getComputedStyle(document.body).getPropertyValue(m[1]).trim() || m[2] || c
  );
}; // Site-wide particle size per breakpoint (Framer: phone < 810px, tablet < 1200px). The grid between
// dots is a whole number of device pixels, so every gap is the same width.
const bpDot = (desktop) =>
  window.innerWidth < 810 ? 1.2 : window.innerWidth < 1200 ? 1.6 : desktop;
const bpGrid = (desktop, dpr) => {
  const g =
    window.innerWidth < 810 ? 1.5 : window.innerWidth < 1200 ? 2 : desktop;
  return Math.max(1, Math.round(g * dpr)) / dpr;
};
const pixelRatio = () => Math.min(3, Math.max(1, window.devicePixelRatio || 1));
const ease = (x) => 1 - Math.pow(1 - x, 3);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}; // grid of the loader (set per breakpoint when it starts)
let G = 2.5; // text drawn on a hidden canvas and sampled on the grid (edges always, insides mostly). Only a box
// around the centre is drawn and read, not the whole screen, so each number change stays cheap on phones.
function textPoints(text, SW, SH, px, family) {
  const W = Math.min(SW, Math.ceil(px * 3.4)),
    H = Math.min(SH, Math.ceil(px * 1.5)); // the box sits on the same grid as the rest of the screen
  const offX = Math.round((SW - W) / 2 / G) * G,
    offY = Math.round((SH - H) / 2 / G) * G;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#000";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `500 ${px}px ${family}`;
  g.fillText(text, W / 2, H / 2);
  const d = g.getImageData(0, 0, W, H).data;
  const A = (x, y) =>
    x < 0 || y < 0 || x >= W || y >= H
      ? 0
      : d[(Math.floor(y) * W + Math.floor(x)) * 4 + 3];
  const out = [];
  for (let y = G / 2; y < H; y += G)
    for (let x = G / 2; x < W; x += G) {
      if (A(x, y) < 110) continue;
      const edge =
        A(x - G, y) < 110 ||
        A(x + G, y) < 110 ||
        A(x, y - G) < 110 ||
        A(x, y + G) < 110;
      if (edge || Math.random() < 0.85) out.push(x + offX, y + offY);
    }
  return out;
} // The page as particles: each word in its own font, every picture as an outlined block.
function pagePoints(W, H, skip) {
  const m = document.createElement("canvas");
  m.width = W;
  m.height = H;
  const mg = m.getContext("2d", { willReadFrequently: true });
  mg.fillStyle = "#000"; // words sit on their real baseline: the font's ascent and descent are centred in the box the
  // browser laid the text out in, exactly as CSS does, so the page appears right under its particles
  mg.textBaseline = "alphabetic";
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node;
  while ((node = walker.nextNode())) {
    const el = node.parentElement;
    const text = node.textContent || "";
    if (!el || skip.contains(el) || !text.trim() || el.closest("style, script"))
      continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || +cs.opacity === 0) continue;
    mg.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const fs = parseFloat(cs.fontSize) || 16;
    const fm = mg.measureText("Hg");
    const asc = fm.fontBoundingBoxAscent ?? fs * 0.8,
      desc = fm.fontBoundingBoxDescent ?? fs * 0.2; // words split after a hyphen too, since the browser may wrap a line there ("AI-" / "native")
    const re = /[^\s-]+-?|-/g;
    let w;
    while ((w = re.exec(text))) {
      range.setStart(node, w.index);
      range.setEnd(node, w.index + w[0].length);
      const r = range.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W)
        continue;
      mg.fillText(w[0], r.left, r.top + (r.height - (asc + desc)) / 2 + asc);
    }
  }
  const blocks = []; // canvases are left out: the particle stages are still blank (or reach far past their section)
  // while the loader runs, and would only show as a big boxed patch
  document.querySelectorAll("img, video").forEach((el) => {
    if (skip.contains(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 40 || r.bottom < 0 || r.top > H) return;
    blocks.push(r);
  });
  const d = mg.getImageData(0, 0, W, H).data;
  const out = [];
  for (let y = G / 2; y < H; y += G)
    for (let x = G / 2; x < W; x += G) {
      if (d[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] > 100) {
        out.push(x, y);
        continue;
      }
      for (const r of blocks)
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          const edge =
            x - r.left < 3 ||
            r.right - x < 3 ||
            y - r.top < 3 ||
            r.bottom - y < 3;
          if (edge || Math.random() < 0.28) out.push(x, y);
          break;
        }
    }
  return out;
}
export default function PageLoader(props) {
  const { color, background, particles, style } = props;
  const onCanvas = false;
  const [show, setShow] = useState(() => {
    const s = !played && !onCanvas; // tell the site's other animations to wait until the page is revealed
    if (s && typeof window !== "undefined") window.__ucasLoading = true;
    return s;
  });
  const layerRef = useRef(null);
  const bgRef = useRef(null);
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!show) return;
    played = true;
    const layer = layerRef.current,
      canvas = canvasRef.current,
      bg = bgRef.current;
    if (!layer || !canvas || !bg) return;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      html.style.overflow = prevOverflow;
      window.__ucasLoading = false;
      window.dispatchEvent(new Event("ucas-loaded"));
      setShow(false);
    };
    if (reduce) {
      layer.style.transition = "opacity 0.4s ease";
      layer.style.opacity = "0";
      const t = window.setTimeout(finish, 450);
      return () => {
        clearTimeout(t);
        html.style.overflow = prevOverflow;
      };
    }
    const g = canvas.getContext("2d");
    const ink = resolveColor(color);
    bg.style.background = resolveColor(background);
    const W = window.innerWidth,
      H = window.innerHeight;
    const dpr = pixelRatio();
    G = bpGrid(2.5, dpr);
    const dot = Math.max(1, Math.round(bpDot(2) * dpr)) / dpr;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const cx = W / 2,
      cy = H / 2;
    const family =
      "'Aeonik Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    const numPx = Math.round(Math.min(W * 0.22, H * 0.3)); // the field covers the whole screen; the pool draws the number (and later the page)
    const F = Math.round((W * H) / 420); // smaller screens use a finer grid, so the number and the page need more dots for the same shapes
    const P = Math.round(
      particles *
        Math.min(1.4, Math.max(W < 1200 ? 0.6 : 0.3, (W * H) / (1440 * 900))),
    );
    const N = F + P;
    const x = new Float32Array(N),
      y = new Float32Array(N),
      al = new Float32Array(N);
    const fx = new Float32Array(N),
      fy = new Float32Array(N),
      fa = new Float32Array(N);
    const lx = new Float32Array(N),
      ly = new Float32Array(N);
    const tx = new Float32Array(N),
      ty = new Float32Array(N),
      ta = new Float32Array(N);
    const d = new Float32Array(N),
      ph = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      x[i] = Math.round((Math.random() * W) / G) * G;
      y[i] = Math.round((Math.random() * H) / G) * G;
      al[i] = i < F ? 0.97 : 0;
      tx[i] = fx[i] = x[i];
      ty[i] = fy[i] = y[i];
      ta[i] = fa[i] = al[i];
      d[i] = Math.random();
      ph[i] = Math.random() * Math.PI * 2;
    }
    let tc = -10,
      morph = 0.65; // start time and length of the current change
    // start a change: every particle loosens a little where it is, then sweeps to its new home
    const retarget = (now, pts, who, spread) => {
      const from = who === "pool" ? F : 0;
      const M = pts.length / 2;
      const idx = new Uint32Array(M);
      for (let k = 0; k < M; k++) idx[k] = k;
      for (let k = M - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        const t = idx[k];
        idx[k] = idx[j];
        idx[j] = t;
      }
      if (who === "pool") {
        // number changes: the dots already drawing the number take the new digits first. Extra
        // dots appear right where they belong and spare ones melt into the new digits, so
        // nothing pops up or fades out around the number.
        const vis = [],
          hid = [];
        for (let i = F; i < N; i++) (al[i] > 0.05 ? vis : hid).push(i);
        for (let k = vis.length - 1; k > 0; k--) {
          const j = Math.floor(Math.random() * (k + 1));
          const t = vis[k];
          vis[k] = vis[j];
          vis[j] = t;
        }
        const ord = vis.concat(hid);
        for (let k = 0; k < ord.length; k++) {
          const i = ord[k];
          const shown = al[i] > 0.05;
          const q = k < M ? idx[k] : M ? Math.floor(Math.random() * M) : -1;
          fa[i] = al[i];
          if (q >= 0 && (shown || k < M)) {
            tx[i] = pts[q * 2];
            ty[i] = pts[q * 2 + 1];
            ta[i] = k < M ? 0.97 : 0;
          } else {
            tx[i] = x[i];
            ty[i] = y[i];
            ta[i] = 0;
          }
          if (!shown) {
            // a hidden dot starts on its new spot and simply fades in there
            x[i] = tx[i];
            y[i] = ty[i];
          }
          fx[i] = x[i];
          fy[i] = y[i];
          const t = Math.random() * Math.PI * 2,
            r = shown ? spread * (0.2 + Math.random()) : 0;
          lx[i] = Math.cos(t) * r;
          ly[i] = Math.sin(t) * r;
        }
        tc = now;
        return;
      }
      for (let i = from, k = 0; i < N; i++, k++) {
        fx[i] = x[i];
        fy[i] = y[i];
        fa[i] = al[i];
        const t = Math.random() * Math.PI * 2,
          r = spread * (0.2 + Math.random());
        lx[i] = Math.cos(t) * r;
        ly[i] = Math.sin(t) * r;
        if (k < M) {
          tx[i] = pts[idx[k] * 2];
          ty[i] = pts[idx[k] * 2 + 1];
          ta[i] = 0.97;
        } else {
          // spare dots slip into the field, invisibly
          tx[i] = fx[i] + (Math.random() - 0.5) * 60;
          ty[i] = fy[i] + (Math.random() - 0.5) * 60;
          ta[i] = 0;
        }
      }
      tc = now;
    };
    const digits = (n) => textPoints(`${n}%`, W, H, numPx, family); // ---- real loading progress: images, fonts and the window load event
    let fontsDone = false,
      loadDone = document.readyState === "complete";
    document.fonts?.ready.then(() => (fontsDone = true));
    const onLoad = () => (loadDone = true);
    window.addEventListener("load", onLoad);
    const progressTarget = () => {
      // only what the first screen needs: lazy images further down load later on their own
      const imgs = Array.from(document.images).filter((im) => {
        if (layer.contains(im) || im.loading === "lazy") return false;
        const r = im.getBoundingClientRect();
        return r.bottom > 0 && r.top < H && r.width > 0;
      });
      let done = 0;
      for (const im of imgs) if (im.complete) done++;
      done += (fontsDone ? 1 : 0) + (loadDone ? 1 : 0);
      return done / (imgs.length + 2);
    };
    let shown = -1,
      lastChange = -10,
      p = 0,
      phase = "count",
      tEnd = 0;
    let pagePts = null;
    const FORM = 0.85,
      REST = 0.15,
      REVEAL = 0.4;
    const px = (v) => Math.round(v * dpr) / dpr; // capped at 60 frames a second, so a 120 Hz screen does not draw every particle twice as often
    let raf = 0,
      t0 = 0,
      last = 0,
      lastDraw = 0;
    const frame = (now) => {
      if (now - lastDraw < 1e3 / 60 - 2) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastDraw = now;
      if (!t0) t0 = last = now;
      const t = (now - t0) / 1e3;
      const dt = Math.min(0.05, (now - last) / 1e3);
      last = now;
      if (phase === "count") {
        // climb towards the real progress, never faster than 0→100 in 2.2s; give up waiting at 4s
        const goal = t > 4 ? 1 : progressTarget(); // measured in real time, so slow devices (few frames) never stretch the count
        p = Math.max(p, Math.min(goal, t / 1.5));
        const n = Math.floor(p * 100 + 1e-6);
        if (
          n !== shown &&
          (t - lastChange > 0.3 || (n === 100 && t - lastChange > 0.2))
        ) {
          shown = n;
          lastChange = t;
          retarget(t, digits(n), "pool", 6);
          morph = 0.32;
        } // reading the page into particles is the heaviest step: do it while "100%" rests, so the
        // frame where everything starts to fly is not the one that stalls
        if (shown === 100 && !pagePts && t - lastChange > 0.36) {
          try {
            pagePts = pagePoints(W, H, layer);
          } catch {
            pagePts = [];
          }
        } else if (shown === 100 && pagePts && t - lastChange > 0.6) {
          // one move: every particle flies straight into the page
          phase = "page";
          retarget(t, pagePts, "all", 4);
          morph = FORM;
          tEnd = t;
        }
      } else if (phase === "page" && t - tEnd > FORM + REST) {
        phase = "reveal";
        tEnd = t;
      } // the real page fades in exactly under the particles that drew it
      const rv = phase === "reveal" ? smooth(0, REVEAL, t - tEnd) : 0;
      bg.style.opacity = String(1 - rv);
      canvas.style.opacity = String(1 - rv);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      g.fillStyle = ink;
      const u = t - tc;
      for (let i = 0; i < N; i++) {
        if (u < morph + 0.5) {
          // loosen in place, then sweep in with a small per-dot delay
          const e1 = 1 - Math.pow(1 - Math.min(1, u / 0.22), 3);
          const sp = phase === "count" ? 0.15 : 0.3;
          const e2 = ease(
            smooth(d[i] * sp, d[i] * sp + 1 - sp, (u - 0.08) / morph),
          );
          const ax = fx[i] + lx[i] * e1,
            ay = fy[i] + ly[i] * e1;
          x[i] = ax + (tx[i] - ax) * e2;
          y[i] = ay + (ty[i] - ay) * e2;
          al[i] = fa[i] + (ta[i] - fa[i]) * e2;
        }
        if (al[i] <= 0.01) continue; // the field breathes softly
        const tw =
          i < F && phase === "count"
            ? 0.75 + 0.25 * Math.sin(t * 1.6 + ph[i])
            : 1;
        g.globalAlpha = al[i] * tw;
        g.fillRect(px(x[i] - dot / 2), px(y[i] - dot / 2), dot, dot);
      }
      g.globalAlpha = 1;
      if (phase === "reveal" && rv >= 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame); // safety net: whatever happens (a background tab, a stalled frame loop), the page is never held
    // back for long and the site's animations always get to start
    const safety = window.setTimeout(finish, 8e3);
    return () => {
      clearTimeout(safety);
      cancelAnimationFrame(raf);
      window.removeEventListener("load", onLoad);
      html.style.overflow = prevOverflow;
    };
  }, [show]);
  if (!show) return null;
  return /*#__PURE__*/ _jsxs("div", {
    ref: layerRef,
    "aria-hidden": true,
    style: {
      ...style,
      position: "fixed",
      inset: 0,
      width: "100vw",
      height: "100vh",
      zIndex: 9999,
      pointerEvents: "none", // fallback: if scripts never run, fade the layer away on its own
      animation: "ucas-loader-fallback 0.4s ease 12s forwards",
    },
    children: [
      /*#__PURE__*/ _jsx("style", {
        children: `@keyframes ucas-loader-fallback { to { opacity: 0; visibility: hidden } }`,
      }),
      /*#__PURE__*/ _jsx("div", {
        ref: bgRef,
        style: { position: "absolute", inset: 0, background },
      }),
      /*#__PURE__*/ _jsx("canvas", {
        ref: canvasRef,
        style: {
          position: "absolute",
          inset: 0,
          display: "block",
          imageRendering: "pixelated",
        },
      }),
    ],
  });
}
