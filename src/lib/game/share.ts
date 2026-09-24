/**
 * Shareable creations: link sharing and WAV export.
 *
 * A share link carries the whole melody in the URL (base64url JSON), so
 * anyone opening it can listen — no account, no server. WAV export renders
 * the same sine-with-envelope tone the composer plays, offline, via
 * OfflineAudioContext.
 */
import { midiToFreq } from "./music.ts";
import { parseCreationData } from "./creations.ts";

export type SharedCreation = {
  name: string;
  notes: number[];
};

const SHARE_VERSION = 1;
const MAX_SHARE_NAME = 60;

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replaceAll("-", "+").replaceAll("_", "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Encode a creation into a URL-safe share payload. */
export function encodeShare(name: string, notes: number[]): string {
  const payload = JSON.stringify({
    v: SHARE_VERSION,
    n: name.slice(0, MAX_SHARE_NAME),
    s: notes,
  });
  return bytesToB64url(new TextEncoder().encode(payload));
}

/** Decode a share payload. Null when malformed, versioned wrong, or empty. */
export function decodeShare(payload: string): SharedCreation | null {
  try {
    if (!payload || payload.length > 4096) return null;
    const json = new TextDecoder().decode(b64urlToBytes(payload));
    const data: unknown = JSON.parse(json);
    if (typeof data !== "object" || data === null) return null;
    const d = data as { v?: unknown; n?: unknown; s?: unknown };
    if (d.v !== SHARE_VERSION) return null;
    const { notes } = parseCreationData({ notes: d.s });
    if (notes.length === 0) return null;
    const name = typeof d.n === "string" && d.n.length > 0 ? d.n.slice(0, MAX_SHARE_NAME) : "Shared melody";
    return { name, notes };
  } catch {
    return null;
  }
}

/** Absolute share URL for a creation. */
export function shareUrl(name: string, notes: number[]): string {
  return `${window.location.origin}/shared/${encodeShare(name, notes)}`;
}

/** Render the melody to a 16-bit PCM WAV blob. Needs a real browser. */
export async function renderCreationWav(
  notes: number[],
  opts: { noteDuration?: number; gap?: number } = {},
): Promise<Blob> {
  const noteDuration = opts.noteDuration ?? 0.5;
  const gap = opts.gap ?? 0.05;
  const sampleRate = 44100;
  const total = notes.length * (noteDuration + gap) + 0.2;
  const ctx = new OfflineAudioContext(1, Math.ceil(total * sampleRate), sampleRate);

  let onset = 0;
  for (const midi of notes) {
    if (midi >= 0) {
      // Same voice as the composer: sine with a quick attack and gentle release.
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(midiToFreq(midi), onset);
      gain.gain.setValueAtTime(0.0001, onset);
      gain.gain.exponentialRampToValueAtTime(0.5, onset + 0.02);
      gain.gain.setValueAtTime(0.5, onset + Math.max(0.02, noteDuration - 0.08));
      gain.gain.exponentialRampToValueAtTime(0.0001, onset + noteDuration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(onset);
      osc.stop(onset + noteDuration + 0.05);
    }
    onset += noteDuration + gap;
  }

  const buffer = await ctx.startRendering();
  return bufferToWav(buffer);
}

type PcmBuffer = {
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  getChannelData(channel: number): Float32Array;
};

/** Encode raw PCM as a 16-bit WAV blob. */
export function bufferToWav(buffer: PcmBuffer): Blob {
  const channels = Math.min(2, buffer.numberOfChannels);
  const length = buffer.length;
  const dataSize = channels * length * 2;
  const out = new DataView(new ArrayBuffer(44 + dataSize));

  const writeAscii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) out.setUint8(offset + i, s.charCodeAt(i));
  };
  writeAscii(0, "RIFF");
  out.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  out.setUint32(16, 16, true); // PCM chunk size
  out.setUint16(20, 1, true); // PCM format
  out.setUint16(22, channels, true);
  out.setUint32(24, buffer.sampleRate, true);
  out.setUint32(28, buffer.sampleRate * channels * 2, true); // byte rate
  out.setUint16(32, channels * 2, true); // block align
  out.setUint16(34, 16, true); // bits per sample
  writeAscii(36, "data");
  out.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < channels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      out.setInt16(offset, Math.round(sample * 32767), true);
      offset += 2;
    }
  }
  return new Blob([out.buffer], { type: "audio/wav" });
}

/** Trigger a download of a blob. Returns the object URL for cleanup. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
