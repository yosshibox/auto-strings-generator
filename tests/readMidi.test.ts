import { describe, expect, it } from "vitest";
import { MidiClip, type MidiTrack } from "@ableton-extensions/sdk";
import { arrangementMidiNoteRange } from "../src/live/readMidi";

function midiClip(startTime: number, notes: MidiClip<"1.0.0">["notes"], duration?: number): MidiClip<"1.0.0"> {
  const clip = Object.create(MidiClip.prototype) as MidiClip<"1.0.0">;
  const endTime =
    startTime +
    (duration ??
      notes.reduce((maxEnd, note) => Math.max(maxEnd, note.startTime + note.duration), Number.NEGATIVE_INFINITY));
  Object.defineProperties(clip, {
    startTime: { get: () => startTime },
    endTime: { get: () => endTime },
    notes: { get: () => notes },
  });
  return clip;
}

function midiTrack(clips: MidiClip<"1.0.0">[]): MidiTrack<"1.0.0"> {
  return { arrangementClips: clips } as unknown as MidiTrack<"1.0.0">;
}

describe("arrangementMidiNoteRange", () => {
  it("derives the full clip range across source arrangement tracks", () => {
    const topTrack = midiTrack([
      midiClip(4, [{ pitch: 88, startTime: 0.25, duration: 4 }]),
      midiClip(28, [{ pitch: 83, startTime: 3.948, duration: 3.875 }], 8),
    ]);
    const chordTrack = midiTrack([
      midiClip(4, [{ pitch: 57, startTime: 0, duration: 8 }]),
      midiClip(32, [{ pitch: 64, startTime: 0.01, duration: 3.563 }], 4),
    ]);

    expect(arrangementMidiNoteRange(topTrack, chordTrack)).toEqual({
      startTime: 4,
      endTime: 36,
    });
  });

  it("returns null when there are no unmuted arrangement notes", () => {
    expect(arrangementMidiNoteRange(midiTrack([midiClip(0, [{ pitch: 60, startTime: 0, duration: 1, muted: true }])]))).toBeNull();
  });
});
