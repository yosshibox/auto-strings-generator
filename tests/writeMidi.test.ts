import { describe, expect, it } from "vitest";
import { writeVoiceOutput } from "../src/live/writeMidi";
import type { VoiceOutput } from "../src/music/types";

function createFakeSong() {
  const tracks: Array<{ name: string; clips: Array<{ startTime: number; duration: number; notes: unknown[] }> }> = [];
  return {
    tracks,
    song: {
      async createMidiTrack() {
        const track = {
          name: "",
          clips: [] as Array<{ startTime: number; duration: number; notes: unknown[] }>,
          async createMidiClip(startTime: number, duration: number) {
            const clip = { startTime, duration, notes: [] as unknown[] };
            track.clips.push(clip);
            return clip;
          },
        };
        tracks.push(track);
        return track;
      },
    },
  };
}

const context = {
  async withinTransaction(callback: () => Promise<void>) {
    await callback();
  },
};

describe("writeVoiceOutput", () => {
  it("writes all voices into one track and one clip when outputMode is singleTrack", async () => {
    const fake = createFakeSong();
    const output: VoiceOutput = {
      violin1: [{ pitch: 72, startTime: 4, duration: 2 }],
      violin2: [{ pitch: 67, startTime: 4, duration: 2 }],
      viola: [{ pitch: 60, startTime: 4, duration: 2 }],
      cello: [{ pitch: 48, startTime: 4, duration: 2 }],
    };

    await writeVoiceOutput(context as never, fake.song as never, output, 4, 8, "singleTrack");

    expect(fake.tracks).toHaveLength(1);
    expect(fake.tracks[0]?.name).toBe("Generated Strings");
    expect(fake.tracks[0]?.clips).toHaveLength(1);
    expect(fake.tracks[0]?.clips[0]?.duration).toBe(4);
    expect(fake.tracks[0]?.clips[0]?.notes).toEqual([
      { pitch: 72, startTime: 0, duration: 2 },
      { pitch: 67, startTime: 0, duration: 2 },
      { pitch: 60, startTime: 0, duration: 2 },
      { pitch: 48, startTime: 0, duration: 2 },
    ]);
  });

  it("keeps the existing four-track output mode", async () => {
    const fake = createFakeSong();
    const output: VoiceOutput = {
      violin1: [{ pitch: 72, startTime: 4, duration: 2 }],
      violin2: [{ pitch: 67, startTime: 4, duration: 2 }],
      viola: [{ pitch: 60, startTime: 4, duration: 2 }],
      cello: [{ pitch: 48, startTime: 4, duration: 2 }],
    };

    await writeVoiceOutput(context as never, fake.song as never, output, 4, 8, "fourTracks");

    expect(fake.tracks.map((track) => track.name)).toEqual([
      "Generated Violin I",
      "Generated Violin II",
      "Generated Viola",
      "Generated Cello",
    ]);
    expect(fake.tracks.map((track) => track.clips[0]?.notes)).toEqual([
      [{ pitch: 72, startTime: 0, duration: 2 }],
      [{ pitch: 67, startTime: 0, duration: 2 }],
      [{ pitch: 60, startTime: 0, duration: 2 }],
      [{ pitch: 48, startTime: 0, duration: 2 }],
    ]);
  });
});
