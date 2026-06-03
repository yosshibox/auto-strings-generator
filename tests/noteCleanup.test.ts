import { describe, expect, it } from "vitest";
import { mergeAdjacentSamePitch } from "../src/music/noteCleanup";

describe("mergeAdjacentSamePitch", () => {
  it("merges adjacent notes with the same pitch and compatible velocity", () => {
    expect(
      mergeAdjacentSamePitch([
        { pitch: 60, startTime: 0, duration: 4, velocity: 80 },
        { pitch: 60, startTime: 4, duration: 4, velocity: 80 },
        { pitch: 62, startTime: 8, duration: 1, velocity: 80 },
      ]),
    ).toEqual([
      { pitch: 60, startTime: 0, duration: 8, velocity: 80 },
      { pitch: 62, startTime: 8, duration: 1, velocity: 80 },
    ]);
  });
});
