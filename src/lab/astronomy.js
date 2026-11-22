import { TAU, series, fract, mix, arc, view3D } from "./sketch.js";
const { sin, cos, sqrt, hypot, abs, PI } = Math;

function ringworld({ random }) {
  const globe = series(1250, () => [
    random() * TAU,
    Math.acos(2 * random() - 1),
  ]);
  const ice = series(1650, () => {
    const u = random();
    return [
      random() * TAU,
      u < 0.52 ? 0.67 + 0.14 * random() : 0.86 + 0.22 * random(),
      random(),
    ];
  });
  return ({ dot, time, pointer }) => {
    const project = view3D(pointer.x * 0.42, 0.31 + pointer.y * 0.53),
      spin = time * 0.12;
    for (const [a, b] of globe) {
      const x = 0.49 * sin(b) * cos(a + spin),
        y = 0.49 * cos(b),
        z = 0.49 * sin(b) * sin(a + spin);
      const [px, py, d] = project(x, y, z);
      if (d > 0)
        dot(px, py, 0.008, 0.28 + 0.56 * (d / 0.49) + 0.13 * cos(b * 16));
    }
    for (const [a, r, s] of ice) {
      const [px, py, d] = project(
        r * cos(a + spin / (r * r)),
        0,
        r * sin(a + spin / (r * r)),
      );
      if (d < 0 && hypot(px, py) < 0.49) continue;
      dot(px, py, 0.004 + 0.004 * s, 0.36 + 0.54 * s);
    }
  };
}
function comet({ random }) {
  const dust = series(950, () => ({
    age: random(),
    cross: random() - 0.5,
    id: random(),
  }));
  return ({ dot, time, pointer, aspect }) => {
    const aim = pointer.active ? pointer.x * 0.72 : 0.53 * sin(time * 0.48),
      cy = pointer.active ? pointer.y * 0.65 : 0.27 * cos(time * 0.48);
    for (const p of dust) {
      const age = fract(p.age + time * 0.32),
        spread = 0.03 + 0.47 * age;
      dot(
        aim - age * aspect * 1.05,
        cy +
          age * age * 0.58 +
          p.cross * spread +
          0.034 * age * sin(age * 13 + p.id * 8 - time),
        0.004 + 0.008 * (1 - age),
        0.14 + 0.84 * (1 - age),
      );
      if (p.id > 0.74)
        dot(
          aim - age * aspect * 0.96,
          cy - age * 0.22 + p.cross * (0.02 + 0.1 * age),
          0.005,
          0.69 * (1 - age) + 0.12,
        );
    }
    dot(aim, cy, 0.037, 1);
  };
}
function pulsar({ dot, time, pointer }) {
  const a = time * 1.6 + pointer.x * PI,
    width = 0.17 + pointer.y * 0.075;
  for (let side = 0; side < 2; side++)
    for (let i = 1; i <= 49; i++)
      for (let j = -6; j <= 6; j++) {
        const r = i * 0.019,
          theta = a + side * PI + (j / 6) * width;
        dot(cos(theta) * r, sin(theta) * r * 0.79, 0.006, 0.94 - 0.58 * r);
      }
  for (let k = 0; k < 6; k++) {
    const r = 0.095 + 0.022 * k;
    arc(dot, 0, 0, r, r * 0.96, 0, TAU, 64, 0.005, 0.66);
  }
  for (let k = 0; k < 5; k++) {
    const u = fract(time * 0.52 + k / 5),
      r = 0.22 + 0.67 * u;
    arc(dot, 0, 0, r, r * 0.85, 0, TAU, 96, 0.004, 0.35 * (1 - u) + 0.09);
  }
}
function starTrails({ random }) {
  const stars = series(170, () => [
    random() * TAU,
    0.08 + random() * 1.5,
    random(),
  ]);
  return ({ dot, pointer, time }) => {
    const cx = pointer.x * 0.68 - 0.18,
      cy = pointer.y * 0.45 - 0.09,
      exposure = 0.3 + 0.23 * (1 + sin(time * 0.28));
    for (const [a, r, s] of stars)
      for (let i = 0; i < 27; i++) {
        const theta = a + time * 0.115 - (exposure * i) / 26;
        dot(
          cx + r * cos(theta),
          cy + r * sin(theta),
          0.004 + s * 0.003,
          0.2 + 0.76 * (1 - i / 27),
        );
      }
  };
}
function lunarPhases() {
  let offset = 0;
  return {
    press() {
      offset += PI / 4;
    },
    draw({ dot, time, pointer }) {
      const light = offset + time * 0.21 + pointer.x * 2.5;
      for (let row = -33; row <= 33; row++)
        for (let col = -33; col <= 33; col++) {
          const x = col / 33,
            y = row / 33,
            r2 = x * x + y * y;
          if (r2 > 1) continue;
          const z = sqrt(Math.max(0, 1 - r2)),
            lit = Math.max(0, x * sin(light) + z * cos(light));
          const mare =
            0.78 + 0.18 * sin(13 * x + 3 * cos(y * 9)) * cos(8 * y - x * 2);
          dot(x * 0.77, y * 0.77, 0.008, 0.105 + lit * mare);
        }
    },
  };
}
function meteors({ random }) {
  const rocks = series(75, () => [random(), random(), random()]);
  return ({ dot, time, pointer, aspect }) => {
    const ox = pointer.active ? pointer.x * aspect : -0.46,
      oy = pointer.active ? pointer.y : -0.42;
    for (const [a, age, s] of rocks) {
      const u = fract(age + time * (0.13 + 0.12 * s)),
        angle = a * TAU,
        r = u * u * 2.6;
      for (let k = 0; k < 14; k++) {
        const d = Math.max(0.015, r - k * 0.009 * u);
        dot(
          ox + d * cos(angle),
          oy + d * sin(angle),
          0.003 + 0.008 * u,
          (0.17 + 0.82 * u) * (1 - k / 16),
        );
      }
    }
  };
}
function orrery({ dot, line, time, pointer }) {
  const tilt = 0.53 + pointer.y * 0.28,
    rotation = pointer.x * 1.7;
  dot(-0.12, 0, 0.048, 1);
  for (let k = 0; k < 7; k++) {
    const r = 0.19 + k * 0.144,
      e = 0.08 + k * 0.025,
      c = -0.12 + r * e;
    arc(dot, c, 0, r, r * tilt, 0, TAU, 120, 0.004, 0.28);
    const a = (time * 0.46) / r ** 1.5 + k * 1.8 + rotation * (1 + k * 0.09);
    dot(c + r * cos(a), tilt * r * sin(a), 0.016 + 0.003 * k, 0.98);
    if (k === 5)
      line(
        c + r * cos(a) - 0.045,
        tilt * r * sin(a) + 0.018,
        c + r * cos(a) + 0.045,
        tilt * r * sin(a) - 0.018,
        0.004,
        0.72,
      );
  }
}
function cluster({ random, normal }) {
  const stars = series(1600, () => {
    const a = random() * TAU,
      r = Math.min(0.9, abs(normal()) * 0.31),
      b = 2 * random() - 1;
    return [
      r * cos(a) * sqrt(1 - b * b),
      r * b,
      r * sin(a) * sqrt(1 - b * b),
      random(),
    ];
  });
  return ({ dot, pointer, time }) => {
    const view = view3D(time * 0.14 + pointer.x * 1.5, pointer.y * 0.9, 1.45);
    for (const [x, y, z, s] of stars) {
      const [u, v, d] = view(x, y, z);
      dot(
        u,
        v,
        0.003 + 0.006 * s,
        0.28 + 0.29 * (1 + d) + 0.16 * sin(s * 28 + time * 1.2),
      );
    }
  };
}
function transit({ random }) {
  const disk = series(1450, () => {
    const r = 0.46 * sqrt(random()),
      a = random() * TAU;
    return [r * cos(a), r * sin(a), 0.9 - 0.58 * r];
  });
  const totalLight = disk.reduce((sum, point) => sum + point[2], 0);
  const samples = 220,
    changes = new Float64Array(samples + 1);
  return ({ dot, line, time, pointer, aspect }) => {
    const impact = 0.06 + 0.36 * pointer.y,
      r = 0.08 + 0.048 * (1 + pointer.x),
      phase = fract(time * 0.13),
      planetX = mix(-0.84, 0.84, phase);
    changes.fill(0);
    let occulted = 0;
    for (const [x, y, brightness] of disk) {
      if (hypot(x - planetX, y - impact) > r)
        dot(x, y - 0.29, 0.009, brightness);
      else occulted += brightness;
      // A stellar point disappears between its two crossings of the planet's limb.
      const dy = y - impact;
      if (abs(dy) >= r) continue;
      const dx = sqrt(r * r - dy * dy),
        bins = (samples - 1) / 1.68;
      changes[Math.ceil((x - dx + 0.84) * bins)] += brightness;
      changes[Math.floor((x + dx + 0.84) * bins) + 1] -= brightness;
    }
    arc(dot, planetX, impact - 0.29, r, r, 0, TAU, 40, 0.004, 0.35);
    let blocked = 0;
    const graphY = (light) => 0.41 + (2.95 * light) / totalLight;
    for (let i = 0; i < samples; i++) {
      blocked += changes[i];
      dot(
        (i / (samples - 1) - 0.5) * aspect * 1.64,
        graphY(blocked),
        0.005,
        0.8,
      );
    }
    const x = (phase - 0.5) * aspect * 1.64;
    line(x, 0.34, x, 0.84, 0.003, 0.26);
    dot(x, graphY(occulted), 0.018, 1);
  };
}
function wormhole({ dot, time, pointer }) {
  const cx = pointer.x * 0.64,
    cy = pointer.y * 0.44;
  for (let j = 0; j < 26; j++) {
    const z = fract(j / 26 + time * 0.16),
      r = 0.035 + z * z * 1.6;
    for (let k = 0; k < 50; k++) {
      const a = (k * TAU) / 50 + z * 0.9;
      dot(
        cx * (1 - z) + r * cos(a),
        cy * (1 - z) + r * sin(a) * 0.87,
        0.003 + 0.008 * z,
        0.22 + 0.77 * z,
      );
    }
  }
}
export const astronomy = [
  [
    "星环掠影",
    "上下倾斜环面，观察冰粒从行星前后通过。",
    ringworld,
    "https://science.nasa.gov/saturn/facts/",
  ],
  [
    "彗尾分流",
    "移动彗核，观察弯曲尘尾和较直的细尾。",
    comet,
    "https://science.nasa.gov/solar-system/comets/",
  ],
  ["脉冲灯塔", "横移转动双束，纵移改变光锥开角。", () => pulsar],
  ["极轴星轨", "移动天极，观察恒星弧迹绕新中心旋转。", starTrails],
  [
    "月相明暗",
    "点按推进八分之一个周期，横移微调照明角度。",
    lunarPhases,
    "https://science.nasa.gov/moon/moon-phases/",
  ],
  [
    "流星辐射",
    "指定辐射点，让流星从指尖向四周划过。",
    meteors,
    "https://science.nasa.gov/solar-system/meteors-meteorites/",
  ],
  [
    "行星仪",
    "横移拨动各轨道的相位，纵移倾斜行星盘。",
    () => orrery,
    "https://science.nasa.gov/solar-system/solar-system-facts/",
  ],
  ["球状星团", "滑动旋转星团，观察密集核心和稀疏外围。", cluster],
  ["凌星测光", "调整行星大小与凌越高度，观察下方亮度曲线。", transit],
  ["跃迁隧道", "移动远处的消失点，改变穿过环列的方向。", () => wormhole],
];
