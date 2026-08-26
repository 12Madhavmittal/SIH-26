import { describe, it, expect } from "vitest";
import { generateLotCode, isValidLotCode, verifyWeights, cropCode } from "./lotTraceability";

describe("generateLotCode", () => {
  const base = { fpoCode: "KRI", crop: "Tomato", grade: "A", totalKg: 620, date: new Date("2026-08-26T00:00:00Z") };

  // Note: getMonth/getDate are local-time; freeze TZ-independent fields by using
  // the same Date instance for generation and snapshot assertions.
  it("produces a structurally valid code", () => {
    const code = generateLotCode(base);
    expect(isValidLotCode(code)).toBe(true);
    expect(code).toMatch(/^KRI-TOM-\d{6}-A-[A-Z0-9]{4}$/);
  });

  it("is deterministic for identical inputs (idempotent submission detection)", () => {
    const a = generateLotCode(base);
    const b = generateLotCode(base);
    expect(a).toBe(b);
  });

  it("changes checksum when weight differs (tamper evidence)", () => {
    const a = generateLotCode(base);
    const b = generateLotCode({ ...base, totalKg: 621 });
    expect(a).not.toBe(b);
    // But only the checksum segment differs
    expect(a.split("-").slice(0, 4)).toEqual(b.split("-").slice(0, 4));
  });

  it("falls back to ANN prefix and derived crop letters for unknown crops", () => {
    const code = generateLotCode({ ...base, fpoCode: undefined, crop: "Dragon Fruit" });
    expect(code.startsWith("ANN-DRA")).toBe(true);
  });

  it("sanitizes hostile FPO codes", () => {
    const code = generateLotCode({ ...base, fpoCode: "../../etc/passwd!" });
    expect(isValidLotCode(code)).toBe(true);
    expect(code.startsWith("ANN-") || /^ETC-|^PAS/.test(code)).toBe(true);
  });
});

describe("cropCode", () => {
  it("maps known crops and derives unknowns", () => {
    expect(cropCode("tomato")).toBe("TOM");
    expect(cropCode("ONION")).toBe("ONI");
    expect(cropCode("dragon fruit")).toBe("DRA");
    expect(cropCode("!!")).toBe("XXX");
  });
});

describe("verifyWeights", () => {
  const contributions = [
    { farmerCode: "KR-041", harvestCluster: "Hosur", contributedKg: 240 },
    { farmerCode: "KR-079", harvestCluster: "Hosur", contributedKg: 210 },
    { farmerCode: "TN-108", harvestCluster: "Shoolagiri", contributedKg: 170 },
  ];

  it("passes when packed weight matches contributions", () => {
    const v = verifyWeights(contributions, 620);
    expect(v.status).toBe("ok");
    expect(v.contributionsTotalKg).toBe(620);
    expect(v.discrepancyKg).toBe(0);
  });

  it("allows up to 2% handling loss as ok", () => {
    const v = verifyWeights(contributions, 612); // ~1.29% loss
    expect(v.status).toBe("ok");
    expect(v.discrepancyPercent).toBeLessThan(0);
  });

  it("warns between 2% and 5% shrinkage", () => {
    const v = verifyWeights(contributions, 597); // ~3.7% loss
    expect(v.status).toBe("warning");
  });

  it("flags mismatch above 5% and blocks dispatch messaging", () => {
    const v = verifyWeights(contributions, 500); // ~19% loss
    expect(v.status).toBe("mismatch");
    expect(v.message).toContain("not be dispatched");
  });

  it("handles zero contributions without crashing", () => {
    const v = verifyWeights([], 100);
    expect(Number.isFinite(v.discrepancyPercent) || v.discrepancyPercent === Number.POSITIVE_INFINITY).toBe(true);
    expect(v.status).toBe("mismatch");
  });
});
