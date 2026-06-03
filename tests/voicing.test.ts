import { describe, expect, it } from "vitest";
import { generateVoicingCandidates } from "../src/music/voicing";
import { STRING_RANGES } from "../src/music/ranges";
import type { ChordEvent } from "../src/music/types";

const cmaj7: ChordEvent = {
  startTime: 0,
  endTime: 4,
  rawPitches: [48, 52, 55, 59],
  pitchClasses: [0, 4, 7, 11],
  bassPitch: 48,
  quality: "unknown",
};

describe("generateVoicingCandidates", () => {
  it("creates in-range voicings without voice crossing", () => {
    const candidates = generateVoicingCandidates(cmaj7, 79);

    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      expect(candidate.violin2).toBeGreaterThanOrEqual(STRING_RANGES.violin2.min);
      expect(candidate.violin2).toBeLessThanOrEqual(STRING_RANGES.violin2.max);
      expect(candidate.viola).toBeGreaterThanOrEqual(STRING_RANGES.viola.min);
      expect(candidate.viola).toBeLessThanOrEqual(STRING_RANGES.viola.max);
      expect(candidate.cello).toBeGreaterThanOrEqual(STRING_RANGES.cello.min);
      expect(candidate.cello).toBeLessThanOrEqual(STRING_RANGES.cello.max);
      expect(candidate.cello).toBeLessThan(candidate.viola);
      expect(candidate.viola).toBeLessThan(candidate.violin2);
      expect(candidate.violin2).toBeLessThan(candidate.violin1);
    }
  });

  it("prefers preserving the original bass pitch class", () => {
    const best = generateVoicingCandidates(cmaj7, 79)[0];

    expect(best!.cello % 12).toBe(0);
  });

  it("keeps violin 2 below a supplied top-line safety ceiling", () => {
    const candidates = generateVoicingCandidates(cmaj7, 88, undefined, true, 76);

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.violin2 <= 76)).toBe(true);
  });

  it("starts from a balanced string-register voicing when there is no previous chord", () => {
    const best = generateVoicingCandidates(cmaj7, 79)[0]!;

    expect(best.violin1 - best.violin2).toBeGreaterThanOrEqual(5);
    expect(best.violin1 - best.violin2).toBeLessThanOrEqual(12);
    expect(best.violin2 - best.viola).toBeLessThanOrEqual(12);
    expect(best.viola - best.cello).toBeLessThanOrEqual(19);
    expect(best.cello).toBeGreaterThanOrEqual(43);
  });
});
