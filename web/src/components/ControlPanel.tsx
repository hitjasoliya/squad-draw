"use client";
import React from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawingOptions {
  stroke: string;
  strokeWidth: number;
  fill: string;
  fillStyle: string;
  roughness: number;
  strokeLineDash: number[];
  fillOpacity: number;
}

interface ControlPanelProps {
  options: DrawingOptions;
  onChange: (opts: DrawingOptions) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

function hexToHex8(hex: string, alpha: number) {
  let c = (hex || "").replace("#", "");
  if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]].join("");
  if (typeof c !== "string" || c.length !== 6) return hex; // fallback for invalid input
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${c}${alphaHex}`;
}
function setFillWithOpacity(fill: string, opacity: number) {
  if (fill.startsWith("rgba")) {
    return fill.replace(
      /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/,
      (m, r, g, b) => `rgba(${r}, ${g}, ${b}, ${opacity})`,
    );
  }
  if (fill.startsWith("#")) {
    const baseColor = fill.length === 9 ? fill.slice(0, 7) : fill;
    return hexToHex8(baseColor, opacity);
  }
  if (fill === "rgba(0,0,0,0)" || fill === "transparent") {
    return opacity === 0 ? "rgba(0,0,0,0)" : `rgba(0,0,0,${opacity})`;
  }
  // fallback for named colors - convert to rgba
  const tempDiv = document.createElement("div");
  tempDiv.style.color = fill;
  document.body.appendChild(tempDiv);
  const computedColor = window.getComputedStyle(tempDiv).color;
  document.body.removeChild(tempDiv);

  if (computedColor.startsWith("rgb(")) {
    const match = computedColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
    }
  }

  return fill;
}
const fillOpacities = [0, 0.25, 0.5, 0.75, 1];

const strokeColors = ["#f5f6fa", "#353b48", "#009432", "#4834d4", "#e84118"];
const backgroundColors = [
  "#f5f6fa",
  "#353b48",
  "#009432",
  "#4834d4",
  "#e84118",
];
const strokeWidths = [1, 2, 3, 4, 5];
const roughness = [0, 1, 2, 3, 4];

interface StrokeDashOption {
  label: string;
  value: number[];
  icon: React.ReactNode;
}

const strokeDashOptions: StrokeDashOption[] = [
  {
    label: "Solid",
    value: [],
    icon: (
      <svg width="24" height="8">
        <line
          x1="2"
          y1="4"
          x2="22"
          y2="4"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  {
    label: "Dashed",
    value: [8, 4],
    icon: (
      <svg width="24" height="8">
        <line
          x1="2"
          y1="4"
          x2="22"
          y2="4"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6,3"
        />
      </svg>
    ),
  },
  {
    label: "Dotted",
    value: [2, 2],
    icon: (
      <svg width="24" height="8">
        <line
          x1="2"
          y1="4"
          x2="22"
          y2="4"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="1,2"
        />
      </svg>
    ),
  },
  {
    label: "Dash-dot",
    value: [8, 3, 2, 3],
    icon: (
      <svg width="24" height="8">
        <line
          x1="2"
          y1="4"
          x2="22"
          y2="4"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6,2,1,2"
        />
      </svg>
    ),
  },
  {
    label: "Long dash",
    value: [12, 4],
    icon: (
      <svg width="24" height="8">
        <line
          x1="2"
          y1="4"
          x2="22"
          y2="4"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="10,3"
        />
      </svg>
    ),
  },
];

export default function ControlPanel({
  options,
  onChange,
  isOpen = false,
  onClose,
}: ControlPanelProps) {
  const opts = { ...options };
  return (
    <div
      className={cn(
        "fixed bottom-36 left-4 max-w-[calc(100vw-2rem)] sm:bottom-24 sm:left-6 transition-[transform,opacity] duration-200 ease-out z-30",
        isOpen
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-4 opacity-0 scale-95 pointer-events-none"
      )}
    >
      <Card className="p-4 bg-card/90 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl glass-panel gap-3 w-64">
        <div className="flex items-center justify-between ">
          <h3 className="text-sm font-semibold">Drawing Options</h3>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Stroke</div>
            <div className="flex gap-1 flex-wrap">
              {strokeColors.map((color: string) => (
                <Button
                  key={color}
                  className={
                    cn(
                      "w-8 h-8 p-0 border-2 transition-[border-color,box-shadow,transform]",
                      opts.stroke === color
                        ? "border-primary ring-2 ring-primary/40 bg-primary text-primary-foreground"
                        : "border-border bg-background"
                    )
                  }
                  style={{ background: color }}
                  variant={opts.stroke === color ? "default" : "outline"}
                  onClick={() => onChange({ ...opts, stroke: color })}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Background</div>
            <div className="flex gap-1 flex-wrap">
              {backgroundColors.map((color: string) => {
                const isSelected = (() => {
                  const fill = opts.fill ?? "";
                  if (color === "transparent") {
                    return (
                      fill === "transparent" ||
                      fill === "rgba(0,0,0,0)" ||
                      fill.startsWith("rgba(0, 0, 0,") ||
                      fill.startsWith("rgba(0,0,0,")
                    );
                  }
                  if (fill.startsWith("#") && color.startsWith("#")) {
                    // Compare hex colors (with or without alpha)
                    const fillBase =
                      fill.length === 9 ? fill.slice(0, 7) : fill;
                    return fillBase === color;
                  }
                  if (fill.startsWith("rgba") && color.startsWith("#")) {
                    // Convert rgba to hex for comparison
                    const rgbaMatch = fill.match(
                      /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/,
                    );
                    if (
                      rgbaMatch &&
                      rgbaMatch[1] &&
                      rgbaMatch[2] &&
                      rgbaMatch[3]
                    ) {
                      const [, r, g, b] = rgbaMatch;
                      const hexFromRgba = `#${parseInt(r).toString(16).padStart(2, "0")}${parseInt(g).toString(16).padStart(2, "0")}${parseInt(b).toString(16).padStart(2, "0")}`;
                      return hexFromRgba === color;
                    }
                  }
                  return fill === color;
                })();

                return (
                  <Button
                    key={color}
                    className={
                      cn(
                        "w-8 h-8 p-0 border-2 transition-[border-color,box-shadow,transform]",
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 bg-primary text-primary-foreground"
                          : "border-border bg-background"
                      )
                    }
                    style={{
                      background:
                        color === "transparent"
                          ? "repeating-linear-gradient(45deg, hsl(var(--muted)) 0 4px, hsl(var(--muted-foreground) / 0.3) 4px 8px)"
                          : color,
                    }}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => {
                      const newFill =
                        color === "transparent"
                          ? "rgba(0,0,0,0)"
                          : setFillWithOpacity(color, opts.fillOpacity);
                      onChange({ ...opts, fill: newFill });
                    }}
                  />
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Stroke width</div>
            <div className="flex gap-1 flex-wrap">
              {strokeWidths.map((w: number) => (
                <Button
                  key={w}
                  className="w-8 h-8 flex items-center justify-center p-0"
                  style={{
                    border:
                      opts.strokeWidth === w
                        ? "2px solid hsl(var(--ring)) !important"
                        : "1px solid hsl(var(--foreground) / 0.8) !important",
                  }}
                  variant={opts.strokeWidth === w ? "default" : "outline"}
                  onClick={() => onChange({ ...opts, strokeWidth: w })}
                >
                  <svg width="24" height="8">
                    <line
                      x1="2"
                      y1="4"
                      x2="22"
                      y2="4"
                      stroke="currentColor"
                      strokeWidth={w}
                    />
                  </svg>
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Roughness</div>
            <div className="flex gap-1 flex-wrap">
              {roughness.map((r: number) => (
                <Button
                  key={r}
                  className="w-8 h-8 flex items-center justify-center p-0"
                  style={{
                    border:
                      opts.roughness === r
                        ? "2px solid hsl(var(--ring)) !important"
                        : "1px solid hsl(var(--foreground) / 0.8) !important",
                  }}
                  variant={opts.roughness === r ? "default" : "outline"}
                  onClick={() => onChange({ ...opts, roughness: r })}
                >
                  <svg width="24" height="8">
                    {r === 0 ? (
                      <line
                        x1="2"
                        y1="4"
                        x2="22"
                        y2="4"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    ) : r === 1 ? (
                      <path
                        d="M2 4 Q8 2 16 4 Q20 6 22 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                    ) : r === 2 ? (
                      <path
                        d="M2 4 Q8 1 16 4 Q20 7 22 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                    ) : r === 3 ? (
                      <path
                        d="M2 4 Q8 0 16 4 Q20 8 22 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                    ) : (
                      <path
                        d="M2 4 Q8 0 16 4 Q20 8 22 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                      />
                    )}
                  </svg>
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Stroke Dash</div>
            <div className="flex gap-1 flex-wrap">
              {strokeDashOptions.map((opt: StrokeDashOption) => (
                <Button
                  key={opt.label}
                  className="w-8 h-8 flex items-center justify-center p-0"
                  style={{
                    border:
                      JSON.stringify(opts.strokeLineDash) ===
                      JSON.stringify(opt.value)
                        ? "2px solid hsl(var(--ring)) !important"
                        : "1px solid hsl(var(--foreground) / 0.8) !important",
                  }}
                  variant={
                    JSON.stringify(opts.strokeLineDash) ===
                    JSON.stringify(opt.value)
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    onChange({ ...opts, strokeLineDash: opt.value })
                  }
                >
                  {opt.icon}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Fill Opacity</div>
            <div className="flex gap-1 flex-wrap">
              {fillOpacities.map((opacity) => {
                const isSelected = Math.abs(opts.fillOpacity - opacity) < 0.01;
                return (
                  <Button
                    key={opacity}
                    className="w-8 h-8 flex items-center justify-center text-xs p-0"
                    style={{
                      border: isSelected
                        ? "2px solid hsl(var(--ring)) !important"
                        : "1px solid hsl(var(--foreground) / 0.8) !important",
                    }}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => {
                      const currentFillBase = (() => {
                        const fill = opts.fill ?? "";
                        if (
                          fill === "transparent" ||
                          fill === "rgba(0,0,0,0)"
                        ) {
                          return "rgba(0,0,0,0)";
                        }
                        if (fill.startsWith("rgba")) {
                          return fill.replace(
                            /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/,
                            (m, r, g, b) =>
                              `rgba(${r}, ${g}, ${b}, ${opacity})`,
                          );
                        }
                        if (fill.startsWith("#")) {
                          const baseColor =
                            fill.length === 9 ? fill.slice(0, 7) : fill;
                          return hexToHex8(baseColor, opacity);
                        }
                        return fill;
                      })();

                      onChange({
                        ...opts,
                        fill: currentFillBase,
                        fillOpacity: opacity,
                      });
                    }}
                  >
                    {Math.round(opacity * 100)}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
