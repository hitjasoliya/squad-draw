"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { ShapeType } from "@/schemas/index";
import { useRoomStore } from "@/store/room.store";
import ShapeSelector from "@/components/ShapeSelector";
import TypeControlPanel, { DrawingOptions } from "@/components/ControlPanel";
import { GroupChatbot } from "@/components/GroupChatbot";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Modal } from "@/components/ui/modal";
import { Home, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Toggle } from "@/components/Toggle";
import { useWhiteboardCanvas } from "@/hooks/useWhiteboardCanvas";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [currentShape, setCurrentShape] = useState<ShapeType | "HAND">("HAND");
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

  const { shapes, isConnected, onlineMembers, clearShapes, joinRoomInSocket, disconnectSocket, cursors } =
    useRoomStore();

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      toast.info("For a better experience, we recommend using a desktop.", {
        position: "bottom-center",
        duration: 10000,
      });
    }
  }, []);

  const canvas = useWhiteboardCanvas({
    shapes,
    currentShape,
    drawingOptions,
    userId: session?.user?.id,
    roomId,
  });

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
    const canvasEl = canvas.staticCanvasRef.current;
    if (canvasEl) {
      const dataURL = canvasEl.toDataURL("image/png");
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
      } catch (err) {
        toast.error("Failed to clear shapes");
        console.error("Error clearing shapes:", err);
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
      // joinRoomInSocket owns socket creation + all listeners.
      joinRoomInSocket(roomId);

      return () => {
        disconnectSocket();
      };
    }
  }, [session, roomId, loading, joinRoomInSocket, disconnectSocket]);

  const previousConnectionStatus = useRef<boolean | null>(null);
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
    <div ref={canvas.containerRef} className="relative w-full h-full overflow-hidden">
      {/* Top bar: presence (desktop), theme, back to dashboard */}
      <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
        <div className="hidden md:flex bg-card/85 backdrop-blur-xl border border-border/80 rounded-2xl px-3 py-1.5 shadow-xl glass-panel items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-destructive"}`} />
            <span className="text-xs font-semibold text-foreground">
              {isConnected ? "Live Sync" : "Offline"}
            </span>
          </div>
          <div className="h-4 w-px bg-border/60" />
          <span className="text-xs font-mono text-muted-foreground">
            {onlineMembers.length} active
          </span>
        </div>
        <ThemeToggle />
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-2xl border-border/80 bg-card/85 backdrop-blur-xl hover:bg-accent active:scale-95 shadow-md"
          onClick={() => router.push("/dashboard")}
          title="Back to Dashboard"
        >
          <Home className="h-4 w-4" />
        </Button>
      </div>

      <ShapeSelector
        currentShape={currentShape}
        onShapeChange={setCurrentShape}
        onClearShapes={handleClearShapes}
        onSaveCanvas={handleSaveCanvas}
        isHandMode={currentShape === "HAND"}
        onHandModeToggle={() => setCurrentShape("HAND")}
      />

      {/* Draw options + zoom controls */}
      <div className="fixed bottom-20 left-4 sm:bottom-6 sm:left-6 z-30 flex items-center gap-2">
        <Button
          onClick={() => setIsControlPanelOpen(!isControlPanelOpen)}
          size="icon"
          className="rounded-2xl h-10 w-10 border border-border/80 bg-card/85 backdrop-blur-xl shadow-xl hover:bg-accent active:scale-95 transition-all"
          variant="outline"
          title="Drawing Options"
        >
          <Palette className="h-4 w-4" />
        </Button>
        <div className="bg-card/85 backdrop-blur-xl rounded-2xl border border-border/80 flex items-center shadow-xl glass-panel p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl active:scale-95 text-xs font-bold"
            onClick={canvas.zoomIn}
          >
            +
          </Button>
          <button
            className="text-xs font-mono px-2 min-w-[44px] text-center text-foreground hover:bg-accent/60 rounded-lg py-1 transition-colors"
            onClick={canvas.resetZoom}
            title="Reset zoom"
          >
            {canvas.zoomLevel}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl active:scale-95 text-xs font-bold"
            onClick={canvas.zoomOut}
          >
            −
          </Button>
        </div>
      </div>

      <TypeControlPanel
        options={drawingOptions}
        onChange={setDrawingOptions}
        isOpen={isControlPanelOpen}
        onClose={() => setIsControlPanelOpen(false)}
      />

      <GroupChatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <Toggle isOpen={isChatOpen} setIsOpen={setIsChatOpen} />

      <canvas
        id="static-canvas"
        ref={canvas.staticCanvasRef}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
      />
      <canvas
        id="dynamic-canvas"
        ref={canvas.dynamicCanvasRef}
        className={currentShape === "HAND" ? "cursor-grab" : "cursor-crosshair"}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
      />
      {Object.entries(cursors).map(([userId, cursor]) => {
        if (userId === session?.user?.id) return null;
        const [sx, sy] = canvas.worldToScreen(cursor.x, cursor.y);
        return (
          <div
            key={userId}
            className="absolute pointer-events-none z-10"
            style={{
              left: `${sx}px`,
              top: `${sy}px`,
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
