const TAU = 2 * Math.PI;
const { sin, cos, abs, sqrt, hypot, floor, exp } = Math;
const points = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function knot({ dot, time, pointer }) {
  const yaw = time * 0.2 + pointer.x * 1.8,
    pitch = 0.43 + pointer.y * 1.2;
  for (let i = 0; i < 235; i++) {
    const t = (TAU * i) / 235,
      r = 0.53 + 0.25 * cos(3 * t);
    const x = r * cos(2 * t),
      y = r * sin(2 * t),
      z = 0.31 * sin(3 * t);
    const dx = -0.75 * sin(3 * t) * cos(2 * t) - 2 * y,
      dy = -0.75 * sin(3 * t) * sin(2 * t) + 2 * x,
      dz = 0.93 * cos(3 * t);
    const flat = hypot(dx, dy),
      length = hypot(flat, dz);
    for (let j = 0; j < 13; j++) {
      const a = (j * TAU) / 13,
        rad = 0.073;
      const px =
        x +
        rad * ((-dy / flat) * cos(a) - ((dx * dz) / (length * flat)) * sin(a));
      const py =
        y +
        rad * ((dx / flat) * cos(a) - ((dy * dz) / (length * flat)) * sin(a));
      const pz = z + ((rad * flat) / length) * sin(a);
      const u = px * cos(yaw) - py * sin(yaw),
        v = px * sin(yaw) + py * cos(yaw);
      const depth = v * sin(pitch) + pz * cos(pitch);
      dot(
        u * 1.14,
        (v * cos(pitch) - pz * sin(pitch)) * 1.14,
        0.0038 + 0.0018 * (1 + depth),
        clamp(0.53 + depth * 0.69, 0.16, 1),
      );
    }
  }
}

function flower() {
  let petals = 5;
  return {
    press() {
      petals = petals === 9 ? 3 : petals + 1;
    },
    draw({ dot, time, pointer }) {
      const power = 2.4 + pointer.y * 1.25;
      for (let layer = 1; layer <= 22; layer++) {
        const u = layer / 22,
          rot = (1 - u) * (0.3 + pointer.x * 0.52) + time * 0.095;
        for (let i = 0; i < 160; i++) {
          const a = (TAU * i) / 160,
            m = (petals * a) / 4;
          const r =
            0.85 * u * (abs(cos(m)) ** power + abs(sin(m)) ** power) ** -1.5;
          dot(
            cos(a + rot) * r * 0.85,
            sin(a + rot) * r * 0.85,
            0.004,
            0.25 + 0.58 * u,
          );
        }
      }
    },
  };
}

function ice({ random }) {
  let branches = [],
    age = 0;
  function seed() {
    branches = [];
    for (let side = -1; side <= 1; side += 2) {
      for (let j = 1; j <= 10; j++) {
        const root = 0.07 * j,
          len = (1 - j / 12) * (0.15 + random() * 0.25);
        branches.push([root, 0, root + len * 0.5, side * len * 0.866, root]);
        for (let k = 1; k <= 3; k++) {
          const f = k / 4,
            x = root + len * 0.5 * f,
            y = side * len * 0.866 * f;
          branches.push([x, y, x + len * (1 - f) * 0.45, y, root + len * f]);
        }
      }
    }
    branches.push([0, 0, 0.85, 0, 0]);
  }
  seed();
  age = 0.98;
  return {
    press() {
      seed();
      age = 0.08;
    },
    draw({ dot, time, dt, pointer }) {
      age = Math.min(1.15, age + dt * 0.31);
      for (let arm = 0; arm < 6; arm++) {
        const a = (arm * TAU) / 6 + time * 0.035 + pointer.x * 0.38,
          ca = cos(a),
          sa = sin(a);
        for (const [x, y, ex, ey, start] of branches) {
          const length = hypot(ex - x, ey - y),
            steps = Math.ceil(length / 0.012);
          for (let i = 0; i <= steps; i++) {
            const f = i / steps;
            if (start + length * f > age) break;
            const px = x + (ex - x) * f,
              py = y + (ey - y) * f;
            dot(
              px * ca - py * sa,
              px * sa + py * ca,
              0.0045 + (1 - f) * 0.0023,
              0.55 + 0.36 * cos(f * 3) ** 2,
            );
          }
        }
      }
    },
  };
}

function hilbert() {
  let order = 4,
    path = [];
  function build() {
    const n = 2 ** order;
    path = points(n * n, (index) => {
      let x = 0,
        y = 0,
        k = index;
      for (let s = 1; s < n; s *= 2) {
        const rx = 1 & (k >> 1),
          ry = 1 & (k ^ rx);
        if (!ry) {
          if (rx) {
            x = s - 1 - x;
            y = s - 1 - y;
          }
          [x, y] = [y, x];
        }
        x += s * rx;
        y += s * ry;
        k >>= 2;
      }
      return [(x / (n - 1) - 0.5) * 1.62, (y / (n - 1) - 0.5) * 1.62];
    });
  }
  build();
  return {
    press() {
      order = order === 5 ? 2 : order + 1;
      build();
    },
    draw({ dot, line, time, pointer }) {
      const head = (((time * 0.16 + 0.5 + pointer.x * 0.22) % 1) + 1) % 1;
      for (let i = 1; i < path.length; i++) {
        const [x, y] = path[i],
          [a, b] = path[i - 1],
          lag = (head - i / path.length + 1) % 1,
          glow = exp(-lag * 12);
        line(x, y, a, b, 0.003 + 0.003 * glow, 0.22 + 0.67 * glow);
        dot(x, y, 0.004 + 0.004 * glow, 0.48 + glow * 0.47);
      }
    },
  };
}

function mandelbrot() {
  const views = [
    [-0.66, 0, 1.35],
    [-0.75, 0.12, 0.22],
    [-0.746, 0.101, 0.047],
    [-0.7436, 0.1318, 0.0072],
  ];
  let level = 0,
    field = [];
  function build() {
    const [cx, cy, size] = views[level],
      cap = 56 + level * 34;
    field = [];
    for (let j = -46; j <= 46; j++)
      for (let i = -73; i <= 73; i++) {
        const x = i / 52,
          y = j / 52,
          a = cx + x * size,
          b = cy + y * size;
        let u = 0,
          v = 0,
          k = 0;
        while (k < cap && u * u + v * v < 16) {
          const next = u * u - v * v + a;
          v = 2 * u * v + b;
          u = next;
          k++;
        }
        if (k < 3 || k === cap) continue;
        const smooth = k + 1 - Math.log2(Math.log(hypot(u, v)));
        field.push([x, y, smooth]);
      }
  }
  build();
  return {
    press() {
      level = (level + 1) % views.length;
      build();
    },
    draw({ dot, time, pointer }) {
      for (const [x, y, k] of field) {
        const brightness = (1 + cos(k * 0.71 - time * 0.7 + pointer.x * 2)) / 2;
        dot(x, y, 0.002 + brightness * 0.0048, 0.15 + 0.75 * brightness);
      }
    },
  };
}

function chemistry({ random }) {
  const w = 104,
    h = 62,
    n = w * h;
  let a = new Float32Array(n).fill(1),
    b = new Float32Array(n);
  let nextA = new Float32Array(n),
    nextB = new Float32Array(n);
  function inject(cx, cy, r) {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const i = ((cy + dy + h) % h) * w + ((cx + dx + w) % w);
        a[i] = 0.35;
        b[i] = 0.85;
      }
  }
  for (let i = 0; i < 21; i++)
    inject(
      floor(4 + random() * (w - 8)),
      floor(4 + random() * (h - 8)),
      2 + (i % 3),
    );
  function step() {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x,
          up = ((y + h - 1) % h) * w + x,
          down = ((y + 1) % h) * w + x;
        const left = y * w + ((x + w - 1) % w),
          right = y * w + ((x + 1) % w);
        const u = a[i],
          v = b[i],
          reaction = u * v * v;
        nextA[i] = clamp(
          u +
            0.2 * (a[up] + a[down] + a[left] + a[right] - 4 * u) -
            reaction +
            0.035 * (1 - u),
          0,
          1,
        );
        nextB[i] = clamp(
          v +
            0.095 * (b[up] + b[down] + b[left] + b[right] - 4 * v) +
            reaction -
            0.096 * v,
          0,
          1,
        );
      }
    [a, nextA] = [nextA, a];
    [b, nextB] = [nextB, b];
  }
  for (let i = 0; i < 100; i++) step();
  let carry = 0;
  return {
    press(p, aspect) {
      inject(
        clamp(floor(((p.x * aspect) / 2.6 + 0.5) * w), 0, w - 1),
        clamp(floor((p.y / 1.55 + 0.5) * h), 0, h - 1),
        5,
      );
    },
    draw({ dot, dt }) {
      carry += dt * 68;
      while (carry >= 1) {
        step();
        carry--;
      }
      for (let i = 0; i < n; i++) {
        const value = b[i];
        if (value < 0.06) continue;
        dot(
          ((i % w) / w - 0.5) * 2.6,
          (floor(i / w) / h - 0.5) * 1.55,
          0.003 + value * 0.018,
          Math.min(1, value * 2.1),
        );
      }
    },
  };
}

function tree({ random }) {
  const forks = points(512, () => random() - 0.5);
  return ({ dot, line, time, pointer }) => {
    function branch(x, y, a, length, depth, id) {
      const ux = x + cos(a) * length,
        uy = y + sin(a) * length;
      line(x, y, ux, uy, 0.0018 + depth * 0.0011, 0.3 + depth * 0.08);
      if (depth === 0) {
        dot(ux, uy, 0.009, 0.84);
        return;
      }
      const breeze =
        (sin(time * 1.1 + id * 0.2) * 0.022 + pointer.x * 0.11) *
        (1.12 - depth * 0.09);
      const split = 0.49 + pointer.y * 0.18 + forks[id] * 0.26;
      branch(ux, uy, a - split + breeze, length * 0.73, depth - 1, id * 2);
      branch(ux, uy, a + split + breeze, length * 0.74, depth - 1, id * 2 + 1);
    }
    branch(0, 0.87, -Math.PI / 2 + pointer.x * 0.08, 0.49, 8, 1);
  };
}

function bubbles({ dot, time, pointer, aspect }) {
  const centers = [
    [-0.45 + sin(time * 0.63) * 0.24, 0.05 + cos(time * 0.79) * 0.19, 0.34],
    [0.4 + sin(time * 0.45) * 0.29, -0.12 + cos(time * 0.83) * 0.24, 0.29],
    [sin(time * 0.75) * 0.27, 0.44 * cos(time * 0.49), 0.25],
    [
      pointer.active ? pointer.x * aspect : 0.12,
      pointer.active ? pointer.y : -0.35,
      0.25,
    ],
  ];
  for (let j = -38; j <= 38; j++)
    for (let i = -61; i <= 61; i++) {
      const x = i * 0.025,
        y = j * 0.025;
      let field = 0;
      for (const [cx, cy, r] of centers)
        field += (r * r) / ((x - cx) ** 2 + (y - cy) ** 2 + 0.0001);
      if (field < 0.7 || field > 3.9) continue;
      const ridge =
        exp(-13 * abs(field - 1)) + 0.48 * exp(-13 * abs(field - 1.65));
      if (ridge > 0.036) dot(x, y, 0.003 + 0.008 * ridge, 0.16 + 0.8 * ridge);
    }
}

function gears() {
  const pairs = [
    [8, 3],
    [11, 4],
    [13, 5],
    [9, 2],
  ];
  let index = 0;
  return {
    press() {
      index = (index + 1) % pairs.length;
    },
    draw({ dot, line, time, pointer }) {
      const [outer, inner] = pairs[index],
        r = inner / outer,
        R = 1 - r,
        d = r * (0.72 + pointer.y * 0.23);
      const pos = (t) => [
        0.85 * (R * cos(t) + d * cos((t * R) / r)),
        0.85 * (R * sin(t) - d * sin((t * R) / r)),
      ];
      const head = time * 0.83 + pointer.x * 1.5;
      for (let i = 0; i < 2700; i++) {
        const t = (i * TAU * inner) / 2700,
          [x, y] = pos(t);
        const lag = (head - t) % (TAU * inner);
        dot(
          x,
          y,
          0.0038,
          0.35 + 0.62 * exp(-((lag + TAU * inner) % (TAU * inner)) * 1.7),
        );
      }
      const cx = 0.85 * R * cos(head),
        cy = 0.85 * R * sin(head),
        [px, py] = pos(head);
      for (let i = 0; i < 120; i++) {
        const t = (i * TAU) / 120;
        dot(cx + 0.85 * r * cos(t), cy + 0.85 * r * sin(t), 0.003, 0.25);
      }
      line(cx, cy, px, py, 0.003, 0.55);
      dot(px, py, 0.014, 1);
    },
  };
}

function life({ random }) {
  const w = 88,
    h = 54;
  let cells = new Uint8Array(w * h),
    next = new Uint8Array(w * h);
  let elapsed = 0;
  const at = (x, y) => ((y + h) % h) * w + ((x + w) % w);
  const glider = (x, y) => {
    for (const [dx, dy] of [
      [0, 0],
      [1, 1],
      [-1, 2],
      [0, 2],
      [1, 2],
    ])
      cells[at(x + dx, y + dy)] = 1;
  };
  for (let i = 0; i < cells.length; i++) cells[i] = random() < 0.24 ? 1 : 0;
  function generation() {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let j = -1; j <= 1; j++)
          for (let i = -1; i <= 1; i++)
            if (i || j) sum += cells[at(x + i, y + j)] ? 1 : 0;
        const index = y * w + x;
        next[index] =
          sum === 3 || (cells[index] && sum === 2)
            ? Math.min(12, cells[index] + 1)
            : 0;
      }
    [cells, next] = [next, cells];
  }
  for (let i = 0; i < 8; i++) generation();
  return {
    press(p, aspect) {
      const x = clamp(floor(((p.x * aspect) / 2.6 + 0.5) * w), 2, w - 3),
        y = clamp(floor((p.y / 1.6 + 0.5) * h), 2, h - 4);
      for (let j = -2; j <= 3; j++)
        for (let i = -2; i <= 2; i++) cells[at(x + i, y + j)] = 0;
      glider(x, y);
    },
    draw({ dot, dt }) {
      elapsed += dt;
      if (elapsed >= 0.16) {
        elapsed -= 0.16;
        generation();
      }
      for (let i = 0; i < cells.length; i++)
        if (cells[i])
          dot(
            ((i % w) / w - 0.5) * 2.6,
            (floor(i / w) / h - 0.5) * 1.6,
            0.011,
            0.95 - 0.033 * cells[i],
          );
    },
  };
}

export const forms = [
  [
    "环面纽结",
    "滑动旋转编织成结的管面，观察交叉处的前后关系。",
    () => knot,
    "Three.js · TorusKnotGeometry",
    "https://threejs.org/docs/pages/TorusKnotGeometry.html",
  ],
  [
    "极坐标花冠",
    "点按增加花瓣，滑动调整花瓣曲率与层间扭转。",
    flower,
    "The Coding Train · Supershapes",
    "https://thecodingtrain.com/challenges/26-3d-supershapes",
  ],
  [
    "六棱冰晶",
    "点按生成新的枝晶，从中心看它向六个方向生长。",
    ice,
    "SnowCrystals · Snowflake Science",
    "https://www.snowcrystals.com/science/science.html",
  ],
  [
    "希尔伯特曲线",
    "点按切换迭代阶数，跟随亮点走完整条折线。",
    hilbert,
    "The Coding Train · Hilbert Curve",
    "https://thecodingtrain.com/challenges/c3-hilbert-curve",
  ],
  [
    "分形潜航",
    "点按逐级深入曼德勃罗集边界，横移调整等值纹亮度。",
    mandelbrot,
    "Processing · The Mandelbrot Set",
    "https://www.processing.org/examples/mandelbrot",
  ],
  [
    "反应斑图",
    "点按注入试剂，观察周围的斑纹扩散、分裂或合并。",
    chemistry,
    "Karl Sims · Reaction-Diffusion",
    "https://www.karlsims.com/rd.html",
  ],
  [
    "风中枝序",
    "左右移动改变风向，上下移动调节枝杈开度。",
    tree,
    "The Coding Train · Fractal Trees",
    "https://thecodingtrain.com/challenges/14-fractal-trees-recursive",
  ],
  [
    "软体融球",
    "带动一个软球靠近其他球，观察等值轮廓融合和分离。",
    () => bubbles,
    "The Coding Train · Metaballs",
    "https://thecodingtrain.com/challenges/28-metaballs",
  ],
  [
    "齿轮画盘",
    "点按换一组齿比，上下滑动改变画笔距轮心的距离。",
    gears,
    "Nathan Friend · Inspirograph",
    "https://experiments.withgoogle.com/inspirograph",
  ],
  [
    "生命棋盘",
    "点按植入一艘滑翔机，观察它与周围细胞相遇。",
    life,
    "Play Conway’s Game of Life",
    "https://playgameoflife.com/",
  ],
].map(([name, hint, create, source, url]) => ({
  name,
  hint,
  create,
  source,
  url,
}));
