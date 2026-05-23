import { describe, expect, it } from "vitest";
import {
  DRY_GOODS_CATEGORIES,
  normalizeDryGoodsCargo,
  normalizeDryGoodsCategory,
} from "@/lib/dry-goods";

describe("dry-goods category rules", () => {
  it("keeps the selectable categories inside the dry-goods scope", () => {
    expect(DRY_GOODS_CATEGORIES).toContain("General Dry Freight");
    expect(DRY_GOODS_CATEGORIES).toContain("Packaged Building Materials");
    expect(DRY_GOODS_CATEGORIES).toContain("Non-perishable Food & Beverages");
    expect(DRY_GOODS_CATEGORIES).not.toContain("Refrigerated Produce");
    expect(DRY_GOODS_CATEGORIES).not.toContain("Hazardous Chemicals");
  });

  it("maps legacy specialised freight labels to dry-goods categories", () => {
    expect(normalizeDryGoodsCategory("Reefer Produce")).toBe("Non-perishable Food & Beverages");
    expect(normalizeDryGoodsCategory("Construction Steel")).toBe("Packaged Building Materials");
    expect(normalizeDryGoodsCategory("Hazardous Chemicals")).toBe("Packaged Consumer Goods");
  });

  it("rewrites legacy cargo names into dry-goods demo cargo", () => {
    expect(normalizeDryGoodsCargo("Frozen seafood")).toBe("Cartons of packaged snacks");
    expect(normalizeDryGoodsCargo("Steel beams")).toBe("Packaged building materials");
    expect(normalizeDryGoodsCargo("", "Electronics & Appliances")).toBe("Electronics & Appliances");
  });
});
