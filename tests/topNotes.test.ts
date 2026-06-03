import { describe, expect, it } from "vitest";
import { extractTopNotes } from "../src/music/topNotes";
import type { MidiNote } from "../src/music/types";

describe("extractTopNotes", () => {
  it("keeps the highest overlapping note as the top note", () => {
    const notes: MidiNote[] = [
      { pitch: 76, startTime: 0, duration: 1, velocity: 70 },
      { pitch: 79, startTime: 0, duration: 1, velocity: 82 },
      { pitch: 77, startTime: 1, duration: 1, velocity: 74 },
    ];

    const topNotes = extractTopNotes(notes, 0, 2);

    expect(topNotes).toEqual([
      { pitch: 79, startTime: 0, endTime: 1, velocity: 82 },
      { pitch: 77, startTime: 1, endTime: 2, velocity: 74 },
    ]);
  });

  it("clips note boundaries to the selection", () => {
    const notes: MidiNote[] = [{ pitch: 72, startTime: -1, duration: 3, velocity: 64 }];

    expect(extractTopNotes(notes, 0, 1)).toEqual([
      { pitch: 72, startTime: 0, endTime: 1, velocity: 64 },
    ]);
  });
});
