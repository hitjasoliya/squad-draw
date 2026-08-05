"use client";
import { ShapeType } from "@/schemas/index";
import { Button } from "./ui/button";
import {
  Circle,
  Square,
  Minus,
  Diamond,
  ArrowRight,
  PenTool,
  Type,
  Image,
  Eraser,
  Hand,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShapeSelectorProps {
  currentShape: ShapeType | "HAND";
  onShapeChange: (shape: ShapeType | "HAND") => void;
  onClearShapes?: () => void;
  onSaveCanvas?: () => void;
  isHandMode: boolean;
  onHandModeToggle: (active: boolean) => void;
}

const shapeOptions: {
  type: ShapeType;
  label: string;
  key: string;
  icon: React.ReactNode;
  disabled?: boolean;
}[] = [
  { type: "FREEDRAW", label: "Free Draw", key: "P", icon: <PenTool size={17} /> },
  { type: "RECTANGLE", label: "Rectangle", key: "R", icon: <Square size={17} /> },
  { type: "ELLIPSE", label: "Ellipse", key: "O", icon: <Circle size={17} /> },
  { type: "LINE", label: "Line", key: "L", icon: <Minus size={17} /> },
  { type: "ARROW", label: "Arrow", key: "A", icon: <ArrowRight size={17} /> },
  { type: "DIAMOND", label: "Diamond", key: "D", icon: <Diamond size={17} /> },
  { type: "TEXT", label: "Text", key: "T", icon: <Type size={17} />, disabled: true },
  { type: "IMAGE", label: "Image", key: "I", icon: <Image size={17} />, disabled: true },
];

export default function ShapeSelector({
  currentShape,
  onShapeChange,
  onClearShapes,
  onSaveCanvas,
  isHandMode,
  onHandModeToggle,
}: ShapeSelectorProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-1 p-1.5 overflow-x-auto rounded-none border-x-0 border-b-0 border-t border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl glass-panel sm:inset-x-auto sm:bottom-auto sm:top-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:border sm:justify-center justify-start animate-in fade-in-0 zoom-in-95 duration-200 no-scrollbar">
      {/* Pan Hand Tool */}
      <Button
        variant={isHandMode ? "default" : "ghost"}
        size="icon"
        onClick={() => {
          onHandModeToggle(!isHandMode);
          onShapeChange("HAND");
        }}
        className={cn(
          "shrink-0 w-9 h-9 rounded-xl transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.97] relative group",
          isHandMode
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
            : "hover:bg-accent text-muted-foreground hover:text-foreground"
        )}
        title="Pan Canvas (Hand)"
      >
        <Hand size={17} />
      </Button>

      <div className="w-px h-5 bg-border/60 mx-1 shrink-0" />

      {/* Shape options */}
      <div className="flex items-center gap-1">
        {shapeOptions.map((shape) => {
          const isActive = !isHandMode && currentShape === shape.type;
          return (
            <Button
              key={shape.type}
              variant={isActive ? "default" : "ghost"}
              size="icon"
              onClick={() => {
                onHandModeToggle(false);
                if (!shape.disabled) onShapeChange(shape.type);
              }}
              disabled={shape.disabled}
              className={cn(
                "shrink-0 w-9 h-9 rounded-xl transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.97] relative group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : shape.disabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              )}
              title={
                shape.disabled ? `${shape.label} (Coming Soon)` : `${shape.label}`
              }
            >
              {shape.icon}
            </Button>
          );
        })}
      </div>

      <div className="w-px h-5 bg-border/60 mx-1 shrink-0" />

      {/* Save Canvas Action */}
      {onSaveCanvas && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onSaveCanvas}
          className="shrink-0 w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent active:scale-[0.97] transition-[transform,background-color,color]"
          title="Export Canvas as PNG"
        >
          <Download size={17} />
        </Button>
      )}

      {/* Clear Shapes Action */}
      {onClearShapes && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearShapes}
          className="shrink-0 w-9 h-9 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-[0.97] transition-[transform,background-color,color]"
          title="Clear All Canvas Shapes"
        >
          <Eraser size={17} />
        </Button>
      )}
    </div>
  );
}
