"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
interface ToggleProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}
export function Toggle({ isOpen, setIsOpen }: ToggleProps) {
  return (
    // On mobile the drawer covers the canvas; hide the floating toggle while
    // it is open (the drawer's own X closes it). Desktop keeps the toggle.
    <div className={`fixed bottom-20 right-4 z-40 sm:bottom-4 ${isOpen ? "hidden sm:block" : ""}`}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-full h-9 w-9 sm:h-10 sm:w-10 shadow-lg transition-[transform,background-color] duration-300 ease-in-out",
          isOpen
            ? "rotate-90 bg-destructive hover:bg-destructive/90"
            : "bg-primary hover:bg-primary/90",
        )}
        size="icon"
      >
        <X
          className={cn(
            "h-6 w-6 transition-[transform,opacity] duration-300 ease-in-out",
            isOpen ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0",
          )}
        />
        <MessageCircle
          className={cn(
            "absolute h-6 w-6 transition-[transform,opacity] duration-300 ease-in-out",
            isOpen ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
          )}
        />
        <span className="sr-only">Toggle Chat</span>
      </Button>
    </div>
  );
}
