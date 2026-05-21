export const DRY_GOODS_CATEGORIES = [
  "General Dry Freight",
  "Palletized Goods",
  "Packaged Consumer Goods",
  "Retail Merchandise",
  "Electronics & Appliances",
  "Furniture & Homewares",
  "Textiles & Apparel",
  "Paper & Printing Products",
  "Packaged Building Materials",
  "Machinery Parts",
  "Non-perishable Food & Beverages",
] as const;

const CATEGORY_ALIASES: Record<string, string> = {
  "dry goods": "General Dry Freight",
  "general freight": "General Dry Freight",
  "reefer produce": "Non-perishable Food & Beverages",
  "refrigerated produce": "Non-perishable Food & Beverages",
  "frozen goods": "Non-perishable Food & Beverages",
  "perishable food": "Non-perishable Food & Beverages",
  "construction steel": "Packaged Building Materials",
  "flatbed steel": "Packaged Building Materials",
  steel: "Packaged Building Materials",
  hazardous: "Packaged Consumer Goods",
  "hazardous chemicals": "Packaged Consumer Goods",
  "consumer electronics": "Electronics & Appliances",
};

const CARGO_ALIASES: Record<string, string> = {
  "refrigerated produce pallets": "Palletized non-perishable groceries",
  "produce pallets": "Palletized non-perishable groceries",
  "frozen seafood": "Cartons of packaged snacks",
  "frozen goods": "Cartons of packaged snacks",
  "perishable food": "Packaged pantry goods",
  "steel beams": "Packaged building materials",
  "construction steel": "Packaged building materials",
  "hazardous chemicals": "Boxed household supplies",
  hazardous: "Boxed household supplies",
};

export function normalizeDryGoodsCategory(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return DRY_GOODS_CATEGORIES[0];

  const normalized = normalizeDryGoodsKey(raw);
  const direct = CATEGORY_ALIASES[normalized];
  if (direct) return direct;

  return DRY_GOODS_CATEGORIES.includes(raw as typeof DRY_GOODS_CATEGORIES[number])
    ? raw
    : raw;
}

export function normalizeDryGoodsCargo(value: string | null | undefined, fallbackCategory?: string | null) {
  const raw = (value ?? "").trim();
  const normalized = normalizeDryGoodsKey(raw);
  const direct = CARGO_ALIASES[normalized];
  if (direct) return direct;

  if (normalized.includes("refrigerated") || normalized.includes("reefer") || normalized.includes("produce")) {
    return "Palletized non-perishable groceries";
  }

  if (normalized.includes("frozen") || normalized.includes("perishable")) {
    return "Cartons of packaged snacks";
  }

  if (normalized.includes("hazard") || normalized.includes("chemical")) {
    return "Boxed household supplies";
  }

  if (normalized.includes("steel") || normalized.includes("construction")) {
    return "Packaged building materials";
  }

  return raw || normalizeDryGoodsCategory(fallbackCategory);
}

function normalizeDryGoodsKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
