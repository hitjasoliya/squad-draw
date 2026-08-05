import { cn } from "@/lib/utils";

/**
 * SquadDraw wordmark.
 * Mark: a rough, hand-drawn square with a shape mid-draw, echoing the
 * Rough.js hand-drawn canvas rendering that is the product's core.
 * Uses currentColor so it adapts to light and dark themes automatically.
 */
export function Brand({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-9 w-auto", className)}
      role="img"
      aria-label="SquadDraw"
    >
      <title>SquadDraw</title>
      {/* Hand-drawn square outline, four wobbly strokes */}
      <path
        d="M7 12.5 C9 10.5 14 11 18.5 10.5 C24 10 28.5 11 31 13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M31.5 14.5 C32.5 19 32 25 31 29.5 C30.5 32 29.5 33.5 29 34.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M27.5 35.5 C22 35 16.5 35.5 11 34.5 C8.5 34 7 33 6.5 31.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M7 30.5 C5.5 25 5.5 19.5 7 14.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Shape being drawn inside the square */}
      <circle cx="19" cy="22.5" r="3.2" fill="currentColor" />
      {/* In-progress dot near the corner */}
      <circle cx="27.5" cy="14.5" r="1.8" fill="currentColor" opacity="0.55" />
      {/* Wordmark in a handwritten face, matching the sketched mark */}
      <text
        x="45"
        y="35"
        fontFamily="var(--font-hand), Caveat, cursive"
        fontSize="30"
        fontWeight="600"
        fill="currentColor"
      >
        SquadDraw
      </text>
    </svg>
  );
}
