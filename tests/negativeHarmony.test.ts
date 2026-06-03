import { describe, expect, it } from "vitest";
import {
  applyNegativeHarmonyToNotes,
  inferNegativeHarmonyKeyCenter,
  negativeHarmonyPitch,
  negativePitchClass,
} from "../src/music/negativeHarmony";
import type { MidiNote } from "../src/music/types";

describe("negative harmony", () => {
  it("maps pitch classes around the C tonic-dominant axis", () => {
    expect(Array.from({ length: 12 }, (_, pc) => negativePitchClass(pc, 0))).toEqual([
      7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8,
    ]);
  });

  it("returns to the original pitch when converted twice with the same key center", () => {
    for (let pitch = 48; pitch <= 84; pitch += 1) {
      expect(negativeHarmonyPitch(negativeHarmonyPitch(pitch, 0), 0)).toBe(pitch);
    }
  });

  it("transforms only note pitches and preserves timing fields", () => {
    const notes: MidiNote[] = [
      { pitch: 60, startTime: 4, duration: 1, velocity: 94 },
      { pitch: 64, startTime: 4, duration: 1, velocity: 88 },
      { pitch: 67, startTime: 4, duration: 1, velocity: 90 },
    ];

    expect(applyNegativeHarmonyToNotes(notes, 0)).toEqual([
      { pitch: 55, startTime: 4, duration: 1, velocity: 94 },
      { pitch: 63, startTime: 4, duration: 1, velocity: 88 },
      { pitch: 72, startTime: 4, duration: 1, velocity: 90 },
    ]);
  });

  it("keeps chord voices ordered after conversion", () => {
    const notes: MidiNote[] = [
      { pitch: 48, startTime: 0, duration: 4 },
      { pitch: 52, startTime: 0, duration: 4 },
      { pitch: 55, startTime: 0, duration: 4 },
      { pitch: 60, startTime: 0, duration: 4 },
    ];

    expect(applyNegativeHarmonyToNotes(notes, 0).map((note) => note.pitch)).toEqual([43, 51, 55, 60]);
  });

  it("keeps chord revoicing reversible for the same key center", () => {
    const notes: MidiNote[] = [
      { pitch: 48, startTime: 0, duration: 4 },
      { pitch: 52, startTime: 0, duration: 4 },
      { pitch: 55, startTime: 0, duration: 4 },
      { pitch: 60, startTime: 0, duration: 4 },
      { pitch: 53, startTime: 4, duration: 4 },
      { pitch: 57, startTime: 4, duration: 4 },
      { pitch: 60, startTime: 4, duration: 4 },
      { pitch: 65, startTime: 4, duration: 4 },
    ];

    const converted = applyNegativeHarmonyToNotes(notes, 0);
    expect(applyNegativeHarmonyToNotes(converted, 0).map((note) => note.pitch)).toEqual(notes.map((note) => note.pitch));
  });

  it("infers C as the default key center from a multi-chord clip", () => {
    const notes: MidiNote[] = [
      { pitch: 60, startTime: 0, duration: 1 },
      { pitch: 64, startTime: 0, duration: 1 },
      { pitch: 67, startTime: 0, duration: 1 },
      { pitch: 65, startTime: 1, duration: 1 },
      { pitch: 69, startTime: 1, duration: 1 },
      { pitch: 72, startTime: 1, duration: 1 },
      { pitch: 67, startTime: 2, duration: 1 },
      { pitch: 71, startTime: 2, duration: 1 },
      { pitch: 74, startTime: 2, duration: 1 },
      { pitch: 60, startTime: 3, duration: 1 },
      { pitch: 64, startTime: 3, duration: 1 },
      { pitch: 67, startTime: 3, duration: 1 },
    ];

    expect(inferNegativeHarmonyKeyCenter(notes, 0, 4)).toBe(0);
  });
});
