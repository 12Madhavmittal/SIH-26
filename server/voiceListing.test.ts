import { describe, it, expect } from "vitest";
import { parseVoiceListing } from "./voiceListing";

describe("parseVoiceListing", () => {
  it("parses a full Hinglish listing with high confidence", () => {
    const r = parseVoiceListing("Meri 500 kg tamatar ki fasal tayar hai, A-grade, Hosur cluster me");
    expect(r.crop).toBe("tomato");
    expect(r.quantityKg).toBe(500);
    expect(r.grade).toBe("A");
    expect(r.harvestCluster).toBe("Hosur");
    expect(r.confidence).toBe("high");
  });

  it("handles quintal units and converts to kg", () => {
    const r = parseVoiceListing("maine 3 quintal pyaz harvest kiya");
    expect(r.crop).toBe("onion");
    expect(r.quantityKg).toBe(300);
  });

  it("handles tonne units", () => {
    const r = parseVoiceListing("2 ton aloo ready hai");
    expect(r.crop).toBe("potato");
    expect(r.quantityKg).toBe(2000);
  });

  it("supports Tamil transliteration", () => {
    const r = parseVoiceListing("irandu pattu thakkali ready");
    expect(r.crop).toBe("tomato");
    expect(r.quantityKg).toBeNull(); // word-pair compound not supported yet, so qty is null

    const digits = parseVoiceListing("200 kg thakkali tayar hai Hosur cluster");
    expect(digits.crop).toBe("tomato");
    expect(digits.quantityKg).toBe(200);
    expect(digits.harvestCluster).toBe("Hosur");
  });

  it("defaults grade to A when unspecified and returns high confidence when crop and qty exist", () => {
    const r = parseVoiceListing("400 kg kela hai");
    expect(r.grade).toBe("A");
    expect(r.crop).toBe("banana");
    expect(r.quantityKg).toBe(400);
    expect(r.confidence).toBe("high");
  });

  it("returns low confidence for unrelated speech", () => {
    const r = parseVoiceListing("aaj mausam bahut accha hai");
    expect(r.crop).toBeNull();
    expect(r.quantityKg).toBeNull();
    expect(r.confidence).toBe("low");
  });

  it("parses number-word quantities like do sau kilo", () => {
    const r = parseVoiceListing("do sau kilo tamatar taiyar hai");
    expect(r.quantityKg).toBe(200);
    expect(r.crop).toBe("tomato");
  });

  it("is deterministic", () => {
    const s = "250 kg mirchi B-grade Shoolagiri cluster";
    expect(parseVoiceListing(s)).toEqual(parseVoiceListing(s));
  });
});
