import { describe, expect, it } from "vitest";
import { groupChordEvents } from "../src/music/chordGrouping";
import type { MidiNote } from "../src/music/types";

describe("groupChordEvents", () => {
  it("groups near-simultaneous chord notes and derives pitch classes", () => {
    const notes: MidiNote[] = [
      { pitch: 60, startTime: 0, duration: 4 },
      { pitch: 64, startTime: 0.01, duration: 4 },
      { pitch: 67, startTime: 0.02, duration: 4 },
      { pitch: 71, startTime: 0.02, duration: 4 },
      { pitch: 62, startTime: 4, duration: 4 },
      { pitch: 65, startTime: 4, duration: 4 },
      { pitch: 69, startTime: 4.01, duration: 4 },
      { pitch: 72, startTime: 4.02, duration: 4 },
    ];

    const chords = groupChordEvents(notes, 0, 8);

    expect(chords).toHaveLength(2);
    expect(chords[0]?.pitchClasses).toEqual([0, 4, 7, 11]);
    expect(chords[0]?.startTime).toBe(0);
    expect(chords[0]?.endTime).toBe(4);
    expect(chords[1]?.pitchClasses).toEqual([2, 5, 9, 0]);
    expect(chords[1]?.endTime).toBe(8);
  });

  it("ignores muted notes and notes outside the selection", () => {
    const notes: MidiNote[] = [
      { pitch: 60, startTime: -8, duration: 1 },
      { pitch: 60, startTime: 0, duration: 4 },
      { pitch: 64, startTime: 0, duration: 4, muted: true },
      { pitch: 67, startTime: 0, duration: 4 },
    ];

    const chords = groupChordEvents(notes, 0, 4);

    expect(chords).toHaveLength(1);
    expect(chords[0]?.pitchClasses).toEqual([0, 7]);
  });

  it("keeps humanized chord onsets together instead of creating tiny fragments", () => {
    const notes: MidiNote[] = [
      { pitch: 64, startTime: 27.896, duration: 3.563 },
      { pitch: 68, startTime: 27.917, duration: 3.521 },
      { pitch: 71, startTime: 27.927, duration: 3.542 },
      { pitch: 74, startTime: 27.938, duration: 3.542 },
      { pitch: 64, startTime: 32.01, duration: 3.563 },
      { pitch: 68, startTime: 32.031, duration: 3.552 },
      { pitch: 71, startTime: 32.031, duration: 3.542 },
      { pitch: 76, startTime: 32.042, duration: 3.51 },
    ];

    const chords = groupChordEvents(notes, 27.8, 36);

    expect(chords).toHaveLength(2);
    expect(chords[0]?.rawPitches).toEqual([64, 68, 71, 74]);
    expect(chords[0]?.endTime).toBeCloseTo(32.01);
    expect(chords[0]!.endTime - chords[0]!.startTime).toBeGreaterThan(4);
  });

  it("keeps wider exported MIDI onset spreads together", () => {
    const notes: MidiNote[] = [
      { pitch: 69, startTime: 19.885, duration: 7.156 },
      { pitch: 65, startTime: 19.948, duration: 7.198 },
      { pitch: 76, startTime: 19.958, duration: 7.083 },
      { pitch: 72, startTime: 19.979, duration: 7.146 },
      { pitch: 71, startTime: 27.896, duration: 3.563 },
      { pitch: 68, startTime: 27.917, duration: 3.521 },
      { pitch: 64, startTime: 27.927, duration: 3.542 },
      { pitch: 74, startTime: 27.938, duration: 3.542 },
    ];

    const chords = groupChordEvents(notes, 19.8, 32);

    expect(chords).toHaveLength(2);
    expect(chords[0]?.rawPitches).toEqual([65, 69, 72, 76]);
    expect(chords[0]!.endTime - chords[0]!.startTime).toBeGreaterThan(7);
  });
});
