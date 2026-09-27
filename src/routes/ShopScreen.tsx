import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useStore } from "../lib/game/store.ts";
import {
  AVATARS,
  INSTRUMENTS,
  SHOP_CATALOG,
  THEMES,
  isDefaultItem,
  resolveAvatar,
  resolveTheme,
  type ShopItem,
} from "../lib/game/shop.ts";

/**
 * The points sink: harmony points buy cosmetics — color themes, avatars,
 * and instruments. Owned and equipped items persist in the save; equipping
 * an instrument changes the voice used across the app.
 */
export function ShopScreen() {
  const balance = useStore((s) => s.save.harmonyPoints);
  const shop = useStore((s) => s.save.shop);
  const buyShopItem = useStore((s) => s.buyShopItem);
  const equipShopItem = useStore((s) => s.equipShopItem);
  const [notice, setNotice] = useState<string | null>(null);

  const buy = (item: ShopItem) => {
    const result = buyShopItem(item.id);
    if (result === "ok") {
      setNotice(`${item.name} is yours!`);
      equipShopItem(item.id);
    } else if (result === "insufficient-points") {
      setNotice(`Not enough harmony points yet — ${item.name} costs ${item.price}.`);
    } else {
      setNotice(null);
    }
  };

  const sections: Array<{ title: string; blurb: string; items: ShopItem[] }> = [
    {
      title: "Color themes",
      blurb: "Recolor your practice hall.",
      items: THEMES,
    },
    {
      title: "Avatars",
      blurb: "Who's leading the quest today?",
      items: AVATARS,
    },
    {
      title: "Instruments",
      blurb: "Change the voice you hear across lessons and practice.",
      items: INSTRUMENTS,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl p-4 pb-16 sm:p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">🛍️ Shop</h1>
        <p className="text-sm text-white/60" aria-live="polite">
          {balance} harmony points
        </p>
      </div>
      <p className="mt-1 text-sm text-white/60">
        Spend points on looks and sounds — never on progress. Everything here is cosmetic.
      </p>
      {notice && (
        <p role="status" className="mt-3 rounded-xl bg-emerald-500/15 p-3 text-sm text-emerald-200">
          {notice}
        </p>
      )}

      {sections.map((section) => (
        <section key={section.title} className="mt-8" aria-label={section.title}>
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <p className="text-sm text-white/50">{section.blurb}</p>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {section.items.map((item) => (
              <ShopCard
                key={item.id}
                item={item}
                owned={isDefaultItem(item.id) || shop.owned.includes(item.id)}
                equipped={equippedId(shop, item) === item.id}
                balance={balance}
                onBuy={() => buy(item)}
                onEquip={() => equipShopItem(item.id)}
              />
            ))}
          </ul>
        </section>
      ))}

      <Link to="/" className="mt-8 block text-center text-sm text-white/60 underline">
        Back to the quest
      </Link>
    </div>
  );
}

function equippedId(
  shop: { theme: string; avatar: string; instrument: string },
  item: ShopItem,
): string {
  return item.kind === "theme" ? shop.theme : item.kind === "avatar" ? shop.avatar : shop.instrument;
}

function ShopCard({
  item,
  owned,
  equipped,
  balance,
  onBuy,
  onEquip,
}: {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  balance: number;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const preview =
    item.kind === "theme" ? (
      <span
        className="inline-block h-10 w-16 rounded-lg border border-white/20"
        style={{ background: resolveTheme(item.id).bg }}
        aria-hidden
      />
    ) : item.kind === "avatar" ? (
      <span className="text-4xl" aria-hidden>
        {resolveAvatar(item.id).emoji}
      </span>
    ) : (
      <span className="text-4xl" aria-hidden>
        {instrumentEmoji(item.id)}
      </span>
    );

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      {preview}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {item.name}
          {equipped && <span className="ml-2 text-xs font-normal text-emerald-300">Equipped</span>}
        </p>
        <p className="mt-0.5 text-xs text-white/50">{item.blurb}</p>
      </div>
      {equipped ? (
        <span className="shrink-0 text-sm font-semibold text-emerald-300">✓</span>
      ) : owned ? (
        <button
          type="button"
          onClick={onEquip}
          className="shrink-0 rounded-xl border border-white/20 px-3 py-1.5 text-sm font-semibold hover:border-white/50"
        >
          Equip
        </button>
      ) : (
        <button
          type="button"
          onClick={onBuy}
          disabled={balance < item.price}
          className="shrink-0 rounded-xl bg-amber-400 px-3 py-1.5 text-sm font-bold text-amber-950 disabled:opacity-40"
        >
          {item.price} pts
        </button>
      )}
    </li>
  );
}

function instrumentEmoji(id: string): string {
  switch (id) {
    case "piano":
      return "🎹";
    case "music-box":
      return "🎠";
    case "organ":
      return "🎺";
    default:
      return "🔔";
  }
}

/** All catalog ids, exported for tests and future tooling. */
export function catalogIds(): string[] {
  return SHOP_CATALOG.map((i) => i.id);
}
