import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AccessibleDialog,
  FOCUSABLE_ELEMENTS_SELECTOR,
  getFocusableElements,
  trapFocus,
} from "../src/components/AccessibleDialog";
import * as AppComponents from "../src/app/components";
import { apiClient } from "../src/lib/api_client";

interface MockElementOptions {
  tagName?: string;
  attributes?: Record<string, string>;
  disabled?: boolean;
  tabIndex?: number;
  style?: Record<string, string>;
}

class MockElement {
  tagName: string;
  attributes: Record<string, string>;
  disabled: boolean;
  tabIndex: number;
  style: Record<string, string>;
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  focusCount = 0;

  constructor(options: MockElementOptions = {}) {
    this.tagName = (options.tagName || "div").toUpperCase();
    this.attributes = { ...(options.attributes || {}) };
    this.disabled = options.disabled ?? false;
    this.tabIndex = options.tabIndex ?? 0;
    this.style = { ...(options.style || {}) };
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  hasAttribute(name: string): boolean {
    return name in this.attributes;
  }

  focus(): void {
    this.focusCount += 1;
    if (typeof globalThis.document !== "undefined") {
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = this;
    }
  }

  appendChild(child: MockElement): void {
    child.parentElement = this;
    this.children.push(child);
  }

  contains(child: MockElement | null): boolean {
    if (!child) return false;
    if (child === this) return true;
    let curr: MockElement | null = child.parentElement;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentElement;
    }
    return false;
  }

  closest(selector: string): MockElement | null {
    let curr: MockElement | null = this;
    while (curr) {
      if (selector === '[aria-hidden="true"]' && curr.getAttribute("aria-hidden") === "true") {
        return curr;
      }
      curr = curr.parentElement;
    }
    return null;
  }

  querySelectorAll(_selector: string): MockElement[] {
    const results: MockElement[] = [];
    const traverse = (node: MockElement) => {
      for (const child of node.children) {
        const tag = child.tagName.toLowerCase();
        const isInteractive =
          tag === "button" ||
          tag === "input" ||
          tag === "select" ||
          tag === "textarea" ||
          (tag === "a" && child.hasAttribute("href")) ||
          (child.hasAttribute("tabindex") && child.getAttribute("tabindex") !== "-1");

        if (isInteractive) {
          results.push(child);
        }
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }
}

describe("AccessibleDialog Focus Trap and Accessibility", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    const mockDoc = {
      activeElement: null as unknown as MockElement | null,
    };
    const mockWin = {
      getComputedStyle: (el: MockElement) => el.style,
    };

    (globalThis as unknown as { document: unknown }).document = mockDoc;
    (globalThis as unknown as { window: unknown }).window = mockWin;
  });

  afterEach(() => {
    (globalThis as unknown as { document: unknown }).document = originalDocument;
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  describe("getFocusableElements", () => {
    it("returns focusable elements in DOM order", () => {
      const container = new MockElement({ tagName: "div" });
      const btn1 = new MockElement({ tagName: "button" });
      const link = new MockElement({ tagName: "a", attributes: { href: "#" } });
      const input = new MockElement({ tagName: "input" });
      container.appendChild(btn1);
      container.appendChild(link);
      container.appendChild(input);

      const focusable = getFocusableElements(container as unknown as HTMLElement);
      expect(focusable).toHaveLength(3);
      expect(focusable[0]).toBe(btn1);
      expect(focusable[1]).toBe(link);
      expect(focusable[2]).toBe(input);
    });

    it("filters out disabled elements", () => {
      const container = new MockElement({ tagName: "div" });
      const enabledBtn = new MockElement({ tagName: "button" });
      const disabledAttrBtn = new MockElement({ tagName: "button", attributes: { disabled: "" } });
      const disabledPropBtn = new MockElement({ tagName: "button", disabled: true });
      container.appendChild(enabledBtn);
      container.appendChild(disabledAttrBtn);
      container.appendChild(disabledPropBtn);

      const focusable = getFocusableElements(container as unknown as HTMLElement);
      expect(focusable).toHaveLength(1);
      expect(focusable[0]).toBe(enabledBtn);
    });

    it("filters out elements with tabindex -1", () => {
      const container = new MockElement({ tagName: "div" });
      const normalBtn = new MockElement({ tagName: "button" });
      const skippedBtn = new MockElement({ tagName: "button", attributes: { tabindex: "-1" } });
      container.appendChild(normalBtn);
      container.appendChild(skippedBtn);

      const focusable = getFocusableElements(container as unknown as HTMLElement);
      expect(focusable).toHaveLength(1);
      expect(focusable[0]).toBe(normalBtn);
    });

    it("filters out aria-hidden elements and their children", () => {
      const container = new MockElement({ tagName: "div" });
      const visibleBtn = new MockElement({ tagName: "button" });
      const hiddenBtn = new MockElement({ tagName: "button", attributes: { "aria-hidden": "true" } });

      const hiddenWrapper = new MockElement({ tagName: "div", attributes: { "aria-hidden": "true" } });
      const childOfHidden = new MockElement({ tagName: "button" });
      hiddenWrapper.appendChild(childOfHidden);

      container.appendChild(visibleBtn);
      container.appendChild(hiddenBtn);
      container.appendChild(hiddenWrapper);

      const focusable = getFocusableElements(container as unknown as HTMLElement);
      expect(focusable).toHaveLength(1);
      expect(focusable[0]).toBe(visibleBtn);
    });

    it("filters out hidden styles like display none or visibility hidden", () => {
      const container = new MockElement({ tagName: "div" });
      const visibleBtn = new MockElement({ tagName: "button" });
      const displayNoneBtn = new MockElement({ tagName: "button", style: { display: "none" } });
      const hiddenBtn = new MockElement({ tagName: "button", style: { visibility: "hidden" } });

      container.appendChild(visibleBtn);
      container.appendChild(displayNoneBtn);
      container.appendChild(hiddenBtn);

      const focusable = getFocusableElements(container as unknown as HTMLElement);
      expect(focusable).toHaveLength(1);
      expect(focusable[0]).toBe(visibleBtn);
    });

    it("returns an empty array when container is null", () => {
      expect(getFocusableElements(null)).toEqual([]);
    });
  });

  describe("trapFocus", () => {
    it("wraps focus from the last focusable element to the first when Tab is pressed", () => {
      const container = new MockElement({ tagName: "div" });
      const firstBtn = new MockElement({ tagName: "button" });
      const middleBtn = new MockElement({ tagName: "button" });
      const lastBtn = new MockElement({ tagName: "button" });
      container.appendChild(firstBtn);
      container.appendChild(middleBtn);
      container.appendChild(lastBtn);

      lastBtn.focus();
      expect(globalThis.document.activeElement).toBe(lastBtn);

      const preventDefault = vi.fn();
      const trapped = trapFocus(
        { key: "Tab", shiftKey: false, preventDefault },
        container as unknown as HTMLElement
      );

      expect(trapped).toBe(true);
      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(firstBtn.focusCount).toBe(1);
      expect(globalThis.document.activeElement).toBe(firstBtn);
    });

    it("wraps focus from the first focusable element to the last when Shift Tab is pressed", () => {
      const container = new MockElement({ tagName: "div" });
      const firstBtn = new MockElement({ tagName: "button" });
      const middleBtn = new MockElement({ tagName: "button" });
      const lastBtn = new MockElement({ tagName: "button" });
      container.appendChild(firstBtn);
      container.appendChild(middleBtn);
      container.appendChild(lastBtn);

      firstBtn.focus();
      expect(globalThis.document.activeElement).toBe(firstBtn);

      const preventDefault = vi.fn();
      const trapped = trapFocus(
        { key: "Tab", shiftKey: true, preventDefault },
        container as unknown as HTMLElement
      );

      expect(trapped).toBe(true);
      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(lastBtn.focusCount).toBe(1);
      expect(globalThis.document.activeElement).toBe(lastBtn);
    });

    it("allows standard forward navigation between elements when not on the last element", () => {
      const container = new MockElement({ tagName: "div" });
      const firstBtn = new MockElement({ tagName: "button" });
      const lastBtn = new MockElement({ tagName: "button" });
      container.appendChild(firstBtn);
      container.appendChild(lastBtn);

      firstBtn.focus();
      const preventDefault = vi.fn();
      const trapped = trapFocus(
        { key: "Tab", shiftKey: false, preventDefault },
        container as unknown as HTMLElement
      );

      expect(trapped).toBe(false);
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it("allows standard backward navigation between elements when not on the first element", () => {
      const container = new MockElement({ tagName: "div" });
      const firstBtn = new MockElement({ tagName: "button" });
      const lastBtn = new MockElement({ tagName: "button" });
      container.appendChild(firstBtn);
      container.appendChild(lastBtn);

      lastBtn.focus();
      const preventDefault = vi.fn();
      const trapped = trapFocus(
        { key: "Tab", shiftKey: true, preventDefault },
        container as unknown as HTMLElement
      );

      expect(trapped).toBe(false);
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it("traps focus on single focusable element for both Tab and Shift Tab", () => {
      const container = new MockElement({ tagName: "div" });
      const soleBtn = new MockElement({ tagName: "button" });
      container.appendChild(soleBtn);

      soleBtn.focus();

      const preventDefaultTab = vi.fn();
      const trappedTab = trapFocus(
        { key: "Tab", shiftKey: false, preventDefault: preventDefaultTab },
        container as unknown as HTMLElement
      );
      expect(trappedTab).toBe(true);
      expect(preventDefaultTab).toHaveBeenCalledTimes(1);
      expect(soleBtn.focusCount).toBe(2);

      const preventDefaultShiftTab = vi.fn();
      const trappedShiftTab = trapFocus(
        { key: "Tab", shiftKey: true, preventDefault: preventDefaultShiftTab },
        container as unknown as HTMLElement
      );
      expect(trappedShiftTab).toBe(true);
      expect(preventDefaultShiftTab).toHaveBeenCalledTimes(1);
      expect(soleBtn.focusCount).toBe(3);
    });

    it("redirects focus into the dialog if focus was on the dialog container itself", () => {
      const container = new MockElement({ tagName: "div" });
      const firstBtn = new MockElement({ tagName: "button" });
      const lastBtn = new MockElement({ tagName: "button" });
      container.appendChild(firstBtn);
      container.appendChild(lastBtn);

      container.focus();

      const preventDefault = vi.fn();
      const trapped = trapFocus(
        { key: "Tab", shiftKey: false, preventDefault },
        container as unknown as HTMLElement
      );
      expect(trapped).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
      expect(firstBtn.focusCount).toBe(1);

      container.focus();
      const preventDefaultShift = vi.fn();
      const trappedShift = trapFocus(
        { key: "Tab", shiftKey: true, preventDefault: preventDefaultShift },
        container as unknown as HTMLElement
      );
      expect(trappedShift).toBe(true);
      expect(preventDefaultShift).toHaveBeenCalled();
      expect(lastBtn.focusCount).toBe(1);
    });

    it("redirects focus into the dialog if activeElement is outside the dialog", () => {
      const container = new MockElement({ tagName: "div" });
      const firstBtn = new MockElement({ tagName: "button" });
      const lastBtn = new MockElement({ tagName: "button" });
      container.appendChild(firstBtn);
      container.appendChild(lastBtn);

      const outsideBtn = new MockElement({ tagName: "button" });
      outsideBtn.focus();

      const preventDefault = vi.fn();
      const trapped = trapFocus(
        { key: "Tab", shiftKey: false, preventDefault },
        container as unknown as HTMLElement
      );
      expect(trapped).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
      expect(firstBtn.focusCount).toBe(1);
    });

    it("focuses container and prevents default if no focusable elements exist", () => {
      const container = new MockElement({ tagName: "div" });
      const preventDefault = vi.fn();

      const trapped = trapFocus(
        { key: "Tab", shiftKey: false, preventDefault },
        container as unknown as HTMLElement
      );
      expect(trapped).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
      expect(container.focusCount).toBe(1);
    });

    it("ignores non Tab keys", () => {
      const container = new MockElement({ tagName: "div" });
      const btn = new MockElement({ tagName: "button" });
      container.appendChild(btn);

      const preventDefault = vi.fn();
      const trapped = trapFocus(
        { key: "Escape", shiftKey: false, preventDefault },
        container as unknown as HTMLElement
      );
      expect(trapped).toBe(false);
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("Clean re exports and module structure", () => {
    it("exports AccessibleDialog from main and app components", () => {
      expect(AccessibleDialog).toBeDefined();
      expect(AppComponents.AccessibleDialog).toBe(AccessibleDialog);
      expect(AppComponents.StateBadge).toBeDefined();
    });

    it("exports the canonical API client boundary", () => {
      expect(apiClient).toBeDefined();
      expect(typeof apiClient.getElections).toBe("function");
    });
  });
});
