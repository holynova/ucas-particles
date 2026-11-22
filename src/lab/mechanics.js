// These models use the same height-normalized coordinates as the original gallery.
const TAU = 2 * Math.PI;
const { sin, cos, exp, hypot, sqrt, abs } = Math;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const points = (n, f) => Array.from({ length: n }, (_, i) => f(i));

function net() {
  const cols = 35,
    rows = 21;
  const knots = points(cols * rows, (i) => {
    const x = ((i % cols) / (cols - 1) - 0.5) * 2.35,
      y = (Math.floor(i / cols) / (rows - 1) - 0.5) * 1.48;
    return { x, y, dx: 0, dy: 0, vx: 0, vy: 0 };
  });
  return ({ dot, line, dt, time, pointer, aspect }) => {
    // A damped elastic sheet: the neighbours share their offsets and the frame is pinned.
    for (let y = 1; y < rows - 1; y++)
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x,
          k = knots[i],
          px = pointer.x * aspect - k.x,
          py = pointer.y - k.y;
        const pull = pointer.active ? exp(-5 * (px * px + py * py)) : 0;
        const ax =
          knots[i - 1].dx +
          knots[i + 1].dx +
          knots[i - cols].dx +
          knots[i + cols].dx -
          4 * k.dx;
        const ay =
          knots[i - 1].dy +
          knots[i + 1].dy +
          knots[i - cols].dy +
          knots[i + cols].dy -
          4 * k.dy;
        k.vx += (ax * 95 - k.dx * 12 + pull * px * 33) * dt;
        k.vy += (ay * 95 - k.dy * 12 + pull * py * 33) * dt;
      }
    for (const k of knots) {
      const damping = exp(-4 * dt);
      k.vx *= damping;
      k.vy *= damping;
      k.dx += k.vx * dt;
      k.dy += k.vy * dt;
      k.px = k.x + k.dx;
      k.py =
        k.y + k.dy + cos(k.x * 3.4 + k.y * 3 - time) * 0.045 * (1 - abs(k.y));
    }
    for (let i = 0; i < knots.length; i++) {
      const k = knots[i],
        right = knots[i + 1],
        below = knots[i + cols];
      if (i % cols < cols - 1)
        line(k.px, k.py, right.px, right.py, 0.002, 0.24);
      if (below) line(k.px, k.py, below.px, below.py, 0.002, 0.24);
      dot(k.px, k.py, 0.0055, 0.82);
    }
  };
}

function hourglass({ random }) {
  const sand = points(1750, () => [random(), random(), random()]);
  let elapsed = 0.34,
    turn = 0,
    target = 0;
  return {
    press() {
      target += Math.PI;
      elapsed = 1 - elapsed;
    },
    draw({ dot, line, dt, time }) {
      turn += (target - turn) * (1 - exp(-6 * dt));
      elapsed = Math.min(1, elapsed + dt * 0.048);
      const flip = Math.round(target / Math.PI) % 2 ? -1 : 1;
      // The frame rotates in screen space. Sand always settles towards gravity.
      const c = cos(turn),
        s = sin(turn);
      const edges = [
        [-0.54, -0.82, 0.54, -0.82],
        [-0.53, -0.78, -0.025, -0.035],
        [0.53, -0.78, 0.025, -0.035],
        [-0.025, 0.035, -0.53, 0.78],
        [0.025, 0.035, 0.53, 0.78],
        [-0.54, 0.82, 0.54, 0.82],
      ];
      for (const [x, y, u, v] of edges)
        line(
          x * c - y * s,
          x * s + y * c,
          u * c - v * s,
          u * s + v * c,
          0.007,
          0.58,
        );
      const angle = turn - target,
        ca = cos(angle),
        sa = sin(angle);
      for (const [u, v, w] of sand) {
        let x, y;
        if (w > elapsed) {
          const h =
            sqrt((w - elapsed) / (1 - elapsed || 1)) * sqrt(1 - elapsed) * 0.75;
          y = -h - 0.022;
          x = (u * 2 - 1) * h * 0.65;
        } else {
          const width = 0.5 * sqrt(elapsed);
          x = (u * 2 - 1) * width;
          y = 0.77 - v * (0.65 * sqrt(elapsed)) * (1 - abs(x) / (width || 1));
        }
        dot(
          x * ca - y * sa,
          x * sa + y * ca,
          0.0032 + 0.0016 * v,
          0.38 + 0.51 * u,
        );
      }
      if (elapsed < 1)
        for (let i = 0; i < 56; i++) {
          const y = ((i / 56 + time * 1.38) % 1) ** 1.6 * 0.72;
          dot(sin(i * 8.23 + time * 3) * 0.009 * flip, y, 0.003, 0.75);
        }
    },
  };
}

function pendulum() {
  let a = 1.8,
    b = -0.65,
    u = 0.4,
    v = 0.1;
  const trail = [];
  function advance(h) {
    const delta = a - b,
      l = 0.41,
      g = 2.6,
      den = l * (3 - cos(2 * delta));
    const du =
      (-3 * g * sin(a) -
        g * sin(a - 2 * b) -
        2 * sin(delta) * (v * v * l + u * u * l * cos(delta))) /
      den;
    const dv =
      (2 *
        sin(delta) *
        (2 * u * u * l + 2 * g * cos(a) + v * v * l * cos(delta))) /
      den;
    u += h * du;
    v += h * dv;
    a += h * u;
    b += h * v;
    return [l * (sin(a) + sin(b)), -0.08 + l * (cos(a) + cos(b))];
  }
  for (let i = 0; i < 270; i++) trail.push(advance(0.009));
  return {
    press(p) {
      u = clamp(u + p.x * 3.2 + 0.9, -7, 7);
      v = clamp(v - p.y * 3 - 1, -8, 8);
    },
    draw({ dot, line, dt }) {
      if (dt) {
        const steps = Math.ceil(dt / 0.009);
        for (let i = 0; i < steps; i++) trail.push(advance(dt / steps));
        if (trail.length > 330) trail.splice(0, trail.length - 330);
      }
      const [x, y] = trail[trail.length - 1],
        jx = 0.41 * sin(a),
        jy = -0.08 + 0.41 * cos(a);
      trail.forEach(([px, py], i) =>
        dot(px, py, 0.004, 0.1 + (0.72 * i) / trail.length),
      );
      line(0, -0.08, jx, jy, 0.006, 0.53);
      line(jx, jy, x, y, 0.006, 0.85);
      dot(0, -0.08, 0.018, 0.85);
      dot(jx, jy, 0.027, 0.85);
      dot(x, y, 0.04, 1);
    },
  };
}

function magnet({ dot, line, pointer, aspect, time }) {
  const sx = -0.61,
    sy = 0,
    tx = 0.59 + pointer.x * aspect * 0.24,
    ty = pointer.y * 0.57;
  for (let ray = 0; ray < 46; ray++) {
    const angle = ((ray + 0.5) * TAU) / 46;
    let x = sx + 0.045 * cos(angle),
      y = sy + 0.045 * sin(angle);
    for (let step = 0; step < 124; step++) {
      const dx = x - sx,
        dy = y - sy,
        ex = x - tx,
        ey = y - ty;
      const ra = Math.max(0.0001, (dx * dx + dy * dy) ** 1.5),
        rb = Math.max(0.0001, (ex * ex + ey * ey) ** 1.5);
      const fx = dx / ra - ex / rb,
        fy = dy / ra - ey / rb,
        n = hypot(fx, fy) || 1;
      const nx = x + (0.023 * fx) / n,
        ny = y + (0.023 * fy) / n;
      line(x, y, nx, ny, 0.0025, 0.23);
      if ((step + ray * 2 - Math.floor(time * 19)) % 19 === 0)
        dot(x, y, 0.006, 1);
      x = nx;
      y = ny;
      if (hypot(x - tx, y - ty) < 0.045 || abs(y) > 1 || abs(x) > aspect) break;
    }
  }
  dot(sx, sy, 0.034, 1);
  dot(tx, ty, 0.034, 1);
}

function interference({ dot, time, pointer }) {
  const spacing = 0.36 + pointer.x * 0.25,
    off = pointer.y * 3;
  for (let j = -33; j <= 33; j++)
    for (let i = -55; i <= 55; i++) {
      const x = i * 0.028,
        y = j * 0.028,
        r1 = hypot(x - spacing, y),
        r2 = hypot(x + spacing, y);
      const a = (sin(r1 * 24 - time * 4) + sin(r2 * 24 - time * 4 + off)) / 2;
      if (a > 0.13) dot(x, y, 0.002 + a * 0.006, 0.12 + a * 0.78);
    }
  dot(-spacing, 0, 0.021, 1);
  dot(spacing, 0, 0.021, 1);
}

function wavePendulums({ dot, line, time, pointer }) {
  for (let i = 0; i < 22; i++) {
    const depth = i / 21,
      len = 0.4 + depth * 0.49;
    const x = (depth - 0.5) * 1.66,
      y = -0.57 + depth * 0.27;
    const phase = time * (2.8 + depth * 1.52) + pointer.x * 5 * depth;
    const swing = sin(phase) * (0.78 + pointer.y * 0.22);
    line(
      x,
      y,
      x + sin(swing) * len * 0.63,
      y + len * cos(swing),
      0.0026,
      0.2 + 0.3 * depth,
    );
    dot(x, y, 0.005, 0.45);
    dot(
      x + sin(swing) * len * 0.63,
      y + len * cos(swing),
      0.013 + 0.016 * depth,
      0.45 + 0.53 * depth,
    );
  }
}

function gas({ random }) {
  const r = 0.026,
    balls = points(75, (i) => ({
      x: -1 + (i % 15) * 0.12,
      y: -0.49 + Math.floor(i / 15) * 0.21,
      vx: (random() - 0.5) * 1.3,
      vy: (random() - 0.5) * 1.3,
    }));
  let wall = 1.1;
  return ({ dot, line, dt, pointer }) => {
    wall += (0.83 + pointer.x * 0.6 - wall) * (1 - exp(-dt * 8));
    for (const a of balls) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.x > wall - r) {
        a.x = wall - r;
        a.vx = -abs(a.vx);
      }
      if (a.x < -1.12 + r) {
        a.x = -1.12 + r;
        a.vx = abs(a.vx);
      }
      if (abs(a.y) > 0.66 - r) {
        a.y = Math.sign(a.y) * (0.66 - r);
        a.vy = -Math.sign(a.y) * abs(a.vy);
      }
    }
    for (let i = 0; i < balls.length; i++)
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i],
          b = balls[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          d = hypot(dx, dy);
        if (d <= 0 || d >= 2 * r) continue;
        const nx = dx / d,
          ny = dy / d,
          p = (2 * r - d) / 2,
          vel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        a.x -= nx * p;
        a.y -= ny * p;
        b.x += nx * p;
        b.y += ny * p;
        if (vel > 0) {
          a.vx -= vel * nx;
          a.vy -= vel * ny;
          b.vx += vel * nx;
          b.vy += vel * ny;
        }
      }
    for (const a of balls)
      dot(a.x, a.y, r * 0.78, 0.4 + Math.min(0.57, hypot(a.vx, a.vy) * 0.69));
    line(-1.12, -0.66, 1.47, -0.66, 0.005, 0.48);
    line(-1.12, 0.66, 1.47, 0.66, 0.005, 0.48);
    line(-1.12, -0.66, -1.12, 0.66, 0.005, 0.48);
    line(wall, -0.66, wall, 0.66, 0.018, 0.96);
    line(wall, 0, 1.48, 0, 0.009, 0.55);
  };
}

function binary({ dot, time, pointer }) {
  const phase = time * 0.45,
    sep = 0.44 + pointer.x * 0.2,
    tilt = 0.45 + 0.32 * pointer.y;
  for (let k = 0; k < 2; k++) {
    const sign = k ? 1 : -1,
      mass = k ? 0.72 : 1;
    const cx = cos(phase) * sep * sign,
      cy = sin(phase) * sep * 0.4 * sign;
    for (let i = 0; i < 650; i++) {
      const t = i / 650,
        r = (0.15 + 0.22 * t) * mass,
        a = t * 26 + phase * (k ? -2 : 2);
      dot(
        cx + r * cos(a),
        cy + tilt * r * sin(a),
        0.0023 + 0.0026 * t,
        0.27 + 0.5 * (1 - t),
      );
    }
    for (let i = 0; i < 200; i++) {
      const r = sqrt(i / 200) * 0.074 * mass,
        a = i * 2.39996;
      dot(cx + r * cos(a), cy + r * sin(a), 0.005, 0.92);
    }
  }
  for (let i = 0; i < 640; i++) {
    const r = 0.9 + 0.22 * sin(i * 81.23) ** 2,
      a = i * 2.39996 + time * 0.13;
    dot(r * cos(a), r * sin(a) * tilt, 0.0028, 0.16 + 0.33 * abs(sin(i * 33)));
  }
}

function harp() {
  const plucks = points(9, (i) => ({
    age: 1.1 + i * 0.1,
    strength: 0.06,
    along: 0.34,
  }));
  return {
    press(p, aspect) {
      const i = clamp(Math.round((p.y + 0.64) / 0.16), 0, 8);
      plucks[i] = {
        age: 0,
        strength: 0.12,
        along: clamp((p.x * aspect + 1.15) / 2.3, 0.05, 0.95),
      };
    },
    draw({ dot, line, dt, time }) {
      for (let row = 0; row < 9; row++) {
        const p = plucks[row];
        p.age += dt;
        const y = -0.64 + row * 0.16;
        for (let i = 0; i <= 140; i++) {
          const t = i / 140,
            x = (t - 0.5) * 2.3;
          let displacement = 0;
          for (let n = 1; n <= 4; n++)
            displacement +=
              (sin(n * Math.PI * t) *
                sin(n * Math.PI * p.along) *
                cos(n * (12 + row) * p.age)) /
              (n * n);
          const idle = 0.012 * sin(time * 2.1 + row) * sin(Math.PI * t);
          dot(
            x,
            y + displacement * p.strength * exp(-p.age * 1.4) + idle,
            0.0044,
            0.55 + 0.28 * (1 - (i % 3) / 3),
          );
        }
        dot(-1.15, y, 0.012, 0.75);
        dot(1.15, y, 0.012, 0.75);
      }
      line(-1.15, -0.7, -1.15, 0.7, 0.005, 0.35);
      line(1.15, -0.7, 1.15, 0.7, 0.005, 0.35);
    },
  };
}

function wake({ random }) {
  const tracers = points(620, () => ({
    x: random() * 3.8 - 1.9,
    y: random() * 1.72 - 0.86,
  }));
  return ({ dot, line, dt, time, pointer, aspect }) => {
    const cx = -0.65 + pointer.x * 0.24,
      cy = pointer.y * 0.53,
      r = 0.13;
    const vortices = points(7, (i) => {
      const age = (time * 0.6 + i) % 7;
      return [
        cx + r + age * 0.34,
        cy + (i % 2 ? 1 : -1) * (0.15 + 0.018 * age),
        i % 2 ? 1 : -1,
      ];
    });
    function velocity(x, y) {
      let vx = 0.52,
        vy = 0;
      const dx = x - cx,
        dy = y - cy,
        ds = Math.max(r * r, dx * dx + dy * dy);
      vx -= (0.52 * r * r * (dx * dx - dy * dy)) / (ds * ds);
      vy -= (1.04 * r * r * dx * dy) / (ds * ds);
      for (const [u, v, s] of vortices) {
        const a = x - u,
          b = y - v,
          influence =
            (0.037 * s * exp(-3 * (a * a + b * b))) / (a * a + b * b + 0.016);
        vx -= b * influence;
        vy += a * influence;
      }
      return [vx, vy];
    }
    for (const p of tracers) {
      let x = p.x,
        y = p.y;
      const [vx, vy] = velocity(x, y);
      p.x += vx * dt;
      p.y += vy * dt;
      if (p.x > aspect + 0.12 || abs(p.y) > 1) {
        p.x = -aspect - 0.08;
        p.y = random() * 1.8 - 0.9;
      }
      const dist = hypot(p.x - cx, p.y - cy);
      if (dist < r) {
        const a = Math.atan2(p.y - cy, p.x - cx);
        p.x = cx + cos(a) * (r + 0.003);
        p.y = cy + sin(a) * (r + 0.003);
      }
      dot(p.x, p.y, 0.004, 0.78);
      line(x, y, x - vx * 0.08, y - vy * 0.08, 0.0025, 0.35);
    }
    for (let i = 0; i < 88; i++)
      dot(
        cx + r * cos((i * TAU) / 88),
        cy + r * sin((i * TAU) / 88),
        0.005,
        0.9,
      );
  };
}

export const mechanics = [
  [
    "弹性织网",
    "移入网面，牵动一簇网结；移开后观察回弹。",
    net,
    "The Nature of Code · Oscillation",
    "https://natureofcode.com/oscillation/",
  ],
  [
    "翻转沙漏",
    "点按翻转沙漏，细沙会重新穿过瓶颈。",
    hourglass,
    "Sandspiel",
    "https://sandspiel.club/",
  ],
  [
    "混沌双摆",
    "点按给摆杆施加冲量，不同落点改变摆动轨迹。",
    pendulum,
    "myPhysicsLab · Double Pendulum",
    "https://www.myphysicslab.com/pendulum/double-pendulum-en.html",
  ],
  [
    "磁极引线",
    "移动右侧磁极，观察磁力线重新弯折。",
    () => magnet,
    "PhET · Magnets and Electromagnets",
    "https://phet.colorado.edu/en/simulations/magnets-and-electromagnets",
  ],
  [
    "双源干涉",
    "横移调整波源间距，上下滑动改变相位差。",
    () => interference,
    "PhET · Wave Interference",
    "https://phet.colorado.edu/en/simulations/wave-interference",
  ],
  [
    "摆阵行波",
    "左右移动调整各摆的相位，上下移动改变摆幅。",
    () => wavePendulums,
    "Harvard · Pendulum Waves",
    "https://www.youtube.com/watch?v=yVkdfJ9PkRQ",
  ],
  [
    "活塞气室",
    "左右移动活塞，压缩或释放碰撞中的粒子。",
    gas,
    "PhET · Gas Properties",
    "https://phet.colorado.edu/en/simulations/gas-properties",
  ],
  [
    "双星绕行",
    "横移改变双星间距，纵向滑动倾斜轨道。",
    () => binary,
    "PhET · My Solar System",
    "https://phet.colorado.edu/en/simulations/my-solar-system",
  ],
  [
    "点阵拨弦",
    "点按任意一根弦，观察拨弦位置如何改变振型。",
    harp,
    "PhET · Wave on a String",
    "https://phet.colorado.edu/en/simulations/wave-on-a-string",
  ],
  [
    "绕流尾迹",
    "移动圆柱，观察粒子从两侧绕过并卷入尾流。",
    wake,
    "2D Fluid Dynamics",
    "https://www.ibiblio.org/e-notes/webgl/gpu/fluid.htm",
  ],
].map(([name, hint, create, source, url]) => ({
  name,
  hint,
  create,
  source,
  url,
}));
