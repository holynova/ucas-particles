import { TAU, series, fract, clamp, arc } from "./sketch.js";
const { sin, cos, abs, exp, PI, floor } = Math;
function dunes({ dot, time, pointer, aspect }) {
  const wind = pointer.x * 0.85 + 0.28;
  for (let j = 0; j < 34; j++)
    for (let i = 0; i < 108; i++) {
      const u = i / 107,
        v = j / 33,
        x = (u - 0.5) * aspect * 1.85;
      const phase =
        x * 4 + v * 5 + wind * sin(v * 6 + time * 0.32) - time * 0.48;
      const crest = (0.5 + 0.5 * cos(phase)) ** 3;
      dot(
        x,
        (v - 0.48) * 1.35 -
          0.19 * crest +
          0.1 * sin(x * 2 + v * 4) +
          pointer.y * (v - 0.5) * 0.36,
        0.004 + 0.004 * v,
        0.23 + 0.63 * crest + 0.12 * v,
      );
    }
}
function tornado({ random }) {
  const grains = series(1400, () => [random(), random(), random()]);
  return ({ dot, time, pointer }) => {
    for (const [h, a, s] of grains) {
      const y = fract(h + time * 0.1),
        r = (0.055 + 0.61 * y * y) * (0.78 + 0.25 * s),
        angle = a * TAU + time * (3.2 - 1.8 * y) + y * 11;
      const x = 0.1 * sin(5 * y + time * 0.55) + pointer.x * 0.62 * y;
      dot(
        x + r * cos(angle),
        0.84 - y * 1.65 + r * 0.23 * sin(angle) + pointer.y * 0.13 * y,
        0.003 + 0.006 * s,
        0.25 + 0.66 * (0.5 + 0.5 * sin(angle)),
      );
    }
  };
}
function ridgeCloud({ random }) {
  const parcels = series(750, () => [random(), random(), random()]);
  const hill = (x) => 0.68 - 0.94 * exp(-3.5 * x * x);
  return ({ dot, time, pointer, aspect }) => {
    for (let i = 0; i < 210; i++) {
      const x = (i / 209 - 0.5) * aspect * 2;
      for (let j = 0; j < 7; j++)
        dot(x, hill(x) + j * 0.024, 0.005, 0.78 - j * 0.08);
    }
    for (const [a, b, c] of parcels) {
      const x = (fract(a + time * 0.095) - 0.5) * aspect * 2,
        alt = (0.37 + 0.22 * pointer.y) * exp(-3 * (x + 0.13) ** 2);
      const y = hill(x) - 0.19 - 0.36 * b - alt;
      const cloud = exp(-((x + 0.15 - pointer.x * 0.52) ** 2) * 3.5);
      dot(
        x,
        y + 0.05 * sin(time * 0.6 + c * 7 + x * 2),
        0.003 + 0.013 * cloud * c,
        0.11 + 0.73 * cloud,
      );
    }
  };
}
function delta({ random }) {
  const water = series(890, () => [random(), random(), random()]);
  return ({ dot, time, pointer }) => {
    for (const [start, branch, s] of water) {
      const y = fract(start + time * 0.18),
        l = branch < 0.5 ? -1 : 1,
        f = fract(branch * 2) < 0.5 ? -1 : 1;
      const x =
        0.11 * sin(7 * y + time * 0.28) +
        pointer.x * 0.44 * y +
        l * Math.max(0, y - 0.26) * 0.85 +
        f * Math.max(0, y - 0.57) * 0.77 +
        (s - 0.5) * (0.024 + 0.1 * y) +
        0.09 * sin(11 * y + branch * 1.5) * y;
      dot(x, -0.91 + y * 1.82, 0.005 + 0.003 * s, 0.35 + 0.62 * s);
    }
  };
}
function scree({ random }) {
  const w = 67,
    h = 41,
    grid = new Uint8Array(w * h);
  function put(col, row) {
    if (col >= 0 && col < w && row >= 0 && row < h) grid[row * w + col] = 1;
  }
  for (let x = 0; x < w; x++)
    for (
      let y =
        h -
        floor(
          16 * exp(-((x - 21) ** 2) / 140) + 6 * exp(-((x - 50) ** 2) / 120),
        );
      y < h;
      y++
    )
      put(x, y);
  let debt = 0;
  return {
    press(p, a) {
      const x = floor((p.x * a) / 0.041 + w / 2),
        y = clamp(floor(p.y / 0.042 + h / 2), 0, h - 2);
      for (let i = 0; i < 80; i++)
        put(
          clamp(x + floor(random() * 9) - 4, 0, w - 1),
          Math.max(0, y - floor(random() * 7)),
        );
    },
    draw({ dot, dt, time }) {
      debt += dt * 30;
      while (debt >= 1) {
        debt--;
        put(floor(w * 0.5 + sin(time * 0.42) * w * 0.25), 1);
        for (let y = h - 2; y >= 0; y--) {
          const right = random() > 0.5;
          for (let j = 0; j < w; j++) {
            const x = right ? j : w - 1 - j,
              i = y * w + x;
            if (!grid[i]) continue;
            const d = random() > 0.5 ? 1 : -1;
            for (const dx of [0, d, -d])
              if (x + dx >= 0 && x + dx < w && !grid[i + w + dx]) {
                grid[i] = 0;
                grid[i + w + dx] = 1;
                break;
              }
          }
        }
      }
      for (let i = 0; i < grid.length; i++)
        if (grid[i])
          dot(
            ((i % w) - w / 2 + 0.5) * 0.041,
            (floor(i / w) - h / 2 + 0.5) * 0.042,
            0.014,
            0.5 + (0.36 * ((i * 17) % 13)) / 13,
          );
    },
  };
}
function geyser({ random }) {
  const drops = series(700, () => [random(), random() - 0.5, random()]);
  return ({ dot, time, pointer }) => {
    const pressure = 0.94 - pointer.y * 0.36;
    for (const [age, spread, s] of drops) {
      const f = fract(age + time * (0.45 + 0.08 * s)),
        v = pressure * (0.9 + 0.43 * s);
      dot(
        spread * 0.66 * f + pointer.x * 0.49 * f * f,
        0.74 - 4.1 * f * (v - f),
        0.004 + 0.007 * (1 - f),
        0.27 + 0.67 * (1 - f),
      );
    }
    for (let k = 0; k < 5; k++)
      arc(
        dot,
        0,
        0.78,
        0.12 + k * 0.09,
        0.026 + k * 0.024,
        0,
        TAU,
        75,
        0.005,
        0.61 - k * 0.08,
      );
  };
}
function tide({ dot, time, pointer, aspect }) {
  const waterline = (x) =>
    0.21 +
    0.17 * sin(2.4 * x + 0.9 * time) +
    0.07 * sin(x * 7 - time) +
    pointer.y * 0.38;
  for (let j = 0; j < 17; j++)
    for (let i = 0; i < 130; i++) {
      const x = (i / 129 - 0.5) * aspect * 2,
        swell = 0.04 * sin(j * 0.54 + x * 6 + time * 1.1 + pointer.x * 2);
      dot(
        x,
        waterline(x) - j * 0.066 + swell,
        0.005 + (j < 3 ? 0.004 : 0),
        0.9 - j * 0.039,
      );
    }
  for (let k = 0; k < 210; k++) {
    const x = (fract(k * 0.618) - 0.5) * aspect * 2,
      y = fract(k * 0.437) * 1.6 - 0.6;
    if (y > waterline(x) + 0.07) dot(x, y, 0.007, 0.31);
  }
}
function basalt({ dot, line, time, pointer }) {
  const scale = 0.085,
    raise = (q, r) =>
      0.22 +
      0.15 * sin(q * 0.75 + r * 0.6 + time * 0.6) +
      0.36 * exp(-0.28 * ((q - pointer.x * 4) ** 2 + (r - pointer.y * 4) ** 2));
  for (let r = -4; r <= 4; r++)
    for (let q = -5; q <= 5; q++) {
      const cx = (q * 1.73 + (r % 2) * 0.865) * scale,
        cy = r * 0.115 + 0.23;
      const h = raise(q, r);
      for (let i = 0; i < 6; i++) {
        const a = ((i + 0.5) * TAU) / 6,
          b = a + TAU / 6,
          x = cx + scale * cos(a),
          y = cy + scale * 0.54 * sin(a);
        line(
          x,
          y - h,
          cx + scale * cos(b),
          cy + scale * 0.54 * sin(b) - h,
          0.003,
          0.76,
        );
        if (sin(a) > 0.01)
          for (let k = 0; k < 8; k++)
            dot(x, y - h + (h * k) / 8, 0.004, 0.23 + 0.34 * (1 - k / 8));
      }
    }
}
function windowRain({ random }) {
  const water = series(230, () => [random(), random(), random()]);
  return ({ dot, time, pointer, aspect }) => {
    const blade = pointer.x * 1.18 + 0.66 * sin(time * 0.55),
      pivotY = 0.99;
    for (const [a, b, s] of water) {
      const x = (a - 0.5) * aspect * 2,
        y = fract(b + time * (0.06 + s * 0.19)) * 2 - 1;
      const angle = Math.atan2(x, pivotY - y),
        dist = Math.hypot(x, pivotY - y);
      if (dist < 1.85 && abs(angle - blade) < 0.29) continue;
      for (let k = 0; k < 5; k++)
        dot(
          x + 0.009 * sin(k + s * 6),
          y - k * 0.014 * s,
          0.004 + 0.007 * (1 - k / 6) * s,
          0.81 - k * 0.13,
        );
    }
    for (let k = 0; k < 95; k++) {
      const r = (k / 95) * 1.85;
      dot(sin(blade) * r, pivotY - cos(blade) * r, 0.009, 0.72);
    }
  };
}
function aurora({ dot, time, pointer }) {
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < 100; i++) {
      const u = i / 99,
        x = (u - 0.5) * 2.33 + 0.12 * sin(u * 12 + j * 0.7 + time * 0.33);
      const y =
        0.31 * sin(5 * u + time * 0.44 + pointer.x * 2) +
        0.12 * sin(18 * u + j * 0.5 + time * 0.7) +
        j * 0.075;
      const h =
        0.18 +
        0.28 * (0.5 + 0.5 * sin(8 * u + time * 0.51 + j)) +
        0.11 * pointer.y;
      for (let k = 0; k < 11; k++) {
        const v = k / 10;
        dot(x + 0.055 * v, y - h * v, 0.006, 0.13 + 0.66 * (1 - v) ** 2);
      }
    }
}
export const landscape = [
  ["沙丘风脊", "滑动改变风向和俯视角，追踪沙脊的迁移。", () => dunes],
  ["旋风漏斗", "移动漏斗顶部，弯折从地面卷起的尘柱。", tornado],
  ["山脊云帽", "滑动改变凝结带的位置与高度。", ridgeCloud],
  ["河口分汊", "左右牵引河口，观察水粒从主槽分流。", delta],
  ["碎石滑坡", "点按在指定位置撒下碎石，观察堆积和崩落。", scree],
  ["间歇喷泉", "上下调节喷射高度，左右改变水滴偏移。", geyser],
  ["潮线泡沫", "上下推进潮线，横移扰动近岸波峰。", () => tide],
  ["玄武岩柱", "移动隆起中心，看六边形石柱依次升降。", () => basalt],
  ["雨窗刮痕", "左右拨动雨刷，在往下滑的水滴间划出清晰扇面。", windowRain],
  ["极光帘幕", "滑动牵动光帘的褶皱，改变垂直光丝的长度。", () => aurora],
];
