const { sin, cos, hypot, floor, abs, PI } = Math;
const TAU = PI * 2;
const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const mod = (n, d) => ((n % d) + d) % d;

function maze({ random }) {
  const cols = 21,
    rows = 13,
    count = cols * rows,
    pass = range(count, () => []),
    visited = new Set([0]),
    stack = [0];
  while (stack.length) {
    const cell = stack.at(-1),
      x = cell % cols,
      y = floor(cell / cols);
    const options = [
      x > 0 ? cell - 1 : -1,
      x < cols - 1 ? cell + 1 : -1,
      y > 0 ? cell - cols : -1,
      y < rows - 1 ? cell + cols : -1,
    ].filter((n) => n >= 0 && !visited.has(n));
    if (!options.length) {
      stack.pop();
      continue;
    }
    const next = options[floor(random() * options.length)];
    pass[cell].push(next);
    pass[next].push(cell);
    visited.add(next);
    stack.push(next);
  }
  const parent = new Int16Array(count).fill(-1),
    queue = [0];
  for (let i = 0; i < queue.length; i++)
    for (const n of pass[queue[i]])
      if (n !== 0 && parent[n] < 0) {
        parent[n] = queue[i];
        queue.push(n);
      }
  let route = [],
    age = 0;
  function target(n) {
    route = [];
    for (let i = n; i >= 0; i = parent[i]) route.push(i);
    route.reverse();
    age = 0;
  }
  target(count - 1);
  const unit = (a) => Math.min(1.78 / rows, (a * 1.84) / cols);
  return {
    press(p, aspect) {
      const u = unit(aspect),
        x = clamp(floor((p.x * aspect) / u + cols / 2), 0, cols - 1),
        y = clamp(floor(p.y / u + rows / 2), 0, rows - 1);
      target(y * cols + x);
    },
    draw({ dot, line, aspect, dt }) {
      age += dt;
      const u = unit(aspect);
      for (let i = 0; i < count; i++) {
        const x = ((i % cols) - cols / 2) * u,
          y = (floor(i / cols) - rows / 2) * u;
        if (i % cols === 0) line(x, y, x, y + u, 0.003, 0.37);
        if (i < cols) line(x, y, x + u, y, 0.003, 0.37);
        if (!pass[i].includes(i + 1)) line(x + u, y, x + u, y + u, 0.003, 0.37);
        if (!pass[i].includes(i + cols))
          line(x, y + u, x + u, y + u, 0.003, 0.37);
      }
      route.forEach((cell, i) => {
        const x = ((cell % cols) + 0.5 - cols / 2) * u,
          y = (floor(cell / cols) + 0.5 - rows / 2) * u;
        const head = mod(i - age * 13, Math.max(1, route.length));
        dot(
          x,
          y,
          i === route.length - 1 ? 0.024 : 0.013,
          head < 6 || i === route.length - 1 ? 1 : 0.46,
        );
      });
    },
  };
}
function ant() {
  const size = 69,
    cells = new Uint8Array(size * size);
  let x = 34,
    y = 34,
    dir = 0,
    credit = 0;
  function step() {
    const i = y * size + x;
    dir = mod(dir + (cells[i] ? -1 : 1), 4);
    cells[i] ^= 1;
    x = mod(x + [1, 0, -1, 0][dir], size);
    y = mod(y + [0, 1, 0, -1][dir], size);
  }
  for (let i = 0; i < 3800; i++) step();
  return {
    press(p, aspect) {
      x = clamp(floor((p.x * aspect) / 0.027 + size / 2), 0, size - 1);
      y = clamp(floor(p.y / 0.027 + size / 2), 0, size - 1);
      dir = (dir + 1) % 4;
      cells[y * size + x] ^= 1;
    },
    draw({ dot, dt }) {
      credit += dt * 390;
      while (credit >= 1) {
        step();
        credit--;
      }
      for (let i = 0; i < cells.length; i++)
        if (cells[i])
          dot(
            ((i % size) + 0.5 - size / 2) * 0.027,
            (floor(i / size) + 0.5 - size / 2) * 0.027,
            0.011,
            0.73,
          );
      dot((x + 0.5 - size / 2) * 0.027, (y + 0.5 - size / 2) * 0.027, 0.028, 1);
    },
  };
}
function territories({ random }) {
  const seeds = range(13, () => ({
    x: random() * 2 - 1,
    y: random() * 1.7 - 0.85,
    a: random() * TAU,
  }));
  return ({ dot, time, pointer, aspect }) => {
    const sites = seeds.map((s, i) =>
      i === 0 && pointer.active
        ? [pointer.x * aspect, pointer.y]
        : [
            (s.x + 0.17 * sin(time * 0.39 + s.a)) * aspect,
            s.y + 0.13 * cos(time * 0.47 + s.a),
          ],
    );
    for (let y = -0.92; y < 0.93; y += 0.035)
      for (let x = -aspect * 0.94; x < aspect * 0.94; x += 0.035) {
        let first = Infinity,
          second = Infinity;
        for (const [sx, sy] of sites) {
          const d = (sx - x) ** 2 + (sy - y) ** 2;
          if (d < first) {
            second = first;
            first = d;
          } else if (d < second) second = d;
        }
        const gap = Math.sqrt(second) - Math.sqrt(first);
        if (gap < 0.055)
          dot(
            x,
            y,
            0.006 + 0.006 * (1 - gap / 0.055),
            0.3 + 0.66 * (1 - gap / 0.055),
          );
      }
    for (const [x, y] of sites) dot(x, y, 0.023, 1);
  };
}
function galton({ random }) {
  const rows = 9,
    spacing = 0.164;
  const beads = range(92, () => ({
    choices: range(rows, () => random()),
    offset: random(),
  }));
  const bins = new Uint8Array(rows + 1);
  return ({ dot, line, time, pointer }) => {
    const bias = 0.5 + pointer.x * 0.39;
    bins.fill(0);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i <= j; i++)
        dot((i - j / 2) * spacing, -0.72 + j * 0.142, 0.016, 0.7);
    for (const bead of beads) {
      const phase = ((time * 0.18 + bead.offset) % 1) * (rows + 3),
        idx = Math.min(rows, floor(phase));
      let right = 0;
      for (let k = 0; k < idx; k++) if (bead.choices[k] < bias) right++;
      const x = (right - idx / 2) * spacing;
      if (idx === rows) {
        bins[right]++;
        continue;
      }
      const f = phase - idx,
        sign = bead.choices[idx] < bias ? 1 : -1;
      dot(
        x + sign * spacing * 0.5 * f,
        -0.75 + phase * 0.142 - 0.067 * sin(PI * f),
        0.013,
        0.94,
      );
    }
    for (let i = 0; i <= rows; i++) {
      const x = (i - rows / 2) * spacing;
      line(x - spacing / 2, 0.61, x - spacing / 2, 0.9, 0.004, 0.38);
      for (let j = 0; j < bins[i]; j++)
        dot(
          x + ((j % 3) - 1) * 0.035,
          0.87 - floor(j / 3) * 0.032,
          0.013,
          0.86,
        );
    }
  };
}
function pursuit() {
  let n = 5;
  return {
    press() {
      n = n === 9 ? 3 : n + 1;
    },
    draw({ dot, line, pointer, time }) {
      const tight = 1 - cos(TAU / n),
        spin = sin(TAU / n),
        speed = 1 + 0.55 * pointer.x;
      for (let k = 0; k < n; k++) {
        const base = (k * TAU) / n + pointer.y * 0.6;
        for (let i = 0; i < 175; i++) {
          const t = (i / 174) * 4.6,
            r = 0.88 * Math.exp(-tight * t),
            a = base + t * spin * speed;
          dot(r * cos(a), r * sin(a), 0.005, 0.38 + 0.44 * (1 - i / 175));
        }
        const t = (time * 0.47) % 4.6,
          r = 0.88 * Math.exp(-tight * t),
          a = base + t * spin * speed;
        dot(r * cos(a), r * sin(a), 0.025, 1);
        line(
          r * cos(a),
          r * sin(a),
          r * cos(a + TAU / n),
          r * sin(a + TAU / n),
          0.003,
          0.43,
        );
      }
    },
  };
}
function contours({ dot, pointer, time, aspect }) {
  const peaks = [
    [-0.62, 0.2, 0.62],
    [0.56, 0.24, 0.67],
    [0.15, -0.55, 0.45],
    [pointer.x * aspect + 0.1, pointer.y * 0.8 - 0.12, 0.68],
  ];
  for (let y = -0.94; y < 0.95; y += 0.024)
    for (let x = -aspect * 0.95; x < aspect * 0.95; x += 0.024) {
      let h = 0;
      for (const [cx, cy, amp] of peaks)
        h += amp * Math.exp(-3.7 * ((x - cx) ** 2 + (y - cy) ** 2));
      const d = abs(mod(h * 14 - time * 0.27 + 0.5, 1) - 0.5);
      if (h > 0.09 && d < 0.21)
        dot(x, y, 0.006 + 0.003 * (1 - d / 0.21), 0.32 + 0.61 * (1 - d / 0.21));
    }
}
function sorter({ random }) {
  const n = 19;
  let passes,
    epoch = 0;
  function shuffle() {
    const row = range(n, (i) => i);
    for (let i = n - 1; i > 0; i--) {
      const k = floor(random() * (i + 1));
      [row[i], row[k]] = [row[k], row[i]];
    }
    passes = [row.slice()];
    for (let p = 0; p < n; p++) {
      for (let i = p % 2; i < n - 1; i += 2)
        if (row[i] > row[i + 1]) [row[i], row[i + 1]] = [row[i + 1], row[i]];
      passes.push(row.slice());
    }
    epoch = 0;
  }
  shuffle();
  return {
    press: shuffle,
    draw({ dot, line, aspect, dt }) {
      epoch += dt;
      const dx = (aspect * 1.76) / n,
        y = (i) => (i / (n - 1) - 0.5) * 1.56;
      for (let p = 0; p < n; p++)
        for (let i = 0; i < n; i++) {
          const value = passes[p][i],
            next = passes[p + 1].indexOf(value),
            x = -aspect * 0.88 + dx * p;
          const phase = mod(epoch * 0.41 + value / n, 1);
          line(x, y(i), x + dx, y(next), 0.003, 0.2 + (0.54 * value) / n);
          dot(x + dx * phase, y(i) + (y(next) - y(i)) * phase, 0.009, 0.93);
        }
    },
  };
}
const knightMoves = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];
function knight({ random }) {
  const size = 8,
    step = 0.207;
  let route,
    age = 0;
  function walk(start) {
    const seen = new Set([start]);
    route = [start];
    age = 0;
    const options = (k) =>
      knightMoves
        .map(([dx, dy]) => [(k % size) + dx, floor(k / size) + dy])
        .filter(
          ([x, y]) =>
            x >= 0 && x < size && y >= 0 && y < size && !seen.has(y * size + x),
        )
        .map(([x, y]) => y * size + x);
    for (let i = 1; i < 64; i++) {
      const next = options(route.at(-1))
        .map((n) => [options(n).length + random() * 0.4, n])
        .sort((a, b) => a[0] - b[0]);
      if (!next.length) break;
      route.push(next[0][1]);
      seen.add(next[0][1]);
    }
  }
  walk(0);
  return {
    press(p, a) {
      walk(
        clamp(floor((p.x * a) / step + 4), 0, 7) +
          8 * clamp(floor(p.y / step + 4), 0, 7),
      );
    },
    draw({ dot, line, dt }) {
      age += dt;
      const x = (i) => ((i % 8) - 3.5) * step,
        y = (i) => (floor(i / 8) - 3.5) * step;
      for (let i = 0; i < 64; i++) dot(x(i), y(i), 0.014, 0.53);
      const progress = mod(8 + age * 5, route.length - 1),
        head = floor(progress);
      for (let i = 0; i <= head; i++) {
        const a = route[i],
          b = route[i + 1],
          u = i === head ? progress - head : 1;
        const px = x(a) + (x(b) - x(a)) * u,
          py = y(a) + (y(b) - y(a)) * u;
        line(x(a), y(a), px, py, 0.005, i > head - 6 ? 0.86 : 0.32);
        if (i === head) dot(px, py, 0.03, 1);
      }
    },
  };
}
function lightning({ random }) {
  let branches = [],
    age = 0,
    endX = 0.3,
    endY = 0.83;
  function bolt() {
    branches = [];
    function grow(ax, ay, bx, by, depth) {
      let path = [
        [ax, ay],
        [bx, by],
      ];
      for (let level = 0; level < 5; level++) {
        const finer = [];
        for (let j = 1; j < path.length; j++) {
          const [x, y] = path[j - 1],
            [u, v] = path[j],
            noise = (random() - 0.5) * 0.56;
          finer.push(
            [x, y],
            [(x + u) / 2 - (v - y) * noise, (y + v) / 2 + (u - x) * noise],
          );
        }
        path = [...finer, path.at(-1)];
      }
      branches.push({ path, depth });
      if (depth < 2)
        for (let j = 0; j < 3; j++) {
          const [x, y] = path[6 + floor(random() * 18)];
          grow(
            x,
            y,
            x + (random() - 0.5) * (0.95 - depth * 0.28),
            y + (by - ay) * (0.25 + 0.16 * random()),
            depth + 1,
          );
        }
    }
    grow(-0.12, -0.93, endX, endY, 0);
    age = 0;
  }
  bolt();
  age = 0.24;
  return {
    press(p, a) {
      endX = p.x * a;
      endY = p.y;
      bolt();
    },
    draw({ dot, line, dt }) {
      age += dt;
      if (age > 1.2) bolt();
      const reveal = Math.min(32, 5 + floor(age * 170)),
        light = 0.42 + 0.58 * Math.exp(-age * 2.3);
      for (const { path, depth } of branches)
        for (let i = 1; i <= reveal; i++) {
          const [x, y] = path[i - 1],
            [u, v] = path[i];
          line(x, y, u, v, 0.007 / (depth + 1), light / (1 + 0.5 * depth));
          dot(u, v, 0.008 / (depth + 1), light);
        }
      dot(endX, endY, 0.022, 0.8);
    },
  };
}
function packing({ random }) {
  const circles = [];
  function add(x, y) {
    if (circles.length >= 175) return;
    let limit = Math.min(1.13 - abs(x), 0.88 - abs(y));
    for (const c of circles)
      limit = Math.min(limit, hypot(c.x - x, c.y - y) - c.r - 0.012);
    if (limit > 0.024)
      circles.push({ x, y, r: Math.min(limit, 0.245), seed: random() * TAU });
  }
  function scatter() {
    for (let i = 0; i < 720; i++)
      add((random() - 0.5) * 2.24, (random() - 0.5) * 1.72);
  }
  scatter();
  return {
    press(p, a) {
      const x = clamp(p.x * a, -1.08, 1.08),
        y = clamp(p.y, -0.83, 0.83);
      for (let i = circles.length - 1; i >= 0; i--)
        if (hypot(circles[i].x - x, circles[i].y - y) < 0.34 + circles[i].r)
          circles.splice(i, 1);
      add(x, y);
      scatter();
    },
    draw({ dot, time }) {
      for (const c of circles) {
        const n = Math.max(9, Math.ceil(c.r * 260));
        for (let j = 0; j < n; j++) {
          const a = (j * TAU) / n + c.seed + time * 0.16;
          dot(
            c.x + c.r * cos(a),
            c.y + c.r * sin(a),
            0.004 + (0.003 * c.r) / 0.245,
            0.48 + 0.42 * (0.5 + 0.5 * cos(a - time * 0.65)),
          );
        }
      }
    },
  };
}
const train = "https://thecodingtrain.com/challenges/";
const math = "https://mathworld.wolfram.com/";
export const paths = [
  [
    "迷宫寻径",
    "点按迷宫里的房间，亮点标出从左上角到它的通路。",
    maze,
    "Red Blob Games · Pathfinding",
    "https://www.redblobgames.com/pathfinding/a-star/introduction.html",
  ],
  [
    "翻格蚂蚁",
    "点按将蚂蚁移到新格子，观察它逐步翻转格点。",
    ant,
    "The Coding Train · Langton’s Ant",
    train + "89-langtons-ant",
  ],
  [
    "邻域分疆",
    "滑动一颗种子，观察等距边界和相邻领地如何变化。",
    territories,
    "Red Blob Games · Voronoi",
    "https://www.redblobgames.com/x/2022-voronoi-maps-tutorial/",
  ],
  [
    "高尔顿钉板",
    "左右滑动改变弹珠偏向，看底部各格的堆积变化。",
    galton,
    "Wolfram MathWorld · Galton Board",
    math + "GaltonBoard.html",
  ],
  [
    "多点追逐",
    "点按改变追逐者数量，横移卷紧或展开追逐路径。",
    pursuit,
    "Wolfram MathWorld · Pursuit Curve",
    math + "PursuitCurve.html",
  ],
  [
    "等高线岛",
    "移动一座山峰，让两座山之间的等高线合并、分开。",
    () => contours,
    "Red Blob Games · Making Maps with Noise",
    "https://www.redblobgames.com/maps/terrain-from-noise/",
  ],
  [
    "奇偶编织",
    "点按打乱起点，沿线从左往右看相邻点交换直至排好。",
    sorter,
    "University of San Francisco · Odd-Even Transposition Sort",
    "https://www.cs.usfca.edu/~mmalensek/cs220/schedule/lectures/220-L20.pdf",
  ],
  [
    "骑士足迹",
    "点选棋盘上的起点，跟随亮点逐步走出马步路径。",
    knight,
    "Wolfram MathWorld · Knight’s Tour",
    math + "KnightsTour.html",
  ],
  [
    "分叉闪电",
    "点按指定放电终点，观察每次生成的主干和细枝。",
    lightning,
    "GameDevBuddies · Procedural Lightning",
    "https://github.com/GameDevBuddies/Procedural-Lightning-Tutorial",
  ],
  [
    "圆隙填充",
    "点按腾出一块空隙，再看大小不同的圆如何填满它。",
    packing,
    "The Coding Train · Animated Circle Packing",
    train + "50-animated-circle-packing",
  ],
].map(([name, hint, create, source, url]) => ({
  name,
  hint,
  create,
  source,
  url,
}));
