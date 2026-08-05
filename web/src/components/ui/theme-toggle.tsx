"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Laptop } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark =
    theme === "dark" || (theme === "system" && resolvedTheme === "dark");

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Toggle theme"
            className="p-2 bg-popover text-popover-foreground border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]"
            type="button"
          >
            {/* Only render icon after mount to avoid hydration mismatch */}
            {mounted ? (
              isDark ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )
            ) : (
              <span className="w-5 h-5" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-40 bg-popover text-popover-foreground border border-border"
        >
          <DropdownMenuItem onClick={() => setTheme("light")}>
            {" "}
            <Sun className="w-4 h-4 mr-2" /> Light{" "}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            {" "}
            <Moon className="w-4 h-4 mr-2" /> Dark{" "}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            {" "}
            <Laptop className="w-4 h-4 mr-2" /> System{" "}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
