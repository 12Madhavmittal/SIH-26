import { describe, it, expect } from "vitest";
import {
  buildVerificationUrl,
  generateQrSvgString,
  buildQrProvenancePayload,
} from "./qrGenerator";

describe("buildVerificationUrl", () => {
  it("generates clean URL path for lot code", () => {
    const url = buildVerificationUrl("KHC-TOM-0826-A");
    expect(url).toContain("/trace/KHC-TOM-0826-A");
  });
});

describe("generateQrSvgString", () => {
  it("outputs valid SVG markup with finder patterns", () => {
    const svg = generateQrSvgString("https://annadata-direct.gov.in/trace/KHC-TOM-0826-A");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("rect");
  });
});

describe("buildQrProvenancePayload", () => {
  it("assembles complete verifiable payload with timestamp", () => {
    const payload = buildQrProvenancePayload({
      lotCode: "KHC-TOM-0826-A",
      crop: "Tomato",
      grade: "A",
      totalKg: 620,
      originHub: "Krishnagiri FPO Hub",
    });

    expect(payload.fairPriceVerified).toBe(true);
    expect(payload.verificationUrl).toContain("/trace/KHC-TOM-0826-A");
    expect(payload.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
