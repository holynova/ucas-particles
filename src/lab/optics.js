const { sin, cos, abs, hypot, sqrt, PI } = Math;
const TAU = 2 * PI;
const fract = (x) => x - Math.floor(x);

// A faint light path and a train of photons traveling along it.
function beam({ dot, line }, x, y, endX, endY, phase, brightness = 1) {
  const dx = endX - x,
    dy = endY - y,
    length = hypot(dx, dy);
  if (length < 0.0001) return;
  line(x, y, endX, endY, 0.002, 0.17 * brightness);
  for (let s = fract(phase) * 0.095; s < length; s += 0.095)
    dot(x + (dx * s) / length, y + (dy * s) / length, 0.006, brightness);
}
function lens(frame) {
  const { dot, time, pointer, aspect } = frame,
    focus = 0.6 + 0.26 * pointer.x,
    lean = 0.24 * pointer.y;
  for (let j = -8; j <= 8; j++) {
    const y = j * 0.088,
      x = -aspect * 0.85,
      end = aspect * 0.78;
    beam(frame, x, y + lean * x, 0, y, time * 2.8 + j * 0.13, 0.68);
    beam(
      frame,
      0,
      y,
      end,
      y + end * (lean - y / focus),
      time * 2.8 + j * 0.13 - hypot(x, lean * x) / 0.095,
      0.72,
    );
  }
  for (let j = -55; j <= 55; j++) {
    const v = j / 55,
      x = 0.12 * (1 - v * v);
    dot(x, v * 0.8, 0.008, 0.92);
    dot(-x, v * 0.8, 0.008, 0.92);
  }
}
function refraction(frame) {
  const { dot, line, time, pointer, aspect } = frame,
    incidence = 0.68 + pointer.x * 0.48,
    n = 1.5 + 0.35 * pointer.y;
  const bend = Math.asin(sin(incidence) / n);
  for (let i = -5; i <= 5; i++) {
    const x = i * 0.057;
    beam(
      frame,
      x - 0.94 * Math.tan(incidence),
      -0.94,
      x,
      0,
      time * 2 + i * 0.22,
      0.78,
    );
    beam(
      frame,
      x,
      0,
      x + 0.94 * Math.tan(bend),
      0.94,
      time * 2 + i * 0.22,
      0.9,
    );
  }
  line(-aspect, 0, aspect, 0, 0.004, 0.65);
  for (let x = -aspect; x < aspect; x += 0.09)
    for (let y = 0.07; y < 1; y += 0.09) dot(x, y, 0.003, 0.16);
  for (let y = -0.86; y < 0.86; y += 0.08) dot(0, y, 0.005, 0.41);
}
function doppler({ dot, time, pointer, aspect }) {
  const track = aspect * 0.69,
    speed = 0.74 + pointer.x * 0.45,
    cy = pointer.y * 0.4;
  const emit = (t) => track * sin(t * speed);
  for (let j = 0; j < 15; j++) {
    const age = (j + fract(time / 0.27)) * 0.27,
      r = age * 0.53;
    const cx = emit(time - age),
      count = Math.max(20, Math.ceil(r * 140));
    for (let i = 0; i < count; i++) {
      const a = (TAU * i) / count;
      dot(cx + r * cos(a), cy + r * sin(a), 0.005, 1 - age / 4.4);
    }
  }
  dot(emit(time), cy, 0.035, 1);
}
function moire({ dot, time, pointer }) {
  const angle = 0.13 + 0.095 * sin(time * 0.42) + pointer.x * 0.31,
    scale = 1 + pointer.y * 0.1;
  for (let j = -19; j <= 19; j++)
    for (let i = -19; i <= 19; i++) {
      const x = i * 0.045,
        y = j * 0.045;
      if (x * x + y * y > 0.79) continue;
      dot(x, y, 0.009, 0.66);
      dot(
        (x * cos(angle) - y * sin(angle)) * scale,
        (x * sin(angle) + y * cos(angle)) * scale,
        0.009,
        0.86,
      );
    }
}
function fourier() {
  let terms = 4;
  return {
    press() {
      terms = (terms % 8) + 1;
    },
    draw({ dot, line, time, pointer, aspect }) {
      const phase = time * 1.5 + pointer.x * PI,
        scale = 0.49,
        start = -aspect * 0.5;
      let x = start,
        y = 0;
      const wave = (t) => {
        let v = 0;
        for (let i = 0; i < terms; i++)
          v += (scale * sin((2 * i + 1) * t)) / (2 * i + 1);
        return v;
      };
      for (let i = 0; i < terms; i++) {
        const n = 2 * i + 1,
          r = scale / n;
        for (let j = 0; j < 76; j++) {
          const a = (j * TAU) / 76;
          dot(x + r * cos(a), y + r * sin(a), 0.004, 0.5);
        }
        const nx = x + r * cos(n * phase),
          ny = y + r * sin(n * phase);
        line(x, y, nx, ny, 0.005, 0.87);
        dot(nx, ny, 0.013, 1);
        x = nx;
        y = ny;
      }
      line(x, y, 0.08, y, 0.003, 0.52);
      for (let j = 0; j < 360; j++) {
        const u = j / 359;
        dot(
          0.08 + u * (aspect * 0.92 - 0.08),
          wave(phase - u * TAU * 1.45),
          0.007,
          0.9,
        );
      }
    },
  };
}
function kaleidoscope({ random }) {
  const gems = Array.from({ length: 78 }, () => ({
    a: random(),
    r: random(),
    speed: 0.2 + random() * 0.52,
  }));
  let sectors = 6;
  return {
    press() {
      sectors = sectors === 9 ? 4 : sectors + 1;
    },
    draw({ dot, time, pointer }) {
      const slice = TAU / sectors;
      for (const gem of gems) {
        const r =
          0.09 +
          0.77 * gem.r +
          0.065 * sin(time * gem.speed + gem.a * 8 + pointer.y * 2);
        const offset =
          (0.22 + 0.22 * sin(gem.a * 8 + time * gem.speed + pointer.x * 3)) *
          slice;
        for (let k = 0; k < sectors; k++)
          for (const sign of [-1, 1]) {
            const a = k * slice + sign * offset;
            dot(
              r * cos(a),
              r * sin(a),
              0.004 + 0.011 * gem.a,
              0.39 + 0.57 * gem.r,
            );
          }
      }
    },
  };
}
function slit({ dot, line, pointer, time, aspect }) {
  const edge = -aspect * 0.45,
    gap = 0.21 + 0.13 * pointer.x,
    wavelength = 0.11 + 0.035 * pointer.y;
  for (let y = -0.88; y < 0.9; y += 0.033)
    for (let x = -aspect * 0.9; x < aspect * 0.92; x += 0.033) {
      const dx = x - edge;
      let phase = dx,
        strength = 0.55;
      if (dx > 0) {
        phase = hypot(dx, y);
        const a = (PI * gap * 2 * y) / (Math.max(0.001, phase) * wavelength),
          sinc = abs(a) < 0.001 ? 1 : sin(a) / a;
        strength = Math.min(1, abs(sinc) * 1.4);
      }
      const glow =
        strength *
        (0.5 + 0.5 * cos((TAU * phase) / wavelength - time * 4)) ** 2;
      if (glow > 0.065) dot(x, y, 0.004 + 0.011 * glow, glow);
    }
  line(edge, -0.99, edge, -gap, 0.018, 0.95);
  line(edge, gap, edge, 0.99, 0.018, 0.95);
}
function eclipse({ random }) {
  const corona = Array.from({ length: 1700 }, () => ({
    a: random() * TAU,
    u: random(),
    s: random(),
  }));
  return ({ dot, time, pointer }) => {
    const cx = pointer.active ? pointer.x * 0.86 : 0.48 * sin(time * 0.37),
      cy = pointer.active ? pointer.y * 0.52 : 0.08;
    for (const { a, u, s } of corona) {
      const ray =
        0.14 + 0.2 * (0.5 + 0.5 * sin(7 * a + 0.45 * sin(time * 0.4))) ** 2;
      const r = s < 0.57 ? 0.51 * sqrt(u) : 0.51 + ray * u * u;
      const x = cos(a) * r,
        y = sin(a) * r;
      if (hypot(x - cx, y - cy) > 0.49)
        dot(x, y, 0.005 + 0.005 * s, s < 0.57 ? 0.84 : (1 - u) * 0.82 + 0.12);
    }
  };
}
function scope() {
  let freq = 3;
  return {
    press() {
      freq = freq === 7 ? 2 : freq + 1;
    },
    draw({ dot, pointer, time, aspect }) {
      const phase = 0.45 * sin(time * 0.43) + pointer.x * PI,
        span = Math.min(1.15, aspect * 0.82);
      for (let i = 0; i < 780; i++) {
        const t = time * 1.29 - (TAU * i) / 780;
        dot(
          span * sin(freq * t + phase),
          (0.67 + 0.15 * pointer.y) * sin(2 * t),
          0.004 + 0.005 * (1 - i / 780),
          0.24 + 0.74 * (1 - i / 780),
        );
      }
    },
  };
}
function caustic(frame) {
  const { dot, time, pointer } = frame,
    turn = pointer.x * 1.3 + 0.14 * sin(time * 0.55),
    radius = 0.85;
  for (let i = 0; i < 200; i++) {
    const a = (i * TAU) / 200;
    dot(radius * cos(a), radius * sin(a), 0.005, 0.55);
  }
  for (let i = -29; i <= 29; i++) {
    const a = turn + i * 0.047,
      ix = cos(a),
      iy = sin(a);
    const dx = cos(turn),
      dy = sin(turn),
      proj = dx * ix + dy * iy;
    const rx = dx - 2 * proj * ix,
      ry = dy - 2 * proj * iy,
      x = radius * ix,
      y = radius * iy;
    const dist = 2 * radius * proj;
    beam(
      frame,
      x,
      y,
      x + rx * dist,
      y + ry * dist,
      time * 2.5 + i * 0.32,
      0.58,
    );
  }
}
const gallery = "https://phydemo.app/ray-optics/gallery/";
const ripple = "https://www.falstad.com/ripple/";
export const optics = [
  [
    "透镜聚焦",
    "横移调整焦距，上下移动改变入射光的倾角。",
    () => lens,
    "PhyDemo · Convex Lens",
    gallery + "convex-lens",
  ],
  [
    "水面折光",
    "左右改变入射角，上下调整下层介质的折射率。",
    () => refraction,
    "PhyDemo · Reflection and Refraction",
    gallery + "reflect",
  ],
  [
    "多普勒波列",
    "左右调节波源速度，观察前方波峰如何挤在一起。",
    () => doppler,
    "Falstad · Ripple Tank",
    ripple,
  ],
  [
    "莫尔叠网",
    "滑动旋转、缩放上层点网，寻找缓慢移动的大花纹。",
    () => moire,
    "Wolfram MathWorld · Moiré Pattern",
    "https://mathworld.wolfram.com/MoirePattern.html",
  ],
  [
    "谐波合成",
    "点按改变叠加项数，观察右侧波形的边缘。",
    fourier,
    "The Coding Train · Fourier Series",
    "https://thecodingtrain.com/challenges/125-fourier-series",
  ],
  [
    "镜筒万花",
    "点按改变镜面分区数，滑动重排反射花纹。",
    kaleidoscope,
    "PhyDemo · Images from Two Mirrors",
    gallery + "images-formed-by-two-mirrors",
  ],
  [
    "单缝衍射",
    "左右改变狭缝宽度，上下改变波长，观察中央亮瓣。",
    () => slit,
    "Falstad · Single Slit",
    ripple,
  ],
  [
    "日冕掩星",
    "将暗盘移过发光圆面，遮住圆心时观察外围日冕。",
    eclipse,
    "NASA · Eclipses",
    "https://science.nasa.gov/eclipses/",
  ],
  [
    "余辉示波",
    "点按切换水平振荡频率，横移调整两轴相位差。",
    scope,
    "The Coding Train · Lissajous Curve Table",
    "https://thecodingtrain.com/challenges/116-lissajous-curve-table",
  ],
  [
    "圆镜焦散",
    "左右转动入射方向，观察反射光束聚成的尖弧。",
    () => caustic,
    "PhyDemo · Caustics from a Reflective Sphere",
    gallery + "caustics-from-a-reflective-sphere",
  ],
].map(([name, hint, create, source, url]) => ({
  name,
  hint,
  create,
  source,
  url,
}));
