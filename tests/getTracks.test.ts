import { describe, expect, it } from "vitest";
import {
  AUTO_STRINGS_CHORD_TRACK_NAME,
  AUTO_STRINGS_TOP_TRACK_NAME,
  getPreferredAutoStringTrackIndices,
  type MidiTrackWithIndex,
} from "../src/live/getTracks";

function track(index: number, name: string): MidiTrackWithIndex {
  return {
    index,
    track: { name } as MidiTrackWithIndex["track"],
  };
}

describe("getPreferredAutoStringTrackIndices", () => {
  it("prefers exact autoStrings source track names", () => {
    const preferred = getPreferredAutoStringTrackIndices([
      track(0, "Piano"),
      track(1, AUTO_STRINGS_CHORD_TRACK_NAME),
      track(2, AUTO_STRINGS_TOP_TRACK_NAME),
    ]);

    expect(preferred).toEqual({
      topTrackIndex: 2,
      chordTrackIndex: 1,
    });
  });

  it("leaves indices undefined when the exact names are absent", () => {
    expect(getPreferredAutoStringTrackIndices([track(0, "autoStringsTop")])).toEqual({});
  });
});
