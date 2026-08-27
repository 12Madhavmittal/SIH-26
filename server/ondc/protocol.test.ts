import { describe, it, expect } from "vitest";
import { formatOndcCatalog } from "./protocol";

describe("formatOndcCatalog", () => {
  const mockListings = [
    {
      id: "tomato-01",
      crop: "Tomato",
      lotCode: "KHC-TOM-0826-A",
      variety: "Grade A sorted",
      color: "tomato",
      price: { directBuyerPrice: 28.0 },
      fpo: "Krishnagiri Harvest Collective",
      marketReference: { pricePerKg: 22.5 },
      comparison: { farmerUpliftPercent: 53 },
    },
  ];

  it("formats catalog payload in strict compliance with Beckn Protocol v1.2.0 for ONDC", () => {
    const ondc = formatOndcCatalog(mockListings, "Krishnagiri Harvest Collective", "Krishnagiri");

    expect(ondc.context.domain).toBe("ONDC:AGR10");
    expect(ondc.context.core_version).toBe("1.2.0");
    expect(ondc.context.action).toBe("on_search");
    expect(ondc.context.country).toBe("IND");

    const providers = ondc.message.catalog["bpp/providers"];
    expect(providers.length).toBe(1);
    expect(providers[0].items.length).toBe(1);

    const item = providers[0].items[0];
    expect(item.descriptor.name).toBe("Tomato");
    expect(item.price.currency).toBe("INR");
    expect(item.price.value).toBe("28");
    expect(item.tags[0].code).toBe("provenance");
  });
});
