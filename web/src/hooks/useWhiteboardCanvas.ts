"use client";

import { useEffect, useRef, useState } from "react";
import rough from "roughjs";
import { Shape, ShapeData, ShapeType } from "@/schemas/index";
import type { DrawingOptions } from "@/components/ControlPanel";
import { drawShapesFromArray, Viewport } from "@/lib/shape-renderer";
import { useRoomStore } from "@/store/room.store";

interface UseWhiteboardCanvasOptions {
  shapes: Shape[];
  currentShape: ShapeType | "HAND";
  drawingOptions: DrawingOptions;
  userId?: string;
  roomId?: string;
}

/**
 * Owns the two-layer canvas: viewport (pan/zoom), committed-shape rendering,
 * live-drawing preview, and mouse/touch/wheel interaction. All coordinates
 * inside are world space; screen<->world conversion is exposed for overlays.
 */
export function useWhiteboardCanvas({
  shapes,
  currentShape,
  drawingOptions,
  userId,
  roomId,
}: UseWhiteboardCanvasOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null);

  const viewportRef = useRef<Viewport>({ offsetX: 0, offsetY: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [zoomLevel, setZoomLevel] = useState(100);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<[number, number][]>([]);
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);

  const screenToWorld = (screenX: number, screenY: number): [number, number] => {
    const v = viewportRef.current;
    return [
      (screenX - v.offsetX) / v.scale,
      (screenY - v.offsetY) / v.scale,
    ];
  };

  const worldToScreen = (wx: number, wy: number): [number, number] => {
    const v = viewportRef.current;
    return [wx * v.scale + v.offsetX, wy * v.scale + v.offsetY];
  };

  const redrawCanvas = () => {
    drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);
  };

  // Persist a committed shape through the store (WS primary, REST fallback).
  const commitShape = (data: ShapeData) => {
    if (!userId || !roomId) return;
    const { saveAndBroadcastShape } = useRoomStore.getState();
    void saveAndBroadcastShape(
      { type: data.type, dataFromRoughJs: data, roomId, creatorId: userId },
      userId,
    );
  };

  // Keep canvases sized to the container and redraw on shape changes.
  useEffect(() => {
    const container = containerRef.current;
    const staticCanvas = staticCanvasRef.current;
    const dynamicCanvas = dynamicCanvasRef.current;

    if (!container || !staticCanvas || !dynamicCanvas) return;

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      container.style.height = `${window.innerHeight}px`;
      container.style.width = `${window.innerWidth}px`;
      staticCanvas.width = container.offsetWidth;
      staticCanvas.height = container.offsetHeight;
      dynamicCanvas.width = container.offsetWidth;
      dynamicCanvas.height = container.offsetHeight;

      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);
      }, 150);
    };

    handleResize();
    drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [shapes]);

  // Interaction: draw, pan, zoom (all coords in world space).
  useEffect(() => {
    const staticCanvas = staticCanvasRef.current;
    const dynamicCanvas = dynamicCanvasRef.current;
    if (!staticCanvas || !dynamicCanvas) return;

    const staticCtx = staticCanvas.getContext("2d");
    const dynamicCtx = dynamicCanvas.getContext("2d");
    if (!staticCtx || !dynamicCtx) return;

    const rc = rough.canvas(dynamicCanvas);

    const applyViewport = (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
    ) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(viewportRef.current.offsetX, viewportRef.current.offsetY);
      ctx.scale(viewportRef.current.scale, viewportRef.current.scale);
    };

    const clearDynamic = () => {
      dynamicCtx.clearRect(0, 0, dynamicCanvas.width, dynamicCanvas.height);
    };

    const startDrawing = (wx: number, wy: number) => {
      if (currentShape === "HAND") return;
      if (currentShape === "FREEDRAW") {
        setIsDrawing(true);
        setCurrentPath([[wx, wy]]);
      } else {
        setStartPoint([wx, wy]);
      }
    };

    const drawing = (wx: number, wy: number) => {
      if (currentShape === "HAND") return;
      if (currentShape === "FREEDRAW" && isDrawing) {
        const lastPoint = currentPath[currentPath.length - 1];
        const minDistance = 3 / viewportRef.current.scale;

        if (
          !lastPoint ||
          Math.sqrt(
            Math.pow(wx - lastPoint[0], 2) + Math.pow(wy - lastPoint[1], 2),
          ) > minDistance
        ) {
          const newPath = [...currentPath, [wx, wy] as [number, number]];
          setCurrentPath(newPath);

          clearDynamic();
          if (newPath.length > 1) {
            applyViewport(dynamicCtx, dynamicCanvas);
            rc.linearPath(newPath, {
              ...drawingOptions,
              strokeWidth: 3,
              roughness: 0,
              disableMultiStroke: true,
              seed: 1,
            });
            dynamicCtx.restore();
          }
        }
      } else if (startPoint) {
        clearDynamic();
        applyViewport(dynamicCtx, dynamicCanvas);

        const centerX = (startPoint[0] + wx) / 2;
        const centerY = (startPoint[1] + wy) / 2;
        const width = Math.abs(wx - startPoint[0]);
        const height = Math.abs(wy - startPoint[1]);

        switch (currentShape) {
          case "ELLIPSE":
            rc.ellipse(centerX, centerY, width, height, {
              ...drawingOptions,
              seed: 1,
            });
            break;
          case "RECTANGLE":
            rc.rectangle(
              startPoint[0],
              startPoint[1],
              wx - startPoint[0],
              wy - startPoint[1],
              { ...drawingOptions, seed: 1 },
            );
            break;
          case "LINE":
            rc.line(startPoint[0], startPoint[1], wx, wy, {
              ...drawingOptions,
              seed: 1,
            });
            break;
          case "DIAMOND": {
            const points: [number, number][] = [
              [centerX, startPoint[1]],
              [wx, centerY],
              [centerX, wy],
              [startPoint[0], centerY],
            ];
            rc.polygon(points, { ...drawingOptions, seed: 1 });
            break;
          }
          case "ARROW": {
            rc.line(startPoint[0], startPoint[1], wx, wy, {
              ...drawingOptions,
              seed: 1,
            });
            const angle = Math.atan2(
              wy - startPoint[1],
              wx - startPoint[0],
            );
            const arrowLength = 15;
            const arrowAngle = Math.PI / 6;
            const arrowX1 = wx - arrowLength * Math.cos(angle - arrowAngle);
            const arrowY1 = wy - arrowLength * Math.sin(angle - arrowAngle);
            const arrowX2 = wx - arrowLength * Math.cos(angle + arrowAngle);
            const arrowY2 = wy - arrowLength * Math.sin(angle + arrowAngle);
            rc.line(wx, wy, arrowX1, arrowY1, { ...drawingOptions, seed: 1 });
            rc.line(wx, wy, arrowX2, arrowY2, { ...drawingOptions, seed: 1 });
            break;
          }
        }
        dynamicCtx.restore();
      }
    };

    const endDrawing = (wx: number, wy: number) => {
      if (currentShape === "HAND") return;
      if (currentShape === "FREEDRAW" && isDrawing) {
        if (currentPath.length > 1) {
          commitShape({
            type: "FREEDRAW",
            path: currentPath,
            options: {
              ...drawingOptions,
              strokeWidth: 3,
              roughness: 0,
              disableMultiStroke: true,
              seed: 1,
            },
          });
        }
        setIsDrawing(false);
        setCurrentPath([]);
        clearDynamic();
      } else if (startPoint) {
        const centerX = (startPoint[0] + wx) / 2;
        const centerY = (startPoint[1] + wy) / 2;

        let data: ShapeData | null = null;
        switch (currentShape) {
          case "ELLIPSE":
            data = {
              type: "ELLIPSE",
              cx: centerX,
              cy: centerY,
              rx: Math.abs(wx - startPoint[0]),
              ry: Math.abs(wy - startPoint[1]),
              options: { ...drawingOptions, seed: 1 },
            };
            break;
          case "RECTANGLE":
            data = {
              type: "RECTANGLE",
              x: startPoint[0],
              y: startPoint[1],
              width: wx - startPoint[0],
              height: wy - startPoint[1],
              options: { ...drawingOptions, seed: 1 },
            };
            break;
          case "LINE":
            data = {
              type: "LINE",
              x1: startPoint[0],
              y1: startPoint[1],
              x2: wx,
              y2: wy,
              options: { ...drawingOptions, seed: 1 },
            };
            break;
          case "DIAMOND": {
            const points: [number, number][] = [
              [centerX, startPoint[1]],
              [wx, centerY],
              [centerX, wy],
              [startPoint[0], centerY],
            ];
            data = {
              type: "DIAMOND",
              points,
              options: { ...drawingOptions, seed: 1 },
            };
            break;
          }
          case "ARROW": {
            const angle = Math.atan2(
              wy - startPoint[1],
              wx - startPoint[0],
            );
            const arrowLength = 15;
            const arrowAngle = Math.PI / 6;
            const arrowX1 = wx - arrowLength * Math.cos(angle - arrowAngle);
            const arrowY1 = wy - arrowLength * Math.sin(angle - arrowAngle);
            const arrowX2 = wx - arrowLength * Math.cos(angle + arrowAngle);
            const arrowY2 = wy - arrowLength * Math.sin(angle + arrowAngle);
            data = {
              type: "ARROW",
              x1: startPoint[0],
              y1: startPoint[1],
              x2: wx,
              y2: wy,
              arrowHead1: [arrowX1, arrowY1],
              arrowHead2: [arrowX2, arrowY2],
              options: { ...drawingOptions, seed: 1 },
            };
            break;
          }
        }

        if (data) commitShape(data);
        setStartPoint(null);
        clearDynamic();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // HAND tool: start panning
      if (currentShape === "HAND") {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      // Middle mouse button: also pan
      if (e.button === 1) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
        return;
      }
      const [wx, wy] = screenToWorld(e.offsetX, e.offsetY);
      startDrawing(wx, wy);
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Panning
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        viewportRef.current.offsetX += dx;
        viewportRef.current.offsetY += dy;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);
        return;
      }
      const [wx, wy] = screenToWorld(e.offsetX, e.offsetY);
      drawing(wx, wy);
      useRoomStore.getState().sendCursorPosition(wx, wy);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        return;
      }
      const [wx, wy] = screenToWorld(e.offsetX, e.offsetY);
      endDrawing(wx, wy);
    };

    // Wheel: Ctrl/Cmd+scroll zooms toward cursor, plain scroll pans.
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewportRef.current;

      if (e.ctrlKey || e.metaKey) {
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.min(Math.max(v.scale * zoomFactor, 0.1), 10);
        const rect = dynamicCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        v.offsetX = mouseX - (mouseX - v.offsetX) * (newScale / v.scale);
        v.offsetY = mouseY - (mouseY - v.offsetY) * (newScale / v.scale);
        v.scale = newScale;
        setZoomLevel(Math.round(newScale * 100));
      } else {
        v.offsetX -= e.deltaX;
        v.offsetY -= e.deltaY;
      }

      drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = dynamicCanvas.getBoundingClientRect();
      const sx = (touch?.clientX || 0) - rect.left;
      const sy = (touch?.clientY || 0) - rect.top;
      if (currentShape === "HAND") {
        isPanningRef.current = true;
        panStartRef.current = {
          x: touch?.clientX || 0,
          y: touch?.clientY || 0,
        };
        return;
      }
      const [wx, wy] = screenToWorld(sx, sy);
      startDrawing(wx, wy);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = dynamicCanvas.getBoundingClientRect();
      if (isPanningRef.current) {
        const dx = (touch?.clientX || 0) - panStartRef.current.x;
        const dy = (touch?.clientY || 0) - panStartRef.current.y;
        viewportRef.current.offsetX += dx;
        viewportRef.current.offsetY += dy;
        panStartRef.current = { x: touch?.clientX || 0, y: touch?.clientY || 0 };
        drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);
        return;
      }
      const sx = (touch?.clientX || 0) - rect.left;
      const sy = (touch?.clientY || 0) - rect.top;
      const [wx, wy] = screenToWorld(sx, sy);
      drawing(wx, wy);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (isPanningRef.current) {
        isPanningRef.current = false;
        return;
      }
      const touch = e.changedTouches[0];
      const rect = dynamicCanvas.getBoundingClientRect();
      const sx = (touch?.clientX || 0) - rect.left;
      const sy = (touch?.clientY || 0) - rect.top;
      const [wx, wy] = screenToWorld(sx, sy);
      endDrawing(wx, wy);
    };

    dynamicCanvas.addEventListener("mousedown", handleMouseDown);
    dynamicCanvas.addEventListener("mousemove", handleMouseMove);
    dynamicCanvas.addEventListener("mouseup", handleMouseUp);
    dynamicCanvas.addEventListener("wheel", handleWheel, { passive: false });
    dynamicCanvas.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    dynamicCanvas.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    dynamicCanvas.addEventListener("touchend", handleTouchEnd, {
      passive: false,
    });

    return () => {
      dynamicCanvas.removeEventListener("mousedown", handleMouseDown);
      dynamicCanvas.removeEventListener("mousemove", handleMouseMove);
      dynamicCanvas.removeEventListener("mouseup", handleMouseUp);
      dynamicCanvas.removeEventListener("wheel", handleWheel);
      dynamicCanvas.removeEventListener("touchstart", handleTouchStart);
      dynamicCanvas.removeEventListener("touchmove", handleTouchMove);
      dynamicCanvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    shapes,
    currentShape,
    isDrawing,
    currentPath,
    startPoint,
    drawingOptions,
    userId,
    roomId,
  ]);

  const zoomBy = (factor: number) => {
    const v = viewportRef.current;
    const newScale = Math.min(Math.max(v.scale * factor, 0.1), 10);
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    v.offsetX = cx - (cx - v.offsetX) * (newScale / v.scale);
    v.offsetY = cy - (cy - v.offsetY) * (newScale / v.scale);
    v.scale = newScale;
    setZoomLevel(Math.round(newScale * 100));
    drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);
  };

  const zoomIn = () => zoomBy(1.2);
  const zoomOut = () => zoomBy(0.8);

  const resetZoom = () => {
    viewportRef.current = { offsetX: 0, offsetY: 0, scale: 1 };
    setZoomLevel(100);
    drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);
  };

  return {
    containerRef,
    staticCanvasRef,
    dynamicCanvasRef,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    screenToWorld,
    worldToScreen,
  };
}
