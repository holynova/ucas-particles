import { useEffect, useRef, useState } from "react";
import { studies } from "./scenes.js";
import { makeStudy } from "./renderer.js";
import "./lab.css";

function Preview({ study, index }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const scene = makeStudy(canvas, study, index, true);
    const resize = new ResizeObserver(() => {
      scene.resize();
      scene.frame(0);
    });
    resize.observe(canvas);
    return () => resize.disconnect();
  }, [study, index]);
  return <canvas ref={ref} aria-hidden="true" className="lab-thumb" />;
}

function Stage({ index, paused }) {
  const ref = useRef(null);
  const controller = useRef(null);
  const playing = useRef(!paused);
  useEffect(() => {
    const canvas = ref.current;
    const scene = makeStudy(canvas, studies[index], index);
    let raf = 0,
      lastTime = 0,
      visible = false;
    const target = { x: 0, y: 0 };
    function frame(now) {
      raf = 0;
      const dt = lastTime ? Math.min(0.045, (now - lastTime) / 1000) : 0;
      lastTime = now;
      const smooth = 1 - Math.exp(-dt * 14);
      scene.pointer.x += (target.x - scene.pointer.x) * smooth;
      scene.pointer.y += (target.y - scene.pointer.y) * smooth;
      scene.frame(dt);
      sync();
    }
    function sync() {
      if (playing.current && visible && !document.hidden) {
        if (!raf) raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
        lastTime = 0;
      }
    }
    const setPoint = (event) => {
      const rect = canvas.getBoundingClientRect();
      target.x = (2 * (event.clientX - rect.left)) / rect.width - 1;
      target.y = (2 * (event.clientY - rect.top)) / rect.height - 1;
      scene.pointer.active = true;
      if (!playing.current) {
        Object.assign(scene.pointer, target);
        scene.frame(0);
      }
    };
    const leave = () => {
      scene.pointer.active = false;
      target.x = target.y = 0;
    };
    const press = (event) => {
      setPoint(event);
      Object.assign(scene.pointer, target);
      scene.press();
      if (!playing.current) scene.frame(0);
    };
    const key = (event) => {
      const delta = {
        ArrowLeft: [-0.12, 0],
        ArrowRight: [0.12, 0],
        ArrowUp: [0, -0.12],
        ArrowDown: [0, 0.12],
      }[event.key];
      if (!delta && event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (delta) {
        target.x = Math.max(-1, Math.min(1, target.x + delta[0]));
        target.y = Math.max(-1, Math.min(1, target.y + delta[1]));
      }
      scene.pointer.active = true;
      Object.assign(scene.pointer, target);
      if (!delta) scene.press();
      if (!playing.current) scene.frame(0);
    };
    const resize = new ResizeObserver(() => {
      scene.resize();
      scene.frame(0);
    });
    resize.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    visibility.observe(canvas);
    canvas.addEventListener("pointermove", setPoint);
    canvas.addEventListener("pointerdown", press);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("pointercancel", leave);
    canvas.addEventListener("blur", leave);
    canvas.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", sync);
    controller.current = sync;
    return () => {
      cancelAnimationFrame(raf);
      visibility.disconnect();
      resize.disconnect();
      canvas.removeEventListener("pointermove", setPoint);
      canvas.removeEventListener("pointerdown", press);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointercancel", leave);
      canvas.removeEventListener("blur", leave);
      canvas.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", sync);
      controller.current = null;
    };
  }, [index]);
  useEffect(() => {
    playing.current = !paused;
    controller.current?.();
  }, [paused]);
  return (
    <canvas
      ref={ref}
      className="lab-stage"
      tabIndex="0"
      role="img"
      aria-label={studies[index].name}
      aria-describedby="lab-hint lab-keyboard"
    />
  );
}

export default function ParticleLab() {
  const [index, setIndex] = useState(0);
  const [near, setNear] = useState(false);
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const section = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  const study = studies[index];
  return (
    <section
      ref={section}
      id="particle-lab"
      lang="zh-CN"
      className="column section lab"
      aria-labelledby="lab-title"
    >
      <h2 id="lab-title">粒子实验室</h2>
      <div className="lab-view">
        {near && <Stage index={index} paused={paused} />}
        <button
          className="lab-play"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "播放动画" : "暂停动画"}
        >
          <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>
          {paused ? "播放" : "暂停"}
        </button>
      </div>
      <div className="lab-details" aria-live="polite">
        <div>
          <h3>{study.name}</h3>
          <p id="lab-hint">{study.hint}</p>
        </div>
        <a
          href={study.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`参考案例：${study.source}`}
        >
          参考案例
        </a>
      </div>
      <span id="lab-keyboard" className="lab-sr">
        聚焦画面后，用方向键移动，空格或回车点按。
      </span>
      <div className="lab-grid" role="group" aria-label="选择粒子效果">
        {studies.map((item, i) => (
          <button
            key={item.name}
            type="button"
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          >
            {near && <Preview study={item} index={i} />}
            <span>{item.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
