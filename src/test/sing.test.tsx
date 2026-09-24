/**
 * Singing studio: mic permission flow (grant / deny), round start in the
 * listen phase, and mic teardown on break. Audio and mic are faked; pitch
 * DSP itself is covered in pitch.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { SingScreen } from "../routes/SingScreen.tsx";

class FakeParam {
  value = 0;
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class FakeNode {
  connect() {}
}
class FakeGain extends FakeNode {
  gain = new FakeParam();
}
class FakeOsc extends FakeNode {
  type = "sine";
  frequency = new FakeParam();
  start() {}
  stop() {}
}
class FakeAnalyser extends FakeNode {
  fftSize = 2048;
  getFloatTimeDomainData(arr: Float32Array) {
    arr.fill(0); // silence
  }
}
class FakeAudioContext {
  state: AudioContextState = "running";
  sampleRate = 44100;
  currentTime = 0;
  createGain() {
    return new FakeGain();
  }
  createOscillator() {
    return new FakeOsc();
  }
  createMediaStreamSource() {
    return new FakeNode();
  }
  createAnalyser() {
    return new FakeAnalyser();
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

const stopTrack = vi.fn();
const fakeStream = { getTracks: () => [{ stop: stopTrack }] };
const getUserMedia = vi.fn();

function renderSing() {
  const rootRoute = createRootRoute({});
  const route = createRoute({ getParentRoute: () => rootRoute, path: "/", component: SingScreen });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  window.localStorage.clear();
  stopTrack.mockClear();
  getUserMedia.mockReset();
  vi.stubGlobal("AudioContext", FakeAudioContext);
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  Object.defineProperty(window.navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
});

describe("singing studio", () => {
  it("asks for the mic with a privacy note before anything else", async () => {
    renderSing();
    expect(await screen.findByText("Turn on the microphone")).toBeTruthy();
    expect(await screen.findByText(/nothing is recorded/i)).toBeTruthy();
  });

  it("shows guidance and a retry when the mic is denied", async () => {
    getUserMedia.mockRejectedValueOnce(new Error("NotAllowedError"));
    renderSing();
    const enable = await screen.findByText("Turn on the microphone");
    await act(async () => {
      fireEvent.click(enable);
    });
    expect(await screen.findByText(/browser said no/i)).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("starts round one in the listen phase when the mic is granted", async () => {
    getUserMedia.mockResolvedValueOnce(fakeStream);
    renderSing();
    const enable = await screen.findByText("Turn on the microphone");
    await act(async () => {
      fireEvent.click(enable);
    });
    expect(await screen.findByText("Listen…")).toBeTruthy();
    expect(screen.getByText("Round 1")).toBeTruthy();
  });

  it("taking a break stops the mic and returns to the prompt", async () => {
    getUserMedia.mockResolvedValueOnce(fakeStream);
    renderSing();
    const enable = await screen.findByText("Turn on the microphone");
    await act(async () => {
      fireEvent.click(enable);
    });
    await screen.findByText("Listen…");
    await act(async () => {
      fireEvent.click(screen.getByText(/take a break/i));
    });
    expect(stopTrack).toHaveBeenCalled();
    expect(screen.getByText("Turn on the microphone")).toBeTruthy();
  });
});
