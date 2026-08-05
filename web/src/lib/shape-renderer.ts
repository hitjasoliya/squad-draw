import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Shape, ShapeData } from "@/schemas/index";

/** World-space viewport transform (pan offsets in screen px, scale factor). */
export interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

const DEFAULT_TEXT_FONT = "16px sans-serif";

function drawShape(ctx: CanvasRenderingContext2D, rc: RoughCanvas, d: ShapeData) {
  switch (d.type) {
    case "RECTANGLE":
      rc.rectangle(d.x, d.y, d.width, d.height, d.options);
      break;
    case "ELLIPSE":
      rc.ellipse(d.cx, d.cy, d.rx, d.ry, d.options);
      break;
    case "LINE":
      rc.line(d.x1, d.y1, d.x2, d.y2, d.options);
      break;
    case "DIAMOND":
      rc.polygon(d.points, d.options);
      break;
    case "ARROW":
      rc.line(d.x1, d.y1, d.x2, d.y2, d.options);
      rc.line(d.x2, d.y2, d.arrowHead1[0], d.arrowHead1[1], d.options);
      rc.line(d.x2, d.y2, d.arrowHead2[0], d.arrowHead2[1], d.options);
      break;
    case "FREEDRAW":
      rc.linearPath(d.path, d.options);
      break;
    // Legacy TEXT rows (tool disabled): keep rendering them as before.
    case "TEXT":
      ctx.font = DEFAULT_TEXT_FONT;
      ctx.fillStyle = d.options.stroke;
      ctx.fillText(d.text, d.x, d.y);
      break;
  }
}

/** Redraw all committed shapes onto the static canvas with the viewport transform. */
export function drawShapesFromArray(
  shapes: Shape[],
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  viewport: Viewport,
) {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rc = rough.canvas(canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(viewport.offsetX, viewport.offsetY);
  ctx.scale(viewport.scale, viewport.scale);

  for (const shape of shapes) {
    drawShape(ctx, rc, shape.dataFromRoughJs);
  }

  ctx.restore();
}
