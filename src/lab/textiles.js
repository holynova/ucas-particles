import { TAU, series, fract, mix, arc } from "./sketch.js";
const { sin, cos, abs, PI, floor } = Math;
function loom({ dot, line, pointer, time }) {
  const cols = 23,
    rows = 15,
    s = 0.078,
    phase = floor(time * 3 + pointer.x * 4);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = (c - 11) * s,
        y = (r - 7) * s,
        over = (r + c + phase) % 2 === 0;
      for (let k = -3; k <= 3; k++) {
        const d = (k * s) / 7;
        dot(
          x + d,
          y + 0.005 * sin(2 * c + time),
          over ? 0.009 : 0.004,
          over ? 0.92 : 0.27,
        );
        dot(x, y + d, over ? 0.004 : 0.009, over ? 0.27 : 0.92);
      }
    }
  const y = Math.round(pointer.y * 6) * s,
    x = (fract(time * 0.42) * 2 - 1) * 0.97;
  line(-0.93, y, x, y, 0.004, 0.72);
  dot(x, y, 0.023, 1);
}
function foldedMap({ dot, line, pointer, time }) {
  const fold = 0.5 + 0.28 * sin(time * 0.58) + 0.2 * pointer.y;
  const vertex = (c, r) => [
    (c - 5) * (0.18 + 0.031 * pointer.x) + (r % 2 ? fold * 0.13 : 0),
    (r - 4) * (0.15 - 0.041 * fold) + (c % 2 ? fold * 0.11 : 0),
  ];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 10; c++) {
      const [x, y] = vertex(c, r),
        [u, v] = vertex(c + 1, r),
        [a, b] = vertex(c, r + 1);
      line(x, y, u, v, 0.003, 0.65);
      line(x, y, a, b, 0.003, 0.5);
      for (let i = 1; i < 6; i++)
        for (let j = 1; j < 6; j++)
          dot(
            x + ((u - x) * i) / 6 + ((a - x) * j) / 6,
            y + ((v - y) * i) / 6 + ((b - y) * j) / 6,
            0.006,
            (c + r) % 2 ? 0.32 : 0.74,
          );
      if (r === 7) {
        const [n, m] = vertex(c + 1, r + 1);
        line(a, b, n, m, 0.003, 0.6);
      }
      if (c === 9) {
        const [n, m] = vertex(c + 1, r + 1);
        line(u, v, n, m, 0.003, 0.6);
      }
    }
}
function book({ dot, line, time, pointer }) {
  for (let j = 0; j < 23; j++) {
    const phase = fract(j / 23 + time * 0.063 + pointer.x * 0.31),
      a = phase * PI;
    for (let k = 0; k < 69; k++) {
      const u = k / 68,
        x = 0.97 * u * cos(a),
        rise = -0.54 * sin(a) * sin(PI * 0.79 * u);
      const y = 0.22 + rise + (j % 4) * 0.004 + pointer.y * 0.15 * u;
      dot(x, y - 0.34 + 0.11 * u, 0.005, 0.62);
      dot(x, y + 0.34 + 0.11 * u, 0.005, 0.79);
      if (k === 68) line(x, y - 0.23, x, y + 0.45, 0.003, 0.39);
      if (j % 5 === 0 && k % 5 === 0)
        for (let z = 1; z < 8; z++)
          dot(x, y - 0.34 + 0.11 * u + z * 0.085, 0.004, 0.35);
    }
  }
  line(0, -0.13, 0, 0.58, 0.009, 0.9);
}
function braid({ dot, time, pointer }) {
  const turns = 2.15 + pointer.y * 0.79;
  for (let row = 0; row < 145; row++) {
    const u = row / 144;
    const strands = series(3, (k) => {
      const a = u * TAU * turns + time * 1.19 + (k * TAU) / 3 + pointer.x;
      return { x: 0.34 * sin(a), z: cos(a) };
    }).sort((a, b) => a.z - b.z);
    for (const { x, z } of strands)
      for (let k = -3; k <= 3; k++) {
        const y = (u - 0.5) * 1.72;
        dot(
          x + k * 0.014 + 0.055 * sin(u * 6 + pointer.x * 2),
          y,
          0.009,
          0.28 + 0.64 * (0.5 + 0.5 * z),
        );
      }
  }
}
function sampler() {
  let motif = 0;
  const stitches = [
    (x, y) => abs(abs(x) + abs(y) - 9) < 2 || abs(x) + abs(y) < 4,
    (x, y) => abs(x - y) < 2 || abs(x + y) < 2 || abs(x) < 1 || abs(y) < 1,
    (x, y) => {
      const a = Math.atan2(y, x),
        r = Math.hypot(x, y);
      return abs(r - (5 + 3 * cos(5 * a))) < 1.7;
    },
  ];
  return {
    press() {
      motif = (motif + 1) % stitches.length;
    },
    draw({ dot, line, time, pointer }) {
      const head = fract(time * 0.16 + pointer.x * 0.25) * 441;
      for (let j = -10; j <= 10; j++)
        for (let i = -10; i <= 10; i++) {
          const x = i * 0.074,
            y = j * 0.074,
            n = (j + 10) * 21 + i + 10;
          dot(x, y, 0.004, 0.22);
          if (!stitches[motif](i, j)) continue;
          const a = n < head ? 0.93 : 0.35;
          line(x - 0.024, y - 0.024, x + 0.024, y + 0.024, 0.009, a);
          line(x - 0.024, y + 0.024, x + 0.024, y - 0.024, 0.006, a * 0.8);
        }
    },
  };
}
function fan({ dot, line, time, pointer }) {
  const spread = 1.2 + pointer.x * 0.62 + 0.13 * sin(time * 0.8),
    pivot = 0.68;
  for (let j = 0; j <= 30; j++) {
    const a = (j / 15 - 1) * spread,
      dx = sin(a),
      dy = -cos(a),
      length = 1.34;
    line(
      0,
      pivot,
      length * dx,
      pivot + length * dy,
      0.004,
      j % 2 ? 0.48 : 0.86,
    );
    for (let i = 0; i < 40; i++) {
      const r = 0.49 + i * 0.021;
      dot(dx * r, pivot + dy * r, 0.005, j % 2 ? 0.36 : 0.79);
    }
    if (j < 30) {
      const b = (j / 15 - 1 + 1 / 15) * spread;
      for (const r of [0.52, 1.31])
        line(
          r * dx,
          pivot + r * dy,
          r * sin(b),
          pivot - r * cos(b),
          0.004,
          0.74,
        );
    }
  }
  dot(0, pivot, 0.026, 1);
}
function nailArt() {
  let stride = 29;
  return {
    press() {
      stride = stride >= 47 ? 11 : stride + 6;
    },
    draw({ dot, line, pointer, time }) {
      const n = 101,
        phase = time * 0.22 + pointer.x * 0.61;
      for (let i = 0; i < n; i++) {
        const a = (i * TAU) / n + phase,
          b = (((i * stride) % n) * TAU) / n + phase,
          x = 0.82 * cos(a),
          y = 0.82 * sin(a);
        const endX = 0.82 * cos(b),
          endY = 0.82 * sin(b),
          u = fract(time * 0.35 + i * 0.618);
        line(x, y, endX, endY, 0.002, 0.23);
        dot(x, y, 0.009, 0.87);
        dot(mix(x, endX, u), mix(y, endY, u), 0.006, 0.76);
      }
    },
  };
}
function spool({ dot, line, time, pointer }) {
  const traverse = 0.74 * sin(time * 1.3 + pointer.x * 2),
    radius = 0.29 + 0.088 * pointer.y;
  for (let j = 0; j < 48; j++) {
    const x = (j / 47 - 0.5) * 1.28;
    for (let i = 0; i < 26; i++) {
      const a = (i / 25) * PI;
      dot(
        x + 0.07 * sin(a),
        radius * cos(a),
        0.006,
        0.28 + 0.62 * sin(a + time * 0.2) ** 2,
      );
    }
  }
  for (const x of [-0.69, 0.69])
    arc(dot, x, 0, 0.105, radius + 0.13, 0, TAU, 95, 0.008, 0.86);
  line(traverse, -radius, traverse + 0.16, -0.72, 0.005, 0.91);
  arc(dot, traverse + 0.16, -0.75, 0.048, 0.048, 0, TAU, 25, 0.006, 0.9);
}
function zipper({ dot, line, time, pointer }) {
  const closure = 0.53 + pointer.y * 0.39 + 0.07 * sin(time * 0.78);
  for (let i = 0; i < 47; i++) {
    const u = i / 46,
      y = (u - 0.5) * 1.72,
      open = Math.max(0, closure - u);
    for (const side of [-1, 1]) {
      const x = side * (0.044 + 1.7 * open * open);
      line(x + side * 0.038, y, x + side * 0.13, y + side * 0.012, 0.012, 0.72);
      dot(x, y + side * 0.011, 0.015, 0.95);
      dot(x + side * 0.17, y, 0.006, 0.42);
    }
  }
  const y = (closure - 0.5) * 1.72;
  arc(dot, 0, y, 0.093, 0.13, 0, TAU, 48, 0.009, 0.94);
  arc(dot, 0, y + 0.16, 0.042, 0.077, 0, TAU, 32, 0.007, 0.78);
}
function seam({ dot, line, time, pointer }) {
  const head = fract(time * 0.13 + pointer.x * 0.28),
    height = 0.25 + 0.16 * pointer.y;
  const point = (u) => [
    (u - 0.5) * 2.12,
    height * sin(TAU * u * 1.8) + 0.15 * cos(TAU * u),
  ];
  for (let i = 0; i <= 200; i++) {
    const u = i / 200,
      [x, y] = point(u);
    dot(x, y, 0.005, u > head ? 0.19 : 0.4);
    if (u < head && i % 12 < 7) dot(x, y, 0.011, 0.94);
    if (i % 12 === 0) {
      dot(x, y - 0.026, 0.006, 0.51);
      dot(x, y + 0.026, 0.006, 0.51);
    }
  }
  const [x, y] = point(head),
    lift = 0.17 + 0.11 * cos(head * TAU * 17);
  line(x, y, x + 0.19, y - lift, 0.008, 0.96);
  arc(dot, x + 0.19, y - lift, 0.022, 0.014, 0, TAU, 16, 0.004, 0.8);
  for (let i = 0; i < 68; i++) {
    const u = i / 67;
    dot(
      x + 0.19 + 0.35 * u,
      y - lift - 0.2 * sin(PI * u) + 0.14 * u,
      0.005,
      0.6,
    );
  }
}
export const textiles = [
  ["经纬梭织", "上下选择纬线，横移错开经纬的压叠顺序。", () => loom],
  ["折叠地图", "滑动展开纸面，观察山折和谷折交替收拢。", () => foldedMap],
  ["翻页书脊", "横移翻动点阵纸页，上下调整页边翘度。", () => book],
  ["三股辫绳", "上下改变编结的疏密，横移扭动三股绳。", () => braid],
  ["十字绣样", "点按切换菱纹、星形与花形，横移推进绣线。", sampler],
  ["开合折扇", "横移收拢或展开扇骨，观察扇面的疏密。", () => fan],
  ["弦钉绕画", "点按改变绕线步长，在圆形钉盘上编出新纹样。", nailArt],
  ["绕线筒", "横移引线环，纵移调整卷筒厚度。", () => spool],
  ["拉链齿合", "上下移动拉头，观察两列链齿分开或咬合。", () => zipper],
  ["游针走线", "横移指定缝制进度，上下调整针脚的曲线。", () => seam],
];
