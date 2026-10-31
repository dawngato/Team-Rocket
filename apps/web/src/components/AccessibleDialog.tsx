"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface AccessibleDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
}

export const FOCUSABLE_ELEMENTS_SELECTOR = [
  'a[href]:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(", ");

export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container || typeof container.querySelectorAll !== "function") return [];

  const rawElements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR)
  );

  return rawElements.filter((element) => {
    if (element.hasAttribute("disabled")) return false;
    if ("disabled" in element && Boolean((element as unknown as { disabled: boolean }).disabled)) {
      return false;
    }
    if (element.getAttribute("tabindex") === "-1") return false;
    if (element.getAttribute("aria-hidden") === "true") return false;

    if (typeof element.closest === "function") {
      const hiddenAncestor = element.closest('[aria-hidden="true"]');
      if (hiddenAncestor && container.contains(hiddenAncestor)) {
        return false;
      }
    }

    if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
    }

    return true;
  });
}

export interface KeyboardFocusEvent {
  key: string;
  shiftKey: boolean;
  preventDefault: () => void;
}

export function trapFocus(
  event: KeyboardFocusEvent,
  container: HTMLElement | null
): boolean {
  if (event.key !== "Tab" || !container) {
    return false;
  }

  const focusable = getFocusableElements(container);

  if (focusable.length === 0) {
    event.preventDefault();
    if (typeof container.focus === "function") {
      container.focus();
    }
    return true;
  }

  const firstElement = focusable[0];
  const lastElement = focusable[focusable.length - 1];
  const activeElement =
    typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;

  if (event.shiftKey) {
    if (
      !activeElement ||
      activeElement === firstElement ||
      activeElement === container ||
      (typeof container.contains === "function" && !container.contains(activeElement))
    ) {
      event.preventDefault();
      lastElement.focus();
      return true;
    }
  } else {
    if (
      !activeElement ||
      activeElement === lastElement ||
      activeElement === container ||
      (typeof container.contains === "function" && !container.contains(activeElement))
    ) {
      event.preventDefault();
      firstElement.focus();
      return true;
    }
  }

  return false;
}

export function AccessibleDialog({
  open,
  isOpen: legacyIsOpen,
  onClose,
  title,
  description,
  children,
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const requestedOpen = open ?? legacyIsOpen ?? false;
  const [visible, setVisible] = useState(requestedOpen);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (requestedOpen && !visible) {
      previousFocus.current = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
      setVisible(true);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "hidden";
      }
    }
    if (!requestedOpen && visible) {
      setVisible(false);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
      previousFocus.current?.focus();
    }
  }, [requestedOpen, visible]);

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab") {
        trapFocus(e, dialogRef.current);
      }
    }

    if (visible) {
      if (typeof document !== "undefined") {
        document.addEventListener("keydown", handleKeyDown);
      }

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        dialogRef.current?.focus();
      }
    }

    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-backdrop-fade"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby={description ? "dialog-description" : undefined}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 360 }}
            className="relative z-10 w-full max-w-lg p-6 bg-white dark:bg-[#132135] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1E3352] origin-center animate-dialog-spring"
            tabIndex={-1}
          >
            <h2 id="dialog-title" className="text-xl font-bold tracking-tight text-[#17233B] dark:text-white mb-2">
              {title}
            </h2>
            {description ? (
              <p id="dialog-description" className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                {description}
              </p>
            ) : null}
            <div className="space-y-4">{children}</div>
            <div className="flex justify-end gap-2 pt-5 border-t border-slate-100 dark:border-[#1E3352]/70 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all duration-75 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#132135]"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
