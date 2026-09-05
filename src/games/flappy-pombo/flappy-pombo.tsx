import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Flappy Pombo — implementação 100% original em Canvas 2D.
 * Nenhum código ou arte de terceiros: tudo desenhado proceduralmente.
 * Arquitetura preparada para áudio (ver `playSound`, hoje um no-op).
 */

const W = 480;
const H = 720;
const GROUND_H = 96;
const GRAVITY = 1500;
const FLAP_V = -430;
const BIRD_X = 140;
const BIRD_R = 16;
const PIPE_W = 66;
const BEST_KEY = "gamehub:flappy-pombo:best";

type Phase = "ready" | "playing" | "over";
type Pipe = { x: number; gapY: number; gap: number; scored: boolean };

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Placeholder para áudio futuro (sem dependências). */
function playSound(_name: "flap" | "score" | "hit") {}

export default function FlappyPombo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  // estado mutável do loop
  const state = useRef({
    phase: "ready" as Phase,
    y: H / 2,
    v: 0,
    rot: 0,
    wing: 0,
    t: 0,
    score: 0,
    pipes: [] as Pipe[],
    spawn: 0,
    scroll: 0,
    paused: false,
  });

  const reset = useCallback(() => {
    const s = state.current;
    s.y = H / 2;
    s.v = 0;
    s.rot = 0;
    s.t = 0;
    s.score = 0;
    s.pipes = [];
    s.spawn = 0;
    s.phase = "ready";
    setScore(0);
    setPhase("ready");
  }, []);

  const flap = useCallback(() => {
    const s = state.current;
    if (s.phase === "ready") {
      s.phase = "playing";
      setPhase("playing");
    }
    if (s.phase === "playing") {
      s.v = FLAP_V;
      s.wing = 1;
      playSound("flap");
    }
  }, []);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(BEST_KEY) ?? 0);
    if (Number.isFinite(stored)) setBest(stored);
  }, []);

  // input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (state.current.phase === "over") return;
        flap();
      }
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  // pausa segura quando a aba perde foco
  useEffect(() => {
    const onVis = () => {
      state.current.paused = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // loop principal
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let scale = 1;
    let ox = 0;
    let oy = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = wrap.clientWidth;
      const ch = wrap.clientHeight;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      scale = Math.max(cw / W, ch / H);
      ox = (cw - W * scale) / 2;
      oy = (ch - H * scale) / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const die = () => {
      const s = state.current;
      if (s.phase !== "playing") return;
      s.phase = "over";
      playSound("hit");
      setPhase("over");
      setBest((prevBest) => {
        const next = Math.max(prevBest, s.score);
        window.localStorage.setItem(BEST_KEY, String(next));
        return next;
      });
    };

    const update = (dt: number) => {
      const s = state.current;
      s.t += dt;
      s.wing = Math.max(0, s.wing - dt * 3);

      if (s.phase === "ready") {
        s.y = H / 2 + Math.sin(s.t * 3) * 10;
        s.rot = 0;
        s.scroll += 40 * dt;
        return;
      }
      if (s.phase !== "playing") {
        s.scroll += 20 * dt;
        return;
      }

      const speed = 150 + Math.min(70, s.score * 3);
      s.scroll += speed * dt;
      s.v += GRAVITY * dt;
      s.y += s.v * dt;
      s.rot = Math.max(-0.5, Math.min(1.2, s.v / 700));

      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(1.15, 1.7 - s.score * 0.02);
        const gap = Math.max(150, 220 - s.score * 3);
        s.pipes.push({ x: W + PIPE_W, gapY: rand(140, H - GROUND_H - 140), gap, scored: false });
      }

      for (const p of s.pipes) {
        p.x -= speed * dt;
        if (!p.scored && p.x + PIPE_W < BIRD_X - BIRD_R) {
          p.scored = true;
          s.score += 1;
          setScore(s.score);
          playSound("score");
        }
        // colisão
        const withinX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
        if (withinX) {
          const top = p.gapY - p.gap / 2;
          const bottom = p.gapY + p.gap / 2;
          if (s.y - BIRD_R < top || s.y + BIRD_R > bottom) die();
        }
      }
      s.pipes = s.pipes.filter((p) => p.x > -PIPE_W - 10);

      if (s.y + BIRD_R >= H - GROUND_H) {
        s.y = H - GROUND_H - BIRD_R;
        die();
      }
      if (s.y - BIRD_R < 0) {
        s.y = BIRD_R;
        s.v = 0;
      }
    };

    const drawSky = () => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#5b7fa6");
      g.addColorStop(0.55, "#8fadc6");
      g.addColorStop(1, "#c3ced8");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    };

    const drawCity = (offset: number, layer: number) => {
      const baseY = H - GROUND_H;
      const speedMul = layer === 0 ? 0.08 : 0.2;
      const step = layer === 0 ? 74 : 52;
      const alpha = layer === 0 ? 0.28 : 0.45;
      ctx.fillStyle = `rgba(38, 52, 74, ${alpha})`;
      const shift = (offset * speedMul) % step;
      for (let i = -1; i < W / step + 2; i++) {
        const x = i * step - shift;
        const seed = Math.abs(Math.sin((i + layer * 13) * 12.9898) * 43758.5453) % 1;
        const h = (layer === 0 ? 90 : 60) + seed * (layer === 0 ? 150 : 110);
        const w = step - (layer === 0 ? 14 : 10);
        ctx.fillRect(x, baseY - h, w, h);
        // janelas
        ctx.fillStyle = `rgba(200, 220, 240, ${alpha * 0.35})`;
        for (let wy = baseY - h + 12; wy < baseY - 14; wy += 18) {
          for (let wx = x + 8; wx < x + w - 8; wx += 14) {
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
        ctx.fillStyle = `rgba(38, 52, 74, ${alpha})`;
      }
    };

    const drawPipe = (p: Pipe) => {
      const top = p.gapY - p.gap / 2;
      const bottom = p.gapY + p.gap / 2;
      const body = (x: number, y: number, w: number, h: number) => {
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, "#5c6672");
        g.addColorStop(0.25, "#c8cfd6");
        g.addColorStop(0.5, "#8f99a4");
        g.addColorStop(0.8, "#68727e");
        g.addColorStop(1, "#454d57");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "rgba(20,24,30,0.55)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y, w - 2, h);
      };
      const flange = (y: number) => {
        const x = p.x - 7;
        const w = PIPE_W + 14;
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, "#4d555f");
        g.addColorStop(0.3, "#d6dce2");
        g.addColorStop(0.6, "#8a949f");
        g.addColorStop(1, "#3f464f");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, 22);
        ctx.strokeStyle = "rgba(20,24,30,0.6)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, 20);
        ctx.fillStyle = "rgba(30,36,44,0.7)";
        for (let i = 0; i < 4; i++) ctx.fillRect(x + 10 + i * (w - 24) / 3, y + 8, 4, 5);
      };

      body(p.x, 0, PIPE_W, top - 20);
      flange(top - 22);
      body(p.x, bottom + 22, PIPE_W, H - GROUND_H - bottom - 22);
      flange(bottom);
    };

    const drawGround = (offset: number) => {
      const y = H - GROUND_H;
      const g = ctx.createLinearGradient(0, y, 0, H);
      g.addColorStop(0, "#b9bec4");
      g.addColorStop(0.12, "#9ca2a9");
      g.addColorStop(1, "#6f757c");
      ctx.fillStyle = g;
      ctx.fillRect(0, y, W, GROUND_H);
      ctx.fillStyle = "rgba(40,46,54,0.5)";
      ctx.fillRect(0, y, W, 4);
      ctx.strokeStyle = "rgba(60,66,74,0.45)";
      ctx.lineWidth = 2;
      const step = 56;
      const shift = offset % step;
      for (let i = -1; i < W / step + 2; i++) {
        const x = i * step - shift;
        ctx.beginPath();
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, y + 40);
      ctx.lineTo(W, y + 40);
      ctx.stroke();
    };

    const drawPigeon = (y: number, rot: number, t: number, wing: number) => {
      ctx.save();
      ctx.translate(BIRD_X, y);
      ctx.rotate(rot);

      // cauda
      ctx.fillStyle = "#6f7783";
      ctx.beginPath();
      ctx.moveTo(-12, -2);
      ctx.lineTo(-30, -10);
      ctx.lineTo(-28, 6);
      ctx.closePath();
      ctx.fill();

      // corpo
      const g = ctx.createLinearGradient(0, -18, 0, 18);
      g.addColorStop(0, "#a8b2be");
      g.addColorStop(1, "#6d7783");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // cabeça
      ctx.fillStyle = "#8e99a6";
      ctx.beginPath();
      ctx.arc(13, -9, 10, 0, Math.PI * 2);
      ctx.fill();
      // brilho iridescente no pescoço
      ctx.fillStyle = "rgba(120, 200, 170, 0.45)";
      ctx.beginPath();
      ctx.ellipse(8, -2, 6, 4, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // olho
      ctx.fillStyle = "#f2f5f8";
      ctx.beginPath();
      ctx.arc(17, -11, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#15181d";
      ctx.beginPath();
      ctx.arc(18, -11, 1.7, 0, Math.PI * 2);
      ctx.fill();

      // bico
      ctx.fillStyle = "#e2a06a";
      ctx.beginPath();
      ctx.moveTo(22, -8);
      ctx.lineTo(33, -5);
      ctx.lineTo(22, -2);
      ctx.closePath();
      ctx.fill();

      // patas
      ctx.strokeStyle = "#d9705f";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-2, 13);
      ctx.lineTo(-2, 20);
      ctx.lineTo(4, 21);
      ctx.stroke();

      // asa animada
      const beat = Math.sin(t * 9) * 0.5 + wing * 0.9;
      ctx.save();
      ctx.translate(-2, -2);
      ctx.rotate(-0.35 + beat * 0.6);
      const wg = ctx.createLinearGradient(0, -6, 0, 12);
      wg.addColorStop(0, "#c3ccd6");
      wg.addColorStop(1, "#7d8794");
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-14, 4, -22, 16);
      ctx.quadraticCurveTo(-4, 14, 8, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(40,46,56,0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    };

    const drawScore = (value: number) => {
      ctx.save();
      ctx.font = "700 54px 'Chakra Petch', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(16,20,28,0.65)";
      ctx.fillStyle = "#f7f9fb";
      ctx.strokeText(String(value), W / 2, 84);
      ctx.fillText(String(value), W / 2, 84);
      ctx.restore();
    };

    const render = () => {
      const s = state.current;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();

      drawSky();
      drawCity(s.scroll, 0);
      drawCity(s.scroll, 1);
      for (const p of s.pipes) drawPipe(p);
      drawGround(s.scroll);
      drawPigeon(s.y, s.rot, s.t, s.wing);
      if (s.phase !== "ready") drawScore(s.score);
      ctx.restore();
    };

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (!state.current.paused) update(dt);
      render();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative size-full select-none overflow-hidden"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        if (state.current.phase !== "over") flap();
      }}
    >
      <canvas ref={canvasRef} className="block size-full" aria-label="Flappy Pombo" />

      {phase === "ready" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/40 p-6 text-center backdrop-blur-[2px]">
          <div>
            <h2 className="font-display text-3xl font-extrabold uppercase text-foreground drop-shadow sm:text-4xl">
              Flappy Pombo
            </h2>
            <p className="mt-2 text-sm font-semibold text-foreground/90 sm:text-base">
              Toque, clique ou pressione Espaço
            </p>
            <p className="mt-1 text-xs text-foreground/70">
              Desvie dos canos de metal. Recorde: {best}
            </p>
          </div>
        </div>
      )}

      {phase === "over" && (
        <div className="absolute inset-0 grid place-items-center bg-background/70 p-6 text-center backdrop-blur-sm">
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase text-foreground sm:text-3xl">
              Game Over
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">Pontuação</p>
            <p className="font-display text-5xl font-extrabold text-primary">{score}</p>
            <p className="mt-2 text-sm text-muted-foreground">Recorde: {best}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-violet px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              Jogar novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
