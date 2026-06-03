import type { MidiTrack, Song } from "@ableton-extensions/sdk";
import type { ExtensionContext } from "@ableton-extensions/sdk";
import type { MidiNote, VoiceOutput } from "../music/types";

function toClipRelativeNotes(notes: MidiNote[], clipStart: number): MidiNote[] {
  return notes
    .filter((note) => note.duration > 0)
    .map((note) => ({
      ...note,
      startTime: Math.max(0, note.startTime - clipStart),
    }));
}

function outputEndTime(output: VoiceOutput, fallbackEndTime: number): number {
  return Object.values(output).reduce((endTime, notes) => {
    return notes.reduce((voiceEndTime, note) => Math.max(voiceEndTime, note.startTime + note.duration), endTime);
  }, fallbackEndTime);
}

async function createNamedTrack(song: Song<"1.0.0">, name: string): Promise<MidiTrack<"1.0.0">> {
  const track = await song.createMidiTrack();
  track.name = name;
  return track;
}

export async function writeFourTrackOutput(
  context: ExtensionContext<"1.0.0">,
  song: Song<"1.0.0">,
  output: VoiceOutput,
  startTime: number,
  endTime: number,
): Promise<void> {
  const clipEndTime = outputEndTime(output, endTime);
  const duration = clipEndTime - startTime;
  if (duration <= 0) throw new Error("Selection duration must be greater than zero.");

  await context.withinTransaction(() =>
    Promise.all([
      createNamedTrack(song, "Generated Violin I"),
      createNamedTrack(song, "Generated Violin II"),
      createNamedTrack(song, "Generated Viola"),
      createNamedTrack(song, "Generated Cello"),
    ]).then(async ([violin1, violin2, viola, cello]) => {
      const clips = await Promise.all([
        violin1.createMidiClip(startTime, duration),
        violin2.createMidiClip(startTime, duration),
        viola.createMidiClip(startTime, duration),
        cello.createMidiClip(startTime, duration),
      ]);

      clips[0]!.notes = toClipRelativeNotes(output.violin1, startTime);
      clips[1]!.notes = toClipRelativeNotes(output.violin2, startTime);
      clips[2]!.notes = toClipRelativeNotes(output.viola, startTime);
      clips[3]!.notes = toClipRelativeNotes(output.cello, startTime);
    }),
  );
}
