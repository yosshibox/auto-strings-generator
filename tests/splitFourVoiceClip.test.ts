import { describe, expect, it } from "vitest";
import { splitFourVoiceClip } from "../src/generators/splitFourVoiceClip";
import type { MidiNote } from "../src/music/types";

describe("splitFourVoiceClip", () => {
  it("splits four-note voicings into four string voices by pitch order", () => {
    const notes: MidiNote[] = [
      { pitch: 48, startTime: 4, duration: 2, velocity: 90 },
      { pitch: 67, startTime: 4, duration: 2, velocity: 91 },
      { pitch: 72, startTime: 4, duration: 2, velocity: 92 },
      { pitch: 60, startTime: 4, duration: 2, velocity: 93 },
      { pitch: 50, startTime: 6, duration: 1.5, velocity: 80 },
      { pitch: 69, startTime: 6, duration: 1.5, velocity: 81 },
      { pitch: 74, startTime: 6, duration: 1.5, velocity: 82 },
      { pitch: 62, startTime: 6, duration: 1.5, velocity: 83 },
    ];

    const result = splitFourVoiceClip(notes, 4, 8);

    expect(result.violin1.map((note) => note.pitch)).toEqual([72, 74]);
    expect(result.violin2.map((note) => note.pitch)).toEqual([67, 69]);
    expect(result.viola.map((note) => note.pitch)).toEqual([60, 62]);
    expect(result.cello.map((note) => note.pitch)).toEqual([48, 50]);
    expect(result.violin1[0]).toMatchObject({ startTime: 4, duration: 2, velocity: 92 });
  });

  it("throws when a voicing group does not contain exactly four notes", () => {
    expect(() =>
      splitFourVoiceClip(
        [
          { pitch: 60, startTime: 0, duration: 1 },
          { pitch: 64, startTime: 0, duration: 1 },
          { pitch: 67, startTime: 0, duration: 1 },
        ],
        0,
        1,
      ),
    ).toThrow("Expected at least 4 notes");
  });

  it("extracts the top three notes and bass when more than four notes are active", () => {
    const notes: MidiNote[] = [
      { pitch: 76, startTime: 0, duration: 4 },
      { pitch: 72, startTime: 0, duration: 4 },
      { pitch: 67, startTime: 0, duration: 4 },
      { pitch: 64, startTime: 0, duration: 4 },
      { pitch: 48, startTime: 0, duration: 4 },
    ];

    const result = splitFourVoiceClip(notes, 0, 4);

    expect(result.violin1.map((note) => note.pitch)).toEqual([76]);
    expect(result.violin2.map((note) => note.pitch)).toEqual([72]);
    expect(result.viola.map((note) => note.pitch)).toEqual([67]);
    expect(result.cello.map((note) => note.pitch)).toEqual([48]);
  });

  it("assigns a moving note by its rank among sustained active voices", () => {
    const notes: MidiNote[] = [
      { pitch: 72, startTime: 0, duration: 4 },
      { pitch: 67, startTime: 0, duration: 2 },
      { pitch: 60, startTime: 0, duration: 4 },
      { pitch: 48, startTime: 0, duration: 4 },
      { pitch: 69, startTime: 2, duration: 2 },
    ];

    const result = splitFourVoiceClip(notes, 0, 4);

    expect(result.violin1.map((note) => note.pitch)).toEqual([72]);
    expect(result.violin2.map((note) => note.pitch)).toEqual([67, 69]);
    expect(result.viola.map((note) => note.pitch)).toEqual([60]);
    expect(result.cello.map((note) => note.pitch)).toEqual([48]);
  });
});
