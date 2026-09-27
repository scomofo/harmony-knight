/**
 * Shop: purchase logic, equipping rules, defensive instrument resolution,
 * and save sanitization.
 */
import { describe, expect, it } from "vitest";
import {
  AVATARS,
  INSTRUMENTS,
  SHOP_CATALOG,
  THEMES,
  buyItem,
  canEquip,
  defaultShop,
  equipItem,
  isDefaultItem,
  resolveAvatar,
  resolveInstrument,
  resolveTheme,
  sanitizeShop,
  shopItem,
} from "./shop.ts";

describe("shop catalog", () => {
  it("has unique ids across all kinds", () => {
    const ids = SHOP_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every item has a non-negative price and a blurb", () => {
    for (const item of SHOP_CATALOG) {
      expect(item.price).toBeGreaterThanOrEqual(0);
      expect(item.blurb.length).toBeGreaterThan(0);
      expect(item.name.length).toBeGreaterThan(0);
    }
  });

  it("covers themes, avatars, and instruments", () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(3);
    expect(AVATARS.length).toBeGreaterThanOrEqual(3);
    expect(INSTRUMENTS.length).toBeGreaterThanOrEqual(3);
  });
});

describe("buyItem", () => {
  it("deducts points and adds the item to owned", () => {
    const r = buyItem(defaultShop(), "dragon", 100);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spent).toBe(30);
      expect(r.state.owned).toContain("dragon");
    }
  });

  it("rejects unknown items without touching state", () => {
    const before = defaultShop();
    const r = buyItem(before, "flying-carpet", 1000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unknown-item");
    expect(r.state).toBe(before);
  });

  it("rejects items the learner already owns", () => {
    const owned = { ...defaultShop(), owned: ["dragon"] };
    const r = buyItem(owned, "dragon", 100);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("already-owned");
  });

  it("rejects default (free) items as already-owned", () => {
    const r = buyItem(defaultShop(), "knight", 100);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("already-owned");
  });

  it("rejects purchases the balance cannot cover", () => {
    const r = buyItem(defaultShop(), "organ", 10);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("insufficient-points");
      expect(r.state.owned).not.toContain("organ");
    }
  });

  it("allows spending the exact balance", () => {
    const r = buyItem(defaultShop(), "dragon", 30);
    expect(r.ok).toBe(true);
  });
});

describe("equipItem", () => {
  it("equips default items without a purchase", () => {
    const s = equipItem(defaultShop(), "sine");
    expect(s.instrument).toBe("sine");
  });

  it("equips owned items", () => {
    const owned = { ...defaultShop(), owned: ["ember", "dragon", "organ"] };
    expect(equipItem(owned, "ember").theme).toBe("ember");
    expect(equipItem(owned, "dragon").avatar).toBe("dragon");
    expect(equipItem(owned, "organ").instrument).toBe("organ");
  });

  it("refuses unowned items and unknown ids", () => {
    const before = defaultShop();
    expect(equipItem(before, "ember")).toBe(before);
    expect(equipItem(before, "nope")).toBe(before);
  });

  it("never cross-wires kinds", () => {
    const owned = { ...defaultShop(), owned: ["dragon"] };
    const s = equipItem(owned, "dragon");
    expect(s.avatar).toBe("dragon");
    expect(s.theme).toBe("midnight");
  });
});

describe("defensive resolution", () => {
  it("falls back to the default instrument for unknown ids", () => {
    expect(resolveInstrument("kazoo").id).toBe("sine");
    expect(resolveInstrument("").id).toBe("sine");
  });

  it("falls back for unknown themes and avatars", () => {
    expect(resolveTheme("nope").id).toBe("midnight");
    expect(resolveAvatar("nope").id).toBe("knight");
  });

  it("resolves every catalogued instrument to a voice", () => {
    for (const inst of INSTRUMENTS) {
      const v = resolveInstrument(inst.id).voice;
      expect(typeof v.type).toBe("string");
    }
  });
});

describe("sanitizeShop", () => {
  it("accepts a well-formed shop state", () => {
    const s = { owned: ["dragon", "forest", "owl", "piano"], theme: "forest", avatar: "owl", instrument: "piano" };
    expect(sanitizeShop(s)).toEqual(s);
  });

  it("drops unknown owned ids and resets unequippable selections", () => {
    const s = sanitizeShop({
      owned: ["dragon", "bogus"],
      theme: "ember", // not owned -> default
      avatar: "knight",
      instrument: "organ", // not owned -> default
    });
    expect(s.owned).toEqual(["dragon"]);
    expect(s.theme).toBe("midnight");
    expect(s.avatar).toBe("knight");
    expect(s.instrument).toBe("sine");
  });

  it("returns defaults for garbage", () => {
    expect(sanitizeShop(null)).toEqual(defaultShop());
    expect(sanitizeShop("nope")).toEqual(defaultShop());
    expect(sanitizeShop([])).toEqual(defaultShop());
  });

  it("isDefaultItem marks only free items", () => {
    expect(isDefaultItem("knight")).toBe(true);
    expect(isDefaultItem("dragon")).toBe(false);
    expect(canEquip(defaultShop(), "midnight")).toBe(true);
    expect(canEquip(defaultShop(), "sunrise")).toBe(false);
    expect(shopItem("sunrise")?.kind).toBe("theme");
  });
});
