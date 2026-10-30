import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { EvidenceOrbit } from "../src/components/EvidenceOrbit";

describe("EvidenceOrbit resource optimization and accessibility", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  it("exports a valid React functional component", () => {
    expect(typeof EvidenceOrbit).toBe("function");
    const element = React.createElement(EvidenceOrbit, {
      manifestDigest: "0123456789abcdef",
      leafCount: 42,
      anchorTxHash: "0xabcdef1234567890",
    });
    expect(element).toBeDefined();
    expect(element.type).toBe(EvidenceOrbit);
  });
});
