/**
 * Batch 6 ("Reasons to return"): shop purchase/equip flow, endless
 * practice rendering, skill ratings on Home, and the store actions behind
 * them.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
  type RouteComponent,
} from "@tanstack/react-router";
import { ShopScreen } from "../routes/ShopScreen.tsx";
import { EndlessScreen } from "../routes/EndlessScreen.tsx";
import { HomeScreen } from "../routes/Screens.tsx";
import { useStore } from "../lib/game/store.ts";

function renderAt(path: string, component: RouteComponent) {
  const rootRoute = createRootRoute({});
  const route = createRoute({ getParentRoute: () => rootRoute, path, component });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  window.localStorage.clear();
  useStore.getState().resetSave();
});

describe("shop screen", () => {
  it("buys an affordable item, deducts points, and equips it", async () => {
    act(() => {
      useStore.getState().addPoints(100);
    });
    renderAt("/shop", ShopScreen);
    expect(await screen.findByText("100 harmony points")).toBeTruthy();

    // Dragon is the first 30-pt item (avatars section order is stable).
    const buyDragon = screen.getAllByRole("button", { name: "30 pts" })[0]!;
    fireEvent.click(buyDragon);

    expect(useStore.getState().save.harmonyPoints).toBe(70);
    expect(useStore.getState().save.shop.owned).toContain("dragon");
    expect(useStore.getState().save.shop.avatar).toBe("dragon");
    expect(await screen.findByText("Dragon is yours!")).toBeTruthy();
  });

  it("refuses purchases the balance cannot cover", async () => {
    renderAt("/shop", ShopScreen);
    const organ = await screen.findByRole("button", { name: "80 pts" });
    expect(organ).toBeDisabled();
    expect(useStore.getState().save.shop.owned).not.toContain("organ");
  });

  it("equips owned items without spending again", async () => {
    act(() => {
      const s = useStore.getState();
      s.addPoints(100);
      expect(s.buyShopItem("sunrise")).toBe("ok");
      // Bought but not equipped (buy auto-equips, so switch away first).
      s.equipShopItem("midnight");
    });
    renderAt("/shop", ShopScreen);
    const equip = await screen.findByRole("button", { name: "Equip" });
    fireEvent.click(equip);
    expect(useStore.getState().save.shop.theme).toBe("sunrise");
    expect(useStore.getState().save.harmonyPoints).toBe(60);
  });
});

describe("store shop actions", () => {
  it("buyShopItem reports unknown/already-owned/insufficient distinctly", () => {
    const s = useStore.getState();
    expect(s.buyShopItem("nope")).toBe("unknown-item");
    expect(s.buyShopItem("knight")).toBe("already-owned"); // default item
    expect(s.buyShopItem("organ")).toBe("insufficient-points");
  });

  it("recordEndlessAttempt accumulates per task kind", () => {
    const s = useStore.getState();
    act(() => {
      s.recordEndlessAttempt("chord-id", true);
      s.recordEndlessAttempt("chord-id", false);
    });
    expect(useStore.getState().save.practiceEvidence["chord-id"]).toEqual({
      attempts: 2,
      correct: 1,
    });
  });
});

describe("endless practice screen", () => {
  it("explains the mode and starts a session", async () => {
    renderAt("/endless", EndlessScreen);
    expect(await screen.findByText("Endless practice")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start practicing" }));
    expect(await screen.findByText("Round 1")).toBeTruthy();
    // A real task from the seeded engine is on screen.
    expect(screen.getByTestId("task-player")).toBeTruthy();
    // Starting counts today as a learning day.
    expect(useStore.getState().save.learningDays.length).toBe(1);
  });
});

describe("home skill ratings", () => {
  it("shows the ratings section and the equipped avatar", async () => {
    renderAt("/", HomeScreen);
    expect(await screen.findByText("Skill ratings")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Avatar: Knight" })).toBeTruthy();
    expect(screen.getByText("♾️ Endless practice")).toBeTruthy();
    expect(screen.getByText("🛍️ Shop")).toBeTruthy();
  });
});
