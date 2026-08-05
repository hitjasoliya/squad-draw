import React from "react";
import { Button } from "./button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: "default" | "danger";
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "default",
}: ModalProps) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-150"
      onClick={handleBackdropClick}
    >
      <div className="bg-background/95 backdrop-blur-md rounded-2xl p-6 max-w-md w-full mx-4 border border-border shadow-2xl animate-in zoom-in-95 fade-in-0 duration-150 ease-out">
        <h3 className="text-xl font-semibold text-foreground mb-4">{title}</h3>
        <p className="text-muted-foreground mb-6 leading-relaxed">{message}</p>

        <div className="flex gap-3 justify-end">
          <Button onClick={onClose} variant="secondary">
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            variant={variant === "danger" ? "destructive" : "default"}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
