import { TAU, series, fract, clamp, arc, mix } from "./sketch.js";
const { sin, cos, abs, sqrt, floor, PI } = Math;
function sequencer() {
  const cols = 16,
    rows = 6,
    sx = 0.135,
    sy = 0.169;
  const grid = series(rows, (r) =>
    series(cols, (c) => Number((c + r * (r + 1)) % ((r % 3) + 3) === 0)),
  );
  return {
    press(p, a) {
      const c = clamp(Math.round((p.x * a) / sx + 7.5), 0, 15),
        r = clamp(Math.round(p.y / sy + 2.5), 0, 5);
      grid[r][c] ^= 1;
    },
    draw({ dot, line, time }) {
      const beat = floor(time * 3.5) % cols;
      grid.forEach((row, r) =>
        row.forEach((on, c) => {
          const x = (c - 7.5) * sx,
            y = (r - 2.5) * sy;
          for (let j = -2; j <= 2; j++)
            for (let k = -2; k <= 2; k++)
              if (on || Math.max(abs(k), abs(j)) === 2)
                dot(
                  x + k * 0.017,
                  y + j * 0.019,
                  0.006,
                  on ? (c === beat ? 1 : 0.73) : 0.21,
                );
        }),
      );
      const x = (beat - 7.5) * sx;
      line(x, -0.62, x, -0.53, 0.012, 0.95);
      line(x, 0.53, x, 0.62, 0.012, 0.95);
    },
  };
}
function cam({ dot, line, time, pointer }) {
  const angle = time * 1.4 + pointer.x * PI,
    base = 0.27,
    lift = 0.13 + 0.075 * pointer.y,
    cx = 0,
    cy = 0.24;
  const rad = (a) => base + lift * (1 + cos(3 * a)) * 0.5;
  for (let i = 0; i < 200; i++) {
    const a = (i * TAU) / 200,
      r = rad(a - angle);
    dot(cx + r * cos(a), cy + r * sin(a), 0.009, 0.93);
  }
  const y = cy - rad(-PI / 2 - angle) - 0.055;
  arc(dot, 0, y, 0.054, 0.054, 0, TAU, 36, 0.006, 0.9);
  line(0, y - 0.056, 0, -0.76, 0.009, 0.82);
  line(-0.2, -0.76, 0.2, -0.76, 0.009, 0.85);
  for (let j = 0; j < 65; j++) {
    const u = j / 64;
    dot(0.072 * sin(u * TAU * 5), mix(-0.67, y - 0.1, u), 0.007, 0.65);
  }
  dot(0, cy, 0.025, 1);
  line(0, cy, 0.22 * cos(angle), cy + 0.22 * sin(angle), 0.007, 0.51);
}
function geneva({ dot, line, time, pointer }) {
  const n = 6,
    dist = 0.89,
    pin = dist * sin(PI / n),
    left = -0.49,
    right = left + dist;
  const cycles = time * 0.3 + pointer.x * 0.55,
    turn = floor(cycles + 0.5),
    a = (cycles - turn) * TAU,
    engage = PI / 2 - PI / n;
  const offset = Math.atan2(
    pin * sin(clamp(a, -engage, engage)),
    dist - pin * cos(clamp(a, -engage, engage)),
  );
  const angle = PI - (turn * TAU) / n - offset,
    px = left + pin * cos(a),
    py = pin * sin(a);
  arc(dot, left, 0, pin, pin, 0, TAU, 100, 0.005, 0.56);
  line(left, 0, px, py, 0.014, 0.74);
  dot(left, 0, 0.024, 1);
  for (let k = 0; k < n; k++) {
    const b = angle + (k * TAU) / n;
    for (let i = 0; i < 35; i++) {
      const f = i / 34,
        r = 0.14 + 0.59 * f;
      for (const side of [-1, 1])
        dot(
          right + r * cos(b) - side * 0.021 * sin(b),
          r * sin(b) + side * 0.021 * cos(b),
          0.005,
          0.81,
        );
    }
    for (let i = 0; i < 32; i++) {
      const f = i / 31,
        theta = b + (f * TAU) / n,
        r = 0.73 - 0.18 * sin(f * PI);
      dot(right + r * cos(theta), r * sin(theta), 0.008, 0.86);
    }
  }
  dot(right, 0, 0.031, 0.82);
  dot(px, py, 0.032, 1);
}
function crank({ dot, line, time, pointer }) {
  const a = time * 1.5 + pointer.x * PI,
    r = 0.36 + 0.1 * pointer.y,
    cx = -0.68,
    ax = cx + r * cos(a),
    ay = r * sin(a),
    x = ax + sqrt(0.96 ** 2 - ay * ay);
  arc(dot, cx, 0, r, r, 0, TAU, 105, 0.007, 0.58);
  for (const y of [-0.17, 0.17]) line(-0.1, y, 1.2, y, 0.004, 0.43);
  line(cx, 0, ax, ay, 0.013, 0.78);
  line(ax, ay, x, 0, 0.014, 0.85);
  for (let j = -4; j <= 4; j++)
    for (let k = -3; k <= 3; k++) dot(x + j * 0.026, k * 0.039, 0.009, 0.64);
  for (const [px, py] of [
    [cx, 0],
    [ax, ay],
    [x, 0],
  ])
    dot(px, py, 0.025, 1);
}
function mallets() {
  let struck = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  return {
    press(p, a) {
      struck[clamp(Math.round((p.x * a) / 0.22 + 4), 0, 8)] = 1;
    },
    draw({ dot, line, time, dt }) {
      for (let i = 0; i < 9; i++) {
        const drop = fract(time * (0.59 + i * 0.046) + i * 0.17),
          bounce = 4 * drop * (1 - drop),
          x = (i - 4) * 0.22,
          base = 0.19 + i * 0.018;
        struck[i] = Math.max(0, struck[i] - dt * 1.25);
        const strength = Math.max(struck[i], Math.exp(-drop * 14) * 0.7),
          len = 0.31 - i * 0.017;
        for (let k = 0; k < 40; k++) {
          const u = k / 39;
          for (const side of [-1, 1])
            dot(
              x + side * 0.071,
              base + u * len + strength * 0.024 * sin(u * PI) * cos(time * 32),
              0.006,
              0.48 + 0.42 * strength,
            );
        }
        line(x - 0.071, base, x + 0.071, base, 0.008, 0.82);
        dot(
          x,
          base - 0.045 - (0.38 + 0.23 * struck[i]) * bounce - 0.08 * struck[i],
          0.03,
          0.95,
        );
        if (strength > 0.2)
          arc(
            dot,
            x,
            base - 0.02,
            0.086 + 0.08 * (1 - strength),
            0.03 + 0.09 * (1 - strength),
            PI,
            PI,
            30,
            0.004,
            strength,
          );
      }
    },
  };
}
function barrel({ dot, line, time, pointer }) {
  const spin = time * 0.98 + pointer.x * TAU;
  for (let j = 0; j < 15; j++) {
    const x = (j - 7) * 0.104,
      n = 3 + (j % 4);
    for (let i = 0; i < 65; i++) {
      const a = (i / 64) * PI;
      dot(x, 0.36 * cos(a) - 0.11, 0.004, 0.2 + 0.2 * sin(a));
    }
    let closest = 0;
    for (let p = 0; p < n; p++) {
      const a = spin + (p * TAU) / n + j * 1.79;
      if (sin(a) < 0) continue;
      const y = 0.36 * cos(a) - 0.11;
      dot(x, y, 0.015, 0.96);
      closest = Math.max(closest, cos(a));
    }
    const tip = 0.32 - 0.1 * closest ** 20;
    line(x, 0.73, x + 0.012, tip, 0.007, 0.77);
    dot(x + 0.012, tip, 0.011, 0.84);
  }
  for (const x of [-0.79, 0.79])
    arc(dot, x, -0.11, 0.052, 0.36, 0, TAU, 75, 0.006, 0.78);
}
function vinyl({ dot, line, time, pointer }) {
  const cx = -0.2,
    r = 0.75,
    phase = time * 0.9 + pointer.x * PI;
  for (let j = 0; j < 23; j++)
    for (let i = 0; i < 112; i++) {
      const a = (i * TAU) / 112 + phase,
        rad = 0.19 + j * 0.024 + 0.003 * sin(3 * a + j * 0.38);
      dot(
        cx + rad * cos(a),
        rad * sin(a),
        0.004,
        i % 23 === 0 ? 0.84 : 0.28 + 0.25 * (0.5 + 0.5 * cos(a - phase)),
      );
    }
  arc(dot, cx, 0, 0.145, 0.145, 0, TAU, 70, 0.008, 0.88);
  dot(cx, 0, 0.02, 1);
  const pivot = [0.83, -0.53],
    angle = 2.12 + 0.37 * pointer.y + 0.045 * sin(time * 0.5);
  const x = pivot[0] + 0.87 * cos(angle),
    y = pivot[1] + 0.87 * sin(angle);
  line(...pivot, x, y, 0.012, 0.9);
  line(x, y, x - 0.09, y + 0.04, 0.023, 0.94);
  dot(...pivot, 0.031, 1);
}
const digits = [
  "111101101101111",
  "010110010010111",
  "111001111100111",
  "111001111001111",
  "101101111001001",
  "111100111001111",
  "111100111101111",
  "111001001001001",
  "111101111101111",
  "111101111001111",
];
function counter() {
  let offset = 1736,
    ticks = 2.4;
  return {
    press() {
      offset = (offset + 137) % 10000;
    },
    draw({ dot, line, dt, pointer }) {
      ticks += dt * (1.8 + pointer.x * 0.9);
      const num = offset + floor(ticks),
        next = num + 1,
        fold = clamp((fract(ticks) - 0.63) / 0.37, 0, 1);
      const current = String(num % 10000).padStart(4, "0"),
        future = String(next % 10000).padStart(4, "0");
      for (let j = 0; j < 4; j++) {
        const cx = (j - 1.5) * 0.49;
        for (let i = 0; i < 15; i++) {
          const row = floor(i / 3),
            col = i % 3,
            y = (row - 2) * 0.127,
            change = current[j] !== future[j];
          const mask =
            change && fold > 0.5 ? digits[future[j]] : digits[current[j]];
          if (mask[i] === "0") continue;
          const scale =
            change && ((fold < 0.5 && row < 2) || (fold >= 0.5 && row > 2))
              ? abs(cos(PI * fold))
              : 1;
          for (let u = -2; u <= 2; u++)
            for (let v = -2; v <= 2; v++)
              dot(
                cx + (col - 1) * 0.115 + u * 0.018,
                (y + v * 0.018) * scale,
                0.007,
                0.91,
              );
        }
        for (const side of [-1, 1])
          line(cx - 0.2, side * 0.37, cx + 0.2, side * 0.37, 0.004, 0.4);
        line(cx - 0.2, 0, cx + 0.2, 0, 0.003, 0.32);
      }
      const x = (fract(ticks) - 0.5) * 1.83;
      dot(x, 0.48, 0.014, 0.81);
    },
  };
}
function lift({ dot, line, time, pointer }) {
  const r = 0.23,
    h = 0.47,
    length = 4 * h + TAU * r,
    phase = time * 0.42 + pointer.y * 0.52;
  function route(t) {
    let d = fract(t) * length;
    if (d < 2 * h) return [-r, h - d];
    d -= 2 * h;
    if (d < PI * r) {
      const a = PI + d / r;
      return [r * cos(a), -h + r * sin(a)];
    }
    d -= PI * r;
    if (d < 2 * h) return [r, -h + d];
    d -= 2 * h;
    const a = d / r;
    return [r * cos(a), h + r * sin(a)];
  }
  for (let i = 0; i < 150; i++) {
    const [x, y] = route(i / 150);
    dot(x, y, 0.005, 0.38);
  }
  for (let i = 0; i < 13; i++) {
    const u = fract(i / 13 + phase * 0.16),
      [x, y] = route(u);
    line(x - 0.065, y - 0.028, x - 0.048, y + 0.037, 0.005, 0.8);
    line(x - 0.048, y + 0.037, x + 0.048, y + 0.037, 0.005, 0.8);
    line(x + 0.048, y + 0.037, x + 0.065, y - 0.028, 0.005, 0.8);
    if (u < 0.42 || u > 0.94)
      for (let k = -1; k <= 1; k++) dot(x + k * 0.026, y, 0.01, 0.98);
  }
  for (let j = 0; j < 38; j++) {
    const u = fract(time * 0.87 + j * 0.618 + pointer.x * 0.28);
    dot(0.11 + u * 0.68, -0.7 + 0.56 * u * u + 0.025 * sin(j * 4), 0.009, 0.81);
  }
}
function iris({ dot, line, time, pointer }) {
  const gap =
    0.13 +
    0.29 * (0.5 + 0.5 * sin(time * 0.7 + pointer.x * 2)) +
    0.08 * pointer.y;
  arc(dot, 0, 0, 0.84, 0.84, 0, TAU, 165, 0.009, 0.72);
  for (let j = 0; j < 9; j++) {
    const a = (j * TAU) / 9 + 0.13 * sin(time * 0.32),
      b = a + TAU / 9;
    const outer = [0.79 * cos(a + 0.74), 0.79 * sin(a + 0.74)],
      inner = [gap * cos(a), gap * sin(a)],
      tip = [gap * cos(b), gap * sin(b)];
    line(...inner, ...tip, 0.008, 0.98);
    for (let k = 0; k < 38; k++) {
      const u = k / 37,
        x = mix(inner[0], outer[0], u),
        y = mix(inner[1], outer[1], u);
      for (let n = 0; n < 8; n++) {
        const v = n / 8,
          theta = b + 0.74;
        dot(
          mix(x, mix(tip[0], 0.79 * cos(theta), u), v),
          mix(y, mix(tip[1], 0.79 * sin(theta), u), v),
          0.005,
          n === 0 ? 0.87 : 0.32,
        );
      }
    }
  }
}
export const machines = [
  ["步进鼓机", "点按格子开关鼓点，观察扫描线依次经过六行节拍。", sequencer],
  ["凸轮顶杆", "横移转动凸轮，纵移改变凸起高度，观察弹簧压缩。", () => cam],
  ["槽轮间歇", "横移转动拨盘，看圆销进入轮槽时从动轮才转位。", () => geneva],
  ["曲柄滑块", "横移转动曲柄，纵移改变半径与滑块行程。", () => crank],
  ["跳槌音板", "点按一块音板，让对应的小槌跳高并激起振纹。", mallets],
  ["钉筒八音盒", "横移拨动钉筒，观察各排凸钉依次触动簧片。", () => barrel],
  ["唱针循槽", "横移拨动唱盘，纵移摆动唱臂。", () => vinyl],
  ["翻片计数", "点按让计数跃进，横移调整翻片速率。", counter],
  ["斗链提升", "纵移拨动斗链，横移调整顶部落料的相位。", () => lift],
  ["光圈叶片", "横移拨动叶片，纵移微调中央孔径。", () => iris],
];
