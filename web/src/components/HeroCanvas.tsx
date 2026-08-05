"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Eraser, Pen, Square, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "pen" | "rect" | "ellipse";

type Shape = {
  tool: Tool;
  stroke: string;
  width: number;
  points?: [number, number][];
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
};

const TOOLS: { id: Tool; icon: typeof Pen; label: string }[] = [
  { id: "pen", icon: Pen, label: "Freehand pen" },
  { id: "rect", icon: Square, label: "Rectangle" },
  { id: "ellipse", icon: Circle, label: "Ellipse" },
];

function toPos(canvas: HTMLCanvasElement, e: React.PointerEvent) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top] as [number, number];
}

function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  ctx.strokeStyle = s.stroke;
  ctx.lineWidth = s.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.tool === "pen" && s.points) {
    ctx.beginPath();
    s.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
    return;
  }
  const x0 = s.x0 ?? 0;
  const y0 = s.y0 ?? 0;
  const x1 = s.x1 ?? 0;
  const y1 = s.y1 ?? 0;
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  ctx.beginPath();
  if (s.tool === "rect") ctx.rect(x, y, w, h);
  else ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export function HeroCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapesRef = useRef<Shape[]>([]);
  const currentRef = useRef<Shape | null>(null);
  const drawingRef = useRef(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [strokeCount, setStrokeCount] = useState(0);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Dot grid, drawn behind every frame
    ctx.fillStyle = "rgb(113 113 122 / 0.22)";
    for (let x = 24; x < w; x += 24) {
      for (let y = 24; y < h; y += 24) {
        ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
      }
    }

    const stroke = getComputedStyle(canvas).color;
    shapesRef.current.forEach((s) => drawShape(ctx, s));
    if (currentRef.current) drawShape(ctx, currentRef.current);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = Math.round(wrap.clientWidth * dpr);
      canvas.height = Math.round(wrap.clientHeight * dpr);
      render();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [render]);

  const stroke = () => getComputedStyle(canvasRef.current!).color;

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const [x, y] = toPos(canvas, e);
    currentRef.current =
      tool === "pen"
        ? { tool, stroke: stroke(), width: 2.5, points: [[x, y]] }
        : { tool, stroke: stroke(), width: 2.5, x0: x, y0: y, x1: x, y1: y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cur = currentRef.current;
    if (!drawingRef.current || !cur) return;
    const canvas = canvasRef.current!;
    const [x, y] = toPos(canvas, e);
    if (cur.tool === "pen") cur.points!.push([x, y]);
    else {
      cur.x1 = x;
      cur.y1 = y;
    }
    render();
  };

  const onPointerUp = () => {
    const cur = currentRef.current;
    if (!drawingRef.current || !cur) return;
    drawingRef.current = false;
    const keep =
      cur.tool === "pen"
        ? (cur.points?.length ?? 0) > 1
        : Math.abs((cur.x1 ?? 0) - (cur.x0 ?? 0)) > 2 ||
          Math.abs((cur.y1 ?? 0) - (cur.y0 ?? 0)) > 2;
    if (keep) {
      shapesRef.current.push(cur);
      setStrokeCount((c) => c + 1);
    }
    currentRef.current = null;
    render();
  };

  const undo = () => {
    shapesRef.current.pop();
    setStrokeCount((c) => Math.max(0, c - 1));
    render();
  };

  const clear = () => {
    shapesRef.current = [];
    currentRef.current = null;
    setStrokeCount(0);
    render();
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-[380px] sm:h-[440px] lg:h-[520px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* Floating tool bar, mirrors the room toolbar */}
      <div className="absolute left-1/2 top-4 -translate-x-1/2 flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900/70 p-1 shadow-lg backdrop-blur-xl">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            aria-label={t.label}
            aria-pressed={tool === t.id}
            onClick={() => setTool(t.id)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]",
              tool === t.id
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            <t.icon className="h-4 w-4" />
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-white/15" />
        <button
          type="button"
          title="Undo last stroke"
          aria-label="Undo last stroke"
          onClick={undo}
          disabled={strokeCount === 0}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-[background-color,color,transform] duration-150 ease-out hover:text-zinc-100 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Clear canvas"
          aria-label="Clear canvas"
          onClick={clear}
          disabled={strokeCount === 0}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-[background-color,color,transform] duration-150 ease-out hover:text-red-400 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
        >
          <Eraser className="h-4 w-4" />
        </button>
      </div>

      {/* Live indicator: real interactive state, not decoration */}
      <div className="absolute bottom-3 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-2.5 py-1 backdrop-blur-xl">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-xs font-medium text-zinc-300">
          Live canvas, draw here
          {strokeCount > 0 && ` - ${strokeCount} stroke${strokeCount === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
}
