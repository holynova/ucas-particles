function generator(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function makeStudy(canvas, study, index, miniature = false) {
  const context = canvas.getContext("2d");
  const random = generator(93 + index * 71);
  const normal = () =>
    Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(random() * Math.PI * 2);
  const model = study.create({ random, normal });
  const draw = typeof model === "function" ? model : model.draw;
  const fills = new Array(16),
    strokes = new Map();
  const pointer = { x: 0, y: 0, active: false };
  let height = 1,
    width = 1,
    scale = 1,
    time = 1.8;
  const bucket = (alpha) => Math.max(1, Math.min(15, Math.round(alpha * 15)));

  function dot(x, y, radius, alpha) {
    const key = bucket(alpha);
    const path = (fills[key] ??= new Path2D());
    const diameter = Math.max(miniature ? 0.9 : 1, radius * 2 * scale);
    path.rect(
      width / 2 + x * scale - diameter / 2,
      height / 2 + y * scale - diameter / 2,
      diameter,
      diameter,
    );
  }

  function line(x1, y1, x2, y2, weight, alpha) {
    const thickness = Math.max(1, Math.round(weight * scale));
    const key = thickness * 16 + bucket(alpha);
    if (!strokes.has(key)) strokes.set(key, new Path2D());
    const path = strokes.get(key);
    path.moveTo(width / 2 + x1 * scale, height / 2 + y1 * scale);
    path.lineTo(width / 2 + x2 * scale, height / 2 + y2 * scale);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.round(rect.width * ratio));
    height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    scale = height / 2;
  }

  function frame(dt) {
    time += dt;
    context.clearRect(0, 0, width, height);
    context.fillStyle = context.strokeStyle = "#f5f5f3";
    fills.fill(null);
    strokes.clear();
    draw({ dot, line, dt, time, pointer, aspect: width / height });
    for (const [key, path] of strokes) {
      context.lineWidth = Math.floor(key / 16);
      context.globalAlpha = (key % 16) / 15;
      context.stroke(path);
    }
    fills.forEach((path, key) => {
      if (!path) return;
      context.globalAlpha = key / 15;
      context.fill(path);
    });
    context.globalAlpha = 1;
  }
  return {
    resize,
    frame,
    pointer,
    press: () => model.press?.(pointer, width / height),
  };
}
