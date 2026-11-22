import { mechanics } from "./mechanics.js";
import { forms } from "./forms.js";
import { optics } from "./optics.js";
import { paths } from "./paths.js";

import { astronomy } from "./astronomy.js";
import { landscape } from "./landscape.js";
import { textiles } from "./textiles.js";
import { dimensions } from "./dimensions.js";
import { machines } from "./machines.js";

// Coordinates are centered on the canvas. One unit is half its shorter side.
const TAU = Math.PI * 2;
const { sin, cos, sqrt, abs, exp, floor, hypot } = Math;
const range = (n, make) => Array.from({ length: n }, (_, i) => make(i));
const lerp = (a, b, mix) => a + (b - a) * mix;
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
const smooth = (v) => v * v * (3 - 2 * v);

function waves({ dot, time, pointer }) {
  const az = -0.29 + pointer.x * 0.13;
  for (let row = 0; row < 45; row++) {
    for (let col = 0; col < 73; col++) {
      const x = (col - 36) / 20,
        z = (row - 22) / 17;
      const depth = z * cos(az) - x * sin(az);
      const side = x * cos(az) + z * sin(az);
      const height =
        sin(x * 4.5 - time * 1.25) * 0.115 +
        sin(z * 4.1 + x * 0.8 + time) * 0.12;
      const scale = 1 / (1.3 - depth * 0.19);
      dot(
        side * scale,
        (depth * (0.42 + pointer.y * 0.09) - height) * scale,
        0.0058 * scale,
        0.4 + scale * 0.46,
      );
    }
  }
}

function galaxy({ random, normal }) {
  const stars = range(3900, (i) => {
    const radius = Math.pow(random(), 0.78) * 1.4;
    const arm = ((i % 4) * TAU) / 4;
    const angle =
      arm + 4.3 * radius + normal() * (0.19 + 0.12 / (radius + 0.13));
    return {
      radius,
      angle,
      z: normal() * (0.032 + 0.085 * exp(-radius * 4)),
      size: 0.0016 + random() ** 3 * 0.006,
      alpha: 0.2 + random() * 0.77,
    };
  });
  return ({ dot, time, pointer }) => {
    const tilt = 0.48 + pointer.y * 0.2;
    for (const s of stars) {
      const a = s.angle + (time * 0.06) / (0.7 + s.radius) + pointer.x * 0.42;
      const x = s.radius * cos(a),
        y = s.radius * sin(a) * tilt + s.z;
      dot(x * 0.97 - y * 0.24, y * 0.97 + x * 0.24, s.size, s.alpha);
    }
  };
}

function chladni({ random, normal }) {
  const modes = [
    [3, 5],
    [4, 7],
    [2, 5],
    [5, 6],
  ];
  const grains = range(3200, () => ({
    x: random() * 2 - 1,
    y: random() * 2 - 1,
    offset: random() * TAU,
    size: 0.002 + random() * 0.0035,
  }));
  let mode = 0;
  function retune(initial) {
    const [n, m] = modes[mode];
    for (const g of grains) {
      let x = clamp(g.x + normal() * 0.09, -1, 1),
        y = clamp(g.y + normal() * 0.09, -1, 1);
      for (let step = 0; step < 12; step++) {
        const u = x * Math.PI,
          v = y * Math.PI;
        const f = cos(n * u) * cos(m * v) - cos(m * u) * cos(n * v);
        const dx =
          Math.PI *
          (-n * sin(n * u) * cos(m * v) + m * sin(m * u) * cos(n * v));
        const dy =
          Math.PI *
          (-m * cos(n * u) * sin(m * v) + n * cos(m * u) * sin(n * v));
        const shift = f / (dx * dx + dy * dy + 0.25);
        x = clamp(x - dx * shift, -1, 1);
        y = clamp(y - dy * shift, -1, 1);
      }
      g.tx = x + normal() * 0.006;
      g.ty = y + normal() * 0.006;
      if (initial) {
        g.x = g.tx;
        g.y = g.ty;
      }
    }
  }
  retune(true);
  return {
    press() {
      mode = (mode + 1) % modes.length;
      retune(false);
    },
    draw({ dot, dt, time }) {
      const step = 1 - exp(-dt * 4);
      for (const g of grains) {
        g.x = lerp(g.x, g.tx, step);
        g.y = lerp(g.y, g.ty, step);
        dot(
          g.x * 0.82 + sin(time * 3 + g.offset) * 0.002,
          g.y * 0.82 + cos(time * 3 + g.offset) * 0.002,
          g.size,
          0.46 + 0.36 * abs(sin(g.offset)),
        );
      }
    },
  };
}

function flock({ random, normal }) {
  const birds = range(112, () => ({
    x: normal() * 0.44,
    y: normal() * 0.27,
    vx: 0.18 + random() * 0.2,
    vy: normal() * 0.12,
    phase: random() * TAU,
  }));
  return ({ line, dot, dt, time, pointer, aspect }) => {
    // Read every neighbour from the same simulation step before applying forces.
    for (const b of birds) {
      let cx = 0,
        cy = 0,
        vx = 0,
        vy = 0,
        rx = 0,
        ry = 0,
        count = 0;
      for (const other of birds) {
        const dx = other.x - b.x,
          dy = other.y - b.y,
          dd = dx * dx + dy * dy;
        if (dd <= 0 || dd > 0.12) continue;
        count++;
        cx += dx;
        cy += dy;
        vx += other.vx;
        vy += other.vy;
        if (dd < 0.01) {
          rx -= dx / (dd + 0.001);
          ry -= dy / (dd + 0.001);
        }
      }
      let ax = -b.x * 0.22 + cos(time * 0.38) * 0.14 + rx * 0.022,
        ay = -b.y * 0.55 + sin(time * 0.5) * 0.16 + ry * 0.022;
      if (count) {
        ax += (cx / count) * 1.55 + (vx / count - b.vx) * 1.4;
        ay += (cy / count) * 1.55 + (vy / count - b.vy) * 1.4;
      }
      if (pointer.active) {
        const dx = b.x - pointer.x * aspect,
          dy = b.y - pointer.y,
          dd = dx * dx + dy * dy;
        if (dd < 0.26) {
          ax += (dx / (dd + 0.016)) * 0.75;
          ay += (dy / (dd + 0.016)) * 0.75;
        }
      }
      b.ax = ax;
      b.ay = ay;
    }
    for (const b of birds) {
      b.vx += b.ax * dt;
      b.vy += b.ay * dt;
      const speed = hypot(b.vx, b.vy) || 0.01,
        limit = clamp(speed, 0.17, 0.59) / speed;
      b.vx *= limit;
      b.vy *= limit;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const nx = b.vx / (speed * limit),
        ny = b.vy / (speed * limit),
        wing = 0.012 + 0.01 * cos(time * 8 + b.phase);
      line(
        b.x - nx * 0.023 - ny * wing,
        b.y - ny * 0.023 + nx * wing,
        b.x,
        b.y,
        0.005,
        0.77,
      );
      line(
        b.x,
        b.y,
        b.x - nx * 0.023 + ny * wing,
        b.y - ny * 0.023 - nx * wing,
        0.005,
        0.77,
      );
      dot(b.x, b.y, 0.004, 0.9);
    }
  };
}

function lorenz() {
  let x = 0.3,
    y = 0.6,
    z = 1;
  const path = [];
  const step = ([x, y, z]) => [
    10 * (y - x),
    x * (28 - z) - y,
    x * y - (8 * z) / 3,
  ];
  for (let i = 0; i < 8500; i++) {
    const a = step([x, y, z]),
      dt = 0.007;
    const b = step([
      x + (a[0] * dt) / 2,
      y + (a[1] * dt) / 2,
      z + (a[2] * dt) / 2,
    ]);
    x += b[0] * dt;
    y += b[1] * dt;
    z += b[2] * dt;
    if (i > 700) path.push([x / 21, y / 27, (z - 25) / 28]);
  }
  return ({ dot, time, pointer }) => {
    const yaw = 0.28 + pointer.x * 0.85 + sin(time * 0.14) * 0.11;
    const front = (time * 120) % path.length;
    for (let i = 0; i < path.length; i++) {
      const [x, y, z] = path[i],
        dx = x * cos(yaw) + y * sin(yaw),
        depth = y * cos(yaw) - x * sin(yaw);
      const phase = (front - i + path.length) % path.length;
      const alpha = phase < 200 ? 1 - phase / 240 : 0.16 + 0.15 * (1 + depth);
      dot(
        dx * 1.13,
        -z * 0.97 + (pointer.y * 0.3 + 0.08) * depth,
        phase < 28 ? 0.0065 : 0.0033,
        alpha,
      );
    }
  };
}

function flow({ random }) {
  const lattice = range(256, () => random() * TAU);
  function gradient(x, y, dx, dy) {
    const a = lattice[(((x * 37 + y * 67) % 256) + 256) % 256];
    return cos(a) * dx + sin(a) * dy;
  }
  function noise(x, y) {
    const a = floor(x),
      b = floor(y),
      u = x - a,
      v = y - b;
    return lerp(
      lerp(gradient(a, b, u, v), gradient(a + 1, b, u - 1, v), smooth(u)),
      lerp(
        gradient(a, b + 1, u, v - 1),
        gradient(a + 1, b + 1, u - 1, v - 1),
        smooth(u),
      ),
      smooth(v),
    );
  }
  const seeds = range(410, () => [
    random() * 4 - 2,
    random() * 2.25 - 1.125,
    random(),
  ]);
  return ({ line, dot, time, pointer, aspect }) => {
    for (const [sx, sy, offset] of seeds) {
      let x = sx,
        y = sy;
      for (let i = 0; i < 20; i++) {
        let a = noise(x * 1.5 + time * 0.055, y * 1.5) * 9;
        if (pointer.active) {
          const dx = pointer.x * aspect - x,
            dy = pointer.y - y;
          a += 2.5 * exp(-3 * (dx * dx + dy * dy));
        }
        const nx = x + cos(a) * 0.018,
          ny = y + sin(a) * 0.018;
        line(x, y, nx, ny, 0.0028, 0.1 + i * 0.023);
        if (i === floor((time * 9 + offset * 20) % 20)) dot(x, y, 0.0046, 0.85);
        x = nx;
        y = ny;
      }
    }
  };
}

function network({ random }) {
  const stars = range(96, () => ({
    x: random() * 2 - 1,
    y: random() * 2 - 1,
    p: random() * TAU,
    r: 0.003 + random() * 0.006,
  }));
  return ({ dot, line, time, pointer, aspect }) => {
    for (const s of stars) {
      s.px = s.x * aspect * 0.9 + sin(time * 0.18 + s.p) * 0.08;
      s.py = s.y * 0.84 + cos(time * 0.2 + s.p) * 0.08;
    }
    for (let i = 0; i < stars.length; i++) {
      const a = stars[i];
      for (let j = i + 1; j < stars.length; j++) {
        const b = stars[j],
          d = hypot(b.px - a.px, b.py - a.py);
        if (d < 0.33)
          line(a.px, a.py, b.px, b.py, 0.003, 0.54 * (1 - d / 0.33));
      }
      if (pointer.active) {
        const x = pointer.x * aspect,
          y = pointer.y,
          d = hypot(x - a.px, y - a.py);
        if (d < 0.52) line(a.px, a.py, x, y, 0.0035, 0.86 * (1 - d / 0.52));
      }
      dot(a.px, a.py, a.r, 0.82);
    }
  };
}

function rain({ random }) {
  const drops = range(230, () => ({
      x: random() * 4 - 2,
      y: random() * 2 - 1,
      z: random(),
    })),
    splashes = [];
  let center = 0;
  return ({ line, dot, dt, pointer, aspect }) => {
    center = lerp(center, pointer.x * aspect, 1 - exp(-dt * 6));
    const roof = -0.12 + pointer.y * 0.32,
      width = 0.32;
    for (const d of drops) {
      const before = d.y,
        speed = 0.94 + d.z * 1.25;
      d.y += dt * speed;
      d.x -= dt * 0.09;
      const hit = d.y >= roof && before < roof && abs(d.x - center) < width;
      if (hit || d.y > 0.74 + d.z * 0.16) {
        splashes.push({
          x: d.x,
          y: hit ? roof : d.y,
          age: 0,
          r: 0.06 + random() * 0.07,
        });
        d.x = (random() * 2 - 1) * aspect * 1.13;
        d.y = -1 - random() * 0.24;
      }
      line(
        d.x,
        d.y,
        d.x + 0.002,
        d.y - 0.018 - d.z * 0.037,
        0.003 + d.z * 0.002,
        0.17 + d.z * 0.55,
      );
    }
    line(center - width, roof, center + width, roof, 0.006, 0.8);
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.age += dt;
      const life = s.age / 0.55;
      if (life >= 1) {
        splashes.splice(i, 1);
        continue;
      }
      for (let j = 0; j < 12; j++) {
        const a = (TAU * j) / 12;
        dot(
          s.x + cos(a) * s.r * life,
          s.y + sin(a) * s.r * life * 0.23 - sin(Math.PI * life) * 0.025,
          0.003,
          0.55 * (1 - life),
        );
      }
    }
  };
}

function fireworks({ random }) {
  let countdown = 1.45;
  const sparks = [];
  function burst(x, y, age = 0) {
    const rotation = random() * TAU;
    for (let i = 0; i < 155; i++) {
      const a = i * 2.39996 + rotation,
        velocity = 0.15 + sqrt(random()) * 0.95;
      sparks.push({
        x,
        y,
        vx: cos(a) * velocity,
        vy: sin(a) * velocity,
        age,
        life: 1.15 + random() * 0.8,
        r: 0.002 + random() * 0.004,
      });
    }
  }
  burst(-0.32, -0.13, 0.46);
  burst(0.52, -0.33, 0.25);
  return {
    press(p, aspect) {
      burst(p.x * aspect, p.y);
    },
    draw({ dot, line, dt, aspect }) {
      countdown -= dt;
      if (countdown <= 0) {
        burst((random() - 0.5) * aspect * 0.94, (random() - 0.55) * 0.72);
        countdown = 1.3 + random() * 0.65;
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.age += dt;
        if (s.age > s.life) {
          sparks.splice(i, 1);
          continue;
        }
        const travel = 1 - exp(-s.age * 1.4),
          px = s.x + s.vx * travel,
          py = s.y + s.vy * travel + s.age * s.age * 0.15;
        const old = Math.max(0, s.age - 0.058),
          tail = 1 - exp(-old * 1.4),
          alpha = (1 - s.age / s.life) ** 0.75;
        line(
          s.x + s.vx * tail,
          s.y + s.vy * tail + old * old * 0.15,
          px,
          py,
          0.003,
          alpha * 0.61,
        );
        dot(px, py, s.r, alpha);
      }
    },
  };
}

function phyllotaxis({ dot, time, pointer }) {
  const count = 1400,
    size = 0.84,
    golden = Math.PI * (3 - sqrt(5));
  const angle = golden + pointer.x * 0.045;
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count,
      r = sqrt(u) * size,
      a = i * angle + time * 0.075;
    const wave = 0.5 + 0.5 * cos(r * 16 - time * 1.45 + pointer.y * 3);
    dot(
      cos(a) * r,
      sin(a) * r,
      (0.003 + sqrt(u) * 0.009) * (0.88 + wave * 0.16),
      0.38 + wave * 0.55,
    );
  }
}

const classics = [
  {
    name: "点阵波浪",
    hint: "左右移动，沿着波面改变视角。",
    source: "Three.js · Points Waves",
    url: "https://threejs.org/examples/webgl_points_waves.html",
    create: () => waves,
  },
  {
    name: "旋臂星系",
    hint: "滑动改变星盘倾角，观察四条旋臂。",
    source: "Three.js · Galaxy",
    url: "https://threejs.org/examples/webgpu_tsl_galaxy.html",
    create: galaxy,
  },
  {
    name: "振动沙纹",
    hint: "点按画面切换振型，看沙粒迁移到新的节线。",
    source: "CymaVis · Chladni Plate",
    url: "https://cymavis.com/chladni",
    create: chladni,
  },
  {
    name: "避让鸟群",
    hint: "将指针伸入鸟群，观察它们分开、转向，再次结队。",
    source: "p5.js · Flocking",
    url: "https://p5js.org/examples/Classes-And-Objects-Flocking/",
    create: flock,
  },
  {
    name: "混沌蝶翼",
    hint: "滑动旋转洛伦兹吸引子，追踪亮点如何在双翼间穿行。",
    source: "The Coding Train · Lorenz Attractor",
    url: "https://thecodingtrain.com/challenges/12-lorenz-attractor",
    create: lorenz,
  },
  {
    name: "噪声流场",
    hint: "在流线间移动，让指尖附近的流向弯折。",
    source: "The Coding Train · Perlin Noise Flow Field",
    url: "https://thecodingtrain.com/challenges/24-perlin-noise-flow-field",
    create: flow,
  },
  {
    name: "连线星图",
    hint: "指向空隙，附近节点会向指针连线。",
    source: "Vincent Garreau · particles.js",
    url: "https://vincentgarreau.com/particles.js/",
    create: network,
  },
  {
    name: "雨滴碰撞",
    hint: "移动横板接雨，观察落点溅开的粒子。",
    source: "Three.js · Compute Particles Rain",
    url: "https://threejs.org/examples/webgpu_compute_particles_rain.html",
    create: rain,
  },
  {
    name: "粒子烟花",
    hint: "点按任意位置引爆烟花，可连续点按。",
    source: "The Coding Train · Fireworks",
    url: "https://thecodingtrain.com/challenges/27-fireworks",
    create: fireworks,
  },
  {
    name: "叶序螺旋",
    hint: "左右滑动微调发散角，看种子从螺旋重排成放射状。",
    source: "The Coding Train · Phyllotaxis",
    url: "https://thecodingtrain.com/challenges/30-phyllotaxis",
    create: () => phyllotaxis,
  },
];

function originalGroup(name, file, entries) {
  return {
    name,
    studies: entries.map(([title, hint, create, reference]) => ({
      name: title,
      hint,
      create,
      url:
        reference ||
        `https://github.com/holynova/ucas-particles/blob/main/src/lab/${file}.js`,
      source: reference ? title : name,
      linkLabel: reference ? "背景资料" : "本组源码",
    })),
  };
}

export const groups = [
  { name: "经典实验", studies: classics },
  { name: "力与运动", studies: mechanics },
  { name: "形态与生长", studies: forms },
  { name: "光与波", studies: optics },
  { name: "群体与路径", studies: paths },
  originalGroup("天文巡游", "astronomy", astronomy),
  originalGroup("天气与地貌", "landscape", landscape),
  originalGroup("纸艺与编织", "textiles", textiles),
  originalGroup("几何与维度", "dimensions", dimensions),
  originalGroup("节奏机械", "machines", machines),
];
export const studies = groups.flatMap((group) => group.studies);
