import {
  TAU,
  series,
  fract,
  clamp,
  arc,
  view3D,
  surfacePoint,
  mix,
} from "./sketch.js";
const { sin, cos, abs, sqrt, PI, cosh } = Math;
function mobius({ dot, time, pointer }) {
  const view = view3D(time * 0.21 + pointer.x * 1.7, 0.47 + pointer.y * 0.86);
  for (let i = 0; i < 158; i++) {
    const a = (i / 158) * TAU;
    for (let j = 0; j < 15; j++) {
      const w = (j / 14 - 0.5) * 0.51,
        r = 0.64 + w * cos(a / 2);
      surfacePoint(
        dot,
        view,
        r * cos(a),
        w * sin(a / 2),
        r * sin(a),
        j === 0 || j === 14 ? 0.009 : 0.006,
      );
    }
  }
}
const cube4 = series(16, (i) => series(4, (k) => ((i >> k) & 1 ? 1 : -1)));
function tesseract({ dot, line, time, pointer }) {
  const theta = time * 0.39 + pointer.x * 1.8,
    view = view3D(0.48 + pointer.x * 0.26, 0.34 + pointer.y * 0.62, 0.68);
  const pts = cube4.map(([x, y, z, w]) => {
    const depth = w * cos(theta) - x * sin(theta),
      scale = 1.52 / (3.15 - depth);
    return view(
      (x * cos(theta) + w * sin(theta)) * scale,
      y * scale,
      z * scale,
    );
  });
  pts.forEach(([x, y, z], i) => {
    dot(x, y, 0.016, 0.86);
    for (let k = 0; k < 4; k++)
      if (!(i & (1 << k))) {
        const [u, v] = pts[i | (1 << k)];
        line(x, y, u, v, 0.004, 0.69);
        for (let j = 1; j < 8; j++)
          dot(mix(x, u, j / 8), mix(y, v, j / 8), 0.005, 0.58 + z * 0.12);
      }
  });
}
function soapNeck({ dot, time, pointer }) {
  const view = view3D(0.3 + time * 0.14, 0.17 + pointer.y * 0.6),
    neck = 0.25 + 0.105 * pointer.x + 0.035 * sin(time * 0.7);
  for (let j = 0; j < 35; j++) {
    const h = (j / 34 - 0.5) * 0.98,
      r = neck * cosh(h / neck);
    for (let i = 0; i < 74; i++) {
      const a = (TAU * i) / 74;
      surfacePoint(
        dot,
        view,
        r * cos(a),
        h,
        r * sin(a),
        j === 0 || j === 34 ? 0.012 : 0.0055,
      );
    }
  }
}
function superSolid({ dot, time, pointer }) {
  const e = 0.79 + 0.7 * pointer.x,
    f = 0.72 + 0.62 * pointer.y;
  const power = (v, p) => Math.sign(v) * abs(v) ** p;
  const view = view3D(time * 0.27, 0.42);
  for (let j = 1; j < 34; j++)
    for (let i = 0; i < 60; i++) {
      const a = (i * TAU) / 60,
        b = (j / 34 - 0.5) * PI,
        base = power(cos(b), f);
      surfacePoint(
        dot,
        view,
        0.64 * base * power(cos(a), e),
        0.69 * power(sin(b), f),
        0.64 * base * power(sin(a), e),
      );
    }
}
function inversion({ dot, time, pointer }) {
  const cx = pointer.x * 0.54 + 0.13 * sin(time * 0.45),
    cy = pointer.y * 0.46 + 0.11 * cos(time * 0.38),
    r = 0.53;
  for (let row = -7; row <= 7; row++)
    for (let i = 0; i < 128; i++)
      for (const flip of [false, true]) {
        const u = (i / 127 - 0.5) * 3,
          v = row * 0.18,
          x = (flip ? v : u) - cx,
          y = (flip ? u : v) - cy,
          k = (r * r) / Math.max(0.0001, x * x + y * y);
        if (k > 16) continue;
        dot(cx + x * k, cy + y * k, 0.005, 0.53 + abs(row / 7) * 0.31);
      }
  arc(dot, cx, cy, r, r, 0, TAU, 99, 0.005, 0.42);
  dot(cx, cy, 0.022, 1);
}
function projection({ dot, line, time, pointer }) {
  const angle = 0.82 + pointer.x * 0.64 + 0.12 * sin(time * 0.88),
    az = time * 0.42 + pointer.y * 2;
  const view = view3D(-0.3, 0.28, 0.86),
    r = 0.48;
  function plot(x, y, z) {
    return view(x, y, z);
  }
  for (let j = 1; j < 13; j++)
    for (let i = 0; i < 62; i++) {
      const a = (i * TAU) / 62,
        b = (j * PI) / 13;
      surfacePoint(
        dot,
        view,
        r * sin(b) * cos(a),
        -r * cos(b),
        r * sin(b) * sin(a),
        0.005,
      );
    }
  const pole = plot(0, -r, 0);
  for (let j = -6; j <= 6; j++)
    for (let i = -6; i <= 6; i++) {
      const [x, y] = plot(i * 0.16, r, j * 0.16);
      dot(x, y, 0.005, 0.42);
    }
  const sx = r * sin(angle) * cos(az),
    sy = r * cos(angle),
    sz = r * sin(angle) * sin(az);
  const k = (2 * r) / (sy + r),
    q = plot(sx * k, r, sz * k),
    s = plot(sx, sy, sz);
  line(pole[0], pole[1], q[0], q[1], 0.006, 0.93);
  dot(s[0], s[1], 0.024, 1);
  dot(q[0], q[1], 0.027, 0.98);
}
function tetraDust({ random }) {
  const vertices = [
    [0, -0.88, 0],
    [-0.86, 0.54, 0.49],
    [0.86, 0.54, 0.49],
    [0, 0.54, -0.98],
  ];
  let p = [0, 0, 0];
  const points = series(2750, () => {
    const v = vertices[Math.floor(random() * 4)];
    p = p.map((n, i) => (n + v[i]) / 2);
    return p;
  });
  return ({ dot, time, pointer }) => {
    const view = view3D(time * 0.24 + pointer.x * 1.8, 0.06 + pointer.y * 0.74);
    for (const [x, y, z] of points) surfacePoint(dot, view, x, y, z, 0.0055);
  };
}
function section({ dot, line, pointer, time }) {
  const cube = cube4.slice(0, 8).map((p) => p.slice(0, 3).map((v) => v * 0.56));
  const view = view3D(time * 0.23 + 0.5, 0.34),
    normal = [0.6 + 0.29 * pointer.x, 1, 0.37],
    level = 0.56 * pointer.y + 0.12 * sin(time * 0.74),
    intersections = [];
  const distance = (p) => p.reduce((s, v, i) => s + v * normal[i], -level);
  cube.forEach((p, i) => {
    for (let k = 0; k < 3; k++)
      if (!(i & (1 << k))) {
        const q = cube[i | (1 << k)],
          a = view(...p),
          b = view(...q);
        line(a[0], a[1], b[0], b[1], 0.004, 0.42);
        const d = distance(p),
          e = distance(q);
        if ((d <= 0 && e > 0) || (d > 0 && e <= 0))
          intersections.push(p.map((n, j) => mix(n, q[j], d / (d - e))));
      }
  });
  const center = intersections.reduce(
    (s, p) => s.map((n, i) => n + p[i] / intersections.length),
    [0, 0, 0],
  );
  intersections.sort(
    (a, b) =>
      Math.atan2(a[2] - center[2], a[0] - center[0]) -
      Math.atan2(b[2] - center[2], b[0] - center[0]),
  );
  intersections.forEach((p, i) => {
    const q = intersections[(i + 1) % intersections.length];
    const a = view(...p),
      b = view(...q);
    line(a[0], a[1], b[0], b[1], 0.009, 0.98);
    dot(a[0], a[1], 0.021, 1);
    for (let k = 0; k < 20; k++)
      for (let j = 1; j < 11; j++) {
        const pt = p.map((n, d) =>
          mix(center[d], mix(n, q[d], k / 20), j / 11),
        );
        surfacePoint(dot, view, ...pt, 0.004);
      }
  });
}
function pascal() {
  let modulus = 2,
    rows = [];
  function rebuild() {
    rows = [[1]];
    for (let n = 1; n < 60; n++)
      rows.push(
        series(
          n + 1,
          (i) => ((rows[n - 1][i - 1] || 0) + (rows[n - 1][i] || 0)) % modulus,
        ),
      );
  }
  rebuild();
  return {
    press() {
      modulus = (modulus % 5) + 1;
      if (modulus < 2) modulus = 2;
      rebuild();
    },
    draw({ dot, time, pointer }) {
      const focus = fract(time * 0.18 + pointer.x * 0.38) * 60;
      rows.forEach((row, n) =>
        row.forEach((v, k) => {
          if (v)
            dot(
              (k - n / 2) * 0.03,
              (n - 29.5) * 0.028,
              0.008,
              clamp(
                0.36 +
                  (0.4 * v) / (modulus - 1) +
                  0.23 * Math.exp(-abs(n - focus) / 3),
                0,
                1,
              ),
            );
        }),
      );
    },
  };
}
function cycloid({ dot, line, time, pointer, aspect }) {
  const r = 0.24,
    extent = TAU * 1.6,
    arm = r * (0.97 + 0.62 * pointer.y),
    phase = fract(time * 0.14 + pointer.x * 0.3) * extent;
  const start = (-r * extent) / 2,
    base = 0.29;
  for (let j = 0; j < 320; j++) {
    const a = (j / 319) * extent;
    dot(
      start + r * a - arm * sin(a),
      base - r + arm * cos(a),
      0.006,
      a <= phase ? 0.95 : 0.32,
    );
  }
  const cx = start + r * phase,
    cy = base - r,
    px = cx - arm * sin(phase),
    py = cy + arm * cos(phase);
  line(-aspect * 0.95, base, aspect * 0.95, base, 0.003, 0.43);
  arc(dot, cx, cy, r, r, 0, TAU, 80, 0.006, 0.74);
  line(cx, cy, px, py, 0.006, 0.83);
  dot(px, py, 0.018, 1);
}
export const dimensions = [
  [
    "莫比乌斯带",
    "滑动翻看扭转处，沿边缘追踪一圈。",
    () => mobius,
    "https://mathworld.wolfram.com/MoebiusStrip.html",
  ],
  [
    "四维方影",
    "横移转动第四维，纵移倾斜投影。",
    () => tesseract,
    "https://mathworld.wolfram.com/Tesseract.html",
  ],
  [
    "悬链皂膜",
    "横移调整细腰半径，纵移侧看两端的圆环。",
    () => soapNeck,
    "https://mathworld.wolfram.com/Catenoid.html",
  ],
  ["超二次体", "沿两个方向滑动，把圆润表面捏成棱角。", () => superSolid],
  ["反演圆网", "移动反演中心，观察正交直线如何弯成圆弧。", () => inversion],
  [
    "球面投影",
    "滑动球上的亮点，追踪它在平面上的投影。",
    () => projection,
    "https://mathworld.wolfram.com/StereographicProjection.html",
  ],
  ["四面体尘", "滑动旋转分形四面体，观察层层嵌套的空洞。", tetraDust],
  [
    "立方截面",
    "纵移抬高剖面，横移改变倾角，看截面边数如何变化。",
    () => section,
  ],
  ["余数三角", "点按切换杨辉三角的模数，横移扫过不同行。", pascal],
  [
    "滚圆摆线",
    "横移滚轮，纵移笔尖距轮心的距离。",
    () => cycloid,
    "https://mathworld.wolfram.com/Cycloid.html",
  ],
];
