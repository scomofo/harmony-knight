/**
 * Profile switcher UI: labelled controls, add/rename/delete flows, and the
 * delete-confirmation gate (typed name).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { HomeScreen } from "../routes/Screens.tsx";
import { useStore } from "../lib/game/store.ts";

function renderHome() {
  const rootRoute = createRootRoute({});
  const route = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomeScreen });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

function resetProfiles() {
  window.localStorage.clear();
  const ids = Object.keys(useStore.getState().profiles);
  for (const id of ids) useStore.getState().deleteProfile(id);
}

beforeEach(resetProfiles);

async function openSwitcher() {
  const chip = await screen.findByRole("button", { name: /switch profile/i });
  fireEvent.click(chip);
  return screen.getByRole("dialog", { name: "Who's playing?" });
}

describe("profile switcher", () => {
  it("shows the current profile chip with an accessible name", async () => {
    renderHome();
    const chip = await screen.findByRole("button", { name: "Switch profile. Current profile: Default" });
    expect(chip).toBeTruthy();
    expect(within(chip).getByText("Default")).toBeTruthy();
  });

  it("adds a profile through the one-screen name + avatar form", async () => {
    renderHome();
    await openSwitcher();
    fireEvent.click(screen.getByRole("button", { name: "＋ Add a profile" }));

    const dialog = screen.getByRole("dialog", { name: "New profile" });
    const nameInput = within(dialog).getByLabelText("Profile name");
    fireEvent.change(nameInput, { target: { value: "Maya" } });
    const avatars = within(dialog).getByRole("radiogroup", { name: "Pick an avatar" });
    fireEvent.click(within(avatars).getByRole("radio", { name: "Avatar 🦊" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Create profile" }));

    expect(useStore.getState().profiles[useStore.getState().activeProfileId].name).toBe("Maya");
    expect(useStore.getState().profiles[useStore.getState().activeProfileId].avatar).toBe("🦊");
    // Chip reflects the new current profile.
    expect(
      screen.getByRole("button", { name: "Switch profile. Current profile: Maya" }),
    ).toBeTruthy();
  });

  it("requires a name before creating a profile", async () => {
    renderHome();
    await openSwitcher();
    fireEvent.click(screen.getByRole("button", { name: "＋ Add a profile" }));
    const dialog = screen.getByRole("dialog", { name: "New profile" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create profile" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("a name");
    expect(Object.keys(useStore.getState().profiles)).toHaveLength(1);
  });

  it("renames a profile", async () => {
    useStore.getState().addProfile("Maya", "🦊");
    renderHome();
    await openSwitcher();
    fireEvent.click(screen.getByRole("button", { name: "Rename Maya" }));
    const dialog = screen.getByRole("dialog", { name: "Edit profile" });
    const nameInput = within(dialog).getByLabelText("Profile name");
    expect((nameInput as HTMLInputElement).value).toBe("Maya");
    fireEvent.change(nameInput, { target: { value: "Maya R." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(
      screen.getByRole("button", { name: "Switch profile. Current profile: Maya R." }),
    ).toBeTruthy();
  });

  it("delete requires typing the profile name, then removes it", async () => {
    useStore.getState().addProfile("Maya", "🦊");
    const first = Object.values(useStore.getState().profiles).find((p) => p.name === "Default")!;
    renderHome();
    await openSwitcher();
    fireEvent.click(screen.getByRole("button", { name: "Delete Maya" }));
    const dialog = screen.getByRole("dialog", { name: "Delete profile" });
    const confirm = within(dialog).getByLabelText(/type maya to confirm/i);
    const delButton = within(dialog).getByRole("button", { name: "Delete Maya" });
    expect((delButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(confirm, { target: { value: "may" } });
    expect((delButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(confirm, { target: { value: "Maya" } });
    expect((delButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(delButton);
    expect(useStore.getState().profiles[first.id]).toBeDefined();
    expect(Object.values(useStore.getState().profiles).some((p) => p.name === "Maya")).toBe(false);
  });

  it("deleting the last profile starts a fresh default", async () => {
    renderHome();
    await openSwitcher();
    fireEvent.click(screen.getByRole("button", { name: "Delete Default" }));
    const dialog = screen.getByRole("dialog", { name: "Delete profile" });
    expect(within(dialog).getByText(/last profile/)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText(/type default to confirm/i), {
      target: { value: "Default" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete Default" }));
    const state = useStore.getState();
    expect(Object.keys(state.profiles)).toHaveLength(1);
    const only = state.profiles[state.activeProfileId];
    expect(only.name).toBe("Default");
    expect(only.save.harmonyPoints).toBe(0);
  });

  it("escape closes the dialog", async () => {
    renderHome();
    await openSwitcher();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
