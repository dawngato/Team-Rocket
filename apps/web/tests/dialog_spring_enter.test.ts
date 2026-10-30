import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "fs";
import path from "path";
import { AccessibleDialog } from "../src/components/AccessibleDialog";

describe("Dialog and Popover Spring Enter Transitions", () => {
  it("includes subtle spring enter transition and origin center on AccessibleDialog", () => {
    const html = renderToString(
      React.createElement(
        AccessibleDialog,
        {
          isOpen: true,
          onClose: () => {},
          title: "Verify Vote",
          description: "Confirm ballot submission",
        },
        React.createElement("div", null, "Dialog Content")
      )
    );

    expect(html).toContain("animate-dialog-spring");
    expect(html).toContain("origin-center");
    expect(html).toContain("animate-backdrop-fade");
    expect(html).toContain("active:scale-[0.98]");
  });

  it("defines keyframes for dialog and popover spring enter in globals css", () => {
    const cssPath = path.resolve(__dirname, "../src/app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    expect(cssContent).toContain("@keyframes dialogSpringEnter");
    expect(cssContent).toContain("@keyframes popoverSpringEnter");
    expect(cssContent).toContain("scale(0.97)");
    expect(cssContent).toContain("scale(1)");
    expect(cssContent).toContain(".animate-dialog-spring");
    expect(cssContent).toContain(".animate-popover-spring");
    expect(cssContent).toContain("transform-origin: center");
    expect(cssContent).toContain("transform-origin: top right");
  });
});
