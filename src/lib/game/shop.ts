/**
 * Points sink: the shop. Harmony points buy cosmetics — color themes,
 * avatars, and instruments. Owned/equipped items persist in the save.
 *
 * Instruments are resolved by id string only (resolveInstrument), with a
 * graceful fallback to the default voice when the id is unknown. This
 * module never depends on voice-engine internals — it only names an
 * oscillator shape and gain that audio.ts understands.
 */

export type ShopKind = "theme" | "avatar" | "instrument";

export type ThemeDef = {
  id: string;
  kind: "theme";
  name: string;
  blurb: string;
  price: number;
  /** Page background (CSS). */
  bg: string;
  /** Accent color (CSS). */
  accent: string;
};

export type AvatarDef = {
  id: string;
  kind: "avatar";
  name: string;
  blurb: string;
  price: number;
  emoji: string;
};

export type InstrumentDef = {
  id: string;
  kind: "instrument";
  name: string;
  blurb: string;
  price: number;
  /** Named voice: oscillator shape + optional gain trim. */
  voice: { type: OscillatorType; gain?: number };
};

export type ShopItem = ThemeDef | AvatarDef | InstrumentDef;

export const THEMES: ThemeDef[] = [
  {
    id: "midnight",
    kind: "theme",
    name: "Midnight Keep",
    blurb: "The classic knight's hall. Yours from the start.",
    price: 0,
    bg: "#141021",
    accent: "#8b7ff0",
  },
  {
    id: "sunrise",
    kind: "theme",
    name: "Sunrise Courtyard",
    blurb: "Warm golds for morning practice.",
    price: 40,
    bg: "radial-gradient(1200px 800px at 20% 0%, #3a2b18 0%, #1c1410 60%, #141021 100%)",
    accent: "#f5b54a",
  },
  {
    id: "forest",
    kind: "theme",
    name: "Whispering Forest",
    blurb: "Deep greens, calm and steady.",
    price: 40,
    bg: "radial-gradient(1200px 800px at 80% 0%, #14301f 0%, #0f1f16 60%, #0c1410 100%)",
    accent: "#5fd08a",
  },
  {
    id: "ocean",
    kind: "theme",
    name: "Tidepool",
    blurb: "Cool blues that drift like a slow 6/8.",
    price: 40,
    bg: "radial-gradient(1200px 800px at 50% 0%, #123046 0%, #0e1e2e 60%, #0c121e 100%)",
    accent: "#5fb8d0",
  },
  {
    id: "ember",
    kind: "theme",
    name: "Ember Forge",
    blurb: "For fiery practice sessions. A little dramatic.",
    price: 60,
    bg: "radial-gradient(1200px 800px at 50% 0%, #3d1712 0%, #1f100e 60%, #120c0c 100%)",
    accent: "#f0724a",
  },
];

export const AVATARS: AvatarDef[] = [
  { id: "knight", kind: "avatar", name: "Knight", blurb: "The classic. Brave, a bit square.", price: 0, emoji: "🛡️" },
  { id: "dragon", kind: "avatar", name: "Dragon", blurb: "Breathes fire, reads bass clef.", price: 30, emoji: "🐉" },
  { id: "owl", kind: "avatar", name: "Owl", blurb: "Wise about modes. Up all night.", price: 30, emoji: "🦉" },
  { id: "fox", kind: "avatar", name: "Fox", blurb: "Quick on the draw with intervals.", price: 30, emoji: "🦊" },
  { id: "robot", kind: "avatar", name: "Metronome Bot", blurb: "Never rushes. Never drags.", price: 50, emoji: "🤖" },
  { id: "star", kind: "avatar", name: "Falling Star", blurb: "Makes every cadence sparkle.", price: 50, emoji: "⭐" },
];

export const INSTRUMENTS: InstrumentDef[] = [
  {
    id: "sine",
    kind: "instrument",
    name: "Pure Tone",
    blurb: "A clean sine wave. Simple and true.",
    price: 0,
    voice: { type: "sine" },
  },
  {
    id: "piano",
    kind: "instrument",
    name: "Grand Keys",
    blurb: "Warm and round, like a practice-room piano.",
    price: 60,
    voice: { type: "triangle" },
  },
  {
    id: "music-box",
    kind: "instrument",
    name: "Music Box",
    blurb: "Delicate and soft, for quiet evenings.",
    price: 60,
    voice: { type: "sine", gain: 0.35 },
  },
  {
    id: "organ",
    kind: "instrument",
    name: "Chapel Organ",
    blurb: "Big and reedy. Mind the neighbors.",
    price: 80,
    voice: { type: "sawtooth", gain: 0.3 },
  },
];

export const SHOP_CATALOG: ShopItem[] = [...THEMES, ...AVATARS, ...INSTRUMENTS];

export const DEFAULT_THEME = "midnight";
export const DEFAULT_AVATAR = "knight";
export const DEFAULT_INSTRUMENT = "sine";

export type ShopState = {
  /** Catalog ids the learner owns. Default (price-0) items are always usable. */
  owned: string[];
  theme: string;
  avatar: string;
  instrument: string;
};

export function defaultShop(): ShopState {
  return { owned: [], theme: DEFAULT_THEME, avatar: DEFAULT_AVATAR, instrument: DEFAULT_INSTRUMENT };
}

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_CATALOG.find((i) => i.id === id);
}

export function isDefaultItem(id: string): boolean {
  const item = shopItem(id);
  return !!item && item.price === 0;
}

/** Owned or free-by-default: equippable without a purchase. */
export function canEquip(state: ShopState, id: string): boolean {
  return isDefaultItem(id) || state.owned.includes(id);
}

/**
 * Resolve an instrument id to its voice spec. Unknown ids fall back to the
 * default voice — never throw, never depend on engine internals.
 */
export function resolveInstrument(id: string): InstrumentDef {
  const item = INSTRUMENTS.find((i) => i.id === id);
  return item ?? INSTRUMENTS[0]!;
}

export function resolveTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

export function resolveAvatar(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]!;
}

export type PurchaseResult =
  | { ok: true; state: ShopState; spent: number }
  | { ok: false; reason: "already-owned" | "insufficient-points" | "unknown-item"; state: ShopState };

/**
 * Pure purchase: deducts points, adds the item to owned. Returns the new
 * shop state; the caller applies the point deduction from `spent`.
 */
export function buyItem(state: ShopState, itemId: string, balance: number): PurchaseResult {
  const item = shopItem(itemId);
  if (!item) return { ok: false, reason: "unknown-item", state };
  if (state.owned.includes(itemId) || isDefaultItem(itemId))
    return { ok: false, reason: "already-owned", state };
  if (balance < item.price) return { ok: false, reason: "insufficient-points", state };
  return {
    ok: true,
    state: { ...state, owned: [...state.owned, itemId] },
    spent: item.price,
  };
}

/** Pure equip: only owned or default items may be equipped. */
export function equipItem(state: ShopState, itemId: string): ShopState {
  const item = shopItem(itemId);
  if (!item || !canEquip(state, itemId)) return state;
  return { ...state, [item.kind]: itemId } as ShopState;
}

/** Coerce unknown input into a valid ShopState, preserving good fields. */
export function sanitizeShop(v: unknown): ShopState {
  const d = defaultShop();
  if (typeof v !== "object" || v === null || Array.isArray(v)) return d;
  const r = v as Record<string, unknown>;
  const owned = Array.isArray(r.owned)
    ? r.owned.filter((id): id is string => typeof id === "string" && !!shopItem(id))
    : d.owned;
  const pick = (key: "theme" | "avatar" | "instrument", fallback: string) => {
    const id = r[key];
    if (typeof id !== "string") return fallback;
    const item = shopItem(id);
    if (!item || item.kind !== key) return fallback;
    return canEquip({ ...d, owned }, id) ? id : fallback;
  };
  return {
    owned,
    theme: pick("theme", d.theme),
    avatar: pick("avatar", d.avatar),
    instrument: pick("instrument", d.instrument),
  };
}
