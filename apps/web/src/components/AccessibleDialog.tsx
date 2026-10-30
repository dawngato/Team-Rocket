"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";

interface AccessibleDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function AccessibleDialog({ open, onClose, title, children }: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (open && !isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      setIsOpen(true);
      document.body.style.overflow = "hidden";
    }
    if (!open && isOpen) {
      setIsOpen(false);
      document.body.style.overflow = "";
      previousFocus.current?.focus();
    }
  }, [open, isOpen]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      dialogRef.current?.focus();
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative w-full max-w-lg mx-4 p-4 bg-white dark:bg-[#132135] rounded-xl shadow-2xl border border-slate-200 dark:border-[#1E3352]"
        tabIndex={-1}
      >
        <h2 id="dialog-title" className="text-lg font-semibold text-[#17233B] dark:text-white mb-4">
          {title}
        </h2>
        <div className="space-y-4">{children}</div>
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
