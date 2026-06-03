import { describe, expect, it } from "vitest";
import { generateCounterMelody } from "../src/generators/generateCounterMelody";
import type { ChordEvent, MidiNote } from "../src/music/types";

describe("generateCounterMelody", () => {
  it("creates non-copying counter motion inside the requested range", () => {
    const melody: MidiNote[] = [
      { pitch: 76, startTime: 0, duration: 4, velocity: 80 },
      { pitch: 77, startTime: 4, duration: 1, velocity: 80 },
      { pitch: 79, startTime: 5, duration: 1, velocity: 80 },
    ];
    const chords: ChordEvent[] = [
      {
        startTime: 0,
        endTime: 4,
        rawPitches: [60, 64, 67, 71],
        pitchClasses: [0, 4, 7, 11],
        bassPitch: 60,
        quality: "unknown",
      },
      {
        startTime: 4,
        endTime: 6,
        rawPitches: [62, 65, 69, 72],
        pitchClasses: [2, 5, 9, 0],
        bassPitch: 62,
        quality: "unknown",
      },
    ];

    const counter = generateCounterMelody(melody, chords, { min: 55, max: 79 });

    expect(counter.length).toBeGreaterThan(melody.length);
    expect(counter.map((note) => note.pitch)).not.toEqual(melody.map((note) => note.pitch));
    for (const note of counter) {
      expect(note.pitch).toBeGreaterThanOrEqual(55);
      expect(note.pitch).toBeLessThanOrEqual(79);
    }
  });
});
