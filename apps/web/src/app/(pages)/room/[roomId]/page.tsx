"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import rough from "roughjs";
import { RoughCanvas } from "roughjs/bin/canvas";
import { ShapeType } from "@/schemas/index";
import { useRoomStore } from "@/store/room.store";
import { useDashboardStore } from "@/store/dashboard.store";
import ShapeSelector from "@/components/ShapeSelector";
import TypeControlPanel, { DrawingOptions } from "@/components/ControlPanel";
import { GroupChatbot } from "@/components/GroupChatbot";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Modal } from "@/components/ui/modal";
import { MessageCircle, Palette, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Toggle } from "@/components/Toggle";

// Viewport transform type
interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

// This function draws all committed shapes with viewport transform applied.
function drawShapesFromArray(
  shapes: any[],
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  viewport: Viewport,
) {
  if (!canvasRef.current) return;
  const ctx = canvasRef.current.getContext("2d");
  if (!ctx) return;
  const rc = rough.canvas(canvasRef.current);
  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

  ctx.save();
  ctx.translate(viewport.offsetX, viewport.offsetY);
  ctx.scale(viewport.scale, viewport.scale);

  shapes.forEach((shape) => {
    const d = shape.dataFromRoughJs;
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
      case "TEXT":
        ctx.font = "16px sans-serif";
        ctx.fillStyle = d.options.stroke;
        ctx.fillText(d.text, d.x, d.y);
        break;
    }
  });

  ctx.restore();
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      toast.info("For a better experience, we recommend using a desktop.", {
        position: "bottom-center",
        duration: 10000,
      });
    }
  }, []);
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null);

  const roughCanvasRef = useRef<RoughCanvas | null>(null);
  const previousConnectionStatus = useRef<boolean | null>(null);

  // Infinite canvas viewport state
  const viewportRef = useRef<Viewport>({ offsetX: 0, offsetY: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(100);

  // Convert screen coordinates to world coordinates
  const screenToWorld = (screenX: number, screenY: number): [number, number] => {
    const v = viewportRef.current;
    return [
      (screenX - v.offsetX) / v.scale,
      (screenY - v.offsetY) / v.scale,
    ];
  };

  const redrawCanvas = () => {
    drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);
  };
  const [currentShape, setCurrentShape] = useState<ShapeType | 'HAND'>("HAND");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<[number, number][]>([]);
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [drawingOptions, setDrawingOptions] = useState<DrawingOptions>({
    stroke: "#000000",
    strokeWidth: 2,
    fill: "rgba(255, 255, 255, 0.1)",
    fillStyle: "solid",
    roughness: 2,
    strokeLineDash: [],
    fillOpacity: 0.25,
  });
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme === "dark") {
      setDrawingOptions((opts) => ({ ...opts, stroke: "#ffffff" }));
    } else if (resolvedTheme === "light") {
      setDrawingOptions((opts) => ({ ...opts, stroke: "#000000" }));
    }
  }, [resolvedTheme]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "clearShapes" | null;
    title: string;
    message: string;
    confirmText: string;
    variant: "default" | "danger";
  }>({
    isOpen: false,
    type: null,
    title: "",
    message: "",
    confirmText: "",
    variant: "default",
  });

  const {
    shapes,
    isConnected,
    onlineMembers,
    clearShapes,
    initializeSocket,
    disconnectSocket,
    saveAndBroadcastShape,
    joinRoomInSocket,
    sendCursorPosition,
    cursors,
  } = useRoomStore();

  const { getOverviewRoom, canManageRoom } = useDashboardStore();

  const handleClearShapes = () => {
    setModalState({
      isOpen: true,
      type: "clearShapes",
      title: "Clear All Shapes",
      message:
        "Are you sure you want to clear all shapes? This action cannot be undone and all shapes will be permanently removed from the canvas.",
      confirmText: "Clear All",
      variant: "danger",
    });
  };

  const handleSaveCanvas = () => {
    if (staticCanvasRef.current) {
      const canvas = staticCanvasRef.current;
      const dataURL = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `squad-draw-${roomId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Canvas saved as PNG!");
    } else {
      toast.error("Could not save canvas.");
    }
  };

  const handleConfirm = async () => {
    if (modalState.type === "clearShapes") {
      try {
        await clearShapes();
        toast.success("All shapes cleared successfully!");
      } catch (error) {
        toast.error("Failed to clear shapes");
        console.error("Error clearing shapes:", error);
      }
    }
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (!sessionLoading) {
      setLoading(false);
    }
  }, [sessionLoading]);

  useEffect(() => {
    if (session && session.user && !loading && roomId) {
      joinRoomInSocket(roomId);
      // toast.success("CONNECTING TO SERVER AND LOADING SHAPES")
      initializeSocket();

      return () => {
        disconnectSocket();
      };
    }
  }, [session, roomId, loading, joinRoomInSocket, initializeSocket, disconnectSocket]);

  // Handle canvas and container resizing
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


  useEffect(() => {
    const staticCanvas = staticCanvasRef.current;
    const dynamicCanvas = dynamicCanvasRef.current;
    if (!staticCanvas || !dynamicCanvas) return;

    const staticCtx = staticCanvas.getContext("2d");
    const dynamicCtx = dynamicCanvas.getContext("2d");
    if (!staticCtx || !dynamicCtx) return;

    const rc = rough.canvas(dynamicCanvas);

    // Apply viewport transform to dynamic canvas context
    const applyViewport = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(viewportRef.current.offsetX, viewportRef.current.offsetY);
      ctx.scale(viewportRef.current.scale, viewportRef.current.scale);
    };

    // Clear dynamic canvas with viewport
    const clearDynamic = () => {
      dynamicCtx.clearRect(0, 0, dynamicCanvas.width, dynamicCanvas.height);
    };

    // #### Shared drawing logic (all coords in world space) ####
    const startDrawing = (wx: number, wy: number) => {
      if (currentShape === 'HAND') return;
      if (currentShape === "FREEDRAW") {
        setIsDrawing(true);
        setCurrentPath([[wx, wy]]);
      } else {
        setStartPoint([wx, wy]);
      }
    };

    const drawing = (wx: number, wy: number) => {
      if (currentShape === 'HAND') return;
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
          case "ELLIPSE": rc.ellipse(centerX, centerY, width, height, { ...drawingOptions, seed: 1 }); break;
          case "RECTANGLE": rc.rectangle(startPoint[0], startPoint[1], wx - startPoint[0], wy - startPoint[1], { ...drawingOptions, seed: 1 }); break;
          case "LINE": rc.line(startPoint[0], startPoint[1], wx, wy, { ...drawingOptions, seed: 1 }); break;
          case "DIAMOND": {
            const points: [number, number][] = [[centerX, startPoint[1]], [wx, centerY], [centerX, wy], [startPoint[0], centerY]];
            rc.polygon(points, { ...drawingOptions, seed: 1 });
            break;
          }
          case "ARROW": {
            rc.line(startPoint[0], startPoint[1], wx, wy, { ...drawingOptions, seed: 1 });
            const angle = Math.atan2(wy - startPoint[1], wx - startPoint[0]);
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
      if (currentShape === 'HAND') return;
      if (currentShape === "FREEDRAW" && isDrawing) {
        if (currentPath.length > 1 && session?.user?.id) {
          const newShape = {
            type: "FREEDRAW" as ShapeType,
            dataFromRoughJs: {
              type: "FREEDRAW",
              path: currentPath,
              options: { ...drawingOptions, strokeWidth: 3, roughness: 0, disableMultiStroke: true, seed: 1 },
            },
            roomId: roomId,
            creatorId: session.user.id,
          };
          saveAndBroadcastShape(newShape, session.user.id);
        }
        setIsDrawing(false);
        setCurrentPath([]);
        clearDynamic();
      } else if (startPoint) {
        const centerX = (startPoint[0] + wx) / 2;
        const centerY = (startPoint[1] + wy) / 2;
        if (session?.user?.id) {
          let newShape: any;
          switch (currentShape) {
            case "ELLIPSE": newShape = { type: "ELLIPSE" as ShapeType, dataFromRoughJs: { type: "ELLIPSE", cx: centerX, cy: centerY, rx: Math.abs(wx - startPoint[0]), ry: Math.abs(wy - startPoint[1]), options: { ...drawingOptions, seed: 1 } }, roomId, creatorId: session.user.id }; break;
            case "RECTANGLE": newShape = { type: "RECTANGLE" as ShapeType, dataFromRoughJs: { type: "RECTANGLE", x: startPoint[0], y: startPoint[1], width: wx - startPoint[0], height: wy - startPoint[1], options: { ...drawingOptions, seed: 1 } }, roomId, creatorId: session.user.id }; break;
            case "LINE": newShape = { type: "LINE" as ShapeType, dataFromRoughJs: { type: "LINE", x1: startPoint[0], y1: startPoint[1], x2: wx, y2: wy, options: { ...drawingOptions, seed: 1 } }, roomId, creatorId: session.user.id }; break;
            case "DIAMOND": {
              const points = [[centerX, startPoint[1]], [wx, centerY], [centerX, wy], [startPoint[0], centerY]];
              newShape = { type: "DIAMOND" as ShapeType, dataFromRoughJs: { type: "DIAMOND", points, options: { ...drawingOptions, seed: 1 } }, roomId, creatorId: session.user.id };
              break;
            }
            case "ARROW": {
              const angle = Math.atan2(wy - startPoint[1], wx - startPoint[0]);
              const arrowLength = 15;
              const arrowAngle = Math.PI / 6;
              const arrowX1 = wx - arrowLength * Math.cos(angle - arrowAngle);
              const arrowY1 = wy - arrowLength * Math.sin(angle - arrowAngle);
              const arrowX2 = wx - arrowLength * Math.cos(angle + arrowAngle);
              const arrowY2 = wy - arrowLength * Math.sin(angle + arrowAngle);
              newShape = { type: "ARROW" as ShapeType, dataFromRoughJs: { type: "ARROW", x1: startPoint[0], y1: startPoint[1], x2: wx, y2: wy, arrowHead1: [arrowX1, arrowY1], arrowHead2: [arrowX2, arrowY2], options: { ...drawingOptions, seed: 1 } }, roomId, creatorId: session.user.id };
              break;
            }
          }
          if (newShape) {
            saveAndBroadcastShape(newShape, session.user.id);
          }
        }
        setStartPoint(null);
        clearDynamic();
      }
    };

    // Mouse Event Handlers — convert screen coords to world coords
    const handleMouseDown = (e: MouseEvent) => {
      // HAND tool: start panning
      if (currentShape === 'HAND') {
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
      sendCursorPosition(wx, wy);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        return;
      }
      const [wx, wy] = screenToWorld(e.offsetX, e.offsetY);
      endDrawing(wx, wy);
    };

    // Wheel handler: Ctrl+scroll = zoom, plain scroll = pan
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewportRef.current;

      if (e.ctrlKey || e.metaKey) {
        // Zoom towards cursor
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.min(Math.max(v.scale * zoomFactor, 0.1), 10);
        const rect = dynamicCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Adjust offset so zoom centers on cursor
        v.offsetX = mouseX - (mouseX - v.offsetX) * (newScale / v.scale);
        v.offsetY = mouseY - (mouseY - v.offsetY) * (newScale / v.scale);
        v.scale = newScale;
        setZoomLevel(Math.round(newScale * 100));
      } else {
        // Plain scroll = pan
        v.offsetX -= e.deltaX;
        v.offsetY -= e.deltaY;
      }

      drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);
    };

    // #### MOBILE/TOUCH SUPPORT: Touch Event Handlers ####
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = dynamicCanvas.getBoundingClientRect();
      const sx = (touch?.clientX || 0) - rect.left;
      const sy = (touch?.clientY || 0) - rect.top;
      if (currentShape === 'HAND') {
        isPanningRef.current = true;
        panStartRef.current = { x: touch?.clientX || 0, y: touch?.clientY || 0 };
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

    // Add all event listeners
    dynamicCanvas.addEventListener("mousedown", handleMouseDown);
    dynamicCanvas.addEventListener("mousemove", handleMouseMove);
    dynamicCanvas.addEventListener("mouseup", handleMouseUp);
    dynamicCanvas.addEventListener("wheel", handleWheel, { passive: false });
    dynamicCanvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    dynamicCanvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    dynamicCanvas.addEventListener("touchend", handleTouchEnd, { passive: false });

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
    shapes, roomId, currentShape, isDrawing, currentPath, startPoint, session?.user?.id,
    drawingOptions, saveAndBroadcastShape, sendCursorPosition
  ]);


  const [previousShapesLength, setPreviousShapesLength] = useState<
    number | null
  >(null);

  useEffect(() => {
    drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);

    if (
      previousShapesLength !== null &&
      previousShapesLength > 0 &&
      shapes.length === 0
    ) {
      toast.info("All shapes have been cleared");
    }

    setPreviousShapesLength(shapes.length);
  }, [shapes, previousShapesLength]);


  // Monitor connection status and show toast notifications
  useEffect(() => {
    if (previousConnectionStatus.current !== null) {
      if (!isConnected && previousConnectionStatus.current) {
        toast.error(
          "Connection lost! Shapes will not be shared until reconnected.",
        );
      } else if (isConnected && !previousConnectionStatus.current) {
        toast.success("Connected to server! You can now share shapes.");
      }
    }

    previousConnectionStatus.current = isConnected;
  }, [isConnected]);

  const canManageCurrentRoom = useMemo(() => {
    const room = getOverviewRoom();
    if (!room || !session?.user) {
      return false;
    }
    return canManageRoom(room, session.user);
  }, [getOverviewRoom, canManageRoom, session?.user]);

  if (loading || sessionLoading || !isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-foreground">
          <h2 className="text-3xl font-sans mb-4">Loading Room...</h2>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-foreground">
          <h2 className="text-3xl font-sans mb-4">
            Please sign in to access the room
          </h2>
          <button
            onClick={() => router.push("/signin")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <div className="absolute top-4 right-4 z-10 flex flex-row items-center gap-2">
        <ThemeToggle />
        <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 border-none"
            onClick={() => router.push('/dashboard')}
        >
            <Home className="h-5 w-5" />
        </Button>
        <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            ></div>
            <span className="text-sm font-medium">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="text-sm text-muted-foreground mb-2">
            Online: {onlineMembers.length} members
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            Role: {canManageCurrentRoom ? "Admin/Owner" : "Member"}
          </div>
        </div>
      </div>
      <ShapeSelector
        currentShape={currentShape}
        onShapeChange={setCurrentShape}
        onClearShapes={handleClearShapes}
        onSaveCanvas={handleSaveCanvas}
        isHandMode={currentShape === 'HAND'}
        onHandModeToggle={() => setCurrentShape('HAND')}
      />
      <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2">
        <Button
          onClick={() => setIsControlPanelOpen(!isControlPanelOpen)}
          size="icon"
          className="rounded-lg h-9 w-9 sm:h-10 sm:w-10 shadow-lg"
          variant="outline"
        >
          <Palette className="h-5 w-5" />
        </Button>
        <div className="bg-background/80 backdrop-blur-sm rounded-lg border flex items-center shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none rounded-l-lg"
            onClick={() => {
              const v = viewportRef.current;
              const newScale = Math.min(v.scale * 1.2, 10);
              const cx = window.innerWidth / 2;
              const cy = window.innerHeight / 2;
              v.offsetX = cx - (cx - v.offsetX) * (newScale / v.scale);
              v.offsetY = cy - (cy - v.offsetY) * (newScale / v.scale);
              v.scale = newScale;
              setZoomLevel(Math.round(newScale * 100));
              drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);
            }}
          >+</Button>
          <button
            className="text-xs font-mono px-1 min-w-[40px] text-center text-foreground hover:bg-accent transition-colors"
            onClick={() => {
              viewportRef.current = { offsetX: 0, offsetY: 0, scale: 1 };
              setZoomLevel(100);
              drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);
            }}
            title="Reset zoom"
          >
            {zoomLevel}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none rounded-r-lg"
            onClick={() => {
              const v = viewportRef.current;
              const newScale = Math.max(v.scale * 0.8, 0.1);
              const cx = window.innerWidth / 2;
              const cy = window.innerHeight / 2;
              v.offsetX = cx - (cx - v.offsetX) * (newScale / v.scale);
              v.offsetY = cy - (cy - v.offsetY) * (newScale / v.scale);
              v.scale = newScale;
              setZoomLevel(Math.round(newScale * 100));
              drawShapesFromArray(shapes, staticCanvasRef, viewportRef.current);
            }}
          >−</Button>
        </div>
      </div>
      <Toggle isOpen={isChatOpen} setIsOpen={setIsChatOpen} />    

      <TypeControlPanel
        options={drawingOptions}
        onChange={setDrawingOptions}
        isOpen={isControlPanelOpen}
        onClose={() => setIsControlPanelOpen(false)}
      />

      <GroupChatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      <canvas
        id="static-canvas"
        ref={staticCanvasRef}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      />
      <canvas
        id="dynamic-canvas"
        ref={dynamicCanvasRef}
        className={currentShape === 'HAND' ? "cursor-grab" : "cursor-crosshair"}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
      />
      {Object.entries(cursors).map(([userId, cursor]) => {
        if (userId === session?.user?.id) return null;
        return (
          <div
            key={userId}
            className="absolute pointer-events-none"
            style={{
              left: `${cursor.x}px`,
              top: `${cursor.y}px`,
              transform: "translate(-50%, -50%)",
              transition: "left 0.1s linear, top 0.1s linear",
            }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: cursor.color }}
            ></div>
            <div className="text-xs bg-black text-white px-1 rounded-md mt-1">
              {cursor.userName}
            </div>
          </div>
        );
      })}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        variant={modalState.variant}
        onConfirm={handleConfirm}
      />
    </div>
  );
}