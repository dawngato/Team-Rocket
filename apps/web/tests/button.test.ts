import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Button } from "../src/components/Button";
import * as AppComponents from "../src/app/components";

describe("Button Design Engineering and Accessibility", () => {
  it("includes tactile active state scaling class of scale 0.98", () => {
    const html = renderToString(React.createElement(Button, null, "Cast Vote"));
    expect(html).toContain("active:scale-[0.98]");
  });

  it("includes instant feedback transition classes", () => {
    const html = renderToString(React.createElement(Button, null, "Submit"));
    expect(html).toContain("transition-all");
    expect(html).toContain("duration-75");
    expect(html).toContain("ease-out");
  });

  it("includes accessible focus rings with token colors", () => {
    const html = renderToString(React.createElement(Button, null, "Verify"));
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain("focus-visible:ring-[#157E92]");
    expect(html).toContain("focus-visible:ring-offset-2");
  });

  it("provides touch accessible minimum height of at least 44px for standard size", () => {
    const html = renderToString(React.createElement(Button, { size: "md" }, "Confirm"));
    expect(html).toContain("min-h-[44px]");
  });

  it("renders confirmed variant with official green token", () => {
    const html = renderToString(React.createElement(Button, { variant: "confirmed" }, "Attested"));
    expect(html).toContain("bg-[#15805D]");
  });

  it("renders danger variant with red token", () => {
    const html = renderToString(React.createElement(Button, { variant: "danger" }, "Revoke"));
    expect(html).toContain("bg-[#C23C45]");
  });

  it("disables tactile active scaling when button is disabled", () => {
    const html = renderToString(React.createElement(Button, { disabled: true }, "Disabled Action"));
    expect(html).toContain("disabled:active:scale-100");
    expect(html).toContain("disabled:pointer-events-none");
    expect(html).toContain("disabled");
  });

  it("renders loading spinner and aria busy attribute when isLoading is true", () => {
    const html = renderToString(React.createElement(Button, { isLoading: true }, "Processing"));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("animate-spin");
  });

  it("exports Button cleanly from app components index", () => {
    expect(AppComponents.Button).toBeDefined();
    expect(AppComponents.Button).toBe(Button);
  });
});
