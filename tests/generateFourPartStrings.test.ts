import { describe, expect, it } from "vitest";
import { generateFourPartStrings } from "../src/generators/generateFourPartStrings";
import { groupChordEvents } from "../src/music/chordGrouping";
import type { ChordEvent, TopNoteEvent } from "../src/music/types";

describe("generateFourPartStrings", () => {
  it("preserves Violin I top notes and emits block lower voices", () => {
    const topNotes: TopNoteEvent[] = [
      { pitch: 79, startTime: 0, endTime: 2, velocity: 90 },
      { pitch: 81, startTime: 2, endTime: 4, velocity: 88 },
    ];
    const chords: ChordEvent[] = [
      {
        startTime: 0,
        endTime: 4,
        rawPitches: [48, 52, 55, 59],
        pitchClasses: [0, 4, 7, 11],
        bassPitch: 48,
        quality: "unknown",
      },
    ];

    const result = generateFourPartStrings(topNotes, chords, {
      topNoteHandling: "fixed",
      bassMode: "originalBass",
      rhythmMode: "topRhythmFollow",
      innerVoiceMode: "smooth",
      avoidParallelPerfects: true,
      legatoOverlapBeats: 0,
      velocityHumanize: 0,
    });

    expect(result.violin1.map((note) => note.pitch)).toEqual([79, 81]);
    expect(result.violin1.map((note) => note.startTime)).toEqual([0, 2]);
    expect(result.violin2).toHaveLength(1);
    expect(result.viola).toHaveLength(1);
    expect(result.cello).toHaveLength(1);
    expect(result.cello[0]!.pitch % 12).toBe(0);
  });

  it("does not create tiny lower-voice fragments from humanized chord input", () => {
    const topNotes: TopNoteEvent[] = [
      { pitch: 88, startTime: 27.49, endTime: 32.073, velocity: 73 },
      { pitch: 83, startTime: 31.948, endTime: 35.823, velocity: 50 },
    ];
    const chords = groupChordEvents(
      [
        { pitch: 64, startTime: 27.896, duration: 3.563 },
        { pitch: 68, startTime: 27.917, duration: 3.521 },
        { pitch: 71, startTime: 27.927, duration: 3.542 },
        { pitch: 74, startTime: 27.938, duration: 3.542 },
        { pitch: 64, startTime: 32.01, duration: 3.563 },
        { pitch: 68, startTime: 32.031, duration: 3.552 },
        { pitch: 71, startTime: 32.031, duration: 3.542 },
        { pitch: 76, startTime: 32.042, duration: 3.51 },
      ],
      27.8,
      36,
    );

    const result = generateFourPartStrings(topNotes, chords, {
      topNoteHandling: "fixed",
      bassMode: "originalBass",
      rhythmMode: "topRhythmFollow",
      innerVoiceMode: "smooth",
      avoidParallelPerfects: true,
      legatoOverlapBeats: 0,
      velocityHumanize: 0,
    });

    for (const voice of [result.violin2, result.viola, result.cello]) {
      expect(voice.length).toBeGreaterThanOrEqual(1);
      expect(Math.min(...voice.map((note) => note.duration))).toBeGreaterThan(3);
      expect(voice.reduce((sum, note) => sum + note.duration, 0)).toBeGreaterThan(7);
    }
  });

  it("keeps held lower voices away from the lowest top note inside the chord span", () => {
    const topNotes: TopNoteEvent[] = [
      { pitch: 84, startTime: 0, endTime: 1, velocity: 80 },
      { pitch: 78, startTime: 1, endTime: 4, velocity: 80 },
    ];
    const chords: ChordEvent[] = [
      {
        startTime: 0,
        endTime: 4,
        rawPitches: [50, 54, 57, 62, 66],
        pitchClasses: [2, 6, 9],
        bassPitch: 50,
        quality: "unknown",
      },
    ];

    const result = generateFourPartStrings(topNotes, chords, {
      topNoteHandling: "fixed",
      bassMode: "originalBass",
      rhythmMode: "topRhythmFollow",
      innerVoiceMode: "smooth",
      avoidParallelPerfects: true,
      legatoOverlapBeats: 0,
      velocityHumanize: 0,
    });

    expect(result.violin2[0]!.pitch).toBeLessThanOrEqual(73);
  });

  it("sustains the final top note to the final chord end when it is only slightly short", () => {
    const topNotes: TopNoteEvent[] = [{ pitch: 79, startTime: 0, endTime: 3.85, velocity: 80 }];
    const chords: ChordEvent[] = [
      {
        startTime: 0,
        endTime: 4,
        rawPitches: [48, 52, 55, 59],
        pitchClasses: [0, 4, 7, 11],
        bassPitch: 48,
        quality: "unknown",
      },
    ];

    const result = generateFourPartStrings(topNotes, chords, {
      topNoteHandling: "fixed",
      bassMode: "originalBass",
      rhythmMode: "topRhythmFollow",
      innerVoiceMode: "smooth",
      avoidParallelPerfects: true,
      legatoOverlapBeats: 0,
      velocityHumanize: 0,
    });

    expect(result.violin1[0]!.duration).toBeCloseTo(4.5);
  });
});
