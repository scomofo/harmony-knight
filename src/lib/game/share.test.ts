/**
 * Shareable creations: link encoding round-trips, hostile payloads, and
 * WAV encoding against a synthetic PCM buffer (jsdom has no Web Audio).
 */
import { describe, expect, it } from "vitest";
import { bufferToWav, decodeShare, encodeShare } from "./share.ts";

describe("share links", () => {
  it("round-trips a melody through a URL-safe payload", () => {
    const payload = encodeShare("My tune", [60, 62, 64, 67]);
    expect(payload).not.toMatch(/[+/=]/); // URL-safe
    expect(payload).not.toContain("/");
    expect(decodeShare(payload)).toEqual({ name: "My tune", notes: [60, 62, 64, 67] });
  });

  it("survives unicode names (emoji titles)", () => {
    const payload = encodeShare("🎺 My jam!", [60, 64]);
    expect(decodeShare(payload)?.name).toBe("🎺 My jam!");
  });

  it("rejects hostile or malformed payloads", () => {
    expect(decodeShare("")).toBeNull();
    expect(decodeShare("!!!not-base64!!!")).toBeNull();
    expect(decodeShare(encodeShare("x", []))).toBeNull(); // empty melody
    // Wrong version.
    const v2 = btoa(JSON.stringify({ v: 2, n: "x", s: [60] }))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    expect(decodeShare(v2)).toBeNull();
    // Oversized.
    expect(decodeShare("a".repeat(5000))).toBeNull();
  });

  it("clamps out-of-range notes the same way storage does", () => {
    const payload = encodeShare("x", [60, 999, -5]);
    expect(decodeShare(payload)?.notes).toEqual([60, 127, 0]);
  });
});

describe("WAV export", () => {
  function fakeBuffer(samples: number[], sampleRate = 44100) {
    const data = new Float32Array(samples);
    return {
      sampleRate,
      numberOfChannels: 1,
      length: samples.length,
      getChannelData: (ch: number) => {
        if (ch !== 0) throw new Error("only mono here");
        return data;
      },
    };
  }

  /** jsdom's Blob has no arrayBuffer(); FileReader works. */
  function blobBytes(blob: Blob): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
  }

  it("writes a valid 16-bit PCM WAV", async () => {
    const blob = bufferToWav(fakeBuffer([0, 0.5, -0.5, 1, -1]));
    expect(blob.type).toBe("audio/wav");
    const bytes = await blobBytes(blob);
    const ascii = (o: number, n: number) => String.fromCharCode(...bytes.slice(o, o + n));
    expect(ascii(0, 4)).toBe("RIFF");
    expect(ascii(8, 4)).toBe("WAVE");
    expect(ascii(12, 4)).toBe("fmt ");
    expect(ascii(36, 4)).toBe("data");
    // 44-byte header + 5 samples * 2 bytes.
    expect(bytes.length).toBe(44 + 10);
    const view = new DataView(bytes.buffer);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(34, true)).toBe(16); // 16-bit
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(Math.round(0.5 * 32767));
    expect(view.getInt16(48, true)).toBe(Math.round(-0.5 * 32767));
  });

  it("clips samples outside [-1, 1]", async () => {
    const blob = bufferToWav(fakeBuffer([2, -2]));
    const view = new DataView((await blobBytes(blob)).buffer);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32767);
  });
});
